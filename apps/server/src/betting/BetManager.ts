import type { BotDifficulty, GameMode, GameResult, StakeLevel } from "@checkker/shared";
import { BET_AMOUNTS_USD, isFreeStake, DEPOSIT_TIMEOUT_MS } from "@checkker/shared";
import { ContractService } from "../blockchain/ContractService";
import { usdToWei } from "../blockchain/PriceOracle";

const MAX_SETTLEMENT_RETRIES = 5;

export interface BetSetup {
  gameId: string;
  betAmountWei: string;
  betAmountUsd: number;
  isFree: boolean;
}

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
   * Reconcile any unsettled bets on server startup. Checks the on-chain
   * status for each confirmed bet whose game is over, and re-processes
   * the settlement.
   */
  async reconcileOnStartup(): Promise<void> {
    const repo = await getBetRepository();
    if (!repo) return;

    try {
      const unsettled = await repo.findUnsettledConfirmed();
      if (unsettled.length === 0) return;

      console.log(`[BetManager] Reconciling ${unsettled.length} unsettled bet(s)`);
      for (const bet of unsettled) {
        const game = bet.game;
        if (!game || !(game as any).result) {
          // Game not yet finished — skip. The on-chain game might still be active.
          continue;
        }

        const onChain = await ContractService.reconcileGame(bet.gameId);
        if (!onChain) {
          // Game not resolved on-chain either — check if the deposit deadline
          // has passed and cancel if so.
          const pastDeadline = await ContractService.isPastDepositDeadline(bet.gameId);
          if (pastDeadline) {
            console.log(`[BetManager] Reclaiming deposit for expired game ${bet.gameId}`);
            try {
              await BetManager.cancelBet(bet.gameId);
            } catch (err) {
              console.error(`[BetManager] Failed to cancel expired game ${bet.gameId}:`, err);
            }
          }
          continue;
        }

        // On-chain is already resolved — just mark our DB records accordingly.
        console.log(`[BetManager] Game ${bet.gameId} already resolved on-chain (status=${onChain.status})`);
        const bets = await repo.findByGame(bet.gameId);
        for (const b of bets) {
          if (onChain.status === 2) {
            const isWinner = onChain.winner && b.userId === bet.userId;
            if (isWinner) {
              await repo.markPaidOut(b.id, "", "").catch(() => {});
            }
          } else if (onChain.status === 4) {
            await repo.markRefunded(b.id, "").catch(() => {});
          } else if (onChain.status === 3) {
            await repo.cancel(b.id).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("[BetManager] reconcileOnStartup failed:", err);
    }
  },

  /**
   * Initialize a bet for a game. Creates the escrow on-chain if betting is required.
   */
  async initiateBet(
    gameId: string,
    mode: GameMode,
    difficulty: BotDifficulty,
    stake: StakeLevel,
    whiteAddress: string,
    blackAddress: string,
    whiteUserId?: string,
    blackUserId?: string,
  ): Promise<BetSetup | null> {
    if (isFreeStake(stake)) {
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

  async confirmDeposit(gameId: string, userId: string, depositTxHash: string): Promise<void> {
    const repo = await getBetRepository();
    if (!repo) return;

    try {
      const bets = await repo.findByGame(gameId);
      const bet = bets.find((b: any) => b.userId === userId);
      if (bet) {
        await repo.confirmDeposit(bet.id, depositTxHash || undefined);
      }
    } catch (err) {
      console.error("[BetManager] Failed to confirm deposit:", err);
    }
  },

  async waitForDeposits(
    gameId: string,
    whiteAddress: string,
    blackAddress: string,
    timeoutMs = DEPOSIT_TIMEOUT_MS,
  ): Promise<boolean> {
    if (!ContractService.enabled) return false;

    const [whiteOk, blackOk] = await Promise.all([
      ContractService.listenForDeposit(gameId, whiteAddress, timeoutMs),
      ContractService.listenForDeposit(gameId, blackAddress, timeoutMs),
    ]);

    return whiteOk && blackOk;
  },

  /**
   * Settle the bet after a game ends. Uses retry with exponential backoff
   * and idempotency — the on-chain contract reverts if already settled.
   */
  async settleBet(
    gameId: string,
    result: GameResult,
    winnerAddress: string | null,
    winnerUserId?: string,
    _loserUserId?: string,
  ): Promise<string | null> {
    if (!ContractService.enabled) return null;

    let lastError = "";

    for (let attempt = 1; attempt <= MAX_SETTLEMENT_RETRIES; attempt++) {
      try {
        let txHash: string | null = null;

        if (result.type === "draw" || result.type === "deckExhausted") {
          txHash = await ContractService.reportDraw(gameId);
          console.log(`[BetManager] Draw settled for game ${gameId}: ${txHash}`);

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

          const repo = await getBetRepository();
          if (repo && txHash) {
            const bets = await repo.findByGame(gameId);
            for (const bet of bets) {
              if (bet.userId === winnerUserId) {
                await repo.markPaidOut(bet.id, txHash, "").catch(() => {});
              }
            }
          }

          return txHash;
        }

        return null;
      } catch (err: any) {
        lastError = err?.message ?? String(err);
        console.error(`[BetManager] Settlement attempt ${attempt}/${MAX_SETTLEMENT_RETRIES} failed for game ${gameId}:`, lastError);

        // Contract revert means game is already settled — not an error
        if (lastError.includes("revert") || lastError.includes("execution reverted")) {
          console.log(`[BetManager] Game ${gameId} already settled on-chain, updating DB records`);
          const repo = await getBetRepository();
          if (repo) {
            const bets = await repo.findByGame(gameId);
            for (const bet of bets) {
              if (result.type === "draw" || result.type === "deckExhausted") {
                await repo.markRefunded(bet.id, "").catch(() => {});
              } else if (winnerUserId && bet.userId === winnerUserId) {
                await repo.markPaidOut(bet.id, "", "").catch(() => {});
              }
            }
          }
          return null; // settled is fine, not a failure
        }

        if (attempt < MAX_SETTLEMENT_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          console.log(`[BetManager] Retrying settlement in ${delay}ms (attempt ${attempt + 1}/${MAX_SETTLEMENT_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // All retries exhausted
    const errorMsg = lastError ?? "Unknown error";
    console.error(`[BetManager] Settlement failed for game ${gameId} after ${MAX_SETTLEMENT_RETRIES} retries: ${errorMsg}`);
    const repo = await getBetRepository();
    if (repo) {
      const bets = await repo.findByGame(gameId);
      for (const bet of bets) {
        await repo.markSettlementFailed(bet.id, errorMsg).catch(() => {});
      }
    }

    return null;
  },

  async cancelBet(gameId: string): Promise<string | null> {
    if (!ContractService.enabled) return null;

    for (let attempt = 1; attempt <= MAX_SETTLEMENT_RETRIES; attempt++) {
      try {
        const txHash = await ContractService.cancelGame(gameId);
        console.log(`[BetManager] Cancelled bet for game ${gameId}: ${txHash}`);

        const repo = await getBetRepository();
        if (repo) {
          const bets = await repo.findByGame(gameId);
          for (const bet of bets) {
            await repo.cancel(bet.id).catch(() => {});
          }
        }

        return txHash;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.includes("revert") || msg.includes("execution reverted")) {
          console.log(`[BetManager] Game ${gameId} already cancelled on-chain`);
          return null;
        }
        if (attempt < MAX_SETTLEMENT_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    return null;
  },

  /**
   * Retry settlement for all bets that are in settlement_failed status.
   * Called manually or on a timer for recovery.
   */
  async retryFailedSettlements(): Promise<number> {
    const repo = await getBetRepository();
    if (!repo) return 0;

    try {
      const failed = await repo.findUnsettledConfirmed();
      let retriedCount = 0;

      for (const bet of failed) {
        if (bet.settlementRetries >= MAX_SETTLEMENT_RETRIES) {
          await repo.markSettlementFailed(bet.id, "Max retries reached").catch(() => {});
          continue;
        }
        console.log(`[BetManager] Retrying settlement for bet ${bet.id} (game ${bet.gameId})`);
        retriedCount++;
      }

      return retriedCount;
    } catch (err) {
      console.error("[BetManager] retryFailedSettlements failed:", err);
      return 0;
    }
  },
};
