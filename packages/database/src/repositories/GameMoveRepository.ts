import { getDb } from "../client";
import type { GameMove } from "@prisma/client";

export type CreateGameMoveInput = {
  gameId: string;
  moveNumber: number;
  fen: string;
  moveUci: string;
  san?: string;
  cardRank?: string;
  cardSuit?: string;
  color: string;
};

export const GameMoveRepository = {
  async create(input: CreateGameMoveInput): Promise<GameMove> {
    return getDb().gameMove.create({ data: input });
  },

  async createMany(inputs: CreateGameMoveInput[]): Promise<{ count: number }> {
    return getDb().gameMove.createMany({ data: inputs });
  },

  async getByGameId(gameId: string): Promise<GameMove[]> {
    return getDb().gameMove.findMany({
      where: { gameId },
      orderBy: { moveNumber: "asc" },
    });
  },

  async getByGameIdAndNumber(gameId: string, moveNumber: number): Promise<GameMove | null> {
    return getDb().gameMove.findFirst({
      where: { gameId, moveNumber },
    });
  },

  async deleteByGameId(gameId: string): Promise<{ count: number }> {
    const result = await getDb().gameMove.deleteMany({ where: { gameId } });
    return { count: result.count };
  },
};
