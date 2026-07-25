-- Split monolithic User table into Account / Profile / UserStats and add auth/lifecycle tables.
-- This migration preserves all existing data and foreign key relationships.

BEGIN;

-- 1. Rename legacy users table to accounts.
ALTER TABLE "users" RENAME TO "accounts";
ALTER TABLE "accounts" RENAME CONSTRAINT "users_pkey" TO "accounts_pkey";

-- 2. Rename legacy unique indexes on accounts.
ALTER INDEX "users_wallet_address_key" RENAME TO "accounts_wallet_address_key";
ALTER INDEX "users_guest_device_id_key" RENAME TO "accounts_guest_device_id_key";
ALTER INDEX "users_username_key" RENAME TO "accounts_username_key";
ALTER INDEX "users_rating_idx" RENAME TO "accounts_rating_idx";

-- 3. Add new account identity/lifecycle columns.
ALTER TABLE "accounts"
  ADD COLUMN "email" VARCHAR(256),
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "roles" VARCHAR(32)[] NOT NULL DEFAULT ARRAY['player']::VARCHAR(32)[],
  ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  ADD COLUMN "status_reason" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "last_login_at" TIMESTAMPTZ,
  ADD COLUMN "last_login_ip" VARCHAR(45);

-- 4. Create Profile table.
CREATE TABLE "profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "display_name" VARCHAR(64),
  "bio" TEXT,
  "avatar_url" VARCHAR(512),
  "avatar_type" VARCHAR(16) NOT NULL DEFAULT 'preset',
  "avatar_id" VARCHAR(32) NOT NULL DEFAULT 'king_white',
  "country" VARCHAR(2),
  "social_links" JSONB DEFAULT '[]'::JSONB,
  "privacy_flags" JSONB DEFAULT '{}'::JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profiles_account_id_key" UNIQUE ("account_id"),
  CONSTRAINT "profiles_username_key" UNIQUE ("username"),
  CONSTRAINT "profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "profiles_username_idx" ON "profiles"("username");

-- 5. Create UserStats table.
CREATE TABLE "user_stats" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 1000,
  "games_played" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "best_streak" INTEGER NOT NULL DEFAULT 0,
  "coins" INTEGER NOT NULL DEFAULT 200,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_stats_account_id_key" UNIQUE ("account_id"),
  CONSTRAINT "user_stats_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_stats_rating_idx" ON "user_stats"("rating" DESC);

-- 6. Backfill Profile and UserStats from legacy columns on accounts.
INSERT INTO "profiles" ("account_id", "username", "avatar_id", "created_at", "updated_at")
SELECT "id", "username", COALESCE("avatar_id", 'king_white'), "created_at", "updated_at"
FROM "accounts";

INSERT INTO "user_stats" ("account_id", "rating", "games_played", "wins", "losses", "draws", "current_streak", "best_streak", "coins", "updated_at")
SELECT "id", "rating", "games_played", "wins", "losses", "draws", "current_streak", "best_streak", "coins", "updated_at"
FROM "accounts";

-- 7. Now that data is migrated, drop legacy columns from accounts.
ALTER TABLE "accounts" DROP COLUMN "username";
ALTER TABLE "accounts" DROP COLUMN "avatar_id";
ALTER TABLE "accounts" DROP COLUMN "rating";
ALTER TABLE "accounts" DROP COLUMN "games_played";
ALTER TABLE "accounts" DROP COLUMN "wins";
ALTER TABLE "accounts" DROP COLUMN "losses";
ALTER TABLE "accounts" DROP COLUMN "draws";
ALTER TABLE "accounts" DROP COLUMN "current_streak";
ALTER TABLE "accounts" DROP COLUMN "best_streak";
ALTER TABLE "accounts" DROP COLUMN "coins";

-- 8. Add status index on accounts.
CREATE INDEX "accounts_status_idx" ON "accounts"("status");

-- 9. Create UserSession table.
CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "device_id" VARCHAR(64),
  "device_name" VARCHAR(128),
  "ip" VARCHAR(45),
  "user_agent" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_sessions_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "user_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_sessions_account_id_idx" ON "user_sessions"("account_id", "revoked_at", "expires_at");

-- 10. Create UsernameHistory table.
CREATE TABLE "username_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "changed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "released_at" TIMESTAMPTZ,

  CONSTRAINT "username_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "username_history_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "username_history_username_idx" ON "username_history"("username", "released_at");
CREATE INDEX "username_history_account_id_idx" ON "username_history"("account_id", "changed_at");

-- 11. Create Role and AccountRole tables.
CREATE TABLE "roles" (
  "id" VARCHAR(32) NOT NULL,
  "description" TEXT,
  "permissions" VARCHAR(64)[],

  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_roles" (
  "account_id" UUID NOT NULL,
  "role_id" VARCHAR(32) NOT NULL,

  CONSTRAINT "account_roles_pkey" PRIMARY KEY ("account_id", "role_id"),
  CONSTRAINT "account_roles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "account_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed default roles.
INSERT INTO "roles" ("id", "description", "permissions") VALUES
  ('player', 'Standard player', ARRAY['profile:read', 'profile:edit', 'game:play']),
  ('moderator', 'Community moderator', ARRAY['profile:read', 'profile:edit', 'game:play', 'moderation:warn', 'moderation:reset_avatar', 'moderation:force_username']),
  ('admin', 'Platform administrator', ARRAY['profile:read', 'profile:edit', 'game:play', 'moderation:*', 'admin:*']),
  ('superadmin', 'Super administrator', ARRAY['*'])
ON CONFLICT ("id") DO NOTHING;

-- 12. Create AuditLog table.
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID,
  "target_id" UUID,
  "action" VARCHAR(64) NOT NULL,
  "ip" VARCHAR(45),
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "audit_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs"("target_id", "action", "created_at");
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id", "created_at");

-- 13. Rename user_cosmetics table to account_cosmetics and update FK.
ALTER TABLE "user_cosmetics" RENAME TO "account_cosmetics";
ALTER TABLE "account_cosmetics" RENAME COLUMN "user_id" TO "account_id";
ALTER TABLE "account_cosmetics" RENAME CONSTRAINT "user_cosmetics_pkey" TO "account_cosmetics_pkey";
ALTER TABLE "account_cosmetics" RENAME CONSTRAINT "user_cosmetics_user_id_fkey" TO "account_cosmetics_account_id_fkey";
ALTER TABLE "account_cosmetics" RENAME CONSTRAINT "user_cosmetics_cosmetic_id_fkey" TO "account_cosmetics_cosmetic_id_fkey";
ALTER INDEX "user_cosmetics_user_id_cosmetic_id_key" RENAME TO "account_cosmetics_account_id_cosmetic_id_key";

-- 14. Update remaining foreign key constraints that referenced users to reference accounts.
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_requester_id_fkey";
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friendships" DROP CONSTRAINT "friendships_addressee_id_fkey";
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey"
  FOREIGN KEY ("addressee_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "games" DROP CONSTRAINT "games_white_user_id_fkey";
ALTER TABLE "games" ADD CONSTRAINT "games_white_user_id_fkey"
  FOREIGN KEY ("white_user_id") REFERENCES "accounts"("id") ON UPDATE CASCADE;

ALTER TABLE "games" DROP CONSTRAINT "games_black_user_id_fkey";
ALTER TABLE "games" ADD CONSTRAINT "games_black_user_id_fkey"
  FOREIGN KEY ("black_user_id") REFERENCES "accounts"("id") ON UPDATE CASCADE;

ALTER TABLE "games" DROP CONSTRAINT "games_winner_user_id_fkey";
ALTER TABLE "games" ADD CONSTRAINT "games_winner_user_id_fkey"
  FOREIGN KEY ("winner_user_id") REFERENCES "accounts"("id") ON UPDATE CASCADE;

ALTER TABLE "bets" DROP CONSTRAINT "bets_user_id_fkey";
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON UPDATE CASCADE;

ALTER TABLE "puzzle_attempts" DROP CONSTRAINT "puzzle_attempts_user_id_fkey";
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
