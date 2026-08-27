import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(32, "Display name must be at most 32 characters")
    .optional(),
  bio: z.string().max(280, "Bio must be at most 280 characters").optional(),
  country: z.string().length(2, "Country must be a 2-letter code").optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().min(1).max(32),
        url: z.string().url().startsWith("https://", "URL must use HTTPS"),
      })
    )
    .max(5, "Maximum 5 social links")
    .optional(),
  privacyFlags: z
    .object({
      showRecentGames: z.boolean().optional(),
      showRank: z.boolean().optional(),
      showCountry: z.boolean().optional(),
      showSocialLinks: z.boolean().optional(),
      allowFriendRequests: z.boolean().optional(),
    })
    .optional(),
});

export const changeUsernameSchema = z.object({
  username: usernameSchema,
});

export const usernameParamSchema = z.object({
  username: usernameSchema,
});

export const adminStatusSchema = z.object({
  status: z.enum(["active", "suspended", "banned", "pending_deletion", "deleted"]),
  reason: z.string().optional(),
});

export const adminForceUsernameSchema = z.object({
  username: usernameSchema,
});

export const accountIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const purchaseCosmeticSchema = z.object({
  cosmeticId: z.string(),
});
