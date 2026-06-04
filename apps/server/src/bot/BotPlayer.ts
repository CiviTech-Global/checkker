import { Chess, getLegalMovesForHand } from "@checkker/chess";
import { type BotDifficulty, type Card, type Color } from "@checkker/shared";
import type { GameEngine } from "../GameEngine";
import type { MoveEvaluator } from "./evaluators";

export interface BotPlayerOptions {
  color: Color;
  difficulty: BotDifficulty;
  delayMs?: number;
  evaluator: MoveEvaluator;
}

const DEFAULT_DELAYS: Record<BotDifficulty, number> = {
  beginner: 3000,
  intermediate: 2000,
  advanced: 1500,
  master: 1000,
};

export class BotPlayer {
  readonly id: string;
  readonly color: Color;
  readonly difficulty: BotDifficulty;
  private thinking = false;
  private delayMs: number;
  private evaluator: MoveEvaluator;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: BotPlayerOptions) {
    this.id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.color = options.color;
    this.difficulty = options.difficulty;
    this.evaluator = options.evaluator;
    this.delayMs = options.delayMs ?? DEFAULT_DELAYS[options.difficulty];
  }

  async playTurn(game: GameEngine): Promise<void> {
    if (this.thinking) return;
    this.thinking = true;

    try {
      if (game.isOver()) return;

      const state = game.getPublicState(this.color) as {
        fen: string;
        turn: Color;
        hand: Card[];
        scorePile: Card[];
        drawPileCount: number;
      };
      if (state.turn !== this.color) return;

      const chess = new Chess(state.fen);
      const legalMoves = getLegalMovesForHand(chess, state.hand);

      const allStuck = legalMoves.every((lm) => lm.moves.length === 0);
      if (allStuck) {
        game.resign(this.color);
        return;
      }

      const result = await this.evaluator.pickMove(state.fen, state.hand, legalMoves, this.color, state.scorePile, state.drawPileCount);
      if (!result) {
        game.resign(this.color);
        return;
      }

      await new Promise<void>((resolve) => {
        this.timeoutId = setTimeout(() => {
          this.timeoutId = null;
          if (game.isOver()) {
            resolve();
            return;
          }
          const playResult = game.playCard(result.cardId, result.move);
          if (!playResult.success) {
            console.error(`[BotPlayer ${this.id}] playCard failed: ${playResult.error}`);
          }
          resolve();
        }, this.delayMs);
      });
    } catch (error) {
      console.error(`[BotPlayer ${this.id}] Error during playTurn:`, error);
    } finally {
      this.thinking = false;
    }
  }

  dispose(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.thinking = false;
  }
}
