import { getDb } from "../client";
import type { AuditLog } from "@prisma/client";

export type AuditAction =
  | "login"
  | "logout"
  | "session_revoked"
  | "wallet_linked"
  | "profile_updated"
  | "avatar_updated"
  | "username_changed"
  | "privacy_updated"
  | "account_deletion_requested"
  | "account_deletion_completed"
  | "account_suspended"
  | "account_banned"
  | "account_unbanned"
  | "role_changed"
  | "avatar_reset_by_moderator"
  | "username_reset_by_moderator";

export type CreateAuditLogInput = {
  actorId?: string;
  targetId?: string;
  action: AuditAction;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export const AuditLogRepository = {
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    return getDb().auditLog.create({
      data: {
        actorId: input.actorId,
        targetId: input.targetId,
        action: input.action,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: input.metadata as never,
      },
    });
  },

  async findByTarget(targetId: string, options: { limit?: number; cursor?: string } = {}): Promise<AuditLog[]> {
    return getDb().auditLog.findMany({
      where: { targetId },
      orderBy: { createdAt: "desc" },
      take: (options.limit ?? 50) + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
    });
  },

  async findByActor(actorId: string, options: { limit?: number; cursor?: string } = {}): Promise<AuditLog[]> {
    return getDb().auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: "desc" },
      take: (options.limit ?? 50) + 1,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
    });
  },
};
