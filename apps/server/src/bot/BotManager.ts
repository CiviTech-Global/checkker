import { v4 as uuid } from "uuid";
import { GameEngine } from "../GameEngine";
import { BotPlayer } from "./BotPlayer";
import { evaluators, brain } from "./evaluators";
import type { BotDifficulty, Color, TimeControl, ChatMessage } from "@checkker/shared";
import type { Socket } from "socket.io";
import { playerStore } from "../PlayerStore";
import { calculateOdds } from "../odds";

interface BotGame {
  gameId: string;
  game: GameEngine;
  bot: BotPlayer;
  humanSocket: Socket;
  humanColor: Color;
  difficulty: BotDifficulty;
  tc: TimeControl;
  moveHistory: Array<{ fen: string; move: string; color: Color; cardRank: string; cardSuit: string }>;
}

interface BotGameHandlers {
  playMove: (...args: any[]) => void;
  resign: (...args: any[]) => void;
  rematchRequest: (...args: any[]) => void;
  undoMove: (...args: any[]) => void;
  chatMessage: (...args: any[]) => void;
  disconnect: (...args: any[]) => void;
}

const BOT_RATINGS: Record<BotDifficulty, number> = {
  beginner: 400,
  intermediate: 900,
  advanced: 1400,
  master: 1900,
};

export class BotManager {
  private botGames: Map<string, BotGame> = new Map();
  private socketHandlers: Map<string, BotGameHandlers> = new Map();

  async createBotGame(
    humanSocket: Socket,
    _humanPlayerId: string,
    difficulty: BotDifficulty,
    tc: TimeControl,
  ): Promise<{ gameId: string; humanColor: Color }> {
    const gameId = `bot-${Date.now()}`;
    const humanColor: Color = "white";
    const botColor: Color = "black";

    const r = brain.getPlayerModel(humanSocket.id).estimatedSkill;
    const adjustedRating = Math.max(200, Math.min(2500, r));

    const game = new GameEngine(adjustedRating, BOT_RATINGS[difficulty], tc);
    const evaluator = evaluators[difficulty];
    const bot = new BotPlayer({ color: botColor, difficulty, evaluator });

    const entry: BotGame = {
      gameId,
      game,
      bot,
      humanSocket,
      humanColor,
      difficulty,
      tc,
      moveHistory: [],
    };
    this.botGames.set(gameId, entry);

    game.startTimeoutCheck({
      onTimeout: () => {
        this.broadcastToHuman(gameId);
        this.disposeBotGame(gameId);
      },
      onTick: () => {
        this.broadcastClock(gameId);
      },
    });

    this.setupHandlers(gameId, entry);

    const humanProfile = playerStore.getOrCreate(humanSocket.id);
    const botProfile = playerStore.createBotProfile(difficulty, BOT_RATINGS[difficulty]);
    const odds = await calculateOdds(game.getOddsInput());
    const bestMoves = await game.getBestMoves();

    humanSocket.emit("game_start", {
      ...game.getPublicState(humanColor),
      liveScores: game.getLiveScores(),
      color: humanColor,
      gameId,
      playerProfile: humanProfile,
      opponentProfile: botProfile,
      odds,
      bestMoves: { [humanColor]: bestMoves[humanColor], [humanColor === "white" ? "black" : "white"]: [] },
    });

    return { gameId, humanColor };
  }

  private setupHandlers(gameId: string, entry: BotGame): void {
    const { humanSocket, humanColor } = entry;

    const playMoveHandler = async ({ gameId: gid, card, move }: { gameId: string; card: string; move: string }) => {
      if (gid !== gameId) return;
      if (entry.game.isOver()) return;
      if (entry.game.getState().turn !== humanColor) return;

      const stateBefore = entry.game.getState();
      entry.moveHistory.push({
        fen: stateBefore.fen,
        move,
        color: humanColor,
        cardRank: card.slice(0, -1),
        cardSuit: card.slice(-1),
      });

      const result = entry.game.playCard(card, move);
      if (result.success) {
        brain.recordPlayerMove(humanSocket.id, move, stateBefore.fen, { rank: card.slice(0, -1) as any, suit: card.slice(-1) as any }, humanColor, true);

        this.broadcastToHuman(gameId);

        if (entry.game.isOver()) {
          await this.handleGameOver(gameId, entry);
          this.disposeBotGame(gameId);
        } else {
          const tip = await brain.getCoachingTip(
            entry.game.getState().fen,
            humanColor === "white" ? entry.game.getState().white.hand : entry.game.getState().black.hand,
            humanColor === "white" ? entry.game.getState().white.scorePile : entry.game.getState().black.scorePile,
            humanColor,
            entry.moveHistory.length,
          );
          if (tip) {
            humanSocket.emit("coaching_tip", tip);
          }
          this.scheduleBotTurn(gameId);
        }
      } else {
        humanSocket.emit("move_error", { error: result.error });
      }
    };

    const resignHandler = ({ gameId: gid }: { gameId: string }) => {
      if (gid !== gameId) return;
      entry.game.resign(humanColor);
      this.broadcastToHuman(gameId);
      this.handleGameOver(gameId, entry);
      this.disposeBotGame(gameId);
    };

    const rematchRequestHandler = ({ gameId: gid }: { gameId: string }) => {
      if (gid !== gameId) return;
      if (!entry.game.isOver()) return;
      brain.persistPlayer(humanSocket.id);
      this.disposeBotGame(gameId);
      this.createBotGame(humanSocket, humanSocket.id, entry.difficulty, entry.tc);
    };

    const undoMoveHandler = ({ gameId: gid }: { gameId: string }) => {
      if (gid !== gameId) return;
      if (entry.game.isOver()) return;
      const undid1 = entry.game.undoLastMove();
      if (undid1) {
        entry.game.undoLastMove();
        entry.moveHistory.pop();
        entry.moveHistory.pop();
      }
      this.broadcastToHuman(gameId);
    };

    const chatMessageHandler = ({ gameId: gid, text }: { gameId: string; text: string }) => {
      if (gid !== gameId) return;
      const profile = playerStore.getOrCreate(humanSocket.id);
      const msg: ChatMessage = {
        id: uuid(),
        senderId: humanSocket.id,
        senderName: profile.displayName,
        text: text.slice(0, 200),
        timestamp: Date.now(),
      };
      humanSocket.emit("chat_message", msg);
    };

    const disconnectHandler = () => {
      brain.persistPlayer(humanSocket.id);
      this.disposeByHumanId(humanSocket.id);
    };

    humanSocket.on("play_move", playMoveHandler);
    humanSocket.on("resign", resignHandler);
    humanSocket.on("rematch_request", rematchRequestHandler);
    humanSocket.on("undo_move", undoMoveHandler);
    humanSocket.on("chat_message", chatMessageHandler);
    humanSocket.on("disconnect", disconnectHandler);

    this.socketHandlers.set(gameId, { playMove: playMoveHandler, resign: resignHandler, rematchRequest: rematchRequestHandler, undoMove: undoMoveHandler, chatMessage: chatMessageHandler, disconnect: disconnectHandler });
  }

  private async handleGameOver(gameId: string, entry: BotGame): Promise<void> {
    const { humanSocket, humanColor, difficulty } = entry;

    brain.persistPlayer(humanSocket.id);

    const puzzles = await brain.generatePuzzlesFromHistory(
      entry.moveHistory.map((m) => ({ fen: m.fen, move: m.move, color: m.color })),
      difficulty,
    );
    if (puzzles.length > 0) {
      humanSocket.emit("puzzles", { puzzles: puzzles.slice(0, 3) });
    }

    if (brain.getLLMCoach().isAvailable()) {
      try {
        const scores = entry.game.getScores();
        const playerScore = humanColor === "white"
          ? scores?.whiteTotal ?? 0
          : scores?.blackTotal ?? 0;
        const report = await brain.analyzeGameWithLLM(
          entry.moveHistory.map((m) => ({
            fen: m.fen,
            move: m.move,
            card: { rank: m.cardRank as any, suit: m.cardSuit as any },
            color: m.color,
          })),
          humanColor,
          playerScore,
          brain.getPlayerModel(humanSocket.id).estimatedSkill,
        );
        if (report.summary) {
          humanSocket.emit("game_analysis", { summary: report.summary, accuracy: report.chessAccuracy, mistakes: report.mistakes.length });
        }
      } catch {
        // Analysis failure is non-fatal.
      }
    }
  }

  private async broadcastToHuman(gameId: string): Promise<void> {
    const entry = this.botGames.get(gameId);
    if (!entry) return;

    const { game, humanSocket, humanColor, difficulty } = entry;
    const bestMoves = game.isOver() ? { white: [], black: [] } : await game.getBestMoves();
    const odds = await calculateOdds(game.getOddsInput());
    const humanProfile = playerStore.getOrCreate(humanSocket.id);
    const botProfile = playerStore.createBotProfile(difficulty, BOT_RATINGS[difficulty]);

    humanSocket.emit("game_update", {
      ...game.getPublicState(humanColor),
      liveScores: game.getLiveScores(),
      bestMoves,
      odds,
      playerProfile: humanProfile,
      opponentProfile: botProfile,
    });

    if (game.isOver()) {
      humanSocket.emit("game_over", { result: game.getResult(), scores: game.getScores() });
    }
  }

  private broadcastClock(gameId: string): void {
    const entry = this.botGames.get(gameId);
    if (!entry) return;
    const { game, humanSocket } = entry;
    if (game.isOver()) return;

    const clock = game.getClockState();
    humanSocket.emit("clock_tick", { gameId, ...clock });
  }

  private scheduleBotTurn(gameId: string): void {
    const entry = this.botGames.get(gameId);
    if (!entry) return;

    const { game, bot } = entry;
    if (game.isOver()) return;
    if (game.getState().turn !== bot.color) return;

    bot.playTurn(game).then(() => {
      if (!this.botGames.has(gameId)) return;
      this.broadcastToHuman(gameId);
      if (entry.game.isOver()) {
        this.handleGameOver(gameId, entry);
        this.disposeBotGame(gameId);
      }
    });
  }

  disposeBotGame(gameId: string): void {
    const entry = this.botGames.get(gameId);
    if (!entry) return;

    entry.game.dispose();
    entry.bot.dispose();

    const handlers = this.socketHandlers.get(gameId);
    if (handlers) {
      entry.humanSocket.off("play_move", handlers.playMove);
      entry.humanSocket.off("resign", handlers.resign);
      entry.humanSocket.off("rematch_request", handlers.rematchRequest);
      entry.humanSocket.off("undo_move", handlers.undoMove);
      entry.humanSocket.off("chat_message", handlers.chatMessage);
      entry.humanSocket.off("disconnect", handlers.disconnect);
      this.socketHandlers.delete(gameId);
    }

    this.botGames.delete(gameId);
  }

  disposeByHumanId(humanPlayerId: string): void {
    const toRemove: string[] = [];
    for (const [gameId, entry] of this.botGames) {
      if (entry.humanSocket.id === humanPlayerId) {
        toRemove.push(gameId);
      }
    }
    for (const gameId of toRemove) {
      this.disposeBotGame(gameId);
    }
  }

  static isBot(playerId: string): boolean {
    return playerId.startsWith("bot-");
  }

  triggerBotTurn(gameId: string): void {
    const entry = this.botGames.get(gameId);
    if (!entry) return;

    const { game, bot } = entry;
    if (game.getState().turn === bot.color && !game.isOver()) {
      bot.playTurn(game).then(() => {
        if (this.botGames.has(gameId)) {
          this.broadcastToHuman(gameId);
          if (entry.game.isOver()) {
            this.handleGameOver(gameId, entry);
            this.disposeBotGame(gameId);
          }
        }
      });
    }
  }
}
