import type { Socket } from "socket.io";
import type { Player } from "./types";
import type { GameServer } from "../GameServer";
import type { BotDifficulty, TimeControl, StakeLevel } from "@checkker/shared";
import { z } from "zod";
import { playerStore } from "../PlayerStore";
import { isBettingEnabled } from "../blockchain/config";
import { authenticatedSockets } from "./auth";

/* ── Payload schemas ───────────────────────────────────────────────────── */
/* The literal tuples mirror the enums exported by @checkker/shared; the
 * `satisfies` clause fails compilation if a schema value is not a member of
 * the corresponding shared type (the shared enums are authoritative).     */

const TIME_CONTROLS = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
] as const satisfies readonly TimeControl[];
const BOT_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "master",
] as const satisfies readonly BotDifficulty[];
const STAKE_LEVELS = ["free", "bet"] as const satisfies readonly StakeLevel[];

const timeControlSchema = z.enum(TIME_CONTROLS);
const botDifficultySchema = z.enum(BOT_DIFFICULTIES);
const stakeLevelSchema = z.enum(STAKE_LEVELS);

export const joinQueueSchema = z.object({
  rating: z.number().int().min(0).max(5000),
  tc: timeControlSchema,
});

export const joinCasualSchema = z.object({
  tc: timeControlSchema,
});

export const joinRankedSchema = z.object({
  difficulty: botDifficultySchema,
  tc: timeControlSchema,
  isBot: z.boolean().optional(),
  stake: stakeLevelSchema.optional(),
});

export const joinCasualDifficultySchema = joinRankedSchema;

/** Reduce a failed safeParse to a serializable, human-readable shape. */
function validationError(event: string, err: z.ZodError): {
  error: string;
  message: string;
  details: ReturnType<z.ZodError["flatten"]>;
} {
  return {
    error: "invalid_payload",
    message: `Invalid ${event} payload`,
    details: err.flatten(),
  };
}

export function registerMatchmakingHandlers(
  socket: Socket,
  server: GameServer,
) {
  /* ── Legacy queue events (backward compat) ──────────────────────── */

  socket.on("join_queue", (payload: unknown) => {
    const parsed = joinQueueSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("queue_error", validationError("join_queue", parsed.error));
      return;
    }

    const { rating, tc } = parsed.data;
    const player: Player = { id: socket.id, socket, rating, casual: false };
    server.addToQueue(player, tc);
  });

  socket.on("join_casual", (payload: unknown) => {
    const parsed = joinCasualSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("queue_error", validationError("join_casual", parsed.error));
      return;
    }

    const player: Player = { id: socket.id, socket, rating: 0, casual: true };
    server.addToQueue(player, parsed.data.tc);
  });

  /* ── New difficulty-based matchmaking ─────────────────────────────── */

  socket.on("join_ranked", (payload: unknown) => {
    const parsed = joinRankedSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("queue_error", validationError("join_ranked", parsed.error));
      return;
    }
    const { difficulty, tc, isBot, stake } = parsed.data;

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

  socket.on("join_casual_difficulty", (payload: unknown) => {
    const parsed = joinCasualDifficultySchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("queue_error", validationError("join_casual_difficulty", parsed.error));
      return;
    }
    const { difficulty, tc, isBot, stake } = parsed.data;

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
