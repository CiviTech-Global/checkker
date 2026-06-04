import { Chess } from "chess.js";
import type { BotDifficulty, Card, Color } from "@checkker/shared";
import { createEngine } from "../engine/factory";
import type { Engine } from "../engine/Engine";
import type { AnalyzedMove } from "../types";

export interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  difficulty: BotDifficulty;
  description: string;
  category: "tactical" | "positional" | "checkmate" | "card_economy";
  rating: number;
}

export interface PuzzleConfig {
  minScoreGap: number;
  maxDepth: number;
  maxCandidates: number;
}

export class PuzzleGenerator {
  private engine: Engine;

  constructor() {
    this.engine = createEngine("heuristic");
  }

  private readonly DEFAULT_CONFIG: PuzzleConfig = {
    minScoreGap: 150,
    maxDepth: 3,
    maxCandidates: 5,
  };

  async generateFromPosition(
    fen: string,
    color: Color,
    difficulty: BotDifficulty = "intermediate",
    config?: Partial<PuzzleConfig>,
  ): Promise<Puzzle | null> {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    const chess = new Chess(fen);
    const allMoves = chess.moves({ verbose: false });

    if (allMoves.length < 2) return null;

    const scored: Array<{ move: string; score: number }> = [];

    for (const move of allMoves) {
      const clone = new Chess(fen);
      clone.move(move);
      const evalResult = await this.engine.evaluate(clone.fen());
      let score = evalResult.score;

      if (color === "black") score = -score;

      const isCheck = clone.isCheck();
      if (isCheck) score += 50;

      const isCapture = clone.get(move.slice(2, 4) as any) !== null;
      if (isCapture) score += 20;

      scored.push({ move, score });
    }

    scored.sort((a, b) => b.score - a.score);

    if (scored.length < 2) return null;

    const bestScore = scored[0].score;
    const secondScore = scored[1].score;
    const scoreGap = bestScore - secondScore;

    if (scoreGap < cfg.minScoreGap) return null;

    const solution = await this.findSolutionLine(fen, scored[0].move, cfg.maxDepth);

    if (!solution || solution.length === 0) return null;

    const isCheckmateLine = solution.some((m) => {
      const c = new Chess(fen);
      try {
        for (const s of solution) c.move(s);
      } catch {}
      return c.isCheckmate();
    });

    let category: Puzzle["category"] = "tactical";
    if (isCheckmateLine) category = "checkmate";
    else if (scored[0].move.includes("capture") || chess.get(scored[0].move.slice(2, 4) as any)) category = "tactical";
    else category = "positional";

    const rating = this.difficultyToRating(difficulty, scoreGap);

    const pieceName = chess.get(scored[0].move.slice(0, 2) as any);
    const description = isCheckmateLine
      ? "Find the checkmate!"
      : `Find the best move${category === "tactical" ? " (tactical)" : " (positional)"}`;

    return {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fen,
      solution,
      difficulty,
      description,
      category,
      rating,
    };
  }

  private async findSolutionLine(fen: string, bestMove: string, maxDepth: number): Promise<string[]> {
    const solution: string[] = [bestMove];
    const chess = new Chess(fen);

    try {
      chess.move(bestMove);
    } catch {
      return [bestMove];
    }

    const color = chess.turn() === "w" ? "black" : "white";

    for (let depth = 1; depth < maxDepth; depth++) {
      const moves = chess.moves({ verbose: false });
      if (moves.length === 0) break;

      const currentColor = chess.turn() === "w" ? "white" : "black";

      if (currentColor === color) {
        const oppMoves: Array<{ move: string; score: number }> = [];
        for (const m of moves) {
          const clone = new Chess(chess.fen());
          clone.move(m);
          const evalResult = await this.engine.evaluate(clone.fen());
          let score = evalResult.score;
          if (chess.turn() === "w") score = -score;
          oppMoves.push({ move: m, score });
        }
        oppMoves.sort((a, b) => b.score - a.score);
        if (oppMoves.length > 0) {
          const worstForUs = oppMoves[oppMoves.length - 1];
          solution.push(worstForUs.move);
          chess.move(worstForUs.move);
        }
      } else {
        const ourMoves: Array<{ move: string; score: number }> = [];
        for (const m of moves) {
          const clone = new Chess(chess.fen());
          clone.move(m);
          const evalResult = await this.engine.evaluate(clone.fen());
          let score = evalResult.score;
          if (chess.turn() === "w") score = -score;
          ourMoves.push({ move: m, score });
        }
        ourMoves.sort((a, b) => b.score - a.score);
        if (ourMoves.length > 0) {
          solution.push(ourMoves[0].move);
          chess.move(ourMoves[0].move);
        }
      }
    }

    return solution;
  }

  private difficultyToRating(difficulty: BotDifficulty, scoreGap: number): number {
    const base: Record<BotDifficulty, number> = {
      beginner: 400,
      intermediate: 900,
      advanced: 1400,
      master: 1900,
    };
    const gapBonus = Math.min(500, Math.round(scoreGap));
    return base[difficulty] + gapBonus;
  }

  async generateBatch(
    fens: string[],
    color: Color,
    difficulty: BotDifficulty = "intermediate",
    config?: Partial<PuzzleConfig>,
  ): Promise<Puzzle[]> {
    const puzzles: Puzzle[] = [];
    for (const fen of fens) {
      const puzzle = await this.generateFromPosition(fen, color, difficulty, config);
      if (puzzle) puzzles.push(puzzle);
      if (puzzles.length >= 10) break;
    }
    return puzzles;
  }

  async generateFromMoveHistory(
    history: Array<{ fen: string; move: string; color: Color }>,
    difficulty: BotDifficulty = "intermediate",
  ): Promise<Puzzle[]> {
    const puzzles: Puzzle[] = [];

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const chess = new Chess(entry.fen);
      const moves = chess.moves({ verbose: false });
      if (moves.length < 2) continue;

      const clone = new Chess(entry.fen);
      try {
        clone.move(entry.move);
      } catch {
        continue;
      }

      const playedEval = await this.engine.evaluate(clone.fen());
      let playedScore = playedEval.score;
      if (entry.color === "black") playedScore = -playedScore;

      let bestScore = -Infinity;
      let bestMove = "";
      for (const m of moves) {
        const c = new Chess(entry.fen);
        c.move(m);
        const e = await this.engine.evaluate(c.fen());
        let s = e.score;
        if (entry.color === "black") s = -s;
        if (s > bestScore) {
          bestScore = s;
          bestMove = m;
        }
      }

      const gap = bestScore - playedScore;
      if (gap > 150 && bestMove !== entry.move) {
        const puzzle: Puzzle = {
          id: `puzzle-${Date.now()}-${i}`,
          fen: entry.fen,
          solution: [bestMove],
          difficulty: gap > 300 ? "master" : gap > 200 ? "advanced" : "intermediate",
          description: gap > 300 ? "You missed a winning move!" : "There was a better move available.",
          category: "tactical",
          rating: Math.round(1000 + gap),
        };
        puzzles.push(puzzle);
      }
    }

    return puzzles;
  }

  /**
   * Generate a puzzle targeting specific player weaknesses.
   * Uses the weakness list to select appropriate puzzle categories.
   */
  async generateTargetedPuzzle(
    fen: string,
    color: Color,
    weaknesses: string[],
    difficulty: BotDifficulty = "intermediate",
  ): Promise<Puzzle | null> {
    // Adjust config based on weakness type
    const config: Partial<PuzzleConfig> = {};

    if (weaknesses.includes("positional_awareness")) {
      config.minScoreGap = 100; // Lower threshold to find more puzzles
    }
    if (weaknesses.includes("missed_captures")) {
      config.minScoreGap = 120;
    }

    const puzzle = await this.generateFromPosition(fen, color, difficulty, config);
    if (!puzzle) return null;

    // Tag the puzzle with the targeted weakness
    if (weaknesses.includes("positional_awareness")) {
      puzzle.category = "positional";
      puzzle.description = "Improve your positional awareness: find the best move.";
    } else if (weaknesses.includes("missed_captures")) {
      puzzle.category = "tactical";
      puzzle.description = "Don't miss captures: find the winning tactic.";
    } else if (weaknesses.includes("card_waste")) {
      puzzle.category = "card_economy";
      puzzle.description = "Practice card economy: choose the optimal card.";
    }

    return puzzle;
  }
}
