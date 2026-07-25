import { getDb } from "../client";
import type { Account, Profile, UserStats } from "@prisma/client";

export type AccountWithProfileAndStats = Account & { profile: Profile | null; stats: UserStats | null };

const accountInclude = {
  profile: true,
  stats: true,
} as const;

export type CreateAccountInput = {
  walletAddress?: string;
  guestDeviceId?: string;
  isGuest: boolean;
  username: string;
  avatarId?: string;
  roles?: string[];
};

export type AccountStatus = "active" | "suspended" | "banned" | "pending_deletion" | "deleted";

export const AccountRepository = {
  async findById(id: string): Promise<AccountWithProfileAndStats | null> {
    return getDb().account.findUnique({
      where: { id, deletedAt: null },
      include: accountInclude,
    });
  },

  async findByWallet(walletAddress: string): Promise<AccountWithProfileAndStats | null> {
    return getDb().account.findUnique({
      where: { walletAddress: walletAddress.toLowerCase(), deletedAt: null },
      include: accountInclude,
    });
  },

  async findByGuestDeviceId(guestDeviceId: string): Promise<AccountWithProfileAndStats | null> {
    return getDb().account.findUnique({
      where: { guestDeviceId, deletedAt: null },
      include: accountInclude,
    });
  },

  async findByUsername(username: string): Promise<AccountWithProfileAndStats | null> {
    return getDb().account.findFirst({
      where: {
        deletedAt: null,
        profile: { username: { equals: username, mode: "insensitive" } },
      },
      include: accountInclude,
    });
  },

  async create(input: CreateAccountInput): Promise<AccountWithProfileAndStats> {
    return getDb().account.create({
      data: {
        walletAddress: input.walletAddress?.toLowerCase(),
        guestDeviceId: input.guestDeviceId,
        isGuest: input.isGuest,
        roles: input.roles ?? ["player"],
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
  },

  async updateStatus(id: string, status: AccountStatus, reason?: string): Promise<Account> {
    return getDb().account.update({
      where: { id },
      data: { status, statusReason: reason },
    });
  },

  async updateLastLogin(id: string, ip?: string): Promise<Account> {
    return getDb().account.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip ?? null },
    });
  },

  async linkWallet(id: string, walletAddress: string): Promise<AccountWithProfileAndStats> {
    return getDb().account.update({
      where: { id },
      data: {
        walletAddress: walletAddress.toLowerCase(),
        isGuest: false,
      },
      include: accountInclude,
    });
  },

  async softDelete(id: string): Promise<Account> {
    return getDb().account.update({
      where: { id },
      data: {
        status: "pending_deletion",
        deletedAt: new Date(),
        email: null,
        walletAddress: null,
        guestDeviceId: null,
        fcmToken: null,
      },
    });
  },

  async anonymizeForDeletion(id: string): Promise<Account> {
    return getDb().account.update({
      where: { id },
      data: {
        status: "deleted",
        email: null,
        walletAddress: null,
        guestDeviceId: null,
        fcmToken: null,
        botConfig: null,
        botMaturity: null,
      },
    });
  },

  async hardDelete(id: string): Promise<void> {
    // Cascading relations (Profile, UserStats, UserSession, UsernameHistory,
    // friendships, etc.) are configured with onDelete: Cascade in Prisma.
    await getDb().account.delete({ where: { id } });
  },

  async listForAdmin(options: {
    cursor?: string;
    limit?: number;
    search?: string;
    status?: AccountStatus;
  }): Promise<AccountWithProfileAndStats[]> {
    const limit = options.limit ?? 50;
    return getDb().account.findMany({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.search
          ? {
              OR: [
                { profile: { username: { contains: options.search, mode: "insensitive" } } },
                { walletAddress: { contains: options.search, mode: "insensitive" } },
                { email: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: accountInclude,
    });
  },
};
