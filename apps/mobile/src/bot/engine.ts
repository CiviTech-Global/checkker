import { Chess } from "chess.js";
import { getLegalMovesForHand } from "@checkker/chess";
import type { Card } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import type { BotConfiguration, BotMaturity, BotStrategy } from "@checkker/shared";
import {
  applyMaturityToConfig,
  getEvaluationMultiplier,
  getStrategyWeights,
} from "@checkker/shared";

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const DIFFICULTY_NOISE: Record<string, number> = {
  beginner: 6,
  intermediate: 2,
  advanced: 0.5,
  master: 0.1,
};

interface Candidate {
  card: Card;
  move: string;
  score: number;
}

export function pickOnlineBotMove({
  fen,
  hand,
  config,
  maturity,
  myColor = "white",
}: {
  fen: string;
  hand: Card[];
  config: BotConfiguration;
  maturity: BotMaturity;
  myColor?: "white" | "black";
}): { cardId: string; move: string } | null {
  const effective = applyMaturityToConfig(config, maturity);
  const weights = getStrategyWeights(effective.strategy as BotStrategy);
  const multiplier = getEvaluationMultiplier(maturity);
  const baseNoise = DIFFICULTY_NOISE[effective.difficulty] ?? 2;
  const noise = baseNoise * (1 - effective.patience / 200);
  const candidatePoolSize = 3 + Math.floor(effective.deepThinking / 15);

  const chess = new Chess(fen);
  const groups = getLegalMovesForHand(chess, hand);
  const candidates: Candidate[] = [];

  for (const group of groups) {
    for (const move of group.moves) {
      const probe = new Chess(fen);
      let captured: { type: string } | null | undefined = null;
      try {
        captured = probe.get(move.slice(2, 4) as any) as { type: string } | null;
        probe.move({
          from: move.slice(0, 2),
          to: move.slice(2, 4),
          promotion: move.length >= 5 ? move.slice(4, 5) : undefined,
        });
      } catch {
        continue;
      }

      let score = 0;
      if (captured) {
        score += (PIECE_VALUE[captured.type.toLowerCase()] ?? 0) * weights.captureBonus;
      }
      if (probe.isCheckmate()) {
        score += 100 * weights.checkBonus;
      } else if (probe.isCheck()) {
        score += 0.5 * weights.checkBonus;
      }

      const to = move.slice(2, 4);
      const attackers = countAttackers(probe, to, myColor === "white" ? "b" : "w");
      if (attackers > 0) {
        score -= attackers * weights.safetyPenalty;
      }

      score *= multiplier;
      score *= 1 + (effective.riskTolerance - 50) / 200;

      candidates.push({ card: group.card, move, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const pool = candidates.slice(0, Math.max(1, Math.min(candidatePoolSize, candidates.length)));

  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const c of pool) {
    const jittered = c.score + Math.random() * noise;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = c;
    }
  }

  if (!best) return null;
  return { cardId: cardId(best.card), move: best.move };
}

function countAttackers(board: Chess, square: string, color: "w" | "b"): number {
  // After our move it's the opponent's turn, so generate_moves returns their moves.
  let count = 0;
  const moves = board.moves({ square, verbose: true } as any);
  for (const m of moves as any[]) {
    if (m.color === color && m.to === square) {
      count++;
    }
  }
  return count;
}

export function isEndgame(fen: string): boolean {
  const placement = fen.split(" ")[0];
  let queens = 0;
  let heavy = 0;
  for (const char of placement) {
    const lower = char.toLowerCase();
    if (lower === "q") queens++;
    if (lower === "r" || lower === "q") heavy++;
  }
  return queens === 0 || heavy <= 3;
}
