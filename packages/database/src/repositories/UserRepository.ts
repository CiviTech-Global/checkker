import { getDb } from "../client";
import type { Prisma } from "@prisma/client";

/**
 * Backward-compatible "User" view that merges Account identity, Profile persona,
 * and UserStats. This type is consumed by legacy game engine and handler code
 * during the transition to the split Account/Profile/Stats model.
 */
export type User = {
  id: string;
  walletAddress: string | null;
  guestDeviceId: string | null;
  isGuest: boolean;
  username: string;
  avatarId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  coins: number;
  fcmToken: string | null;
  botConfig: string | null;
  botMaturity: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  walletAddress?: string;
  username: string;
  avatarId?: string;
};

export type CreateGuestInput = {
  guestDeviceId: string;
  username: string;
  avatarId?: string;
};

export type UserStats = {
  outcome: "win" | "loss" | "draw";
  ratingBefore: number;
  ratingAfter: number;
};

type AccountWithProfileAndStats = Prisma.AccountGetPayload<{ include: typeof accountInclude }>;

function toUser(account: AccountWithProfileAndStats | null): User | null {
  if (!account || !account.profile || !account.stats) return null;
  return {
    id: account.id,
    walletAddress: account.walletAddress,
    guestDeviceId: account.guestDeviceId,
    isGuest: account.isGuest,
    username: account.profile.username,
    avatarId: account.profile.avatarId,
    rating: account.stats.rating,
    gamesPlayed: account.stats.gamesPlayed,
    wins: account.stats.wins,
    losses: account.stats.losses,
    draws: account.stats.draws,
    currentStreak: account.stats.currentStreak,
    bestStreak: account.stats.bestStreak,
    coins: account.stats.coins,
    fcmToken: account.fcmToken,
    botConfig: account.botConfig,
    botMaturity: account.botMaturity,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

const accountInclude = {
  profile: true,
  stats: true,
} as const;

export const UserRepository = {
  async findByWallet(walletAddress: string): Promise<User | null> {
    const account = await getDb().account.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: accountInclude,
    });
    return toUser(account);
  },

  async findById(id: string): Promise<User | null> {
    const account = await getDb().account.findUnique({
      where: { id },
      include: accountInclude,
    });
    return toUser(account);
  },

  async findByUsername(username: string): Promise<User | null> {
    const account = await getDb().account.findFirst({
      where: {
        profile: { username: { equals: username, mode: "insensitive" } },
        deletedAt: null,
      },
      include: accountInclude,
    });
    return toUser(account);
  },

  async isUsernameTaken(username: string): Promise<boolean> {
    const account = await getDb().account.findFirst({
      where: {
        profile: { username: { equals: username, mode: "insensitive" } },
        deletedAt: null,
      },
    });
    return account !== null;
  },

  async create(input: CreateUserInput): Promise<User> {
    const account = await getDb().account.create({
      data: {
        walletAddress: input.walletAddress?.toLowerCase(),
        isGuest: false,
        profile: {
          create: {
            username: input.username,
            avatarId: input.avatarId ?? "king_white",
          },
        },
        stats: { create: {} },
      },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async findByGuestDeviceId(guestDeviceId: string): Promise<User | null> {
    const account = await getDb().account.findUnique({
      where: { guestDeviceId },
      include: accountInclude,
    });
    return toUser(account);
  },

  async createGuest(input: CreateGuestInput): Promise<User> {
    const account = await getDb().account.create({
      data: {
        guestDeviceId: input.guestDeviceId,
        isGuest: true,
        profile: {
          create: {
            username: input.username,
            avatarId: input.avatarId ?? "king_white",
          },
        },
        stats: { create: {} },
      },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async linkWalletToGuest(guestDeviceId: string, walletAddress: string): Promise<User | null> {
    const account = await getDb().account.update({
      where: { guestDeviceId },
      data: {
        walletAddress: walletAddress.toLowerCase(),
        isGuest: false,
      },
      include: accountInclude,
    });
    return toUser(account);
  },

  async updateUsername(id: string, username: string): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: {
        profile: { update: { username } },
      },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async updateAvatar(id: string, avatarId: string): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: {
        profile: { update: { avatarId, avatarType: "preset", avatarUrl: null } },
      },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async updateAfterGame(id: string, stats: UserStats): Promise<User> {
    const account = await getDb().account.findUniqueOrThrow({
      where: { id },
      include: accountInclude,
    });

    // Stats are created atomically with every account; non-null is safe.
    let currentStreak = account.stats!.currentStreak;
    let bestStreak = account.stats!.bestStreak;

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

    const updated = await getDb().account.update({
      where: { id },
      data: {
        stats: {
          update: {
            rating: stats.ratingAfter,
            gamesPlayed: { increment: 1 },
            wins: stats.outcome === "win" ? { increment: 1 } : undefined,
            losses: stats.outcome === "loss" ? { increment: 1 } : undefined,
            draws: stats.outcome === "draw" ? { increment: 1 } : undefined,
            currentStreak,
            bestStreak,
          },
        },
      },
      include: accountInclude,
    });
    return toUser(updated)!;
  },

  async getLeaderboard(limit = 100): Promise<Array<User & { rank: number }>> {
    const accounts = await getDb().account.findMany({
      where: {
        deletedAt: null,
        stats: { gamesPlayed: { gt: 0 } },
      },
      orderBy: { stats: { rating: "desc" } },
      take: limit,
      include: accountInclude,
    });
    return accounts.map((a, i) => ({ ...toUser(a)!, rank: i + 1 }));
  },

  async getUserRank(userId: string): Promise<number | null> {
    const account = await getDb().account.findUnique({
      where: { id: userId },
      include: accountInclude,
    });
    if (!account?.stats || account.stats.gamesPlayed === 0) return null;

    const count = await getDb().account.count({
      where: {
        deletedAt: null,
        stats: {
          gamesPlayed: { gt: 0 },
          rating: { gt: account.stats.rating },
        },
      },
    });
    return count + 1;
  },

  async addCoins(id: string, amount: number): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: {
        stats: { update: { coins: { increment: amount } } },
      },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async getCoins(id: string): Promise<number> {
    const stats = await getDb().userStats.findUnique({
      where: { accountId: id },
      select: { coins: true },
    });
    return stats?.coins ?? 0;
  },

  async updateFcmToken(id: string, token: string | null): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: { fcmToken: token },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async updateBotConfig(id: string, configJson: string): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: { botConfig: configJson },
      include: accountInclude,
    });
    return toUser(account)!;
  },

  async updateBotMaturity(id: string, maturityJson: string): Promise<User> {
    const account = await getDb().account.update({
      where: { id },
      data: { botMaturity: maturityJson },
      include: accountInclude,
    });
    return toUser(account)!;
  },
};
