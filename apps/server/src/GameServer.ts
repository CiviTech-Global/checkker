import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { GameEngine } from "./GameEngine";
import type { BotDifficulty, TimeControl, Color, ChatMessage } from "@checkker/shared";
import { BotManager } from "./bot/BotManager";
import { SpectateManager } from "./bot/SpectateManager";
import { playerStore } from "./PlayerStore";
import { calculateOdds } from "./odds";
import { brain } from "./bot/evaluators";

interface Player {
  id: string;
  socket: Socket;
  rating: number;
  casual: boolean;
}

interface Match {
  game: GameEngine;
  white: Player;
  black: Player;
  tc: TimeControl;
  rematchRequests: Set<string>;
  chatHistory: ChatMessage[];
}

export class GameServer {
  private io: SocketServer;
  private queue: Array<{ player: Player; tc: TimeControl }> = [];
  private matches = new Map<string, Match>();
  private queueTimeouts = new Map<string, NodeJS.Timeout>();
  private botManager: BotManager;
  private spectateManager: SpectateManager;

  constructor(io: SocketServer) {
    this.io = io;
    this.botManager = new BotManager();
    this.spectateManager = new SpectateManager();
  }

  handleConnection(socket: Socket): void {
    brain.getPlayerModel(socket.id);

    socket.on("join_queue", ({ rating, tc }: { rating: number; tc: TimeControl }) => {
      const player: Player = { id: socket.id, socket, rating, casual: false };
      this.addToQueue(player, tc);
    });

    socket.on("join_casual", ({ tc }: { tc: TimeControl }) => {
      const player: Player = { id: socket.id, socket, rating: 0, casual: true };
      this.addToQueue(player, tc);
    });

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
          game.dispose();
        } else {
          // Auto-send coaching tip after each human move
          this.sendCoachingTip(match, socket.id).catch(() => {});
          // Auto-send spectator comment if LLM available
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
        this.startGame(match.black, match.white, match.tc);
      }
    });

    socket.on("disconnect", () => {
      brain.persistPlayer(socket.id);
      this.removeFromQueue(socket.id);
      for (const [gameId, match] of this.matches) {
        if (match.white.id === socket.id || match.black.id === socket.id) {
          const color: Color = match.white.id === socket.id ? "white" : "black";
          match.game.timeOut(color);
          this.broadcastGame(gameId);
          this.endGame(gameId);
        }
      }
      this.botManager.disposeByHumanId(socket.id);
      this.spectateManager.disposeBySocket(socket.id);
    });
  }

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
      this.startGame(opponent.player, player, tc);
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

  private async startGame(p1: Player, p2: Player, tc: TimeControl): Promise<void> {
    const game = new GameEngine(p1.rating, p2.rating, tc);

    const match: Match = {
      game,
      white: p1,
      black: p2,
      tc,
      rematchRequests: new Set(),
      chatHistory: [],
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

    p1.socket.emit("game_start", {
      ...game.getPublicState("white"),
      color: "white",
      gameId: game.id,
      playerProfile: whiteProfile,
      opponentProfile: blackProfile,
      odds,
      bestMoves: { white: bestMoves.white, black: [] },
      ...whiteExtra,
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
