import { getDb } from "../client";
import type { Bet } from "@prisma/client";

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

  async confirmDeposit(betId: string): Promise<Bet> {
    return getDb().bet.update({
      where: { id: betId },
      data: { status: "confirmed" },
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
