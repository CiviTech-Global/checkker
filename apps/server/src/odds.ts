import type { Card, GameOdds, GameResult } from "@checkker/shared";
import { evaluateScorePile } from "@checkker/poker";
import { evaluatePokerPotential } from "@checkker/ai-brain";
import { brain } from "./bot/evaluators";

/**
 * Probable-result model for Checkker (chess + poker hybrid).
 *
 * The winner of a game is whoever ends with the higher TOTAL =
 *   chess points (checkmate 30 / draw 10 / etc.) + poker points (score-pile hands).
 *
 * A chess-only evaluation is therefore only half the story and — because a raw
 * engine score swings with the side to move and with every capture — produces
 * the "it flips every turn" feeling. This model instead estimates each side's
 * EXPECTED FINAL TOTAL (chess expectation + poker expectation) from White's
 * absolute perspective, so the bar stays meaningful and stable.
 */

export interface OddsContext {
  fen: string;
  whiteScorePile?: Card[];
  blackScorePile?: Card[];
  /** Cards currently in hand — improves the poker-potential estimate. */
  whiteHand?: Card[];
  blackHand?: Card[];
  /** Cards left in the draw pile (affects how much poker upside remains). */
  drawPileCount?: number;
  /** When the game is already decided, the bar should reflect the outcome. */
  result?: GameResult | null;
}

// Chess-portion point awards (mirrors CHESS_SCORES in @checkker/shared).
const CHESS_WIN_POINTS = 30;
const CHESS_DRAW_POINTS = 10;

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Expected final poker points for one side (locked hands + realistic upside). */
function pokerExpectation(scorePile: Card[], hand: Card[], drawPileCount: number): number {
  if (scorePile.length === 0 && hand.length === 0) return 0;
  const locked = evaluateScorePile(scorePile).total;
  const potential = evaluatePokerPotential(scorePile, hand, drawPileCount).estimatedFinalScore;
  // estimatedFinalScore already blends current value with realistic draw upside,
  // and is guaranteed >= current value; never let it fall below locked points.
  return Math.max(locked, potential);
}

export async function calculateOdds(ctx: OddsContext | string): Promise<GameOdds> {
  const c: OddsContext = typeof ctx === "string" ? { fen: ctx } : ctx;
  const {
    fen,
    whiteScorePile = [],
    blackScorePile = [],
    whiteHand = [],
    blackHand = [],
    drawPileCount = 20,
    result = null,
  } = c;

  // ── Decided game: reflect the real outcome ──────────────────────────────
  if (result) {
    if (result.type === "draw" || result.type === "deckExhausted") {
      // Fall through to the point comparison below; with the chess portion
      // settled (a tie), the poker piles decide it.
    } else {
      return result.winner === "white"
        ? { whiteWinPct: 100, blackWinPct: 0, drawPct: 0 }
        : { whiteWinPct: 0, blackWinPct: 100, drawPct: 0 };
    }
  }

  // ── Chess dimension (white-relative centipawns; + = good for White) ──────
  // evaluatePosition now always returns a White-relative score, so no
  // side-to-move normalization is required.
  const cp = await brain.evaluatePosition(fen);
  const pWhiteBetter = logistic(0.0035 * cp);
  // Closer-to-equal positions are likelier to end drawn on the board.
  const chessDrawn = Math.exp(-Math.abs(cp) / 250); // 1 when equal → 0 when lopsided
  const pChessDraw = 0.25 * chessDrawn;
  const pWhiteChess = (1 - pChessDraw) * pWhiteBetter;
  const pBlackChess = (1 - pChessDraw) * (1 - pWhiteBetter);

  const whiteChessEV = CHESS_WIN_POINTS * pWhiteChess + CHESS_DRAW_POINTS * pChessDraw;
  const blackChessEV = CHESS_WIN_POINTS * pBlackChess + CHESS_DRAW_POINTS * pChessDraw;

  // ── Poker dimension (expected final score-pile points) ───────────────────
  const whitePokerEV = pokerExpectation(whiteScorePile, whiteHand, drawPileCount);
  const blackPokerEV = pokerExpectation(blackScorePile, blackHand, drawPileCount);

  // ── Combine into an expected total-point margin (White perspective) ──────
  const whiteEV = whiteChessEV + whitePokerEV;
  const blackEV = blackChessEV + blackPokerEV;
  const margin = whiteEV - blackEV;

  // Convert margin to win/draw/loss. ~7 points is a decisive margin.
  const pWhite = logistic(margin / 7);
  // Ties cluster around parity; the draw band widens as totals converge.
  const drawPct = clamp(Math.round(18 * Math.exp(-Math.abs(margin) / 6)), 2, 30);
  const remaining = 100 - drawPct;
  const whiteWinPct = Math.round(pWhite * remaining);
  const blackWinPct = remaining - whiteWinPct;

  return { whiteWinPct, blackWinPct, drawPct };
}
