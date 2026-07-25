import crypto from "crypto";
import {
  SessionRepository,
  AccountRepository,
  AuditLogRepository,
  type AccountWithProfileAndStats,
} from "@checkker/database";

const TOKEN_BYTES = 32;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthenticatedAccount = AccountWithProfileAndStats & { sessionId: string };

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export const SessionService = {
  async createSession(
    account: AccountWithProfileAndStats,
    metadata: {
      deviceId?: string;
      deviceName?: string;
      ip?: string;
      userAgent?: string;
    } = {}
  ): Promise<{ token: string; sessionId: string }> {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await SessionRepository.create({
      accountId: account.id,
      tokenHash,
      deviceId: metadata.deviceId,
      deviceName: metadata.deviceName,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      expiresAt,
    });

    await AccountRepository.updateLastLogin(account.id, metadata.ip);
    await AuditLogRepository.create({
      actorId: account.id,
      targetId: account.id,
      action: "login",
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      metadata: { sessionId: session.id, deviceName: metadata.deviceName },
    });

    return { token, sessionId: session.id };
  },

  async validateToken(token: string): Promise<AuthenticatedAccount | null> {
    const tokenHash = hashToken(token);
    const session = await SessionRepository.findByTokenHash(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

    const account = await AccountRepository.findById(session.accountId);
    if (!account || account.deletedAt || account.status !== "active") return null;

    return { ...account, sessionId: session.id };
  },

  async listSessions(accountId: string, currentSessionId?: string) {
    const sessions = await SessionRepository.findActiveByAccount(accountId);
    return sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      ip: s.ip,
      createdAt: s.createdAt.toISOString(),
      lastActiveAt: s.createdAt.toISOString(), // Updated on activity in future iterations
      isCurrent: s.id === currentSessionId,
    }));
  },

  async revokeSession(accountId: string, sessionId: string, metadata?: { ip?: string; userAgent?: string }) {
    const target = await SessionRepository.findByIdAndAccount(sessionId, accountId);
    if (!target) return false;

    await SessionRepository.revoke(target.id);
    await AuditLogRepository.create({
      actorId: accountId,
      targetId: accountId,
      action: "session_revoked",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { revokedSessionId: sessionId },
    });
    return true;
  },

  async revokeAllExcept(accountId: string, exceptSessionId: string, metadata?: { ip?: string; userAgent?: string }) {
    await SessionRepository.revokeAllExcept(accountId, exceptSessionId);
    await AuditLogRepository.create({
      actorId: accountId,
      targetId: accountId,
      action: "session_revoked",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { revokedAllExcept: exceptSessionId },
    });
  },

  async logout(accountId: string, sessionId: string, metadata?: { ip?: string; userAgent?: string }) {
    await SessionRepository.revoke(sessionId);
    await AuditLogRepository.create({
      actorId: accountId,
      targetId: accountId,
      action: "logout",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { sessionId },
    });
  },
};
