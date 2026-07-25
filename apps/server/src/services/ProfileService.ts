import {
  AccountRepository,
  ProfileRepository,
  UsernameHistoryRepository,
  AuditLogRepository,
  GameRepository,
  UserRepository,
  type AccountWithProfileAndStats,
} from "@checkker/database";
import type { UpdateProfileRequest, PrivacyFlags, PublicProfile, MyProfile } from "@checkker/shared";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 32;
const BIO_MAX_LENGTH = 280;
const MAX_SOCIAL_LINKS = 5;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "support",
  "system",
  "null",
  "undefined",
  "user",
  "checkker",
]);

function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_MIN_LENGTH &&
    username.length <= USERNAME_MAX_LENGTH &&
    /^[a-zA-Z0-9_]+$/.test(username) &&
    !RESERVED_USERNAMES.has(username.toLowerCase())
  );
}

function isValidDisplayName(name: string): boolean {
  return name.length >= DISPLAY_NAME_MIN_LENGTH && name.length <= DISPLAY_NAME_MAX_LENGTH;
}

function isValidBio(bio: string): boolean {
  return bio.length <= BIO_MAX_LENGTH;
}

function isValidCountry(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function mergePrivacyFlags(existing?: PrivacyFlags, update?: PrivacyFlags): PrivacyFlags {
  return {
    showRecentGames: update?.showRecentGames ?? existing?.showRecentGames ?? true,
    showRank: update?.showRank ?? existing?.showRank ?? true,
    showCountry: update?.showCountry ?? existing?.showCountry ?? true,
    showSocialLinks: update?.showSocialLinks ?? existing?.showSocialLinks ?? true,
    allowFriendRequests: update?.allowFriendRequests ?? existing?.allowFriendRequests ?? true,
  };
}

function toPublicProfile(
  account: AccountWithProfileAndStats,
  options: { rank?: number | null; viewerIsFriend?: boolean } = {}
): PublicProfile {
  const privacy = (account.profile?.privacyFlags as PrivacyFlags | undefined) ?? {};
  const stats = account.stats;
  const showSocial = privacy.showSocialLinks !== false;
  const showCountry = privacy.showCountry !== false;

  return {
    id: account.id,
    profile: {
      username: account.profile?.username ?? "unknown",
      displayName: account.profile?.displayName,
      bio: account.profile?.bio,
      avatarUrl: account.profile?.avatarUrl,
      avatarType: (account.profile?.avatarType as "preset" | "custom" | "nft") ?? "preset",
      avatarId: account.profile?.avatarId ?? "king_white",
      country: showCountry ? account.profile?.country : null,
      socialLinks: showSocial ? (account.profile?.socialLinks as never) : [],
      privacyFlags: privacy,
    },
    stats: {
      rating: stats?.rating ?? 1000,
      gamesPlayed: stats?.gamesPlayed ?? 0,
      wins: stats?.wins ?? 0,
      losses: stats?.losses ?? 0,
      draws: stats?.draws ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
      bestStreak: stats?.bestStreak ?? 0,
    },
    rank: privacy.showRank !== false ? options.rank : null,
    isFriend: options.viewerIsFriend,
  };
}

export const ProfileService = {
  async getMyProfile(account: AccountWithProfileAndStats): Promise<MyProfile> {
    const rank = await UserRepository.getUserRank(account.id);
    const publicProfile = toPublicProfile(account, { rank });
    return {
      ...publicProfile,
      walletAddress: account.walletAddress,
      isGuest: account.isGuest,
      roles: account.roles,
      coins: account.stats?.coins ?? 0,
      createdAt: account.createdAt.toISOString(),
    };
  },

  async getPublicProfile(
    username: string,
    options: { viewerAccountId?: string } = {}
  ): Promise<PublicProfile | null> {
    const account = await AccountRepository.findByUsername(username);
    if (!account || account.deletedAt || account.status !== "active") return null;

    let viewerIsFriend = false;
    if (options.viewerAccountId && options.viewerAccountId !== account.id) {
      const { FriendshipRepository } = await import("@checkker/database");
      viewerIsFriend = await FriendshipRepository.areFriends(options.viewerAccountId, account.id);
    }

    const rank = await UserRepository.getUserRank(account.id);
    return toPublicProfile(account, { rank, viewerIsFriend });
  },

  async getRecentGamesForPublicProfile(username: string): Promise<ReturnType<typeof GameRepository.getRecentByUser>> {
    const account = await AccountRepository.findByUsername(username);
    if (!account) return [];
    const privacy = (account.profile?.privacyFlags as PrivacyFlags | undefined) ?? {};
    if (privacy.showRecentGames === false) return [];
    return GameRepository.getRecentByUser(account.id, 10);
  },

  async updateProfile(
    account: AccountWithProfileAndStats,
    input: UpdateProfileRequest,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<PublicProfile> {
    const update: Parameters<typeof ProfileRepository.update>[1] = {};

    if (input.displayName !== undefined) {
      if (input.displayName !== null && !isValidDisplayName(input.displayName)) {
        throw new Error("Display name must be 2-32 characters");
      }
      update.displayName = input.displayName;
    }

    if (input.bio !== undefined) {
      if (input.bio !== null && !isValidBio(input.bio)) {
        throw new Error("Bio must be 280 characters or less");
      }
      update.bio = input.bio;
    }

    if (input.country !== undefined) {
      if (input.country !== null && !isValidCountry(input.country)) {
        throw new Error("Country must be an ISO-3166-1 alpha-2 code");
      }
      update.country = input.country;
    }

    if (input.socialLinks !== undefined) {
      if (input.socialLinks.length > MAX_SOCIAL_LINKS) {
        throw new Error("Maximum 5 social links allowed");
      }
      for (const link of input.socialLinks) {
        if (!link.platform || !link.url || !isValidUrl(link.url)) {
          throw new Error("Invalid social link");
        }
      }
      update.socialLinks = input.socialLinks;
    }

    if (input.privacyFlags !== undefined) {
      const existing = (account.profile?.privacyFlags as PrivacyFlags | undefined) ?? {};
      update.privacyFlags = mergePrivacyFlags(existing, input.privacyFlags);
    }

    await ProfileRepository.update(account.id, update);

    const updated = await AccountRepository.findById(account.id);
    if (!updated) throw new Error("Account not found after update");

    await AuditLogRepository.create({
      actorId: account.id,
      targetId: account.id,
      action: "profile_updated",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { fields: Object.keys(update) },
    });

    return toPublicProfile(updated);
  },

  async changeUsername(
    account: AccountWithProfileAndStats,
    newUsername: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<{ oldUsername: string; newUsername: string }> {
    const normalized = newUsername.trim();
    if (!isValidUsername(normalized)) {
      throw new Error("Username must be 3-20 alphanumeric characters or underscores");
    }

    const history = await UsernameHistoryRepository.findRecentByAccount(account.id);
    if (UsernameHistoryRepository.isInCooldown(history)) {
      throw new Error("Username can only be changed once every 30 days");
    }

    const existing = await UsernameHistoryRepository.findByUsername(normalized);
    if (existing) {
      throw new Error("Username is unavailable");
    }

    const currentUsername = account.profile?.username;
    if (!currentUsername) throw new Error("Profile not found");
    if (currentUsername.toLowerCase() === normalized.toLowerCase()) {
      throw new Error("New username must be different");
    }

    const taken = await AccountRepository.findByUsername(normalized);
    if (taken) {
      throw new Error("Username is already taken");
    }

    await UsernameHistoryRepository.recordChange(account.id, currentUsername);
    await ProfileRepository.updateUsername(account.id, normalized);

    const updated = await AccountRepository.findById(account.id);
    if (!updated) throw new Error("Account not found after username change");

    await AuditLogRepository.create({
      actorId: account.id,
      targetId: account.id,
      action: "username_changed",
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { oldUsername: currentUsername, newUsername: normalized },
    });

    return { oldUsername: currentUsername, newUsername: normalized };
  },

  isValidUsername,
  isValidDisplayName,
  isValidBio,
  toPublicProfile,
};
