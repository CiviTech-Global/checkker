import { getDb } from "../client";
import type { Game } from "@prisma/client";

export type CreateGameInput = {
  whiteUserId: string;
  blackUserId: string;
  mode: "ranked" | "casual";
  difficulty: string;
  timeControl: string;
  whiteRatingBefore: number;
  blackRatingBefore: number;
};

export type CompleteGameInput = {
  resultType: string;
  winnerColor?: string;
  winnerUserId?: string;
  whiteRatingAfter: number;
  blackRatingAfter: number;
  moveCount: number;
};

export type RecentGame = Game & {
  whitePlayer: { id: string; username: string; avatarId: string; rating: number };
  blackPlayer: { id: string; username: string; avatarId: string; rating: number };
};

export const GameRepository = {
  async create(input: CreateGameInput): Promise<Game> {
    return getDb().game.create({ data: input });
  },

  async complete(gameId: string, input: CompleteGameInput): Promise<Game> {
    return getDb().game.update({
      where: { id: gameId },
      data: {
        ...input,
        endedAt: new Date(),
      },
    });
  },

  async findById(gameId: string): Promise<Game | null> {
    return getDb().game.findUnique({ where: { id: gameId } });
  },

  async getRecentByUser(userId: string, limit = 10): Promise<RecentGame[]> {
    return getDb().game.findMany({
      where: {
        OR: [{ whiteUserId: userId }, { blackUserId: userId }],
        endedAt: { not: null },
      },
      orderBy: { endedAt: "desc" },
      take: limit,
      include: {
        whitePlayer: { select: { id: true, username: true, avatarId: true, rating: true } },
        blackPlayer: { select: { id: true, username: true, avatarId: true, rating: true } },
      },
    }) as Promise<RecentGame[]>;
  },
};
