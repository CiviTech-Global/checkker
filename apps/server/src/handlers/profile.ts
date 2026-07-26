import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";
import { playerStore } from "../PlayerStore";
import { ProfileService } from "../services/ProfileService";
import { AccountService } from "../services/AccountService";
import { SessionService } from "../services/SessionService";
import { createChallenge, verifyChallenge } from "../auth/WalletAuth";
import { UserRepository, GameRepository, PuzzleRepository, AccountRepository } from "@checkker/database";
import type { UpdateProfileRequest } from "@checkker/shared";

function getClientMetadata(socket: Socket) {
  return {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers["user-agent"],
  };
}

export function registerProfileHandlers(socket: Socket) {
  socket.on("get_leaderboard", async () => {
    try {
      const leaderboard = await UserRepository.getLeaderboard(100);
      const auth = authenticatedSockets.get(socket.id);
      let myRank: number | null = null;
      if (auth) {
        myRank = await UserRepository.getUserRank(auth.userId);
      }
      socket.emit("leaderboard", { entries: leaderboard, myRank });
    } catch {
      socket.emit("leaderboard", { entries: [], myRank: null });
    }
  });

  socket.on("get_profile", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_data", { profile: playerStore.getOrCreate(socket.id), recentGames: [] });
      return;
    }
    try {
      const user = await UserRepository.findById(auth.userId);
      const recentGames = await GameRepository.getRecentByUser(auth.userId, 10);
      const rank = await UserRepository.getUserRank(auth.userId);
      const puzzleStats = await PuzzleRepository.getUserStats(auth.userId);
      socket.emit("profile_data", {
        profile: playerStore.get(socket.id),
        recentGames: recentGames.map((g: any) => ({
          id: g.id,
          mode: g.mode,
          difficulty: g.difficulty,
          timeControl: g.timeControl,
          opponentName: g.whiteUserId === auth.userId ? g.blackPlayer.username : g.whitePlayer.username,
          opponentAvatar: g.whiteUserId === auth.userId ? g.blackPlayer.avatarId : g.whitePlayer.avatarId,
          opponentRating: g.whiteUserId === auth.userId ? g.blackRatingBefore : g.whiteRatingBefore,
          result: g.winnerUserId === auth.userId ? "win" : g.winnerUserId ? "loss" : "draw",
          myRatingBefore: g.whiteUserId === auth.userId ? g.whiteRatingBefore : g.blackRatingBefore,
          myRatingAfter: g.whiteUserId === auth.userId ? g.whiteRatingAfter : g.blackRatingAfter,
          moveCount: g.moveCount,
          playedAt: g.endedAt,
        })),
        rank,
        user,
        puzzleStats,
      });
    } catch {
      socket.emit("profile_data", { profile: playerStore.getOrCreate(socket.id), recentGames: [] });
    }
  });

  socket.on("update_bot_config", async ({ config, maturity }: { config?: any; maturity?: any }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("bot_error", { error: "Not authenticated" });
      return;
    }
    try {
      const { serializeBotConfig, serializeBotMaturity } = await import("@checkker/shared");
      if (config) {
        await UserRepository.updateBotConfig(auth.userId, serializeBotConfig(config));
      }
      if (maturity) {
        await UserRepository.updateBotMaturity(auth.userId, serializeBotMaturity(maturity));
      }
      socket.emit("bot_config_updated", { success: true });
    } catch {
      socket.emit("bot_error", { error: "Failed to save bot data" });
    }
  });

  socket.on("get_bot_data", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("bot_data", { config: null, maturity: null });
      return;
    }
    try {
      const { deserializeBotConfig, deserializeBotMaturity } = await import("@checkker/shared");
      const user = await UserRepository.findById(auth.userId);
      socket.emit("bot_data", {
        config: deserializeBotConfig(user?.botConfig ?? null),
        maturity: deserializeBotMaturity(user?.botMaturity ?? null),
      });
    } catch {
      socket.emit("bot_data", { config: null, maturity: null });
    }
  });

  // New User & Profile module socket events
  socket.on("update_profile", async (input: UpdateProfileRequest) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    try {
      const account = await AccountRepository.findById(auth.userId);
      if (!account) throw new Error("Account not found");
      const profile = await ProfileService.updateProfile(account, input, getClientMetadata(socket));
      socket.emit("profile_updated", { accountId: account.id, profile });
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to update profile" });
    }
  });

  socket.on("change_username", async ({ username }: { username: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    try {
      const account = await AccountRepository.findById(auth.userId);
      if (!account) throw new Error("Account not found");
      const result = await ProfileService.changeUsername(account, username, getClientMetadata(socket));
      socket.emit("username_changed", { accountId: account.id, oldUsername: result.oldUsername, newUsername: result.newUsername });
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to change username" });
    }
  });

  socket.on("link_wallet", async ({ walletAddress, signature }: { walletAddress: string; signature?: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      socket.emit("profile_error", { error: "Invalid wallet address" });
      return;
    }

    // Step 1: No signature → create a challenge for the client to sign.
    if (!signature) {
      const { nonce, message } = createChallenge(walletAddress);
      socket.emit("link_wallet_challenge", { walletAddress, nonce, message });
      return;
    }

    // Step 2: Signature provided → verify it against the pending challenge.
    const result = verifyChallenge(walletAddress, signature);
    if (!result.valid) {
      socket.emit("profile_error", { error: result.error ?? "Signature verification failed" });
      return;
    }

    try {
      const account = await AccountRepository.findById(auth.userId);
      if (!account) throw new Error("Account not found");
      await AccountService.linkWallet(account, walletAddress, getClientMetadata(socket));
      socket.emit("wallet_linked", { accountId: account.id, walletAddress });
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to link wallet" });
    }
  });

  socket.on("list_sessions", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    try {
      // We don't have the session id in auth; list without current marker or pass undefined.
      const sessions = await SessionService.listSessions(auth.userId);
      socket.emit("sessions_list", { sessions });
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to list sessions" });
    }
  });

  socket.on("revoke_session", async ({ sessionId }: { sessionId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    try {
      const success = await SessionService.revokeSession(auth.userId, sessionId, getClientMetadata(socket));
      socket.emit("session_revoked", { sessionId, success });
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to revoke session" });
    }
  });

  socket.on("delete_account", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("profile_error", { error: "Not authenticated" });
      return;
    }
    try {
      const account = await AccountRepository.findById(auth.userId);
      if (!account) throw new Error("Account not found");
      const result = await AccountService.requestDeletion(account, getClientMetadata(socket));
      socket.emit("account_deletion_scheduled", result);
    } catch (err: any) {
      socket.emit("profile_error", { error: err?.message ?? "Failed to schedule deletion" });
    }
  });
}
