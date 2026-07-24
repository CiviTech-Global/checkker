import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";
import { playerStore } from "../PlayerStore";

export function registerProfileHandlers(socket: Socket) {

  socket.on("get_leaderboard", async () => {
    try {
      const { UserRepository } = await import("@checkker/database");
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
      const { GameRepository, UserRepository, PuzzleRepository } = await import("@checkker/database");
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
      const { UserRepository } = await import("@checkker/database");
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
      const { UserRepository } = await import("@checkker/database");
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
}
