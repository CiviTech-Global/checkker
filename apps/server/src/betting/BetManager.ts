import type { BotDifficulty, GameMode, GameResult } from "@checkker/shared";
import { BET_AMOUNTS_USD, isFreeGame, DEPOSIT_TIMEOUT_MS } from "@checkker/shared";
import { ContractService } from "../blockchain/ContractService";
import { usdToWei } from "../blockchain/PriceOracle";

export interface BetSetup {
  gameId: string;
  betAmountWei: string;
  betAmountUsd: number;
  isFree: boolean;
}

/** Try to import BetRepository — may not be available if DB is not configured */
async function getBetRepository() {
  try {
    const { BetRepository } = await import("@checkker/database");
    return BetRepository;
  } catch {
    return null;
  }
}

export const BetManager = {
  /**
   * Initialize a bet for a game. Creates the escrow on-chain if betting is required.
   * @returns Bet setup info, or null if blockchain is not enabled
   */
  async initiateBet(
    gameId: string,
    mode: GameMode,
    difficulty: BotDifficulty,
    whiteAddress: string,
    blackAddress: string,
    whiteUserId?: string,
    blackUserId?: string
  ): Promise<BetSetup | null> {
    if (isFreeGame(mode, difficulty)) {
      return { gameId, betAmountWei: "0", betAmountUsd: 0, isFree: true };
    }

    if (!ContractService.enabled) {
      console.log("[BetManager] Blockchain not enabled, skipping escrow");
      return null;
    }

    const usd = BET_AMOUNTS_USD[difficulty];
    const wei = await usdToWei(usd);

    try {
      await ContractService.createGame(gameId, whiteAddress, blackAddress, wei);
      console.log(`[BetManager] Created escrow for game ${gameId}: $${usd} (${wei} wei)`);

      // Persist bet records in the database for each player
      const repo = await getBetRepository();
      if (repo) {
        if (whiteUserId) {
          await repo.create({
            gameId,
            userId: whiteUserId,
            amountWei: wei,
            amountUsd: usd,
            depositTxHash: "",
          }).catch((err: any) => console.error("[BetManager] Failed to create white bet record:", err));
        }
        if (blackUserId) {
          await repo.create({
            gameId,
            userId: blackUserId,
            amountWei: wei,
            amountUsd: usd,
            depositTxHash: "",
          }).catch((err: any) => console.error("[BetManager] Failed to create black bet record:", err));
        }
      }

      return { gameId, betAmountWei: wei, betAmountUsd: usd, isFree: false };
    } catch (err) {
      console.error("[BetManager] Failed to create escrow:", err);
      return null;
    }
  },

  /**
   * Confirm a player's deposit in the database.
   */
  async confirmDeposit(gameId: string, userId: string, depositTxHash: string): Promise<void> {
    const repo = await getBetRepository();
    if (!repo) return;

    try {
      const bets = await repo.findByGame(gameId);
      const bet = bets.find((b: any) => b.userId === userId);
      if (bet) {
        // Update the depositTxHash and confirm
        await repo.confirmDeposit(bet.id);
      }
    } catch (err) {
      console.error("[BetManager] Failed to confirm deposit:", err);
    }
  },

  /**
   * Wait for both players to deposit. Returns true if both deposited within timeout.
   */
  async waitForDeposits(
    gameId: string,
    whiteAddress: string,
    blackAddress: string,
    timeoutMs = DEPOSIT_TIMEOUT_MS
  ): Promise<boolean> {
    if (!ContractService.enabled) return false;

    const [whiteOk, blackOk] = await Promise.all([
      ContractService.listenForDeposit(gameId, whiteAddress, timeoutMs),
      ContractService.listenForDeposit(gameId, blackAddress, timeoutMs),
    ]);

    return whiteOk && blackOk;
  },

  /**
   * Settle the bet after a game ends.
   * @param result The game result
   * @param winnerAddress The winner's wallet address (null for draw)
   * @param winnerUserId The winner's DB user ID (for bet record updates)
   * @param loserUserId The loser's DB user ID
   * @returns Transaction hash, or null if no settlement needed
   */
  async settleBet(
    gameId: string,
    result: GameResult,
    winnerAddress: string | null,
    winnerUserId?: string,
    loserUserId?: string
  ): Promise<string | null> {
    if (!ContractService.enabled) return null;

    try {
      let txHash: string | null = null;

      if (result.type === "draw" || result.type === "deckExhausted") {
        txHash = await ContractService.reportDraw(gameId);
        console.log(`[BetManager] Draw settled for game ${gameId}: ${txHash}`);

        // Mark both bets as refunded
        const repo = await getBetRepository();
        if (repo && txHash) {
          const bets = await repo.findByGame(gameId);
          for (const bet of bets) {
            await repo.markRefunded(bet.id, txHash).catch(() => {});
          }
        }

        return txHash;
      }

      if (winnerAddress) {
        txHash = await ContractService.reportWinner(gameId, winnerAddress);
        console.log(`[BetManager] Winner settled for game ${gameId}: ${txHash}`);

        // Update bet records
        const repo = await getBetRepository();
        if (repo && txHash) {
          const bets = await repo.findByGame(gameId);
          for (const bet of bets) {
            if (bet.userId === winnerUserId) {
              await repo.markPaidOut(bet.id, txHash, "").catch(() => {});
            } else {
              // Loser's bet stays as confirmed (they lost their deposit)
            }
          }
        }

        return txHash;
      }

      return null;
    } catch (err) {
      console.error("[BetManager] Settlement failed:", err);
      return null;
    }
  },

  /**
   * Cancel a bet (e.g., deposit timeout). Refunds any deposits.
   */
  async cancelBet(gameId: string): Promise<string | null> {
    if (!ContractService.enabled) return null;

    try {
      const txHash = await ContractService.cancelGame(gameId);
      console.log(`[BetManager] Cancelled bet for game ${gameId}: ${txHash}`);

      // Mark all bet records as cancelled
      const repo = await getBetRepository();
      if (repo) {
        const bets = await repo.findByGame(gameId);
        for (const bet of bets) {
          await repo.cancel(bet.id).catch(() => {});
        }
      }

      return txHash;
    } catch (err) {
      console.error("[BetManager] Cancel failed:", err);
      return null;
    }
  },
};
