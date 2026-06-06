import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CheckkerEscrow", function () {
  let escrow: any;
  let owner: HardhatEthersSigner;
  let referee: HardhatEthersSigner;
  let houseWallet: HardhatEthersSigner;
  let white: HardhatEthersSigner;
  let black: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const BET_AMOUNT = ethers.parseEther("0.1");
  const GAME_ID = ethers.id("game-001");

  beforeEach(async function () {
    [owner, referee, houseWallet, white, black, stranger] = await ethers.getSigners();
    const CheckkerEscrow = await ethers.getContractFactory("CheckkerEscrow");
    escrow = await CheckkerEscrow.deploy(referee.address, houseWallet.address);
    await escrow.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("sets referee correctly", async function () {
      expect(await escrow.referee()).to.equal(referee.address);
    });

    it("sets houseWallet correctly", async function () {
      expect(await escrow.houseWallet()).to.equal(houseWallet.address);
    });

    it("sets houseCutBps to 1000 (10%)", async function () {
      expect(await escrow.houseCutBps()).to.equal(1000n);
    });

    it("reverts if referee is zero address", async function () {
      const Factory = await ethers.getContractFactory("CheckkerEscrow");
      await expect(
        Factory.deploy(ethers.ZeroAddress, houseWallet.address)
      ).to.be.revertedWith("Invalid referee");
    });

    it("reverts if houseWallet is zero address", async function () {
      const Factory = await ethers.getContractFactory("CheckkerEscrow");
      await expect(
        Factory.deploy(referee.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid house wallet");
    });
  });

  // ── createGame ──────────────────────────────────────────────────────

  describe("createGame", function () {
    it("creates a game and emits GameCreated", async function () {
      await expect(
        escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT)
      )
        .to.emit(escrow, "GameCreated")
        .withArgs(GAME_ID, white.address, black.address, BET_AMOUNT);
    });

    it("reverts if caller is not referee", async function () {
      await expect(
        escrow.connect(stranger).createGame(GAME_ID, white.address, black.address, BET_AMOUNT)
      ).to.be.revertedWith("Not referee");
    });

    it("reverts for duplicate game ID", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await expect(
        escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT)
      ).to.be.revertedWith("Game already exists");
    });

    it("reverts if white is zero address", async function () {
      await expect(
        escrow.connect(referee).createGame(GAME_ID, ethers.ZeroAddress, black.address, BET_AMOUNT)
      ).to.be.revertedWith("Invalid player");
    });

    it("reverts if white == black", async function () {
      await expect(
        escrow.connect(referee).createGame(GAME_ID, white.address, white.address, BET_AMOUNT)
      ).to.be.revertedWith("Same player");
    });

    it("reverts if betAmount is 0", async function () {
      await expect(
        escrow.connect(referee).createGame(GAME_ID, white.address, black.address, 0)
      ).to.be.revertedWith("Bet must be > 0");
    });
  });

  // ── deposit ─────────────────────────────────────────────────────────

  describe("deposit", function () {
    beforeEach(async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
    });

    it("accepts white deposit and emits DepositMade", async function () {
      await expect(
        escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT })
      )
        .to.emit(escrow, "DepositMade")
        .withArgs(GAME_ID, white.address, BET_AMOUNT);
    });

    it("accepts black deposit", async function () {
      await expect(
        escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT })
      )
        .to.emit(escrow, "DepositMade")
        .withArgs(GAME_ID, black.address, BET_AMOUNT);
    });

    it("emits GameStarted when both deposit", async function () {
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await expect(
        escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT })
      ).to.emit(escrow, "GameStarted").withArgs(GAME_ID);
    });

    it("reverts for wrong amount", async function () {
      await expect(
        escrow.connect(white).deposit(GAME_ID, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Wrong deposit amount");
    });

    it("reverts for double deposit from same player", async function () {
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await expect(
        escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT })
      ).to.be.revertedWith("Already deposited");
    });

    it("reverts if caller is not a participant", async function () {
      await expect(
        escrow.connect(stranger).deposit(GAME_ID, { value: BET_AMOUNT })
      ).to.be.revertedWith("Not a player in this game");
    });

    it("reverts for non-existent game", async function () {
      const fakeId = ethers.id("fake-game");
      await expect(
        escrow.connect(white).deposit(fakeId, { value: BET_AMOUNT })
      ).to.be.revertedWith("Game not found");
    });
  });

  // ── reportWinner ────────────────────────────────────────────────────

  describe("reportWinner", function () {
    beforeEach(async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT });
    });

    it("pays 90% to winner and 10% to house", async function () {
      const totalPot = BET_AMOUNT * 2n;
      const expectedHouseCut = totalPot * 1000n / 10000n; // 10%
      const expectedPayout = totalPot - expectedHouseCut;

      const winnerBefore = await ethers.provider.getBalance(white.address);
      const houseBefore = await ethers.provider.getBalance(houseWallet.address);

      await expect(
        escrow.connect(referee).reportWinner(GAME_ID, white.address)
      )
        .to.emit(escrow, "GameResolved")
        .withArgs(GAME_ID, white.address, expectedPayout, expectedHouseCut);

      const winnerAfter = await ethers.provider.getBalance(white.address);
      const houseAfter = await ethers.provider.getBalance(houseWallet.address);

      expect(winnerAfter - winnerBefore).to.equal(expectedPayout);
      expect(houseAfter - houseBefore).to.equal(expectedHouseCut);
    });

    it("reverts if caller is not referee", async function () {
      await expect(
        escrow.connect(stranger).reportWinner(GAME_ID, white.address)
      ).to.be.revertedWith("Not referee");
    });

    it("reverts if winner is not a player", async function () {
      await expect(
        escrow.connect(referee).reportWinner(GAME_ID, stranger.address)
      ).to.be.revertedWith("Not a player");
    });

    it("reverts if game is not active", async function () {
      await escrow.connect(referee).reportWinner(GAME_ID, white.address);
      await expect(
        escrow.connect(referee).reportWinner(GAME_ID, white.address)
      ).to.be.revertedWith("Game not active");
    });
  });

  // ── reportDraw ──────────────────────────────────────────────────────

  describe("reportDraw", function () {
    beforeEach(async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT });
    });

    it("refunds both players fully (no house cut) and emits GameDrawn", async function () {
      const whiteBefore = await ethers.provider.getBalance(white.address);
      const blackBefore = await ethers.provider.getBalance(black.address);

      await expect(
        escrow.connect(referee).reportDraw(GAME_ID)
      )
        .to.emit(escrow, "GameDrawn")
        .withArgs(GAME_ID, BET_AMOUNT);

      const whiteAfter = await ethers.provider.getBalance(white.address);
      const blackAfter = await ethers.provider.getBalance(black.address);

      expect(whiteAfter - whiteBefore).to.equal(BET_AMOUNT);
      expect(blackAfter - blackBefore).to.equal(BET_AMOUNT);
    });

    it("reverts if game is not active", async function () {
      await escrow.connect(referee).reportDraw(GAME_ID);
      await expect(
        escrow.connect(referee).reportDraw(GAME_ID)
      ).to.be.revertedWith("Game not active");
    });

    it("reverts if caller is not referee", async function () {
      await expect(
        escrow.connect(stranger).reportDraw(GAME_ID)
      ).to.be.revertedWith("Not referee");
    });
  });

  // ── cancelGame ──────────────────────────────────────────────────────

  describe("cancelGame", function () {
    it("refunds depositor when only one has deposited", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });

      const whiteBefore = await ethers.provider.getBalance(white.address);

      await expect(
        escrow.connect(referee).cancelGame(GAME_ID)
      )
        .to.emit(escrow, "GameCancelled")
        .withArgs(GAME_ID)
        .and.to.emit(escrow, "RefundIssued")
        .withArgs(GAME_ID, white.address, BET_AMOUNT);

      const whiteAfter = await ethers.provider.getBalance(white.address);
      expect(whiteAfter - whiteBefore).to.equal(BET_AMOUNT);
    });

    it("refunds both depositors when both have deposited", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT });

      await expect(
        escrow.connect(referee).cancelGame(GAME_ID)
      )
        .to.emit(escrow, "RefundIssued")
        .withArgs(GAME_ID, white.address, BET_AMOUNT)
        .and.to.emit(escrow, "RefundIssued")
        .withArgs(GAME_ID, black.address, BET_AMOUNT);
    });

    it("reverts if game is already completed", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT });
      await escrow.connect(black).deposit(GAME_ID, { value: BET_AMOUNT });
      await escrow.connect(referee).reportWinner(GAME_ID, white.address);

      await expect(
        escrow.connect(referee).cancelGame(GAME_ID)
      ).to.be.revertedWith("Cannot cancel");
    });

    it("reverts if caller is not referee", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await expect(
        escrow.connect(stranger).cancelGame(GAME_ID)
      ).to.be.revertedWith("Not referee");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────

  describe("Edge cases", function () {
    it("reverts reportWinner on non-existent game", async function () {
      const fakeId = ethers.id("nonexistent");
      await expect(
        escrow.connect(referee).reportWinner(fakeId, white.address)
      ).to.be.revertedWith("Game not found");
    });

    it("reverts reportDraw on non-existent game", async function () {
      const fakeId = ethers.id("nonexistent");
      await expect(
        escrow.connect(referee).reportDraw(fakeId)
      ).to.be.revertedWith("Game not found");
    });

    it("reverts cancelGame on non-existent game", async function () {
      const fakeId = ethers.id("nonexistent");
      await expect(
        escrow.connect(referee).cancelGame(fakeId)
      ).to.be.revertedWith("Game not found");
    });

    it("deposit reverts after game is cancelled", async function () {
      await escrow.connect(referee).createGame(GAME_ID, white.address, black.address, BET_AMOUNT);
      await escrow.connect(referee).cancelGame(GAME_ID);
      await expect(
        escrow.connect(white).deposit(GAME_ID, { value: BET_AMOUNT })
      ).to.be.revertedWith("Not accepting deposits");
    });
  });
});
