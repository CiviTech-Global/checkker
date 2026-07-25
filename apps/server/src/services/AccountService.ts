import {
  AccountRepository,
  SessionRepository,
  AuditLogRepository,
  UsernameHistoryRepository,
  type AccountWithProfileAndStats,
} from "@checkker/database";
import type { AccountStatus } from "@checkker/shared";
import type { AccountDeletionResponse } from "@checkker/shared";

const DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export const AccountService = {
  async linkWallet(
    account: AccountWithProfileAndStats,
    walletAddress: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AccountWithProfileAndStats> {
    const normalized = walletAddress.toLowerCase();
    const existing = await AccountRepository.findByWallet(normalized);
    if (existing && existing.id !== account.id) {
      throw new Error("Wallet address is already linked to another account");
    }

    const updated = await AccountRepository.linkWallet(account.id, normalized);
    if (!updated) throw new Error("Failed to link wallet");

    await AuditLogRepository.create({
      actorId: account.id,
      targetId: account.id,
      action: "wallet_linked",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { walletAddress: normalized },
    });

    return updated;
  },

  async requestDeletion(
    account: AccountWithProfileAndStats,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AccountDeletionResponse> {
    await SessionRepository.revokeAllForAccount(account.id);
    await AccountRepository.softDelete(account.id);

    await AuditLogRepository.create({
      actorId: account.id,
      targetId: account.id,
      action: "account_deletion_requested",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { scheduledAt: new Date(Date.now() + DELETION_GRACE_PERIOD_MS).toISOString() },
    });

    return {
      scheduledAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + DELETION_GRACE_PERIOD_MS).toISOString(),
      message: "Your account is scheduled for deletion. You have 7 days to cancel.",
    };
  },

  async cancelDeletion(accountId: string): Promise<AccountWithProfileAndStats | null> {
    // Restore account from pending_deletion to active.
    const account = await AccountRepository.findById(accountId);
    if (!account || account.status !== "pending_deletion") return null;

    await AccountRepository.updateStatus(accountId, "active");
    // Re-create profile/stats if missing would be handled elsewhere; here we just restore status.
    return AccountRepository.findById(accountId);
  },

  async setStatus(
    actorId: string,
    targetId: string,
    status: AccountStatus,
    reason?: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await AccountRepository.updateStatus(targetId, status, reason);
    await SessionRepository.revokeAllForAccount(targetId);

    const actionMap: Record<string, Parameters<typeof AuditLogRepository.create>[0]["action"]> = {
      active: "account_unbanned",
      suspended: "account_suspended",
      banned: "account_banned",
      pending_deletion: "account_deletion_requested",
      deleted: "account_deletion_completed",
    };

    await AuditLogRepository.create({
      actorId,
      targetId,
      action: actionMap[status] ?? "account_status_changed",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { status, reason },
    });
  },

  async resetAvatarByModerator(
    actorId: string,
    targetId: string,
    avatarId = "king_white",
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const { ProfileRepository } = await import("@checkker/database");
    await ProfileRepository.updateAvatar(targetId, { avatarId, avatarType: "preset", avatarUrl: undefined });
    await AuditLogRepository.create({
      actorId,
      targetId,
      action: "avatar_reset_by_moderator",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { avatarId },
    });
  },

  async forceUsernameChange(
    actorId: string,
    targetId: string,
    newUsername: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const { ProfileService } = await import("./ProfileService");
    if (!ProfileService.isValidUsername(newUsername)) {
      throw new Error("Invalid username");
    }

    const target = await AccountRepository.findById(targetId);
    if (!target?.profile) throw new Error("Target account not found");

    const oldUsername = target.profile.username;
    await UsernameHistoryRepository.recordChange(targetId, oldUsername);
    const { ProfileRepository } = await import("@checkker/database");
    await ProfileRepository.updateUsername(targetId, newUsername);

    await AuditLogRepository.create({
      actorId,
      targetId,
      action: "username_reset_by_moderator",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { oldUsername, newUsername },
    });
  },
};
