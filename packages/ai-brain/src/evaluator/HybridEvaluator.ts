import { Chess } from "chess.js";
import { getLegalMovesForHand } from "@checkker/chess";
import { evaluateScorePile } from "@checkker/poker";
import type { Card, Color, BotDifficulty, MoveEvaluation } from "@checkker/shared";
import type { LegalMovesForCard } from "@checkker/chess";
import { createEngine } from "../engine/factory";
import type { Engine } from "../engine/Engine";
import { evaluatePokerPotential } from "./PokerPotential";
import type { PokerAwareScore, AnalyzedMove } from "../types";

const CARD_SCORE: Record<string, number> = {
  A: 14, K: 13, Q: 12, J: 11, "10": 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
};

export class HybridEvaluator {
  private engine: Engine;

  constructor() {
    this.engine = createEngine("heuristic");
  }

  setEngine(engine: Engine): void {
    this.engine = engine;
  }

  async evaluateChess(fen: string): Promise<number> {
    const result = await this.engine.evaluate(fen);
    return result.score;
  }

  async evaluatePokerAware(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
  ): Promise<PokerAwareScore> {
    const chessScore = await this.evaluateChess(fen);
    const pokerPotential = evaluatePokerPotential(scorePile, hand, drawPileSize);

    const chessCentipawns = chessScore;
    const chessNormalized = chessCentipawns / 100;

    const pokerScore = pokerPotential.estimatedFinalScore;
    const pokerWeight = scorePile.length >= 5 ? 25 : scorePile.length * 5;

    const hybridScore = chessNormalized + (pokerScore * 2);
    const normalizedChessScore = Math.round(chessCentipawns);

    return {
      chessScore: normalizedChessScore,
      pokerPotential: pokerScore,
      hybridScore: Math.round(hybridScore * 10) / 10,
      explanation: `Chess: ${normalizedChessScore > 0 ? "+" : ""}${normalizedChessScore}cp | Poker potential: ${pokerScore}pts`,
    };
  }

  async analyzeMove(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    drawPileSize: number,
    move: string,
    card: Card,
    color: Color,
  ): Promise<{ chessScore: number; pokerImpact: number }> {
    const chess = new Chess(fen);
    try {
      chess.move(move);
    } catch {
      return { chessScore: -Infinity, pokerImpact: 0 };
    }

    const afterEval = await this.evaluateChess(chess.fen());
    const beforeEval = await this.evaluateChess(fen);

    const chessDelta = color === "white"
      ? afterEval - beforeEval
      : beforeEval - afterEval;

    const capturedPiece = chess.get(move.slice(2, 4) as any);
    const isCapture = capturedPiece !== null;

    let pokerImpact = 0;
    if (isCapture) {
      const cardValue = CARD_SCORE[card.rank] ?? 0;
      pokerImpact = cardValue >= 12 ? 2 : cardValue >= 7 ? 1 : 0;
    }

    const usedHighCard = (CARD_SCORE[card.rank] ?? 0) >= 12;
    const wastedCard = usedHighCard && !isCapture;
    if (wastedCard) pokerImpact -= 3;

    return { chessScore: chessDelta, pokerImpact };
  }

  async rankMoves(
    fen: string,
    legalMoves: LegalMovesForCard[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
    topN: number = 5,
    includeBlunderDetection: boolean = true,
  ): Promise<AnalyzedMove[]> {
    const allMoves = legalMoves.flatMap((lm) =>
      lm.moves.map((m) => ({ cardId: lm.card.rank + lm.card.suit[0], card: lm.card, move: m }))
    );
    if (allMoves.length === 0) return [];

    const oppColor = color === "white" ? "black" : "white";
    const analyzed: AnalyzedMove[] = [];

    for (const entry of allMoves) {
      const chess = new Chess(fen);
      try {
        chess.move(entry.move);
      } catch {
        continue;
      }

      const evalBefore = await this.evaluateChess(fen);
      const evalAfter = await this.evaluateChess(chess.fen());
      const chessDelta = color === "white" ? evalAfter - evalBefore : evalBefore - evalAfter;

      const pokerPotential = evaluatePokerPotential(scorePile, [], drawPileSize);
      const pokerValue = pokerPotential.estimatedFinalScore;

      const cardScore = CARD_SCORE[entry.card.rank] ?? 0;
      const isCapture = chess.get(entry.move.slice(2, 4) as any) !== null;
      const cardEfficiency = isCapture ? cardScore : -cardScore * 0.5;

      const hybridScore = chessDelta + pokerValue * 10 + cardEfficiency;

      analyzed.push({
        cardId: entry.cardId,
        move: entry.move,
        chessScore: evalAfter,
        pokerPotential: pokerValue,
        hybridScore,
        rank: 0,
        isBlunder: false,
        isBestMove: false,
      });
    }

    analyzed.sort((a, b) => b.hybridScore - a.hybridScore);

    analyzed.forEach((m, i) => {
      m.rank = i + 1;
      m.isBestMove = i === 0;
    });

    if (includeBlunderDetection && analyzed.length >= 2) {
      const bestScore = analyzed[0].hybridScore;
      for (const m of analyzed) {
        const gap = bestScore - m.hybridScore;
        if (gap > 200) m.isBlunder = true;
      }
    }

    return analyzed.slice(0, topN);
  }

  async getBestMove(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
  ): Promise<AnalyzedMove | null> {
    const chess = new Chess(fen);
    const legalMoves = getLegalMovesForHand(chess, hand);
    const ranked = await this.rankMoves(fen, legalMoves, scorePile, drawPileSize, color, 1, false);
    return ranked[0] ?? null;
  }

  async evaluateDifficulty(
    fen: string,
    hand: Card[],
    legalMoves: LegalMovesForCard[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
    difficulty: BotDifficulty,
  ): Promise<MoveEvaluation | null> {
    const engine = createEngine("heuristic");
    const allMoves = legalMoves.flatMap((lm) =>
      lm.moves.map((m) => ({ cardId: lm.card.rank + lm.card.suit[0], card: lm.card, move: m, piece: lm.piece }))
    );
    if (allMoves.length === 0) return null;

    const oppColor = color === "white" ? "black" : "white";

    const difficultyConfigs: Record<BotDifficulty, { noise: number; horizon: number; cardWastePenalty: number; aggression: number }> = {
      beginner: { noise: 0.6, horizon: 0, cardWastePenalty: 0, aggression: 0.2 },
      intermediate: { noise: 0.3, horizon: 0, cardWastePenalty: 5, aggression: 0.5 },
      advanced: { noise: 0.1, horizon: 1, cardWastePenalty: 15, aggression: 0.7 },
      master: { noise: 0, horizon: 1, cardWastePenalty: 30, aggression: 0.9 },
    };

    const config = difficultyConfigs[difficulty];
    let scoredMoves: Array<{ cardId: string; move: string; score: number }> = [];

    for (const entry of allMoves) {
      const chess = new Chess(fen);
      try {
        chess.move(entry.move);
      } catch {
        continue;
      }

      // engine.evaluate now returns a White-relative score. When Black is
      // moving we want a Black-relative score for maximization.
      let score = (await engine.evaluate(chess.fen())).score;
      if (color === "black") score = -score;

      if (config.horizon > 0) {
        const opponentReplies = chess.moves({ verbose: false });
        if (opponentReplies.length > 0) {
          let worstReplyScore = Infinity;
          for (const reply of opponentReplies.slice(0, 20)) {
            const clone = new Chess(chess.fen());
            try {
              clone.move(reply);
            } catch {
              continue;
            }
            const replyEval = (await engine.evaluate(clone.fen())).score;
            const adjusted = color === "white" ? replyEval : -replyEval;
            if (adjusted < worstReplyScore) worstReplyScore = adjusted;
          }
          if (worstReplyScore < Infinity) {
            score = score * 0.6 + worstReplyScore * 0.4;
          }
        }
      }

      if (chess.isCheck()) score += 50 * config.aggression;

      const cardScore = CARD_SCORE[entry.card.rank] ?? 0;
      const capturedPiece = chess.get(entry.move.slice(2, 4) as any);
      const isCapture = capturedPiece !== null;

      if (!isCapture && cardScore >= 11) {
        score -= config.cardWastePenalty;
      }

      if (isCapture && cardScore <= 6) {
        score += 20 * config.aggression;
      }

      if (config.noise > 0) {
        score += (Math.random() - 0.5) * config.noise * 200;
      }

      scoredMoves.push({ cardId: entry.cardId, move: entry.move, score });
    }

    if (scoredMoves.length === 0) return null;

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0];
  }
}
