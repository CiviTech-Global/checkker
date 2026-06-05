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
    blackAddress: string
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
      return { gameId, betAmountWei: wei, betAmountUsd: usd, isFree: false };
    } catch (err) {
      console.error("[BetManager] Failed to create escrow:", err);
      return null;
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
   * @returns Transaction hash, or null if no settlement needed
   */
  async settleBet(
    gameId: string,
    result: GameResult,
    winnerAddress: string | null
  ): Promise<string | null> {
    if (!ContractService.enabled) return null;

    try {
      if (result.type === "draw" || result.type === "deckExhausted") {
        const txHash = await ContractService.reportDraw(gameId);
        console.log(`[BetManager] Draw settled for game ${gameId}: ${txHash}`);
        return txHash;
      }

      if (winnerAddress) {
        const txHash = await ContractService.reportWinner(gameId, winnerAddress);
        console.log(`[BetManager] Winner settled for game ${gameId}: ${txHash}`);
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
      return txHash;
    } catch (err) {
      console.error("[BetManager] Cancel failed:", err);
      return null;
    }
  },
};
