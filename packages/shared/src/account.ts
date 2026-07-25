export type AccountStatus = "active" | "suspended" | "banned" | "pending_deletion" | "deleted";

export type AuthProvider = "wallet" | "guest" | "oauth" | "email_link";

export type SessionInfo = {
  id: string;
  deviceId?: string | null;
  deviceName?: string | null;
  ip?: string | null;
  createdAt: string;
  lastActiveAt?: string | null;
  isCurrent: boolean;
};

export type Role = "player" | "moderator" | "admin" | "superadmin";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  player: ["profile:read", "profile:edit", "game:play"],
  moderator: [
    "profile:read",
    "profile:edit",
    "game:play",
    "moderation:warn",
    "moderation:reset_avatar",
    "moderation:force_username",
  ],
  admin: [
    "profile:read",
    "profile:edit",
    "game:play",
    "moderation:*",
    "admin:*",
  ],
  superadmin: ["*"],
};

export function hasPermission(roles: string[], permission: string): boolean {
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role as Role];
    if (!perms) continue;
    if (perms.includes("*") || perms.includes(permission) || perms.includes(permission.replace(/:.*/, ":*"))) {
      return true;
    }
  }
  return false;
}

export type AccountDeletionResponse = {
  scheduledAt: string;
  completedAt: string;
  message: string;
};
