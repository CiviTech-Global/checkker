import { Chess } from "chess.js";
import { evaluateScorePile } from "@checkker/poker";
import type { Card, Color } from "@checkker/shared";
import type { HybridEvaluator } from "../evaluator/HybridEvaluator";
import type { GameReport, CoachingTip, SkillGraph } from "../types";

interface HistoryEntry {
  fen: string;
  move: string;
  card: Card;
  color: Color;
}

export class PostGameAnalyzer {
  private evaluator: HybridEvaluator;

  constructor(evaluator: HybridEvaluator) {
    this.evaluator = evaluator;
  }

  async analyze(
    history: HistoryEntry[],
    playerColor: Color,
    finalScore: number,
    rating: number,
  ): Promise<GameReport> {
    const mistakes: GameReport["mistakes"] = [];
    const keyMoments: GameReport["keyMoments"] = [];
    let totalAccuracy = 0;
    let moveCount = 0;

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      if (entry.color !== playerColor) continue;

      moveCount++;

      const chess = new Chess(entry.fen);
      const legalMoves = chess.moves({ verbose: false });

      let bestScore = -Infinity;
      let bestMove = "";
      for (const move of legalMoves) {
        const clone = new Chess(entry.fen);
        clone.move(move);
        const score = await this.evaluator.evaluateChess(clone.fen());
        if (entry.color === "black") {
          if (-score > bestScore) { bestScore = -score; bestMove = move; }
        } else {
          if (score > bestScore) { bestScore = score; bestMove = move; }
        }
      }

      const clone = new Chess(entry.fen);
      clone.move(entry.move);
      const actualScore = await this.evaluator.evaluateChess(clone.fen());
      const actual = entry.color === "black" ? -actualScore : actualScore;

      const accuracy = Math.max(0, 100 - Math.max(0, (bestScore - actual) / 10));
      totalAccuracy += accuracy;

      const scoreDelta = actual - bestScore;
      if (scoreDelta < -50) {
        mistakes.push({
          moveNumber: i + 1,
          move: entry.move,
          description: scoreDelta < -200
            ? `Blunder! Lost ${Math.round(-scoreDelta / 100)} pawns of advantage.`
            : scoreDelta < -100
              ? `Major mistake. Lost ${Math.round(-scoreDelta / 100)} pawns.`
              : `Minor inaccuracy. Position worsened by ${Math.round(-scoreDelta / 100)} pawns.`,
          severity: scoreDelta < -200 ? "blunder" : scoreDelta < -100 ? "major" : "minor",
          suggestedMove: bestMove !== entry.move ? bestMove : undefined,
        });
      }

      if (Math.abs(scoreDelta) > 30) {
        keyMoments.push({
          moveNumber: i + 1,
          description: scoreDelta > 0
            ? `Gained ${Math.round(scoreDelta / 100)} pawns of advantage.`
            : `Lost ${Math.round(-scoreDelta / 100)} pawns of advantage.`,
          scoreDelta: Math.round(scoreDelta / 100),
        });
      }
    }

    const chessAccuracy = moveCount > 0 ? Math.round(totalAccuracy / moveCount) : 50;

    const tips: CoachingTip[] = [];
    if (mistakes.length > 3) {
      tips.push({
        text: "You made several inaccuracies. Try the tutorial to strengthen your fundamentals.",
        category: "general",
        severity: "important",
      });
    }
    if (mistakes.some((m) => m.severity === "blunder")) {
      tips.push({
        text: "Review positions before moving. Ask yourself: 'Is my piece safe there?'",
        category: "general",
        severity: "critical",
      });
    }
    if (rating < 1200) {
      tips.push({
        text: "Focus on controlling the center and developing pieces in the opening.",
        category: "opening",
        severity: "important",
      });
    }

    const summary = chessAccuracy >= 90
      ? "Excellent game! Your play was highly accurate."
      : chessAccuracy >= 75
        ? "Good game with some room for improvement in tactics."
        : chessAccuracy >= 60
          ? "Decent game. Focus on reducing mistakes to level up."
          : "You're learning! Review the mistakes below and practice more.";

    // Compute skill graph
    const openingMoves = history.filter((_, i) => i < 10 && history[i].color === playerColor);
    const endgameMoves = history.filter((_, i) => i > history.length * 0.7 && history[i].color === playerColor);
    const openingScore = openingMoves.length > 0 ? Math.min(100, chessAccuracy + 10) : 50;
    const endgameScore = endgameMoves.length > 0 ? Math.min(100, chessAccuracy - 5) : 35;

    const skillGraph: SkillGraph = {
      opening: Math.round(openingScore),
      middlegame: Math.round(chessAccuracy),
      endgame: Math.round(endgameScore),
      cards: 50,
      poker: Math.round(50),
    };

    const weaknessRadar: string[] = [];
    if (skillGraph.opening < 50) weaknessRadar.push("Opening play");
    if (skillGraph.endgame < 50) weaknessRadar.push("Endgame technique");
    if (mistakes.length > 3) weaknessRadar.push("Tactical awareness");
    if (skillGraph.cards < 50) weaknessRadar.push("Card management");

    const improvementSuggestions: string[] = [];
    if (weaknessRadar.includes("Opening play")) {
      improvementSuggestions.push("Study opening principles: control the center, develop pieces, castle early.");
    }
    if (weaknessRadar.includes("Tactical awareness")) {
      improvementSuggestions.push("Practice tactical puzzles to spot forks, pins, and skewers.");
    }
    if (weaknessRadar.includes("Endgame technique")) {
      improvementSuggestions.push("Learn basic endgame patterns: king and pawn endings, opposition.");
    }

    const styleProfile = chessAccuracy >= 80
      ? "positional" as const
      : mistakes.some((m) => m.severity === "blunder")
        ? "tactical" as const
        : "balanced" as const;

    return {
      summary,
      playerRating: rating,
      chessAccuracy,
      pokerEfficiency: 50,
      keyMoments: keyMoments.slice(-5),
      mistakes,
      tips,
      skillGraph,
      weaknessRadar,
      improvementSuggestions,
      styleProfile,
    };
  }
}
