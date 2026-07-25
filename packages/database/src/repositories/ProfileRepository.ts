import { getDb } from "../client";
import type { Profile } from "@prisma/client";

export type SocialLink = {
  platform: string;
  url: string;
};

export type PrivacyFlags = {
  showRecentGames?: boolean;
  showRank?: boolean;
  showCountry?: boolean;
  showSocialLinks?: boolean;
  allowFriendRequests?: boolean;
};

export type UpdateProfileInput = {
  displayName?: string | null;
  bio?: string | null;
  country?: string | null;
  socialLinks?: SocialLink[];
  privacyFlags?: PrivacyFlags;
};

export const ProfileRepository = {
  async findByAccountId(accountId: string): Promise<Profile | null> {
    return getDb().profile.findUnique({ where: { accountId } });
  },

  async findByUsername(username: string): Promise<Profile | null> {
    return getDb().profile.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
  },

  async update(accountId: string, input: UpdateProfileInput): Promise<Profile> {
    const data: Record<string, unknown> = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.country !== undefined) data.country = input.country;
    if (input.socialLinks !== undefined) data.socialLinks = input.socialLinks as never;
    if (input.privacyFlags !== undefined) data.privacyFlags = input.privacyFlags as never;

    return getDb().profile.update({
      where: { accountId },
      data,
    });
  },

  async updateAvatar(
    accountId: string,
    avatar: { avatarId?: string; avatarUrl?: string; avatarType?: string }
  ): Promise<Profile> {
    return getDb().profile.update({
      where: { accountId },
      data: {
        ...(avatar.avatarId !== undefined ? { avatarId: avatar.avatarId } : {}),
        ...(avatar.avatarUrl !== undefined ? { avatarUrl: avatar.avatarUrl } : {}),
        ...(avatar.avatarType !== undefined ? { avatarType: avatar.avatarType } : {}),
      },
    });
  },

  async updateUsername(accountId: string, username: string): Promise<Profile> {
    return getDb().profile.update({
      where: { accountId },
      data: { username },
    });
  },
};
