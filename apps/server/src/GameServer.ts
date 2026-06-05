import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { GameEngine } from "./GameEngine";
import type { BotDifficulty, TimeControl, Color, ChatMessage, GameMode } from "@checkker/shared";
import { isFreeGame, BET_AMOUNTS_USD } from "@checkker/shared";
import { expectedScore, newRating } from "@checkker/shared";
import { BotManager } from "./bot/BotManager";
import { SpectateManager } from "./bot/SpectateManager";
import { playerStore } from "./PlayerStore";
import { calculateOdds } from "./odds";
import { brain } from "./bot/evaluators";
import { createChallenge, verifyChallenge, cleanupExpiredChallenges } from "./auth/WalletAuth";
import { BetManager } from "./betting/BetManager";
import type { BetSetup } from "./betting/BetManager";
import { CONTRACT_ADDRESS, BLOCKCHAIN_ENABLED } from "./blockchain/config";

interface Player {
  id: string; // socket ID (or user UUID when authenticated)
  socket: Socket;
  rating: number;
  casual: boolean;
  walletAddress?: string;
  userId?: string; // DB user ID
}

interface Match {
  game: GameEngine;
  white: Player;
  black: Player;
  tc: TimeControl;
  mode: GameMode;
  difficulty: BotDifficulty;
  rematchRequests: Set<string>;
  chatHistory: ChatMessage[];
  betSetup: BetSetup | null;
}

/** Tracks games that are waiting for player deposits before starting */
interface PendingBetGame {
  white: Player;
  black: Player;
  tc: TimeControl;
  mode: GameMode;
  difficulty: BotDifficulty;
  betSetup: BetSetup;
  whiteDeposited: boolean;
  blackDeposited: boolean;
}

/** Authenticated socket sessions */
const authenticatedSockets = new Map<string, { walletAddress: string; userId: string }>();

export class GameServer {
  private io: SocketServer;
  private queue: Array<{ player: Player; tc: TimeControl }> = [];
  private rankedQueues: Record<string, Array<{ player: Player; tc: TimeControl }>> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    master: [],
  };
  private casualQueues: Record<string, Array<{ player: Player; tc: TimeControl }>> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    master: [],
  };
  private matches = new Map<string, Match>();
  private pendingBets = new Map<string, PendingBetGame>();
  private queueTimeouts = new Map<string, NodeJS.Timeout>();
  private botManager: BotManager;
  private spectateManager: SpectateManager;
  private challengeCleanupInterval: NodeJS.Timeout;

  constructor(io: SocketServer) {
    this.io = io;
    this.botManager = new BotManager();
    this.spectateManager = new SpectateManager();
    // Clean up expired auth challenges every 60 seconds
    this.challengeCleanupInterval = setInterval(cleanupExpiredChallenges, 60_000);
  }

  handleConnection(socket: Socket): void {
    brain.getPlayerModel(socket.id);

    /* ── Authentication Events ──────────────────────────────────────── */

    socket.on("auth_request", ({ walletAddress }: { walletAddress: string }) => {
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        socket.emit("auth_error", { error: "Invalid wallet address" });
        return;
      }
      const { nonce, message } = createChallenge(walletAddress);
      socket.emit("auth_challenge", { nonce, message });
    });

    socket.on("auth_verify", async ({ walletAddress, signature }: { walletAddress: string; signature: string }) => {
      const result = verifyChallenge(walletAddress, signature);
      if (!result.valid) {
        socket.emit("auth_error", { error: result.error ?? "Verification failed" });
        return;
      }

      // Load existing user or signal that registration is needed
      const profile = await playerStore.loadFromWallet(socket.id, walletAddress);
      if (profile) {
        authenticatedSockets.set(socket.id, {
          walletAddress: walletAddress.toLowerCase(),
          userId: profile.id,
        });
        socket.emit("auth_success", { profile, isNewUser: false });
      } else {
        // Wallet verified but no account yet — client should call set_username
        socket.emit("auth_success", { profile: null, isNewUser: true, walletAddress });
      }
    });

    socket.on("set_username", async ({ walletAddress, username, avatarId }: { walletAddress: string; username: string; avatarId?: string }) => {
      if (!username || username.length < 3 || username.length > 32) {
        socket.emit("auth_error", { error: "Username must be 3-32 characters" });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        socket.emit("auth_error", { error: "Username can only contain letters, numbers, and underscores" });
        return;
      }

      const taken = await playerStore.isUsernameTaken(username);
      if (taken) {
        socket.emit("auth_error", { error: "Username already taken" });
        return;
      }

      const profile = await playerStore.registerUser(socket.id, walletAddress, username, avatarId);
      if (profile) {
        authenticatedSockets.set(socket.id, {
          walletAddress: walletAddress.toLowerCase(),
          userId: profile.id,
        });
        socket.emit("auth_success", { profile, isNewUser: false });
      } else {
        socket.emit("auth_error", { error: "Failed to create account" });
      }
    });

    socket.on("check_username", async ({ username }: { username: string }) => {
      const taken = await playerStore.isUsernameTaken(username);
      socket.emit("username_check", { username, available: !taken });
    });

    socket.on("update_avatar", async ({ avatarId }: { avatarId: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("auth_error", { error: "Not authenticated" });
        return;
      }
      try {
        const { UserRepository } = await import("@checkker/database");
        await UserRepository.updateAvatar(auth.userId, avatarId);
        const profile = playerStore.get(socket.id);
        if (profile) profile.avatarId = avatarId;
        socket.emit("avatar_updated", { avatarId });
      } catch {
        socket.emit("auth_error", { error: "Failed to update avatar" });
      }
    });

    /* ── Legacy queue events (backward compat) ──────────────────────── */

    socket.on("join_queue", ({ rating, tc }: { rating: number; tc: TimeControl }) => {
      const player: Player = { id: socket.id, socket, rating, casual: false };
      this.addToQueue(player, tc);
    });

    socket.on("join_casual", ({ tc }: { tc: TimeControl }) => {
      const player: Player = { id: socket.id, socket, rating: 0, casual: true };
      this.addToQueue(player, tc);
    });

    /* ── New difficulty-based matchmaking ─────────────────────────────── */

    socket.on("join_ranked", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
      const profile = playerStore.get(socket.id);
      const auth = authenticatedSockets.get(socket.id);
      const player: Player = {
        id: socket.id,
        socket,
        rating: profile?.rating ?? 1000,
        casual: false,
        walletAddress: auth?.walletAddress,
        userId: auth?.userId,
      };
      this.addToDifficultyQueue(player, tc, "ranked", difficulty);
    });

    socket.on("join_casual_difficulty", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
      const auth = authenticatedSockets.get(socket.id);
      const player: Player = {
        id: socket.id,
        socket,
        rating: 0,
        casual: true,
        walletAddress: auth?.walletAddress,
        userId: auth?.userId,
      };
      this.addToDifficultyQueue(player, tc, "casual", difficulty);
    });

    /* ── Leaderboard ─────────────────────────────────────────────────── */

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
        const { GameRepository, UserRepository } = await import("@checkker/database");
        const user = await UserRepository.findById(auth.userId);
        const recentGames = await GameRepository.getRecentByUser(auth.userId, 10);
        const rank = await UserRepository.getUserRank(auth.userId);
        socket.emit("profile_data", { profile: playerStore.get(socket.id), recentGames, rank, user });
      } catch {
        socket.emit("profile_data", { profile: playerStore.get(socket.id), recentGames: [] });
      }
    });

    /* ── Bot / Spectate ──────────────────────────────────────────────── */

    socket.on("start_bot_game", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
      this.botManager.createBotGame(socket, socket.id, difficulty, tc);
    });

    socket.on("request_bot", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
      this.botManager.createBotGame(socket, socket.id, difficulty, tc);
    });

    socket.on("start_spectate_bot_game", ({ whiteDifficulty, blackDifficulty }: { whiteDifficulty: BotDifficulty; blackDifficulty: BotDifficulty }) => {
      this.spectateManager.createSpectateGame(socket, whiteDifficulty, blackDifficulty, "blitz");
    });

    socket.on("spectate_pause", ({ gameId }: { gameId: string }) => {
      this.spectateManager.pause(gameId);
    });

    socket.on("spectate_resume", ({ gameId }: { gameId: string }) => {
      this.spectateManager.resume(gameId);
    });

    socket.on("spectate_step_forward", ({ gameId }: { gameId: string }) => {
      this.spectateManager.stepForward(gameId);
    });

    socket.on("spectate_step_backward", ({ gameId, currentIndex }: { gameId: string; currentIndex: number }) => {
      this.spectateManager.stepBackward(gameId, currentIndex);
    });

    socket.on("spectate_leave", ({ gameId }: { gameId: string }) => {
      this.spectateManager.dispose(gameId);
    });

    socket.on("request_adaptive_bot", ({ tc }: { tc: TimeControl }) => {
      const difficulty = brain.getAdaptiveDifficulty(socket.id);
      this.botManager.createBotGame(socket, socket.id, difficulty, tc);
    });

    socket.on("get_adaptive_difficulty", () => {
      const difficulty = brain.getAdaptiveDifficulty(socket.id);
      socket.emit("adaptive_difficulty", { difficulty });
    });

    socket.on("get_cluster_stats", () => {
      const stats = brain.getClusterStats();
      socket.emit("cluster_stats", { clusters: stats });
    });

    socket.on("request_coaching_tip", async ({ gameId }: { gameId: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;

      const color: Color = socket.id === match.white.id ? "white" : "black";
      const state = match.game.getPublicState(color) as any;

      const tip = await brain.getCoachingTip(state.fen, state.hand, state.scorePile, color, state.moveHistory?.length ?? 0);
      if (tip) {
        socket.emit("coaching_tip", tip);
      }
    });

    socket.on("explain_move", async ({ fen, move, cardId, color }: { fen: string; move: string; cardId: string; color: Color }) => {
      const explanation = await brain.explainMoveLLM(fen, move, cardId, color);
      socket.emit("move_explanation", explanation);
    });

    socket.on("generate_puzzle", async ({ difficulty }: { difficulty?: BotDifficulty }) => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const puzzle = await brain.generatePuzzle(fen, "white", difficulty ?? "intermediate");
      if (puzzle) {
        socket.emit("puzzle", { puzzle });
      }
    });

    socket.on("get_player_dashboard", () => {
      const model = brain.getPlayerModel(socket.id);
      const profile = playerStore.getOrCreate(socket.id);
      socket.emit("player_dashboard", {
        profile,
        model,
        skillGraph: {
          opening: 45,
          middlegame: 50,
          endgame: 35,
          cards: 60,
          poker: 40,
        },
      });
    });

    socket.on("find_match", () => {
      const suggestion = brain.findMatch(socket.id);
      if (suggestion) {
        socket.emit("match_suggestion", suggestion);
      }
    });

    /* ── In-Game Events ──────────────────────────────────────────────── */

    socket.on("play_move", ({ gameId, card, move }: { gameId: string; card: string; move: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      const { game, white, black } = match;

      if (socket.id !== white.id && socket.id !== black.id) return;
      const color: Color = socket.id === white.id ? "white" : "black";
      if (game.getState().turn !== color) return;

      const result = game.playCard(card, move);
      if (result.success) {
        this.broadcastGame(gameId);
        if (game.isOver()) {
          this.handleGameOver(gameId);
          game.dispose();
        } else {
          this.sendCoachingTip(match, socket.id).catch(() => {});
          this.sendSpectatorComment(match).catch(() => {});
        }
      } else {
        socket.emit("move_error", { error: result.error });
      }
    });

    socket.on("chat_message", ({ gameId, text }: { gameId: string; text: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      if (socket.id !== match.white.id && socket.id !== match.black.id) return;

      const profile = playerStore.getOrCreate(socket.id);
      const msg: ChatMessage = {
        id: uuid(),
        senderId: socket.id,
        senderName: profile.displayName,
        text: text.slice(0, 200),
        timestamp: Date.now(),
      };
      match.chatHistory.push(msg);
      match.white.socket.emit("chat_message", msg);
      match.black.socket.emit("chat_message", msg);
    });

    socket.on("resign", ({ gameId }: { gameId: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      const { game, white, black } = match;
      const color: Color = socket.id === white.id ? "white" : "black";
      game.resign(color);
      this.broadcastGame(gameId);
      this.handleGameOver(gameId);
      game.dispose();
    });

    socket.on("rematch_request", ({ gameId }: { gameId: string }) => {
      const match = this.findEndedMatch(gameId, socket.id);
      if (!match) return;
      match.rematchRequests.add(socket.id);
      const otherPlayer = socket.id === match.white.id ? match.black : match.white;
      otherPlayer.socket.emit("rematch_requested", { gameId });
      if (match.rematchRequests.has(match.white.id) && match.rematchRequests.has(match.black.id)) {
        this.endGame(gameId);
        this.startGame(match.black, match.white, match.tc, match.mode, match.difficulty);
      }
    });

    socket.on("undo_move", ({ gameId }: { gameId: string }) => {
      // Only allowed for bot games — handled by BotManager
    });

    socket.on("disconnect", () => {
      brain.persistPlayer(socket.id);
      this.removeFromQueue(socket.id);
      this.removeFromDifficultyQueues(socket.id);

      // Cancel any pending bet deposits for this player
      for (const [betGameId, pending] of this.pendingBets) {
        if (pending.white.id === socket.id || pending.black.id === socket.id) {
          BetManager.cancelBet(betGameId).catch(() => {});
          const otherPlayer = pending.white.id === socket.id ? pending.black : pending.white;
          otherPlayer.socket.emit("bet_cancelled", { gameId: betGameId, reason: "Opponent disconnected" });
          this.pendingBets.delete(betGameId);
        }
      }

      for (const [gameId, match] of this.matches) {
        if (match.white.id === socket.id || match.black.id === socket.id) {
          const color: Color = match.white.id === socket.id ? "white" : "black";
          match.game.timeOut(color);
          this.broadcastGame(gameId);
          this.handleGameOver(gameId);
          this.endGame(gameId);
        }
      }
      this.botManager.disposeByHumanId(socket.id);
      this.spectateManager.disposeBySocket(socket.id);

      authenticatedSockets.delete(socket.id);
      playerStore.remove(socket.id);
    });
  }

  /* ── Legacy queue matching (backward compat) ─────────────────────── */

  private addToQueue(player: Player, tc: TimeControl): void {
    const opponent = this.queue.find((q) => {
      if (q.tc !== tc) return false;
      if (q.player.casual || player.casual) return true;
      const useSmartMatch = process.env.SMART_MATCHMAKING !== "false";
      if (useSmartMatch) {
        const a = brain.getPlayerModel(player.id);
        const b = brain.getPlayerModel(q.player.id);
        const styleOk = a.playStyle === "unknown" || b.playStyle === "unknown" ||
          a.playStyle === b.playStyle || Math.random() < 0.3;
        return Math.abs(a.estimatedSkill - b.estimatedSkill) <= 300 && styleOk;
      }
      return Math.abs(q.player.rating - player.rating) <= 150;
    });
    if (opponent) {
      this.queue = this.queue.filter((q) => q !== opponent);
      const oppTimeout = this.queueTimeouts.get(opponent.player.id);
      if (oppTimeout) {
        clearTimeout(oppTimeout);
        this.queueTimeouts.delete(opponent.player.id);
      }
      this.startGame(opponent.player, player, tc, "casual", "beginner");
    } else {
      this.queue.push({ player, tc });
      const timeoutMs = player.casual ? 15000 : 30000;
      const timeout = setTimeout(() => {
        const stillInQueue = this.queue.find((q) => q.player.id === player.id);
        if (stillInQueue) {
          this.removeFromQueue(player.id);
          const difficulty = brain.getAdaptiveDifficulty(player.id);
          player.socket.emit("bot_fallback_offer", { tc, difficulty });
        }
      }, timeoutMs);
      this.queueTimeouts.set(player.id, timeout);
    }
  }

  /* ── Difficulty-based matchmaking ──────────────────────────────────── */

  private addToDifficultyQueue(player: Player, tc: TimeControl, mode: GameMode, difficulty: BotDifficulty): void {
    const queues = mode === "ranked" ? this.rankedQueues : this.casualQueues;
    const queue = queues[difficulty];

    // Find opponent in same difficulty queue with matching time control
    const opponentIdx = queue.findIndex((q) => q.tc === tc && q.player.id !== player.id);

    if (opponentIdx >= 0) {
      const opponent = queue.splice(opponentIdx, 1)[0];
      const oppTimeout = this.queueTimeouts.get(opponent.player.id);
      if (oppTimeout) {
        clearTimeout(oppTimeout);
        this.queueTimeouts.delete(opponent.player.id);
      }
      this.startGame(opponent.player, player, tc, mode, difficulty);
    } else {
      queue.push({ player, tc });
      player.socket.emit("queue_joined", { mode, difficulty, tc, betAmountUsd: isFreeGame(mode, difficulty) ? 0 : BET_AMOUNTS_USD[difficulty] });

      // Bot fallback after 30s
      const timeout = setTimeout(() => {
        const idx = queue.findIndex((q) => q.player.id === player.id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          player.socket.emit("bot_fallback_offer", { tc, difficulty });
        }
      }, 30000);
      this.queueTimeouts.set(player.id, timeout);
    }
  }

  private removeFromDifficultyQueues(socketId: string): void {
    for (const queue of Object.values(this.rankedQueues)) {
      const idx = queue.findIndex((q) => q.player.id === socketId);
      if (idx >= 0) queue.splice(idx, 1);
    }
    for (const queue of Object.values(this.casualQueues)) {
      const idx = queue.findIndex((q) => q.player.id === socketId);
      if (idx >= 0) queue.splice(idx, 1);
    }
  }

  /* ── Game Lifecycle ────────────────────────────────────────────────── */

  private async startGame(p1: Player, p2: Player, tc: TimeControl, mode: GameMode = "casual", difficulty: BotDifficulty = "beginner"): Promise<void> {
    const free = isFreeGame(mode, difficulty);

    // For non-free games with blockchain enabled, initiate bet escrow first
    if (!free && BLOCKCHAIN_ENABLED && p1.walletAddress && p2.walletAddress) {
      const gameId = uuid();
      const betSetup = await BetManager.initiateBet(
        gameId, mode, difficulty, p1.walletAddress, p2.walletAddress
      );

      if (betSetup && !betSetup.isFree) {
        // Store pending bet and notify both players to deposit
        const pending: PendingBetGame = {
          white: p1,
          black: p2,
          tc,
          mode,
          difficulty,
          betSetup,
          whiteDeposited: false,
          blackDeposited: false,
        };
        this.pendingBets.set(gameId, pending);

        const depositPayload = {
          gameId,
          betAmountWei: betSetup.betAmountWei,
          betAmountUsd: betSetup.betAmountUsd,
          contractAddress: CONTRACT_ADDRESS,
        };
        p1.socket.emit("awaiting_deposits", depositPayload);
        p2.socket.emit("awaiting_deposits", depositPayload);

        // Wait for both deposits with timeout
        const depositsOk = await BetManager.waitForDeposits(
          gameId, p1.walletAddress, p2.walletAddress
        );

        this.pendingBets.delete(gameId);

        if (!depositsOk) {
          // Timeout or failure — cancel the bet and refund
          await BetManager.cancelBet(gameId);
          p1.socket.emit("bet_cancelled", { gameId, reason: "Deposit timeout" });
          p2.socket.emit("bet_cancelled", { gameId, reason: "Deposit timeout" });
          return;
        }

        // Both deposited — proceed to start the actual game with the same gameId
        this.launchGame(p1, p2, tc, mode, difficulty, betSetup, gameId);
        return;
      }
    }

    // Free game or blockchain not enabled — start immediately
    this.launchGame(p1, p2, tc, mode, difficulty, null);
  }

  /** Actually start the game engine and emit game_start events */
  private async launchGame(
    p1: Player, p2: Player, tc: TimeControl,
    mode: GameMode, difficulty: BotDifficulty,
    betSetup: BetSetup | null, existingGameId?: string
  ): Promise<void> {
    const game = new GameEngine(p1.rating, p2.rating, tc);
    // If we already have a gameId from escrow, we track it via betSetup.gameId

    const match: Match = {
      game,
      white: p1,
      black: p2,
      tc,
      mode,
      difficulty,
      rematchRequests: new Set(),
      chatHistory: [],
      betSetup,
    };

    this.matches.set(game.id, match);

    game.startTimeoutCheck(() => {
      this.broadcastGame(game.id);
    });

    const whiteProfile = playerStore.getOrCreate(p1.id);
    const blackProfile = playerStore.getOrCreate(p2.id);
    const odds = await calculateOdds(game.getState().fen);
    const bestMoves = await game.getBestMoves();

    const whiteExtra: Record<string, any> = {};
    const blackExtra: Record<string, any> = {};

    if (process.env.SMART_MATCHMAKING !== "false") {
      const wm = brain.getPlayerModel(p1.id);
      const bm = brain.getPlayerModel(p2.id);
      whiteExtra.opponentStyle = bm.playStyle;
      blackExtra.opponentStyle = wm.playStyle;
    }

    const gameMeta = {
      mode,
      difficulty,
      betAmountUsd: betSetup?.betAmountUsd ?? 0,
      betAmountWei: betSetup?.betAmountWei ?? "0",
      escrowGameId: betSetup?.gameId ?? null,
    };

    p1.socket.emit("game_start", {
      ...game.getPublicState("white"),
      color: "white",
      gameId: game.id,
      playerProfile: whiteProfile,
      opponentProfile: blackProfile,
      odds,
      bestMoves: { white: bestMoves.white, black: [] },
      ...whiteExtra,
      ...gameMeta,
    });

    p2.socket.emit("game_start", {
      ...game.getPublicState("black"),
      color: "black",
      gameId: game.id,
      playerProfile: blackProfile,
      opponentProfile: whiteProfile,
      odds,
      bestMoves: { white: [], black: bestMoves.black },
      ...blackExtra,
      ...gameMeta,
    });
  }

  private async broadcastGame(gameId: string): Promise<void> {
    const match = this.matches.get(gameId);
    if (!match) return;
    const { game, white, black } = match;
    const bestMoves = game.isOver() ? { white: [], black: [] } : await game.getBestMoves();
    const odds = await calculateOdds(game.getState().fen);
    const whiteProfile = playerStore.getOrCreate(white.id);
    const blackProfile = playerStore.getOrCreate(black.id);

    white.socket.emit("game_update", {
      ...game.getPublicState("white"),
      bestMoves: { white: bestMoves.white, black: [] },
      odds,
      playerProfile: whiteProfile,
      opponentProfile: blackProfile,
    });
    black.socket.emit("game_update", {
      ...game.getPublicState("black"),
      bestMoves: { white: [], black: bestMoves.black },
      odds,
      playerProfile: blackProfile,
      opponentProfile: whiteProfile,
    });

    if (game.getResult()) {
      const payload = { result: game.getResult(), scores: game.getScores() };
      white.socket.emit("game_over", payload);
      black.socket.emit("game_over", payload);
    }
  }

  /** Handle post-game: settle bet, update ratings, persist to DB */
  private async handleGameOver(gameId: string): Promise<void> {
    const match = this.matches.get(gameId);
    if (!match) return;
    const { game, white, black, mode, betSetup } = match;
    const result = game.getResult();
    if (!result) return;

    // Determine outcome for each player
    let whiteOutcome: "win" | "loss" | "draw" = "draw";
    let blackOutcome: "win" | "loss" | "draw" = "draw";

    if ("winner" in result && result.winner) {
      whiteOutcome = result.winner === "white" ? "win" : "loss";
      blackOutcome = result.winner === "black" ? "win" : "loss";
    }

    // Settle the bet on-chain if there was one
    if (betSetup && !betSetup.isFree) {
      const winnerAddress =
        whiteOutcome === "win" ? white.walletAddress :
        blackOutcome === "win" ? black.walletAddress :
        null;

      try {
        const txHash = await BetManager.settleBet(betSetup.gameId, result, winnerAddress ?? null);
        if (txHash) {
          // Notify players of settlement
          const settlementPayload = {
            escrowGameId: betSetup.gameId,
            txHash,
            betAmountUsd: betSetup.betAmountUsd,
            result: result.type,
          };

          if (winnerAddress) {
            // Winner gets the payout notification
            const winnerSocket = whiteOutcome === "win" ? white.socket : black.socket;
            const loserSocket = whiteOutcome === "win" ? black.socket : white.socket;
            winnerSocket.emit("bet_settled", { ...settlementPayload, outcome: "win" });
            loserSocket.emit("bet_settled", { ...settlementPayload, outcome: "loss" });
          } else {
            // Draw — both get refund notification
            white.socket.emit("bet_settled", { ...settlementPayload, outcome: "draw" });
            black.socket.emit("bet_settled", { ...settlementPayload, outcome: "draw" });
          }
        }
      } catch (err) {
        console.error(`[GameServer] Bet settlement failed for game ${gameId}:`, err);
      }
    }

    // Calculate ELO changes for ranked games
    const whiteRatingBefore = white.rating;
    const blackRatingBefore = black.rating;
    let whiteRatingAfter = whiteRatingBefore;
    let blackRatingAfter = blackRatingBefore;

    if (mode === "ranked") {
      const whiteExpected = expectedScore(whiteRatingBefore, blackRatingBefore);
      const blackExpected = expectedScore(blackRatingBefore, whiteRatingBefore);
      const whiteActual = whiteOutcome === "win" ? 1 : whiteOutcome === "draw" ? 0.5 : 0;
      const blackActual = blackOutcome === "win" ? 1 : blackOutcome === "draw" ? 0.5 : 0;
      whiteRatingAfter = newRating(whiteRatingBefore, whiteExpected, whiteActual);
      blackRatingAfter = newRating(blackRatingBefore, blackExpected, blackActual);
    }

    // Update in-memory profiles
    playerStore.updateAfterGame(white.id, whiteOutcome);
    playerStore.updateAfterGame(black.id, blackOutcome);

    // Persist to DB if available
    if (playerStore.isDbEnabled) {
      await playerStore.persistAfterGame(white.id, whiteOutcome, whiteRatingBefore, whiteRatingAfter).catch(() => {});
      await playerStore.persistAfterGame(black.id, blackOutcome, blackRatingBefore, blackRatingAfter).catch(() => {});

      // Record game in DB
      try {
        const { GameRepository } = await import("@checkker/database");
        const whiteAuth = authenticatedSockets.get(white.id);
        const blackAuth = authenticatedSockets.get(black.id);
        if (whiteAuth && blackAuth) {
          await GameRepository.create({
            whiteUserId: whiteAuth.userId,
            blackUserId: blackAuth.userId,
            mode: match.mode,
            difficulty: match.difficulty,
            timeControl: match.tc,
            whiteRatingBefore,
            blackRatingBefore,
          }).then(async (dbGame) => {
            const winnerAuth = whiteOutcome === "win" ? whiteAuth : blackOutcome === "win" ? blackAuth : undefined;
            await GameRepository.complete(dbGame.id, {
              resultType: result.type,
              winnerColor: "winner" in result ? result.winner : undefined,
              winnerUserId: winnerAuth?.userId,
              whiteRatingAfter,
              blackRatingAfter,
              moveCount: game.getState().moveHistory.length,
            });
          });
        }
      } catch {
        // DB write failed, game continues
      }
    }
  }

  private endGame(gameId: string): void {
    const match = this.matches.get(gameId);
    if (match) {
      match.game.dispose();
    }
    this.matches.delete(gameId);
  }

  private findEndedMatch(gameId: string, socketId: string): Match | null {
    const match = this.matches.get(gameId);
    if (!match) return null;
    if (!match.game.isOver()) return null;
    if (match.white.id !== socketId && match.black.id !== socketId) return null;
    return match;
  }

  private removeFromQueue(socketId: string): void {
    this.queue = this.queue.filter((q) => q.player.id !== socketId);
    const timeout = this.queueTimeouts.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.queueTimeouts.delete(socketId);
    }
  }

  getBotManager(): BotManager {
    return this.botManager;
  }

  private async sendCoachingTip(match: Match, playerId: string): Promise<void> {
    const color: Color = playerId === match.white.id ? "white" : "black";
    const state = match.game.getPublicState(color) as any;
    const tip = await brain.getCoachingTip(
      state.fen, state.hand, state.scorePile, color, state.moveHistory?.length ?? 0
    );
    if (tip) {
      const socket = playerId === match.white.id ? match.white.socket : match.black.socket;
      socket.emit("coaching_tip", tip);
    }
  }

  private async sendSpectatorComment(match: Match): Promise<void> {
    try {
      const state = match.game.getPublicState("white") as any;
      const comment = await brain.generateSpectatorComment?.(state.fen, state.moveHistory?.length ?? 0);
      if (comment) {
        match.white.socket.emit("spectator_comment", { text: comment });
        match.black.socket.emit("spectator_comment", { text: comment });
      }
    } catch {
      // LLM not available, skip
    }
  }

  async dispose(): Promise<void> {
    clearInterval(this.challengeCleanupInterval);
    // Cancel all pending bets
    for (const [betGameId] of this.pendingBets) {
      await BetManager.cancelBet(betGameId).catch(() => {});
    }
    this.pendingBets.clear();
    for (const [, match] of this.matches) {
      match.game.dispose();
    }
    this.matches.clear();
    this.queue = [];
    for (const [, timeout] of this.queueTimeouts) {
      clearTimeout(timeout);
    }
    this.queueTimeouts.clear();
    await brain.dispose();
  }
}
