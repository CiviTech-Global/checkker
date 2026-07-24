import type { Socket } from "socket.io";
import type { Player } from "./types";
import type { GameServer } from "../GameServer";
import type { BotDifficulty, TimeControl, StakeLevel } from "@checkker/shared";
import { playerStore } from "../PlayerStore";
import { isBettingEnabled } from "../blockchain/config";
import { brain } from "../bot/evaluators";
import { authenticatedSockets } from "./auth";

export function registerMatchmakingHandlers(
  socket: Socket,
  server: GameServer,
) {
  /* ── Legacy queue events (backward compat) ──────────────────────── */

  socket.on("join_queue", ({ rating, tc }: { rating: number; tc: TimeControl }) => {
    const player: Player = { id: socket.id, socket, rating, casual: false };
    server.addToQueue(player, tc);
  });

  socket.on("join_casual", ({ tc }: { tc: TimeControl }) => {
    const player: Player = { id: socket.id, socket, rating: 0, casual: true };
    server.addToQueue(player, tc);
  });

  /* ── New difficulty-based matchmaking ─────────────────────────────── */

  socket.on("join_ranked", ({ difficulty, tc, isBot, stake }: { difficulty: BotDifficulty; tc: TimeControl; isBot?: boolean; stake?: StakeLevel }) => {
    const auth = authenticatedSockets.get(socket.id);
    const selectedStake: StakeLevel = stake ?? "bet";

    if (!auth || auth.isGuest) {
      socket.emit("queue_error", { error: "Ranked games require a connected wallet" });
      return;
    }

    if (selectedStake === "bet" && !isBettingEnabled()) {
      socket.emit("queue_error", { error: "betting_coming_soon", message: "Real betting is coming soon. Choose 'free' to play now." });
      return;
    }

    const profile = playerStore.get(socket.id);
    const player: Player = {
      id: socket.id,
      socket,
      rating: profile?.rating ?? 1000,
      casual: false,
      walletAddress: auth.walletAddress,
      userId: auth.userId,
      isBot: isBot ?? false,
    };
    server.addToDifficultyQueue(player, tc, "ranked", difficulty, selectedStake);
  });

  socket.on("join_casual_difficulty", ({ difficulty, tc, isBot, stake }: { difficulty: BotDifficulty; tc: TimeControl; isBot?: boolean; stake?: StakeLevel }) => {
    const auth = authenticatedSockets.get(socket.id);
    const selectedStake: StakeLevel = stake ?? "free";
    const needsWallet = selectedStake === "bet";

    if (needsWallet && (!auth || auth.isGuest)) {
      socket.emit("queue_error", { error: "This casual tier requires a connected wallet when playing for a bet" });
      return;
    }

    if (selectedStake === "bet" && !isBettingEnabled()) {
      socket.emit("queue_error", { error: "betting_coming_soon", message: "Real betting is coming soon. Choose 'free' to play now." });
      return;
    }

    const player: Player = {
      id: socket.id,
      socket,
      rating: 0,
      casual: true,
      walletAddress: auth?.walletAddress,
      userId: auth?.userId,
      isBot: isBot ?? false,
    };
    server.addToDifficultyQueue(player, tc, "casual", difficulty, selectedStake);
  });
}
