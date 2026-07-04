import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { GameEngine } from "./GameEngine";
import type { BotDifficulty, TimeControl, Color, ChatMessage, GameMode } from "@checkker/shared";
import { isFreeGame, BET_AMOUNTS_USD, DEPOSIT_TIMEOUT_MS } from "@checkker/shared";
import { expectedScore, newRating } from "@checkker/shared";
import type { BotConfiguration, BotMaturity } from "@checkker/shared";
import { deserializeBotConfig, serializeBotConfig, deserializeBotMaturity, serializeBotMaturity } from "@checkker/shared";
import { BotManager } from "./bot/BotManager";
import { SpectateManager } from "./bot/SpectateManager";
import { playerStore } from "./PlayerStore";
import { UserRepository } from "@checkker/database";
import { calculateOdds } from "./odds";
import { brain } from "./bot/evaluators";
import { createChallenge, verifyChallenge, cleanupExpiredChallenges, createSession, verifySession, revokeSession } from "./auth/WalletAuth";
import { BetManager } from "./betting/BetManager";
import type { BetSetup } from "./betting/BetManager";
import { CONTRACT_ADDRESS, BLOCKCHAIN_ENABLED } from "./blockchain/config";
import { ContractService } from "./blockchain/ContractService";

interface Player {
  id: string; // socket ID (or user UUID when authenticated)
  socket: Socket;
  rating: number;
  casual: boolean;
  walletAddress?: string;
  userId?: string; // DB user ID
  /** True when this player has enabled client-side delegate/bot mode for this match. */
  isBot?: boolean;
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
  dbGameId?: string; // Persisted database Game ID for move history and replays
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
const authenticatedSockets = new Map<string, { walletAddress?: string; userId: string; isGuest?: boolean }>();

/** Pending private game invite between friends */
interface PrivateInvite {
  inviteId: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  tc: TimeControl;
  createdAt: number;
}

const INVITE_TTL_MS = 5 * 60 * 1000;

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
  private userSockets = new Map<string, Socket>(); // userId → live socket
  private privateInvites = new Map<string, PrivateInvite>();
  private lanHosts = new Map<string, { hostSocketId: string; tc: TimeControl; createdAt: number }>(); // code → host
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
          isGuest: false,
        });
        this.userSockets.set(profile.id, socket);
        socket.emit("auth_success", { profile, isNewUser: false, sessionToken: createSession(walletAddress) });
      } else {
        // Wallet verified but no account yet — client should call set_username
        socket.emit("auth_success", { profile: null, isNewUser: true, walletAddress, sessionToken: createSession(walletAddress) });
      }
    });

    // Silent re-auth with a session token from a previous signature login,
    // so page reloads / reconnects don't prompt the wallet to sign again.
    socket.on("auth_token", async ({ token }: { token: string }) => {
      const walletAddress = typeof token === "string" ? verifySession(token) : null;
      if (!walletAddress) {
        socket.emit("auth_error", { error: "Session expired", sessionExpired: true });
        return;
      }
      const profile = await playerStore.loadFromWallet(socket.id, walletAddress);
      if (profile) {
        authenticatedSockets.set(socket.id, { walletAddress, userId: profile.id, isGuest: false });
        this.userSockets.set(profile.id, socket);
        socket.emit("auth_success", { profile, isNewUser: false, sessionToken: token });
      } else {
        socket.emit("auth_success", { profile: null, isNewUser: true, walletAddress, sessionToken: token });
      }
    });

    // Guest identity for wallet-less free play.
    socket.on("guest_identify", async ({ deviceId, username, avatarId }: { deviceId?: string; username?: string; avatarId?: string }) => {
      if (!deviceId || deviceId.length < 8 || deviceId.length > 64) {
        socket.emit("auth_error", { error: "Invalid guest device id" });
        return;
      }
      const safeUsername = (username?.trim() || `Guest-${deviceId.slice(0, 6)}`).slice(0, 32);
      try {
        let user = await UserRepository.findByGuestDeviceId(deviceId);
        if (!user) {
          // Ensure synthetic username is unique
          let candidate = safeUsername;
          let suffix = 0;
          while (await UserRepository.isUsernameTaken(candidate)) {
            suffix += 1;
            const suffixStr = `-${suffix}`;
            candidate = safeUsername.slice(0, 32 - suffixStr.length) + suffixStr;
          }
          user = await UserRepository.createGuest({ guestDeviceId: deviceId, username: candidate, avatarId });
        }
        authenticatedSockets.set(socket.id, { userId: user.id, isGuest: true });
        this.userSockets.set(user.id, socket);
        const profile = await playerStore.loadFromUser(socket.id, user);
        socket.emit("auth_success", { profile, isNewUser: false, isGuest: true });
      } catch (err: any) {
        socket.emit("auth_error", { error: err?.message ?? "Guest identification failed" });
      }
    });

    socket.on("auth_logout", ({ token }: { token?: string } = {}) => {
      if (token) revokeSession(token);
      authenticatedSockets.delete(socket.id);
    });

    /* ── Betting / escrow deposits ───────────────────────────────────── */

    // Client reports the deposit transaction hash after the wallet broadcasts
    // it. The game still starts on the on-chain DepositMade event; this just
    // records the hash on the Bet row so the DB has a complete audit trail.
    socket.on("deposit_submitted", ({ gameId, txHash }: { gameId?: string; txHash?: string }) => {
      if (!gameId || !txHash) return;
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) return;
      BetManager.confirmDeposit(gameId, auth.userId, txHash).catch(() => {});
    });

    // Re-sync the deposit prompt after a reconnect. If the player's wallet is
    // part of a bet still awaiting deposits, re-point the stored socket to this
    // live connection and replay the current deposit state so the Confirm Bet
    // view reappears instead of being silently dropped.
    socket.on("request_deposit_status", ({ walletAddress }: { walletAddress?: string } = {}) => {
      const auth = authenticatedSockets.get(socket.id);
      const addr = (auth?.walletAddress ?? walletAddress ?? "").toLowerCase();
      if (!addr) return;
      for (const [gameId, pending] of this.pendingBets) {
        const isWhite = pending.white.walletAddress?.toLowerCase() === addr;
        const isBlack = pending.black.walletAddress?.toLowerCase() === addr;
        if (!isWhite && !isBlack) continue;
        if (isWhite) pending.white.socket = socket;
        if (isBlack) pending.black.socket = socket;
        socket.emit("awaiting_deposits", {
          gameId,
          betAmountWei: pending.betSetup.betAmountWei,
          betAmountUsd: pending.betSetup.betAmountUsd,
          contractAddress: CONTRACT_ADDRESS,
          timeoutMs: DEPOSIT_TIMEOUT_MS,
        });
        const mine = isWhite ? pending.whiteDeposited : pending.blackDeposited;
        const theirs = isWhite ? pending.blackDeposited : pending.whiteDeposited;
        if (mine) socket.emit("deposit_confirmed", { player: "self" });
        if (theirs) socket.emit("deposit_confirmed", { player: "opponent" });
        break;
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
          isGuest: false,
        });
        this.userSockets.set(profile.id, socket);
        socket.emit("auth_success", { profile, isNewUser: false, sessionToken: createSession(walletAddress) });
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

    /* ── Online Bot / Delegate Mode config sync ─────────────────────── */

    socket.on("update_bot_config", async ({ config, maturity }: { config?: BotConfiguration; maturity?: BotMaturity }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("bot_error", { error: "Not authenticated" });
        return;
      }
      try {
        const { UserRepository } = await import("@checkker/database");
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
        const user = await UserRepository.findById(auth.userId);
        socket.emit("bot_data", {
          config: deserializeBotConfig(user?.botConfig ?? null),
          maturity: deserializeBotMaturity(user?.botMaturity ?? null),
        });
      } catch {
        socket.emit("bot_data", { config: null, maturity: null });
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

    socket.on("join_ranked", ({ difficulty, tc, isBot }: { difficulty: BotDifficulty; tc: TimeControl; isBot?: boolean }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth || auth.isGuest) {
        socket.emit("queue_error", { error: "Ranked games require a connected wallet" });
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
      this.addToDifficultyQueue(player, tc, "ranked", difficulty);
    });

    socket.on("join_casual_difficulty", ({ difficulty, tc, isBot }: { difficulty: BotDifficulty; tc: TimeControl; isBot?: boolean }) => {
      const auth = authenticatedSockets.get(socket.id);
      const needsWallet = !isFreeGame("casual", difficulty);
      if (needsWallet && (!auth || auth.isGuest)) {
        socket.emit("queue_error", { error: "This casual tier requires a connected wallet" });
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
        const { GameRepository, UserRepository, PuzzleRepository } = await import("@checkker/database");
        const user = await UserRepository.findById(auth.userId);
        const recentGames = await GameRepository.getRecentByUser(auth.userId, 10);
        const rank = await UserRepository.getUserRank(auth.userId);
        const puzzleStats = await PuzzleRepository.getUserStats(auth.userId);
        socket.emit("profile_data", {
          profile: playerStore.get(socket.id),
          recentGames: recentGames.map((g) => ({
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
      // Sample a middlegame position from a short random playout so generated
      // puzzles aren't always the starting position.
      const { Chess } = await import("@checkker/chess");
      const playout = new Chess();
      const plies = 10 + Math.floor(Math.random() * 20);
      for (let i = 0; i < plies; i++) {
        const moves = playout.moves();
        if (moves.length === 0 || playout.isGameOver()) break;
        playout.move(moves[Math.floor(Math.random() * moves.length)]);
      }
      const color = playout.turn() === "w" ? "white" : "black";
      const puzzle = await brain.generatePuzzle(playout.fen(), color, difficulty ?? "intermediate");
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

    /* ── Puzzles ─────────────────────────────────────────────────────── */

    socket.on("get_daily_puzzle", async () => {
      try {
        const { PuzzleRepository } = await import("@checkker/database");
        const puzzle = await PuzzleRepository.ensureDaily();
        socket.emit("daily_puzzle", { puzzle });
      } catch {
        socket.emit("daily_puzzle", { puzzle: null });
      }
    });

    socket.on("get_puzzles", async ({ category, limit }: { category?: string; limit?: number }) => {
      try {
        const { PuzzleRepository } = await import("@checkker/database");
        const effectiveCategory = category ?? "tactics";
        if (effectiveCategory === "daily") {
          const daily = await PuzzleRepository.ensureDaily();
          socket.emit("puzzles", {
            category: "daily",
            puzzles: daily ? [daily] : [],
            count: daily ? 1 : 0,
          });
          return;
        }
        const [puzzles, count] = await Promise.all([
          PuzzleRepository.getByCategory(effectiveCategory, limit ?? 20),
          PuzzleRepository.countByCategory(effectiveCategory),
        ]);
        socket.emit("puzzles", { category: effectiveCategory, puzzles, count });
      } catch {
        socket.emit("puzzles", { category: category ?? "tactics", puzzles: [], count: 0 });
      }
    });

    socket.on("submit_puzzle", async ({ puzzleId, moveUci, timeSpentMs, usedHint }: { puzzleId: string; moveUci: string; timeSpentMs: number; usedHint?: boolean }) => {
      try {
        const { PuzzleRepository } = await import("@checkker/database");
        const puzzle = await PuzzleRepository.getById(puzzleId);
        if (!puzzle) {
          socket.emit("puzzle_result", { correct: false, error: "Puzzle not found" });
          return;
        }

        const normalize = (uci: string) => uci.trim().toLowerCase();
        const correct = normalize(moveUci) === normalize(puzzle.solution);

        const auth = authenticatedSockets.get(socket.id);
        if (auth) {
          await PuzzleRepository.recordAttempt({
            puzzleId,
            userId: auth.userId,
            solved: correct,
            timeSpentMs: timeSpentMs ?? 0,
            usedHint: usedHint ?? false,
          });
        }

        const stats = auth ? await PuzzleRepository.getUserStats(auth.userId) : { streak: 0, solved: 0, attempted: 0 };
        socket.emit("puzzle_result", { correct, solution: puzzle.solution, hint: puzzle.hint, stats });
      } catch {
        socket.emit("puzzle_result", { correct: false, error: "Submission failed" });
      }
    });

    /* ── Friends & Private Games ─────────────────────────────────────── */

    const emitFriendsData = async (targetSocket: Socket, userId: string) => {
      const { FriendshipRepository } = await import("@checkker/database");
      const [friends, pending] = await Promise.all([
        FriendshipRepository.listFriends(userId),
        FriendshipRepository.listPendingFor(userId),
      ]);
      const withPresence = friends.map((f) => ({
        ...f,
        online: this.userSockets.has(f.userId),
      }));
      targetSocket.emit("friends_data", { friends: withPresence, pending });
    };

    socket.on("get_friends", async () => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("friends_data", { friends: [], pending: [], error: "Not authenticated" });
        return;
      }
      try {
        await emitFriendsData(socket, auth.userId);
      } catch {
        socket.emit("friends_data", { friends: [], pending: [], error: "Failed to load friends" });
      }
    });

    socket.on("send_friend_request", async ({ username }: { username: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("friend_request_result", { success: false, error: "Not authenticated" });
        return;
      }
      try {
        const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
        const target = await UserRepository.findByUsername(username?.trim() ?? "");
        if (!target) {
          socket.emit("friend_request_result", { success: false, error: "User not found" });
          return;
        }
        if (target.id === auth.userId) {
          socket.emit("friend_request_result", { success: false, error: "You can't add yourself" });
          return;
        }
        const me = await UserRepository.findById(auth.userId);
        const friendship = await FriendshipRepository.sendRequest(auth.userId, target.id);
        if (!friendship) {
          socket.emit("friend_request_result", { success: false, error: "Request already exists or you're already friends" });
          return;
        }
        await NotificationRepository.create(target.id, "friend_request", {
          friendshipId: friendship.id,
          fromUsername: me?.username ?? "A player",
        });
        const targetSocket = this.userSockets.get(target.id);
        if (targetSocket) {
          targetSocket.emit("friend_request", {
            friendshipId: friendship.id,
            fromUsername: me?.username ?? "A player",
          });
          await emitFriendsData(targetSocket, target.id);
        }
        socket.emit("friend_request_result", { success: true, username: target.username });
      } catch {
        socket.emit("friend_request_result", { success: false, error: "Failed to send request" });
      }
    });

    socket.on("respond_friend_request", async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) return;
      try {
        const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
        const friendship = await FriendshipRepository.respond(friendshipId, auth.userId, accept);
        if (friendship && accept) {
          const me = await UserRepository.findById(auth.userId);
          await NotificationRepository.create(friendship.requesterId, "friend_accepted", {
            username: me?.username ?? "A player",
          });
          const requesterSocket = this.userSockets.get(friendship.requesterId);
          if (requesterSocket) {
            requesterSocket.emit("friend_accepted", { username: me?.username ?? "A player" });
            await emitFriendsData(requesterSocket, friendship.requesterId);
          }
        }
        await emitFriendsData(socket, auth.userId);
      } catch {
        // refresh failed silently; client can re-request
      }
    });

    socket.on("remove_friend", async ({ friendshipId }: { friendshipId: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) return;
      try {
        const { FriendshipRepository } = await import("@checkker/database");
        await FriendshipRepository.remove(friendshipId, auth.userId);
        await emitFriendsData(socket, auth.userId);
      } catch {
        // ignore
      }
    });

    socket.on("invite_friend", async ({ friendUserId, tc }: { friendUserId: string; tc?: TimeControl }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("invite_sent", { success: false, error: "Not authenticated" });
        return;
      }
      try {
        const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
        const friends = await FriendshipRepository.areFriends(auth.userId, friendUserId);
        if (!friends) {
          socket.emit("invite_sent", { success: false, error: "You can only invite friends" });
          return;
        }
        const me = await UserRepository.findById(auth.userId);
        const inviteId = uuid();
        const invite: PrivateInvite = {
          inviteId,
          fromUserId: auth.userId,
          fromUsername: me?.username ?? "A player",
          toUserId: friendUserId,
          tc: tc ?? "blitz",
          createdAt: Date.now(),
        };
        this.privateInvites.set(inviteId, invite);
        setTimeout(() => this.privateInvites.delete(inviteId), INVITE_TTL_MS).unref?.();

        await NotificationRepository.create(friendUserId, "game_invite", {
          inviteId,
          fromUsername: invite.fromUsername,
          tc: invite.tc,
        });
        const friendSocket = this.userSockets.get(friendUserId);
        if (friendSocket) {
          friendSocket.emit("private_invite", {
            inviteId,
            fromUsername: invite.fromUsername,
            tc: invite.tc,
          });
        }
        socket.emit("invite_sent", { success: true, online: !!friendSocket, inviteId });
      } catch {
        socket.emit("invite_sent", { success: false, error: "Failed to send invite" });
      }
    });

    socket.on("respond_invite", async ({ inviteId, accept }: { inviteId: string; accept: boolean }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) return;
      const invite = this.privateInvites.get(inviteId);
      if (!invite || invite.toUserId !== auth.userId) {
        socket.emit("invite_response_result", { success: false, error: "Invite expired" });
        return;
      }
      this.privateInvites.delete(inviteId);

      const inviterSocket = this.userSockets.get(invite.fromUserId);
      if (!accept) {
        inviterSocket?.emit("invite_declined", { inviteId, byUsername: playerStore.get(socket.id)?.displayName });
        socket.emit("invite_response_result", { success: true, accepted: false });
        return;
      }
      if (!inviterSocket) {
        socket.emit("invite_response_result", { success: false, error: "Inviter is no longer online" });
        return;
      }

      const inviterProfile = playerStore.getOrCreate(inviterSocket.id);
      const myProfile = playerStore.getOrCreate(socket.id);
      const inviterAuth = authenticatedSockets.get(inviterSocket.id);
      const inviter: Player = {
        id: inviterSocket.id,
        socket: inviterSocket,
        rating: inviterProfile.rating ?? 1000,
        casual: true,
        walletAddress: inviterAuth?.walletAddress,
        userId: invite.fromUserId,
      };
      const accepter: Player = {
        id: socket.id,
        socket,
        rating: myProfile.rating ?? 1000,
        casual: true,
        walletAddress: auth.walletAddress,
        userId: auth.userId,
      };
      socket.emit("invite_response_result", { success: true, accepted: true });
      // Private friendly game: casual mode, free tier.
      this.startGame(inviter, accepter, invite.tc, "casual", "beginner");
    });

    /* ── LAN host/join handshake ─────────────────────────────────────────
       Both devices connect to the same server (typically one running on the
       host's machine on the local network). The host gets a short code that
       the guest enters to pair up — no wallet auth required. */

    socket.on("host_lan_game", ({ tc }: { tc?: TimeControl } = {}) => {
      // One hosted game per socket: drop any previous code.
      for (const [code, entry] of this.lanHosts) {
        if (entry.hostSocketId === socket.id) this.lanHosts.delete(code);
      }
      let code: string;
      do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
      } while (this.lanHosts.has(code));
      this.lanHosts.set(code, { hostSocketId: socket.id, tc: tc ?? "blitz", createdAt: Date.now() });
      setTimeout(() => {
        if (this.lanHosts.get(code)?.hostSocketId === socket.id) this.lanHosts.delete(code);
      }, INVITE_TTL_MS).unref?.();
      socket.emit("lan_game_hosted", { code, tc: tc ?? "blitz" });
    });

    socket.on("cancel_lan_host", () => {
      for (const [code, entry] of this.lanHosts) {
        if (entry.hostSocketId === socket.id) this.lanHosts.delete(code);
      }
    });

    socket.on("join_lan_game", ({ code }: { code: string }) => {
      const entry = this.lanHosts.get(String(code ?? "").trim());
      if (!entry) {
        socket.emit("lan_join_result", { success: false, error: "Game code not found. Check the code and try again." });
        return;
      }
      const hostSocket = this.io.sockets.sockets.get(entry.hostSocketId);
      if (!hostSocket || entry.hostSocketId === socket.id) {
        this.lanHosts.delete(String(code).trim());
        socket.emit("lan_join_result", { success: false, error: "The host is no longer available." });
        return;
      }
      this.lanHosts.delete(String(code).trim());

      const hostProfile = playerStore.getOrCreate(hostSocket.id);
      const myProfile = playerStore.getOrCreate(socket.id);
      const hostAuth = authenticatedSockets.get(hostSocket.id);
      const myAuth = authenticatedSockets.get(socket.id);
      const host: Player = {
        id: hostSocket.id,
        socket: hostSocket,
        rating: hostProfile.rating ?? 1000,
        casual: true,
        walletAddress: hostAuth?.walletAddress,
        userId: hostAuth?.userId,
      };
      const guest: Player = {
        id: socket.id,
        socket,
        rating: myProfile.rating ?? 1000,
        casual: true,
        walletAddress: myAuth?.walletAddress,
        userId: myAuth?.userId,
      };
      socket.emit("lan_join_result", { success: true });
      this.startGame(host, guest, entry.tc, "casual", "beginner");
    });

    /* ── Notifications ───────────────────────────────────────────────── */

    socket.on("get_notifications", async () => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("notifications", { notifications: [], unread: 0 });
        return;
      }
      try {
        const { NotificationRepository } = await import("@checkker/database");
        const [notifications, unread] = await Promise.all([
          NotificationRepository.listForUser(auth.userId),
          NotificationRepository.unreadCount(auth.userId),
        ]);
        socket.emit("notifications", { notifications, unread });
      } catch {
        socket.emit("notifications", { notifications: [], unread: 0 });
      }
    });

    socket.on("mark_notifications_read", async () => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) return;
      try {
        const { NotificationRepository } = await import("@checkker/database");
        await NotificationRepository.markAllRead(auth.userId);
        socket.emit("notifications_read", { success: true });
      } catch {
        socket.emit("notifications_read", { success: false });
      }
    });

    /* ── Replays ─────────────────────────────────────────────────────── */

    socket.on("get_game_moves", async ({ gameId }: { gameId: string }) => {
      try {
        const { GameMoveRepository } = await import("@checkker/database");
        const moves = await GameMoveRepository.getByGameId(gameId);
        socket.emit("game_moves", { gameId, moves });
      } catch {
        socket.emit("game_moves", { gameId, moves: [] });
      }
    });

    /* ── Push Notifications ──────────────────────────────────────────── */

    socket.on("register_fcm_token", async ({ token }: { token: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("fcm_token_error", { error: "Not authenticated" });
        return;
      }
      try {
        const { UserRepository } = await import("@checkker/database");
        await UserRepository.updateFcmToken(auth.userId, token);
        socket.emit("fcm_token_registered", { token });
      } catch {
        socket.emit("fcm_token_error", { error: "Failed to register token" });
      }
    });

    /* ── Cosmetics ───────────────────────────────────────────────────── */

    socket.on("get_cosmetics", async () => {
      try {
        const { CosmeticRepository, UserRepository } = await import("@checkker/database");
        const auth = authenticatedSockets.get(socket.id);
        const cosmetics = await CosmeticRepository.getAll();
        const userCosmetics = auth ? await CosmeticRepository.getByUser(auth.userId) : [];
        const coins = auth ? await UserRepository.getCoins(auth.userId) : 0;
        socket.emit("cosmetics", { cosmetics, userCosmetics, coins });
      } catch {
        socket.emit("cosmetics", { cosmetics: [], userCosmetics: [], coins: 0 });
      }
    });

    socket.on("purchase_cosmetic", async ({ cosmeticId }: { cosmeticId: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("cosmetic_purchased", { success: false, error: "Not authenticated" });
        return;
      }
      try {
        const { CosmeticRepository } = await import("@checkker/database");
        const result = await CosmeticRepository.purchase(auth.userId, cosmeticId);
        if (result.success) {
          const userCosmetics = await CosmeticRepository.getByUser(auth.userId);
          socket.emit("cosmetic_purchased", { success: true, cosmeticId, coins: result.coins, userCosmetics });
        } else {
          socket.emit("cosmetic_purchased", { success: false, cosmeticId, error: result.error });
        }
      } catch {
        socket.emit("cosmetic_purchased", { success: false, cosmeticId, error: "Purchase failed" });
      }
    });

    socket.on("equip_cosmetic", async ({ cosmeticId }: { cosmeticId: string }) => {
      const auth = authenticatedSockets.get(socket.id);
      if (!auth) {
        socket.emit("cosmetic_error", { error: "Not authenticated" });
        return;
      }
      try {
        const { CosmeticRepository } = await import("@checkker/database");
        await CosmeticRepository.equip(auth.userId, cosmeticId);
        const equipped = await CosmeticRepository.getEquipped(auth.userId);
        socket.emit("cosmetic_equipped", { cosmeticId, equipped });
      } catch {
        socket.emit("cosmetic_error", { error: "Failed to equip cosmetic" });
      }
    });

    /* ── In-Game Events ──────────────────────────────────────────────── */

    socket.on("play_move", async ({ gameId, card, move }: { gameId: string; card: string; move: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      const { game, white, black } = match;

      if (socket.id !== white.id && socket.id !== black.id) return;
      const color: Color = socket.id === white.id ? "white" : "black";
      if (game.getState().turn !== color) return;

      const beforeFen = game.getState().fen;
      const result = game.playCard(card, move);
      if (result.success) {
        // Persist move to DB if the game is tracked
        if (match.dbGameId && playerStore.isDbEnabled) {
          try {
            const { GameMoveRepository } = await import("@checkker/database");
            const state = game.getState();
            const moveHistory = state.moveHistory;
            const latest = moveHistory[moveHistory.length - 1];
            await GameMoveRepository.create({
              gameId: match.dbGameId,
              moveNumber: moveHistory.length,
              fen: state.fen,
              moveUci: move,
              san: latest?.move,
              cardRank: card.slice(0, -1), // e.g. "K" from "K♠"
              cardSuit: card.slice(-1),    // e.g. "♠" from "K♠"
              color,
            });
          } catch {
            // Non-fatal: game continues even if move persistence fails
          }
        }

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

      for (const [code, entry] of this.lanHosts) {
        if (entry.hostSocketId === socket.id) this.lanHosts.delete(code);
      }

      const auth = authenticatedSockets.get(socket.id);
      if (auth) {
        if (this.userSockets.get(auth.userId)?.id === socket.id) {
          this.userSockets.delete(auth.userId);
        }
        for (const [inviteId, invite] of this.privateInvites) {
          if (invite.fromUserId === auth.userId) this.privateInvites.delete(inviteId);
        }
      }
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
        gameId, mode, difficulty, p1.walletAddress, p2.walletAddress,
        p1.userId, p2.userId
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
          timeoutMs: DEPOSIT_TIMEOUT_MS,
        };
        p1.socket.emit("awaiting_deposits", depositPayload);
        p2.socket.emit("awaiting_deposits", depositPayload);

        // Listen for each player's deposit independently and emit per-player events
        const whiteDepositPromise = ContractService.listenForDeposit(gameId, p1.walletAddress!).then((ok) => {
          if (ok && this.pendingBets.has(gameId)) {
            const p = this.pendingBets.get(gameId)!;
            p.whiteDeposited = true;
            p1.socket.emit("deposit_confirmed", { player: "self" });
            p2.socket.emit("deposit_confirmed", { player: "opponent" });
            BetManager.confirmDeposit(gameId, p1.userId ?? "", "").catch(() => {});
          }
          return ok;
        });

        const blackDepositPromise = ContractService.listenForDeposit(gameId, p2.walletAddress!).then((ok) => {
          if (ok && this.pendingBets.has(gameId)) {
            const p = this.pendingBets.get(gameId)!;
            p.blackDeposited = true;
            p2.socket.emit("deposit_confirmed", { player: "self" });
            p1.socket.emit("deposit_confirmed", { player: "opponent" });
            BetManager.confirmDeposit(gameId, p2.userId ?? "", "").catch(() => {});
          }
          return ok;
        });

        const [whiteOk, blackOk] = await Promise.all([whiteDepositPromise, blackDepositPromise]);
        this.pendingBets.delete(gameId);

        if (!whiteOk || !blackOk) {
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

    // Persist game record upfront so moves can be tracked with a stable DB ID
    if (playerStore.isDbEnabled && p1.userId && p2.userId) {
      try {
        const { GameRepository } = await import("@checkker/database");
        const dbGame = await GameRepository.create({
          whiteUserId: p1.userId,
          blackUserId: p2.userId,
          mode,
          difficulty,
          timeControl: tc,
          whiteRatingBefore: p1.rating,
          blackRatingBefore: p2.rating,
          whiteIsBot: p1.isBot ?? false,
          blackIsBot: p2.isBot ?? false,
        });
        match.dbGameId = dbGame.id;
      } catch {
        // DB write failed; game continues without move persistence
      }
    }

    this.matches.set(game.id, match);

    game.startTimeoutCheck(() => {
      this.broadcastGame(game.id);
    });

    const whiteProfile = playerStore.getOrCreate(p1.id);
    const blackProfile = playerStore.getOrCreate(p2.id);
    const odds = await calculateOdds(game.getOddsInput());
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
      liveScores: game.getLiveScores(),
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
      liveScores: game.getLiveScores(),
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
    const odds = await calculateOdds(game.getOddsInput());
    const whiteProfile = playerStore.getOrCreate(white.id);
    const blackProfile = playerStore.getOrCreate(black.id);

    white.socket.emit("game_update", {
      ...game.getPublicState("white"),
      liveScores: game.getLiveScores(),
      bestMoves: { white: bestMoves.white, black: [] },
      odds,
      playerProfile: whiteProfile,
      opponentProfile: blackProfile,
    });
    black.socket.emit("game_update", {
      ...game.getPublicState("black"),
      liveScores: game.getLiveScores(),
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

      const whiteAuth = authenticatedSockets.get(white.id);
      const blackAuth = authenticatedSockets.get(black.id);
      const winnerUserId = whiteOutcome === "win" ? whiteAuth?.userId : blackOutcome === "win" ? blackAuth?.userId : undefined;
      const loserUserId = whiteOutcome === "loss" ? whiteAuth?.userId : blackOutcome === "loss" ? blackAuth?.userId : undefined;

      try {
        const txHash = await BetManager.settleBet(betSetup.gameId, result, winnerAddress ?? null, winnerUserId, loserUserId);
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

      // Complete game in DB
      try {
        const { GameRepository } = await import("@checkker/database");
        const whiteAuth = authenticatedSockets.get(white.id);
        const blackAuth = authenticatedSockets.get(black.id);
        if (match.dbGameId && whiteAuth && blackAuth) {
          const winnerAuth = whiteOutcome === "win" ? whiteAuth : blackOutcome === "win" ? blackAuth : undefined;
          await GameRepository.complete(match.dbGameId, {
            resultType: result.type,
            winnerColor: "winner" in result ? result.winner : undefined,
            winnerUserId: winnerAuth?.userId,
            whiteRatingAfter,
            blackRatingAfter,
            moveCount: game.getState().moveHistory.length,
          });
        }
      } catch {
        // DB write failed, game continues
      }

      // Award coins for playing online games
      try {
        const { UserRepository } = await import("@checkker/database");
        const { COIN_REWARDS } = await import("@checkker/shared");
        const whiteAuth = authenticatedSockets.get(white.id);
        const blackAuth = authenticatedSockets.get(black.id);
        if (whiteAuth) {
          const updated = await UserRepository.addCoins(whiteAuth.userId, COIN_REWARDS[whiteOutcome]);
          white.socket.emit("coins_awarded", { amount: COIN_REWARDS[whiteOutcome], balance: updated.coins });
        }
        if (blackAuth) {
          const updated = await UserRepository.addCoins(blackAuth.userId, COIN_REWARDS[blackOutcome]);
          black.socket.emit("coins_awarded", { amount: COIN_REWARDS[blackOutcome], balance: updated.coins });
        }
      } catch {
        // Coin award failed, non-fatal
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
