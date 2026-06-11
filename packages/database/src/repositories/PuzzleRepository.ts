import { getDb } from "../client";
import type { Puzzle, PuzzleAttempt, Prisma } from "@prisma/client";

export type CreatePuzzleInput = {
  fen: string;
  solution: string;
  hint: string;
  difficulty: string;
  category: string;
  rating?: number;
  cards?: string;
  isDaily?: boolean;
  dailyDate?: Date;
};

export type RecordAttemptInput = {
  puzzleId: string;
  userId: string;
  solved: boolean;
  timeSpentMs: number;
  usedHint: boolean;
};

export const PuzzleRepository = {
  async create(input: CreatePuzzleInput): Promise<Puzzle> {
    return getDb().puzzle.create({ data: input });
  },

  async createMany(inputs: CreatePuzzleInput[]): Promise<{ count: number }> {
    return getDb().puzzle.createMany({
      data: inputs,
      skipDuplicates: true,
    });
  },

  async getById(id: string): Promise<Puzzle | null> {
    return getDb().puzzle.findUnique({ where: { id } });
  },

  async getDaily(date?: Date): Promise<Puzzle | null> {
    const target = date ?? new Date();
    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return getDb().puzzle.findFirst({
      where: {
        isDaily: true,
        dailyDate: startOfDay,
      },
    });
  },

  /**
   * Returns today's daily puzzle, electing one deterministically (day number
   * modulo puzzle count) if none has been assigned yet. Safe to call from a
   * scheduler and from request handlers concurrently.
   */
  async ensureDaily(date?: Date): Promise<Puzzle | null> {
    const existing = await this.getDaily(date);
    if (existing) return existing;

    const target = date ?? new Date();
    const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const count = await getDb().puzzle.count();
    if (count === 0) return null;

    const dayNumber = Math.floor(startOfDay.getTime() / 86_400_000);
    const index = dayNumber % count;
    const [candidate] = await getDb().puzzle.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 1,
      skip: index,
    });
    if (!candidate) return null;

    return getDb().puzzle.update({
      where: { id: candidate.id },
      data: { isDaily: true, dailyDate: startOfDay },
    });
  },

  async count(): Promise<number> {
    return getDb().puzzle.count();
  },

  async getByCategory(category: string, limit = 20, offset = 0): Promise<Puzzle[]> {
    return getDb().puzzle.findMany({
      where: { category },
      orderBy: { rating: "asc" },
      take: limit,
      skip: offset,
    });
  },

  async getByDifficulty(difficulty: string, limit = 20): Promise<Puzzle[]> {
    return getDb().puzzle.findMany({
      where: { difficulty },
      orderBy: { rating: "asc" },
      take: limit,
    });
  },

  async countByCategory(category: string): Promise<number> {
    return getDb().puzzle.count({ where: { category } });
  },

  async recordAttempt(input: RecordAttemptInput): Promise<PuzzleAttempt> {
    return getDb().puzzleAttempt.create({ data: input });
  },

  async getUserStats(userId: string): Promise<{ streak: number; solved: number; attempted: number }> {
    const attempts = await getDb().puzzleAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const solved = attempts.filter((a) => a.solved).length;
    const attempted = attempts.length;

    // Calculate current streak: consecutive days with at least one solved puzzle
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const solvedDays = new Set(
      attempts
        .filter((a) => a.solved)
        .map((a) => {
          const d = new Date(a.createdAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    );

    for (let i = 0; i < 365; i++) {
      const checkDay = new Date(today);
      checkDay.setDate(checkDay.getDate() - i);
      if (solvedDays.has(checkDay.getTime())) {
        streak++;
      } else if (i === 0) {
        // Allow today to be skipped (not done yet)
        continue;
      } else {
        break;
      }
    }

    return { streak, solved, attempted };
  },

  async hasUserSolved(userId: string, puzzleId: string): Promise<boolean> {
    const attempt = await getDb().puzzleAttempt.findFirst({
      where: { userId, puzzleId, solved: true },
    });
    return attempt !== null;
  },
};
