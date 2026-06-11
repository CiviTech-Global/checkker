import { getDb } from "../client";
import type { User } from "@prisma/client";

export type CreateUserInput = {
  walletAddress: string;
  username: string;
  avatarId?: string;
};

export type UserStats = {
  outcome: "win" | "loss" | "draw";
  ratingBefore: number;
  ratingAfter: number;
};

export const UserRepository = {
  async findByWallet(walletAddress: string): Promise<User | null> {
    return getDb().user.findUnique({ where: { walletAddress } });
  },

  async findById(id: string): Promise<User | null> {
    return getDb().user.findUnique({ where: { id } });
  },

  async findByUsername(username: string): Promise<User | null> {
    return getDb().user.findUnique({ where: { username } });
  },

  async isUsernameTaken(username: string): Promise<boolean> {
    const user = await getDb().user.findUnique({ where: { username } });
    return user !== null;
  },

  async create(input: CreateUserInput): Promise<User> {
    return getDb().user.create({
      data: {
        walletAddress: input.walletAddress.toLowerCase(),
        username: input.username,
        avatarId: input.avatarId ?? "king_white",
      },
    });
  },

  async updateUsername(id: string, username: string): Promise<User> {
    return getDb().user.update({
      where: { id },
      data: { username },
    });
  },

  async updateAvatar(id: string, avatarId: string): Promise<User> {
    return getDb().user.update({
      where: { id },
      data: { avatarId },
    });
  },

  async updateAfterGame(id: string, stats: UserStats): Promise<User> {
    const user = await getDb().user.findUniqueOrThrow({ where: { id } });

    let currentStreak = user.currentStreak;
    let bestStreak = user.bestStreak;

    switch (stats.outcome) {
      case "win":
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        break;
      case "loss":
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
        break;
      case "draw":
        currentStreak = 0;
        break;
    }

    return getDb().user.update({
      where: { id },
      data: {
        rating: stats.ratingAfter,
        gamesPlayed: { increment: 1 },
        wins: stats.outcome === "win" ? { increment: 1 } : undefined,
        losses: stats.outcome === "loss" ? { increment: 1 } : undefined,
        draws: stats.outcome === "draw" ? { increment: 1 } : undefined,
        currentStreak,
        bestStreak,
      },
    });
  },

  async getLeaderboard(limit = 100): Promise<Array<User & { rank: number }>> {
    const users = await getDb().user.findMany({
      where: { gamesPlayed: { gt: 0 } },
      orderBy: { rating: "desc" },
      take: limit,
    });
    return users.map((u, i) => ({ ...u, rank: i + 1 }));
  },

  async getUserRank(userId: string): Promise<number | null> {
    const user = await getDb().user.findUnique({ where: { id: userId } });
    if (!user || user.gamesPlayed === 0) return null;

    const count = await getDb().user.count({
      where: {
        gamesPlayed: { gt: 0 },
        rating: { gt: user.rating },
      },
    });
    return count + 1;
  },

  async addCoins(id: string, amount: number): Promise<User> {
    return getDb().user.update({
      where: { id },
      data: { coins: { increment: amount } },
    });
  },

  async getCoins(id: string): Promise<number> {
    const user = await getDb().user.findUnique({ where: { id }, select: { coins: true } });
    return user?.coins ?? 0;
  },

  async updateFcmToken(id: string, token: string | null): Promise<User> {
    return getDb().user.update({
      where: { id },
      data: { fcmToken: token },
    });
  },
};
