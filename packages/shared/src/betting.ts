import type { BotDifficulty } from "./game";

/** USD bet amount per difficulty tier (applies to both ranked and casual non-beginner) */
export const BET_AMOUNTS_USD: Record<BotDifficulty, number> = {
  beginner: 10,
  intermediate: 25,
  advanced: 100,
  master: 500,
};

/** House cut in basis points (1000 = 10%) */
export const HOUSE_CUT_BPS = 1000;

/** Casual beginner is free to play */
export const CASUAL_BEGINNER_FREE = true;

/** Donation limits for casual beginner (USD) */
export const DONATION_MIN_USD = 1;
export const DONATION_MAX_USD = 5;

/** Deposit timeout in milliseconds (2 minutes) */
export const DEPOSIT_TIMEOUT_MS = 120_000;

export type GameMode = "ranked" | "casual";

/** Player-selected stake level for a match. */
export type StakeLevel = "free" | "bet";

export interface BetInfo {
  amountWei: string;
  amountUsd: number;
  difficulty: BotDifficulty;
  mode: GameMode;
  contractAddress: string;
  gameId: string;
}

export interface BetSettlement {
  winnerAddress: string | null; // null for draw
  payoutWei: string;
  houseCutWei: string;
  txHash: string;
}

/** Returns true if this mode+difficulty combo is free (no bet required) */
export function isFreeGame(mode: GameMode, difficulty: BotDifficulty): boolean {
  return mode === "casual" && difficulty === "beginner";
}

/** Returns the USD bet amount for a difficulty tier. */
export function getBetAmountUsd(difficulty: BotDifficulty): number {
  return BET_AMOUNTS_USD[difficulty];
}

/** Returns true if the player chose a free stake. */
export function isFreeStake(stake: StakeLevel): boolean {
  return stake === "free";
}

/** Calculate payout amounts from total pot */
export function calculatePayout(totalPotWei: bigint): {
  winnerPayout: bigint;
  houseCut: bigint;
} {
  const houseCut = (totalPotWei * BigInt(HOUSE_CUT_BPS)) / 10000n;
  const winnerPayout = totalPotWei - houseCut;
  return { winnerPayout, houseCut };
}
