import { getDb } from "../client";
import type { UsernameHistory } from "@prisma/client";

export const USERNAME_COOLDOWN_DAYS = 30;
export const USERNAME_RELEASE_DAYS = 30;

export const UsernameHistoryRepository = {
  async recordChange(accountId: string, username: string): Promise<UsernameHistory> {
    return getDb().usernameHistory.create({
      data: {
        accountId,
        username,
      },
    });
  },

  async findByUsername(username: string): Promise<UsernameHistory | null> {
    return getDb().usernameHistory.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        releasedAt: null,
      },
      orderBy: { changedAt: "desc" },
    });
  },

  async findRecentByAccount(accountId: string): Promise<UsernameHistory | null> {
    return getDb().usernameHistory.findFirst({
      where: { accountId },
      orderBy: { changedAt: "desc" },
    });
  },

  async releaseOldUsernames(): Promise<void> {
    const releaseBefore = new Date();
    releaseBefore.setDate(releaseBefore.getDate() - USERNAME_RELEASE_DAYS);

    await getDb().usernameHistory.updateMany({
      where: {
        releasedAt: null,
        changedAt: { lte: releaseBefore },
      },
      data: { releasedAt: new Date() },
    });
  },

  isInCooldown(history: UsernameHistory | null): boolean {
    if (!history) return false;
    const cooldownUntil = new Date(history.changedAt);
    cooldownUntil.setDate(cooldownUntil.getDate() + USERNAME_COOLDOWN_DAYS);
    return cooldownUntil > new Date();
  },
};
