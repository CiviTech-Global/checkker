import { Chess } from "chess.js";
import { type Card, cardId } from "@checkker/shared";
import type { LocalGameEngine } from "./LocalGameEngine";

export type LocalBotDifficulty = "beginner" | "intermediate" | "advanced";

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

interface CandidateMove {
  card: Card;
  move: string;
  score: number;
}

/**
 * Simple offline bot. Scores each (card, move) pair:
 * - material gained by the capture
 * - small bonus for giving check / checkmate
 * - beginner adds heavy noise, advanced adds almost none
 */
export function pickBotMove(
  engine: LocalGameEngine,
  difficulty: LocalBotDifficulty
): { cardId: string; move: string } | null {
  const legal = engine.getLegalMoves();
  const candidates: CandidateMove[] = [];
  const chess = engine.getChess();
  const fen = chess.fen();

  for (const group of legal) {
    for (const move of group.moves) {
      const probe = new Chess(fen);
      let score = 0;
      try {
        const result = probe.move(move);
        if (result.captured) score += PIECE_VALUE[result.captured] ?? 0;
        if (probe.isCheckmate()) score += 100;
        else if (probe.isCheck()) score += 0.5;
        // Don't hang the moved piece to a pawn for nothing (cheap heuristic):
        // penalize moving the queen early at low depth randomness instead.
      } catch {
        continue;
      }
      candidates.push({ card: group.card, move, score });
    }
  }

  if (candidates.length === 0) return null;

  const noise =
    difficulty === "beginner" ? 6 : difficulty === "intermediate" ? 2 : 0.5;
  let best: CandidateMove | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const jittered = c.score + Math.random() * noise;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = c;
    }
  }
  if (!best) return null;
  return { cardId: cardId(best.card), move: best.move };
}
