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

export const DEFAULT_PRIVACY_FLAGS: Required<PrivacyFlags> = {
  showRecentGames: true,
  showRank: true,
  showCountry: true,
  showSocialLinks: true,
  allowFriendRequests: true,
};

export type AvatarType = "preset" | "custom" | "nft";

export type ProfileSummary = {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  avatarType: AvatarType;
  avatarId: string;
  country?: string | null;
  socialLinks?: SocialLink[];
  privacyFlags?: PrivacyFlags;
};

export type PublicProfile = {
  id: string;
  profile: ProfileSummary;
  stats: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    currentStreak: number;
    bestStreak: number;
  };
  rank?: number | null;
  isFriend?: boolean;
};

export type MyProfile = PublicProfile & {
  walletAddress?: string | null;
  isGuest: boolean;
  roles: string[];
  coins: number;
  createdAt: string;
};

export type UpdateProfileRequest = {
  displayName?: string;
  bio?: string;
  country?: string;
  socialLinks?: SocialLink[];
  privacyFlags?: PrivacyFlags;
};

export type ChangeUsernameRequest = {
  username: string;
};

export type AvatarUploadResponse = {
  avatarUrl: string;
  avatarType: AvatarType;
  thumbnails: {
    "64": string;
    "256": string;
    "512": string;
  };
};
