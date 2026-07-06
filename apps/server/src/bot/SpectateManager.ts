import { GameEngine } from "../GameEngine";
import { BotPlayer } from "./BotPlayer";
import { evaluators } from "./evaluators";
import { calculateOdds } from "../odds";
import { playerStore } from "../PlayerStore";
import type { BotDifficulty, Color, TimeControl, Card } from "@checkker/shared";
import type { Socket } from "socket.io";

interface SpectateMove {
  fen: string;
  move: string;
  card: string;
  color: Color;
  whiteHand: Card[];
  blackHand: Card[];
  whiteScorePile: Card[];
  blackScorePile: Card[];
  turn: Color;
  moveIndex: number;
}

interface SpectateGame {
  gameId: string;
  game: GameEngine;
  whiteBot: BotPlayer;
  blackBot: BotPlayer;
  spectatorSocket: Socket;
  paused: boolean;
  moveHistory: SpectateMove[];
  disposed: boolean;
  resumeResolve: (() => void) | null;
}

const BOT_RATINGS: Record<BotDifficulty, number> = {
  beginner: 400,
  intermediate: 900,
  advanced: 1400,
  master: 1900,
};

const DELAY_RANGES: Record<BotDifficulty, [number, number]> = {
  beginner: [1000, 5000],
  intermediate: [2000, 3500],
  advanced: [1500, 3000],
  master: [2000, 4000],
};

function randomDelay(difficulty: BotDifficulty): number {
  const [min, max] = DELAY_RANGES[difficulty];
  return min + Math.random() * (max - min);
}

export class SpectateManager {
  private games = new Map<string, SpectateGame>();

  async createSpectateGame(
    socket: Socket,
    whiteDifficulty: BotDifficulty,
    blackDifficulty: BotDifficulty,
    tc: TimeControl,
  ): Promise<void> {
    const game = new GameEngine(BOT_RATINGS[whiteDifficulty], BOT_RATINGS[blackDifficulty], tc);
    const gameId = `spectate-${Date.now()}`;

    const whiteBot = new BotPlayer({
      color: "white",
      difficulty: whiteDifficulty,
      evaluator: evaluators[whiteDifficulty],
      delayMs: 0,
    });

    const blackBot = new BotPlayer({
      color: "black",
      difficulty: blackDifficulty,
      evaluator: evaluators[blackDifficulty],
      delayMs: 0,
    });

    const entry: SpectateGame = {
      gameId,
      game,
      whiteBot,
      blackBot,
      spectatorSocket: socket,
      paused: true,
      moveHistory: [],
      disposed: false,
      resumeResolve: null,
    };

    this.games.set(gameId, entry);

    const state = game.getState();
    const odds = await calculateOdds(game.getOddsInput());

    const whiteProfile = playerStore.createBotProfile(whiteDifficulty, BOT_RATINGS[whiteDifficulty]);
    const blackProfile = playerStore.createBotProfile(blackDifficulty, BOT_RATINGS[blackDifficulty]);

    socket.emit("spectate_game_start", {
      gameId,
      fen: state.fen,
      turn: state.turn,
      whiteHand: state.white.hand,
      blackHand: state.black.hand,
      whiteScorePile: state.white.scorePile,
      blackScorePile: state.black.scorePile,
      whiteProfile,
      blackProfile,
      odds,
      whiteDifficulty,
      blackDifficulty,
      timeControl: tc,
    });

    this.gameLoop(gameId);
  }

  private async gameLoop(gameId: string): Promise<void> {
    const entry = this.games.get(gameId);
    if (!entry) return;

    while (!entry.disposed && !entry.game.isOver()) {
      if (entry.paused) {
        await new Promise<void>((resolve) => {
          entry.resumeResolve = resolve;
        });
        entry.resumeResolve = null;
        if (entry.disposed) break;
        continue;
      }

      const state = entry.game.getState();
      const currentBot = state.turn === "white" ? entry.whiteBot : entry.blackBot;
      const difficulty = currentBot.difficulty;

      const delay = randomDelay(difficulty);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));

      if (entry.disposed || entry.paused) continue;
      if (entry.game.isOver()) break;

      await this.executeBotMove(entry, currentBot);

      if (entry.disposed) break;

      const stateAfter = entry.game.getState();
      const lastMove = stateAfter.moveHistory[stateAfter.moveHistory.length - 1];

      if (lastMove) {
        const moveEntry: SpectateMove = {
          fen: stateAfter.fen,
          move: lastMove.move,
          card: `${lastMove.card.rank}${lastMove.card.suit}`,
          color: lastMove.color,
          whiteHand: stateAfter.white.hand,
          blackHand: stateAfter.black.hand,
          whiteScorePile: stateAfter.white.scorePile,
          blackScorePile: stateAfter.black.scorePile,
          turn: stateAfter.turn,
          moveIndex: entry.moveHistory.length,
        };
        entry.moveHistory.push(moveEntry);

        const odds = await calculateOdds(entry.game.getOddsInput());

        entry.spectatorSocket.emit("spectate_move", {
          ...moveEntry,
          odds,
          drawPileCount: stateAfter.drawPile.length,
        });
      }

      if (entry.game.isOver()) {
        const result = entry.game.getResult();
        const scores = entry.game.getScores();
        entry.spectatorSocket.emit("spectate_game_over", { result, scores });
        this.dispose(gameId);
        return;
      }
    }
  }

  private async executeBotMove(entry: SpectateGame, bot: BotPlayer): Promise<void> {
    const game = entry.game;
    const state = game.getPublicState(bot.color) as {
      fen: string;
      turn: Color;
      hand: Card[];
      scorePile: Card[];
      drawPileCount: number;
    };

    if (state.turn !== bot.color) return;

    const { Chess, getLegalMovesForHand } = await import("@checkker/chess");
    const chess = new Chess(state.fen);
    const legalMoves = getLegalMovesForHand(chess, state.hand);

    const allStuck = legalMoves.every((lm) => lm.moves.length === 0);
    if (allStuck) {
      game.resign(bot.color);
      return;
    }

    const evaluator = evaluators[bot.difficulty];
    const result = await evaluator.pickMove(state.fen, state.hand, legalMoves, bot.color, state.scorePile, state.drawPileCount);
    if (!result) {
      game.resign(bot.color);
      return;
    }

    const playResult = game.playCard(result.cardId, result.move);
    if (!playResult.success) {
      console.error(`[SpectateManager] playCard failed: ${playResult.error}`);
    }
  }

  pause(gameId: string): void {
    const entry = this.games.get(gameId);
    if (!entry || entry.disposed) return;
    entry.paused = true;
  }

  resume(gameId: string): void {
    const entry = this.games.get(gameId);
    if (!entry || entry.disposed) return;
    entry.paused = false;
    if (entry.resumeResolve) {
      entry.resumeResolve();
    }
  }

  async stepForward(gameId: string): Promise<void> {
    const entry = this.games.get(gameId);
    if (!entry || entry.disposed || !entry.paused) return;
    if (entry.game.isOver()) return;

    const state = entry.game.getState();
    const currentBot = state.turn === "white" ? entry.whiteBot : entry.blackBot;

    await this.executeBotMove(entry, currentBot);

    const stateAfter = entry.game.getState();
    const lastMove = stateAfter.moveHistory[stateAfter.moveHistory.length - 1];

    if (lastMove) {
      const moveEntry: SpectateMove = {
        fen: stateAfter.fen,
        move: lastMove.move,
        card: `${lastMove.card.rank}${lastMove.card.suit}`,
        color: lastMove.color,
        whiteHand: stateAfter.white.hand,
        blackHand: stateAfter.black.hand,
        whiteScorePile: stateAfter.white.scorePile,
        blackScorePile: stateAfter.black.scorePile,
        turn: stateAfter.turn,
        moveIndex: entry.moveHistory.length,
      };
      entry.moveHistory.push(moveEntry);

      const odds = await calculateOdds(entry.game.getOddsInput());

      entry.spectatorSocket.emit("spectate_move", {
        ...moveEntry,
        odds,
        drawPileCount: stateAfter.drawPile.length,
      });
    }

    if (entry.game.isOver()) {
      const result = entry.game.getResult();
      const scores = entry.game.getScores();
      entry.spectatorSocket.emit("spectate_game_over", { result, scores });
      this.dispose(gameId);
    }
  }

  stepBackward(gameId: string, currentIndex: number): void {
    const entry = this.games.get(gameId);
    if (!entry || entry.disposed || !entry.paused) return;

    const targetIndex = Math.max(-1, currentIndex - 1);

    if (targetIndex < 0) {
      entry.spectatorSocket.emit("spectate_position", {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moveIndex: -1,
        whiteHand: entry.game.getState().white.hand,
        blackHand: entry.game.getState().black.hand,
        whiteScorePile: [],
        blackScorePile: [],
        turn: "white" as Color,
      });
      return;
    }

    const histEntry = entry.moveHistory[targetIndex];
    if (histEntry) {
      entry.spectatorSocket.emit("spectate_position", {
        fen: histEntry.fen,
        moveIndex: targetIndex,
        whiteHand: histEntry.whiteHand,
        blackHand: histEntry.blackHand,
        whiteScorePile: histEntry.whiteScorePile,
        blackScorePile: histEntry.blackScorePile,
        turn: histEntry.turn,
      });
    }
  }

  dispose(gameId: string): void {
    const entry = this.games.get(gameId);
    if (!entry) return;
    entry.disposed = true;
    entry.whiteBot.dispose();
    entry.blackBot.dispose();
    entry.game.dispose();
    if (entry.resumeResolve) {
      entry.resumeResolve();
    }
    this.games.delete(gameId);
  }

  disposeBySocket(socketId: string): void {
    const toRemove: string[] = [];
    for (const [gameId, entry] of this.games) {
      if (entry.spectatorSocket.id === socketId) {
        toRemove.push(gameId);
      }
    }
    for (const gameId of toRemove) {
      this.dispose(gameId);
    }
  }
}
