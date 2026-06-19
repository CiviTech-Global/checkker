import { getDb } from "../client";
import type { Bet, Game } from "@prisma/client";

export type BetWithGame = Bet & { game: Game | null };

export type CreateBetInput = {
  gameId: string;
  userId: string;
  amountWei: string;
  amountUsd: number;
  depositTxHash: string;
};

export const BetRepository = {
  async create(input: CreateBetInput): Promise<Bet> {
    return getDb().bet.create({
      data: {
        gameId: input.gameId,
        userId: input.userId,
        amountWei: input.amountWei,
        amountUsd: input.amountUsd,
        depositTxHash: input.depositTxHash,
      },
    });
  },

  async confirmDeposit(betId: string, depositTxHash?: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: {
        status: "confirmed",
        ...(depositTxHash ? { depositTxHash } : {}),
      },
    });
  },

  async markPaidOut(betId: string, payoutTxHash: string, payoutAmountWei: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: {
        status: "paid_out",
        payoutTxHash,
        payoutAmountWei,
      },
    });
  },

  async markRefunded(betId: string, refundTxHash: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: {
        status: "refunded",
        payoutTxHash: refundTxHash,
      },
    });
  },

  async cancel(betId: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: { status: "cancelled" },
    });
  },

  /**
   * Record a settlement failure with retry tracking. Keeps status as
   * "confirmed" so the startup reconciler will pick it up.
   */
  async recordSettlementFailure(betId: string, errorMessage: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: {
        settlementRetries: { increment: 1 },
        lastSettlementError: errorMessage,
      },
    });
  },

  /**
   * Mark a bet as settlement_failed after exhausting retries.
   */
  async markSettlementFailed(betId: string, errorMessage: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: {
        status: "settlement_failed",
        lastSettlementError: errorMessage,
      },
    });
  },

  /**
   * Find all bets with confirmed status (deposited, game over, but not yet
   * settled on-chain). Used by the startup reconciler.
   */
  async findUnsettledConfirmed(): Promise<BetWithGame[]> {
    return getDb().bet.findMany({
      where: { status: "confirmed" },
      include: { game: true },
    });
  },

  async findByGame(gameId: string): Promise<Bet[]> {
    return getDb().bet.findMany({ where: { gameId } });
  },

  async findByUser(userId: string, limit = 20): Promise<Bet[]> {
    return getDb().bet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
