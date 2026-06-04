import type { GameOdds } from "@checkker/shared";
import { brain } from "./bot/evaluators";

export async function calculateOdds(fen: string): Promise<GameOdds> {
  const whiteScore = await brain.evaluatePosition(fen);

  const k = 0.004;
  const whiteWin = 1 / (1 + Math.exp(-k * whiteScore));
  const drawPct = Math.round(Math.max(5, 30 - Math.abs(whiteScore) * 0.02));
  const remaining = 100 - drawPct;

  const whiteWinPct = Math.round(whiteWin * remaining);
  const blackWinPct = remaining - whiteWinPct;

  return {
    whiteWinPct,
    blackWinPct,
    drawPct,
  };
}
