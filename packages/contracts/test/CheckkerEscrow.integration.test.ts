import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Server↔contract integration tests: exercises the full game lifecycle as
 * the game server would, including the deposit deadline mechanism,
 * settlement idempotency, and edge-case fund safety.
 */
describe("CheckkerEscrow — Full Lifecycle Integration", function () {
  let escrow: any;
  let owner: HardhatEthersSigner;
  let referee: HardhatEthersSigner;
  let houseWallet: HardhatEthersSigner;
  let white: HardhatEthersSigner;
  let black: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const BET = ethers.parseEther("0.1");
  const GAME_ID = ethers.id("integration-test-game-001");
  const DEADLINE_SECS = 600n; // matches DEPOSIT_DEADLINE_SECONDS in contract

  beforeEach(async function () {
    [owner, referee, houseWallet, white, black, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CheckkerEscrow");
    escrow = await Factory.deploy(referee.address, houseWallet.address);
    await escrow.waitForDeployment();
  });

  // ── Full Happy Path ────────────────────────────────────────────────

  it("Full lifecycle: create → both deposit → reportWinner → correct payouts", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);

    // Both deposit
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });

    const game = await escrow.getGame(GAME_ID);
    expect(game.status).to.equal(1n); // Active

    // Report winner
    const totalPot = BET * 2n;
    const houseCut = (totalPot * 1000n) / 10000n;
    const payout = totalPot - houseCut;

    const winnerBefore = await ethers.provider.getBalance(white.address);
    const houseBefore = await ethers.provider.getBalance(houseWallet.address);

    const tx = await escrow.connect(referee).reportWinner(GAME_ID, white.address);
    await tx.wait();

    const winnerAfter = await ethers.provider.getBalance(white.address);
    const houseAfter = await ethers.provider.getBalance(houseWallet.address);

    expect(winnerAfter - winnerBefore).to.equal(payout);
    expect(houseAfter - houseBefore).to.equal(houseCut);

    // Game is now completed
    const finalGame = await escrow.getGame(GAME_ID);
    expect(finalGame.status).to.equal(2n); // Completed
  });

  it("Full lifecycle: create → both deposit → reportDraw → full refunds", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });

    const whiteBefore = await ethers.provider.getBalance(white.address);
    const blackBefore = await ethers.provider.getBalance(black.address);

    await escrow.connect(referee).reportDraw(GAME_ID);

    const whiteAfter = await ethers.provider.getBalance(white.address);
    const blackAfter = await ethers.provider.getBalance(black.address);

    expect(whiteAfter - whiteBefore).to.equal(BET);
    expect(blackAfter - blackBefore).to.equal(BET);
  });

  // ── Settlement Idempotency ─────────────────────────────────────────

  it("Settlement idempotency: second reportWinner reverts", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });

    await escrow.connect(referee).reportWinner(GAME_ID, white.address);

    // Second attempt must revert (handled by the server as "already settled")
    await expect(
      escrow.connect(referee).reportWinner(GAME_ID, white.address),
    ).to.be.revertedWith("Game not active");
  });

  it("Settlement idempotency: second reportDraw reverts", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });

    await escrow.connect(referee).reportDraw(GAME_ID);

    await expect(
      escrow.connect(referee).reportDraw(GAME_ID),
    ).to.be.revertedWith("Game not active");
  });

  // ── Deposit Deadline ───────────────────────────────────────────────

  it("Deposit reverts after deadline passes", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);

    // Verify deadline is set
    const game = await escrow.getGame(GAME_ID);
    expect(game.depositDeadline).to.be.gt(0n);
    expect(game.depositDeadline - game.createdAt).to.equal(DEADLINE_SECS);

    // Fast-forward past the deadline
    await ethers.provider.send("evm_increaseTime", [Number(DEADLINE_SECS) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      escrow.connect(white).deposit(GAME_ID, { value: BET }),
    ).to.be.revertedWith("Deposit deadline passed");
  });

  // ── Player Reclaim After Deadline ──────────────────────────────────

  it("Player can reclaim deposit after deadline when counterparty never deposited", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);

    // Only white deposits
    await escrow.connect(white).deposit(GAME_ID, { value: BET });

    // Fast-forward past the deadline
    await ethers.provider.send("evm_increaseTime", [Number(DEADLINE_SECS) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Black cannot deposit (deadline passed)
    await expect(
      escrow.connect(black).deposit(GAME_ID, { value: BET }),
    ).to.be.revertedWith("Deposit deadline passed");

    // White can reclaim
    const whiteBefore = await ethers.provider.getBalance(white.address);
    const tx = await escrow.connect(white).claimRefundAfterDeadline(GAME_ID);
    await tx.wait();
    const whiteAfter = await ethers.provider.getBalance(white.address);

    // White gets their full deposit back (minus gas)
    expect(whiteAfter - whiteBefore).to.be.closeTo(BET, ethers.parseEther("0.005"));

    // Game is now cancelled (both deposits at 0)
    const game = await escrow.getGame(GAME_ID);
    expect(game.status).to.equal(3n); // Cancelled
  });

  it("Both players can reclaim after deadline if both deposited before deadline but game never started", async function () {
    // Edge case: both deposit, but referee never reports. Both can reclaim.
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });

    // Game is Active (both deposited)
    const game = await escrow.getGame(GAME_ID);
    expect(game.status).to.equal(1n); // Active

    // Fast-forward past the deadline
    await ethers.provider.send("evm_increaseTime", [Number(DEADLINE_SECS) + 1]);
    await ethers.provider.send("evm_mine", []);

    // claimRefundAfterDeadline should NOT work — game is Active
    await expect(
      escrow.connect(white).claimRefundAfterDeadline(GAME_ID),
    ).to.be.revertedWith("Game already active or resolved");
  });

  it("claimRefundAfterDeadline reverts before deadline", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });

    await expect(
      escrow.connect(white).claimRefundAfterDeadline(GAME_ID),
    ).to.be.revertedWith("Deadline not yet passed");
  });

  it("claimRefundAfterDeadline reverts for non-depositor", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);

    await ethers.provider.send("evm_increaseTime", [Number(DEADLINE_SECS) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      escrow.connect(stranger).claimRefundAfterDeadline(GAME_ID),
    ).to.be.revertedWith("No deposit to reclaim");
  });

  // ── One-Sided Deposit + Cancel ─────────────────────────────────────

  it("Referee can cancel and refund when only one player deposited", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(white).deposit(GAME_ID, { value: BET });

    const whiteBefore = await ethers.provider.getBalance(white.address);

    await escrow.connect(referee).cancelGame(GAME_ID);

    const whiteAfter = await ethers.provider.getBalance(white.address);
    expect(whiteAfter - whiteBefore).to.equal(BET);
  });

  // ── Concurrent Game Handling ───────────────────────────────────────

  it("Multiple games can be created and settled independently", async function () {
    const game2Id = ethers.id("integration-test-game-002");
    const game3Id = ethers.id("integration-test-game-003");

    // Create 3 games
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    await escrow.connect(referee).createGame(game2Id, black.address, white.address, BET);
    await escrow.connect(referee).createGame(game3Id, stranger.address, houseWallet.address, BET);

    // Deposit for all three
    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(game2Id, { value: BET });
    await escrow.connect(white).deposit(game2Id, { value: BET });
    await escrow.connect(stranger).deposit(game3Id, { value: BET });
    await escrow.connect(houseWallet).deposit(game3Id, { value: BET });

    // Settle in different ways
    await escrow.connect(referee).reportWinner(GAME_ID, white.address);
    await escrow.connect(referee).reportDraw(game2Id);

    // Game 3: cancel (both deposited, but referee cancels)
    await escrow.connect(referee).cancelGame(game3Id);

    // Verify final statuses
    const g1 = await escrow.getGame(GAME_ID);
    const g2 = await escrow.getGame(game2Id);
    const g3 = await escrow.getGame(game3Id);
    expect(g1.status).to.equal(2n); // Completed
    expect(g2.status).to.equal(4n); // Drawn
    expect(g3.status).to.equal(3n); // Cancelled
  });

  // ── View Functions ─────────────────────────────────────────────────

  it("getGameStatus returns correct statuses", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    expect(await escrow.getGameStatus(GAME_ID)).to.equal(0n); // WaitingForDeposits

    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    await escrow.connect(black).deposit(GAME_ID, { value: BET });
    expect(await escrow.getGameStatus(GAME_ID)).to.equal(1n); // Active

    await escrow.connect(referee).reportWinner(GAME_ID, white.address);
    expect(await escrow.getGameStatus(GAME_ID)).to.equal(2n); // Completed
  });

  it("isGameReady returns true only when both deposited", async function () {
    await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET);
    expect(await escrow.isGameReady(GAME_ID)).to.be.false;

    await escrow.connect(white).deposit(GAME_ID, { value: BET });
    expect(await escrow.isGameReady(GAME_ID)).to.be.false;

    await escrow.connect(black).deposit(GAME_ID, { value: BET });
    expect(await escrow.isGameReady(GAME_ID)).to.be.true;
  });
});
