import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { GameEngine } from "./GameEngine";
import type { BotDifficulty, TimeControl, Color, GameMode, StakeLevel } from "@checkker/shared";
import { isFreeStake, getBetAmountUsd, DEPOSIT_TIMEOUT_MS } from "@checkker/shared";
import { expectedScore, newRating } from "@checkker/shared";
import { BotManager } from "./bot/BotManager";
import { SpectateManager } from "./bot/SpectateManager";
import { playerStore } from "./PlayerStore";
import { calculateOdds } from "./odds";
import { brain } from "./bot/evaluators";
import { BetManager } from "./betting/BetManager";
import type { BetSetup } from "./betting/BetManager";
import { BLOCKCHAIN_ENABLED, CONTRACT_ADDRESS, isBettingEnabled } from "./blockchain/config";
import { ContractService } from "./blockchain/ContractService";
import { SocketRateLimiter } from "./rateLimit";
import { addGameBreadcrumb, setSentryTag, clearSentryUser } from "./monitoring";
import { cleanupExpiredChallenges } from "./auth/WalletAuth";

import {
  registerAuthHandlers,
  registerMatchmakingHandlers,
  registerBettingHandlers,
  registerBotHandlers,
  registerCoachingHandlers,
  registerPuzzleHandlers,
  registerFriendHandlers,
  registerLanHandlers,
  registerNotificationHandlers,
  registerReplayHandlers,
  registerPushHandlers,
  registerCosmeticHandlers,
  registerInGameHandlers,
  registerProfileHandlers,
  authenticatedSockets,
} from "./handlers";
import type { Player, Match, PendingBetGame, PrivateInvite } from "./handlers";

export class GameServer {
  private io: SocketServer;
  private queue: Array<{ player: Player; tc: TimeControl }> = [];
  private rankedQueues: Record<string, Array<{ player: Player; tc: TimeControl; stake: StakeLevel }>> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    master: [],
  };
  private casualQueues: Record<string, Array<{ player: Player; tc: TimeControl; stake: StakeLevel }>> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    master: [],
  };
  private matches = new Map<string, Match>();
  private pendingBets = new Map<string, PendingBetGame>();
  private userSockets = new Map<string, Socket>();
  private privateInvites = new Map<string, PrivateInvite>();
  private lanHosts = new Map<string, { hostSocketId: string; tc: TimeControl; createdAt: number }>();
  private queueTimeouts = new Map<string, ReturnType<typeof setInterval>>();
  private botManager: BotManager;
  private spectateManager: SpectateManager;
  private challengeCleanupInterval: ReturnType<typeof setInterval>;
  private authRateLimiter = new SocketRateLimiter({ capacity: 5, refillRate: 1 / 60 });
  private moveRateLimiter = new SocketRateLimiter({ capacity: 10, refillRate: 2 });

  constructor(io: SocketServer) {
    this.io = io;
    this.botManager = new BotManager();
    this.spectateManager = new SpectateManager();
    this.challengeCleanupInterval = setInterval(cleanupExpiredChallenges, 60_000);
    setInterval(() => {
      this.authRateLimiter.prune();
      this.moveRateLimiter.prune();
    }, 5 * 60 * 1000).unref();
  }

  handleConnection(socket: Socket): void {
    brain.getPlayerModel(socket.id);
    socket.emit("server_features", { bettingEnabled: isBettingEnabled() });

    registerAuthHandlers(socket, this.authRateLimiter, this.userSockets);
    registerMatchmakingHandlers(socket, this);
    registerBettingHandlers(socket, this.pendingBets);
    registerBotHandlers(socket, this);
    registerCoachingHandlers(socket, () => this.matches);
    registerPuzzleHandlers(socket);
    registerFriendHandlers(socket, this, this.privateInvites, this.userSockets);
    registerLanHandlers(socket, this, this.lanHosts);
    registerNotificationHandlers(socket);
    registerReplayHandlers(socket);
    registerPushHandlers(socket);
    registerCosmeticHandlers(socket);
    registerProfileHandlers(socket);
    registerInGameHandlers(socket, this, () => this.matches, this.moveRateLimiter);

    /* ── Disconnect ──────────────────────────────────────────────────── */

    socket.on("disconnect", () => {
      addGameBreadcrumb("connection", "player disconnected", { socketId: socket.id });
      clearSentryUser();
      brain.persistPlayer(socket.id);
      this.removeFromQueue(socket.id);
      this.removeFromDifficultyQueues(socket.id);

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

  /* ── Public accessors for handler modules ────────────────────────── */

  getIo(): SocketServer {
    return this.io;
  }

  getBotManager(): BotManager {
    return this.botManager;
  }

  getSpectateManager(): SpectateManager {
    return this.spectateManager;
  }

  /** Expose startGame for handlers that need to initiate games (invite, LAN). */
  startGamePublic(p1: Player, p2: Player, tc: TimeControl, mode: GameMode, difficulty: BotDifficulty, stake: StakeLevel): Promise<void> {
    return this.startGame(p1, p2, tc, mode, difficulty, stake);
  }

  broadcastGamePublic(gameId: string): Promise<void> {
    return this.broadcastGame(gameId);
  }

  handleGameOverPublic(gameId: string): Promise<void> {
    return this.handleGameOver(gameId);
  }

  endGamePublic(gameId: string): void {
    this.endGame(gameId);
  }

  findEndedMatchPublic(gameId: string, socketId: string): Match | null {
    return this.findEndedMatch(gameId, socketId);
  }

  sendCoachingTipPublic(match: Match, playerId: string): Promise<void> {
    return this.sendCoachingTip(match, playerId);
  }

  sendSpectatorCommentPublic(match: Match): Promise<void> {
    return this.sendSpectatorComment(match);
  }

  /* ── Legacy queue matching (backward compat) ─────────────────────── */

  addToQueue(player: Player, tc: TimeControl): void {
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
      this.startGame(opponent.player, player, tc, "casual", "beginner", "free");
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

  addToDifficultyQueue(player: Player, tc: TimeControl, mode: GameMode, difficulty: BotDifficulty, stake: StakeLevel): void {
    const queues = mode === "ranked" ? this.rankedQueues : this.casualQueues;
    const queue = queues[difficulty];

    const opponentIdx = queue.findIndex((q) => q.tc === tc && q.stake === stake && q.player.id !== player.id);

    if (opponentIdx >= 0) {
      const opponent = queue.splice(opponentIdx, 1)[0];
      const oppTimeout = this.queueTimeouts.get(opponent.player.id);
      if (oppTimeout) {
        clearTimeout(oppTimeout);
        this.queueTimeouts.delete(opponent.player.id);
      }
      this.startGame(opponent.player, player, tc, mode, difficulty, stake);
    } else {
      queue.push({ player, tc, stake });
      player.socket.emit("queue_joined", { mode, difficulty, tc, stake, betAmountUsd: isFreeStake(stake) ? 0 : getBetAmountUsd(difficulty) });

      const timeout = setTimeout(() => {
        const idx = queue.findIndex((q) => q.player.id === player.id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          player.socket.emit("bot_fallback_offer", { tc, difficulty, stake });
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

  private async startGame(p1: Player, p2: Player, tc: TimeControl, mode: GameMode = "casual", difficulty: BotDifficulty = "beginner", stake: StakeLevel = "free"): Promise<void> {
    const free = isFreeStake(stake);

    if (!free && BLOCKCHAIN_ENABLED && isBettingEnabled() && p1.walletAddress && p2.walletAddress) {
      const gameId = uuid();
      const betSetup = await BetManager.initiateBet(
        gameId, mode, difficulty, stake, p1.walletAddress, p2.walletAddress,
        p1.userId, p2.userId
      );

      if (betSetup && !betSetup.isFree) {
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
          await BetManager.cancelBet(gameId);
          p1.socket.emit("bet_cancelled", { gameId, reason: "Deposit timeout" });
          p2.socket.emit("bet_cancelled", { gameId, reason: "Deposit timeout" });
          return;
        }

        this.launchGame(p1, p2, tc, mode, difficulty, betSetup, stake, gameId);
        return;
      }
    }

    this.launchGame(p1, p2, tc, mode, difficulty, null, stake);
  }

  private async launchGame(
    p1: Player, p2: Player, tc: TimeControl,
    mode: GameMode, difficulty: BotDifficulty,
    betSetup: BetSetup | null, stake: StakeLevel = "free", _existingGameId?: string
  ): Promise<void> {
    const game = new GameEngine(p1.rating, p2.rating, tc);

    const match: Match = {
      game,
      white: p1,
      black: p2,
      tc,
      mode,
      difficulty,
      stake,
      rematchRequests: new Set(),
      chatHistory: [],
      betSetup,
    };

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

    game.startTimeoutCheck({
      onTimeout: () => {
        this.broadcastGame(game.id);
      },
      onTick: () => {
        this.broadcastClock(game.id);
      },
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

    addGameBreadcrumb("game", "game started", {
      gameId: game.id,
      mode,
      difficulty,
      tc,
      white: p1.id,
      black: p2.id,
    });
    setSentryTag("game.mode", mode);
    setSentryTag("game.difficulty", difficulty);

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
      addGameBreadcrumb("game", "game over", {
        gameId,
        result: JSON.stringify(game.getResult()),
        scores: JSON.stringify(game.getScores()),
      });
      const payload = { gameId, result: game.getResult(), scores: game.getScores() };
      white.socket.emit("game_over", payload);
      black.socket.emit("game_over", payload);
    }
  }

  private broadcastClock(gameId: string): void {
    const match = this.matches.get(gameId);
    if (!match) return;
    const { game, white, black } = match;
    if (game.isOver()) return;

    const clock = game.getClockState();
    const payload = { gameId, ...clock };
    white.socket.emit("clock_tick", payload);
    black.socket.emit("clock_tick", payload);
  }

  private async handleGameOver(gameId: string): Promise<void> {
    const match = this.matches.get(gameId);
    if (!match) return;
    const { game, white, black, mode, betSetup } = match;
    const result = game.getResult();
    if (!result) return;

    let whiteOutcome: "win" | "loss" | "draw" = "draw";
    let blackOutcome: "win" | "loss" | "draw" = "draw";

    if ("winner" in result && result.winner) {
      whiteOutcome = result.winner === "white" ? "win" : "loss";
      blackOutcome = result.winner === "black" ? "win" : "loss";
    }

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
          const settlementPayload = {
            escrowGameId: betSetup.gameId,
            txHash,
            betAmountUsd: betSetup.betAmountUsd,
            result: result.type,
          };

          if (winnerAddress) {
            const winnerSocket = whiteOutcome === "win" ? white.socket : black.socket;
            const loserSocket = whiteOutcome === "win" ? black.socket : white.socket;
            winnerSocket.emit("bet_settled", { ...settlementPayload, outcome: "win" });
            loserSocket.emit("bet_settled", { ...settlementPayload, outcome: "loss" });
          } else {
            white.socket.emit("bet_settled", { ...settlementPayload, outcome: "draw" });
            black.socket.emit("bet_settled", { ...settlementPayload, outcome: "draw" });
          }
        }
      } catch (err) {
        console.error(`[GameServer] Bet settlement failed for game ${gameId}:`, err);
      }
    }

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

    playerStore.updateAfterGame(white.id, whiteOutcome);
    playerStore.updateAfterGame(black.id, blackOutcome);

    if (playerStore.isDbEnabled) {
      await playerStore.persistAfterGame(white.id, whiteOutcome, whiteRatingBefore, whiteRatingAfter).catch(() => {});
      await playerStore.persistAfterGame(black.id, blackOutcome, blackRatingBefore, blackRatingAfter).catch(() => {});

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
