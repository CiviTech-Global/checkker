import { getDb } from "../client";
import type { UserSession } from "@prisma/client";

export type CreateSessionInput = {
  accountId: string;
  tokenHash: string;
  deviceId?: string;
  deviceName?: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
};

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const SessionRepository = {
  async create(input: CreateSessionInput): Promise<UserSession> {
    return getDb().userSession.create({ data: input });
  },

  async findByTokenHash(tokenHash: string): Promise<UserSession | null> {
    return getDb().userSession.findUnique({
      where: { tokenHash },
    });
  },

  async findByIdAndAccount(id: string, accountId: string): Promise<UserSession | null> {
    return getDb().userSession.findFirst({
      where: { id, accountId },
    });
  },

  async findActiveByAccount(accountId: string): Promise<UserSession[]> {
    const now = new Date();
    return getDb().userSession.findMany({
      where: {
        accountId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async revoke(id: string): Promise<UserSession> {
    return getDb().userSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllExcept(accountId: string, exceptSessionId: string): Promise<void> {
    await getDb().userSession.updateMany({
      where: {
        accountId,
        id: { not: exceptSessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForAccount(accountId: string): Promise<void> {
    await getDb().userSession.updateMany({
      where: {
        accountId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  },

  async cleanupExpired(): Promise<void> {
    await getDb().userSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: new Date() } }, { revokedAt: { not: null } }],
      },
    });
  },

  getDefaultExpiry(): Date {
    return new Date(Date.now() + DEFAULT_TTL_MS);
  },
};
