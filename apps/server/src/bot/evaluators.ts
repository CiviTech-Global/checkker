import type { BotDifficulty, Card, Color, MoveEvaluation } from "@checkker/shared";
import { AIBrain, type AnalyzedMove } from "@checkker/ai-brain";
import type { LegalMovesForCard } from "@checkker/chess";

const stockfishEnabled = process.env.STOCKFISH_ENABLED === "true" || process.env.STOCKFISH_PATH !== undefined;
const storageDir = process.env.AI_BRAIN_STORAGE ?? "./data/player-models";

const brain = new AIBrain();

if (stockfishEnabled) {
  brain.configureEngine("auto");
  console.log(`[AIBrain] Stockfish engine enabled (path: ${process.env.STOCKFISH_PATH ?? "auto-find"})`);
}

if (process.env.AI_BRAIN_PERSISTENCE === "true") {
  brain.enablePersistence(storageDir);
  console.log(`[AIBrain] Player persistence enabled (dir: ${storageDir})`);
}

if (process.env.AI_COACH_PROVIDER && process.env.AI_COACH_API_KEY) {
  brain.getLLMCoach().configure({
    provider: process.env.AI_COACH_PROVIDER as any,
    apiKey: process.env.AI_COACH_API_KEY,
    model: process.env.AI_COACH_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.AI_COACH_BASE_URL ?? "https://api.openai.com/v1",
  });
  console.log(`[AIBrain] LLM coach enabled (provider: ${process.env.AI_COACH_PROVIDER})`);
}

export type { MoveEvaluation };

export interface MoveEvaluator {
  difficulty: BotDifficulty;
  pickMove(
    fen: string,
    hand: Card[],
    legalMoves: LegalMovesForCard[],
    color: Color,
    scorePile?: Card[],
    drawPileSize?: number,
  ): Promise<MoveEvaluation | null>;
}

const beginnerEvaluator: MoveEvaluator = {
  difficulty: "beginner",
  async pickMove(fen, hand, legalMoves, color, scorePile = [], drawPileSize = 20) {
    return await brain.getBestMoveForDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, "beginner");
  },
};

const intermediateEvaluator: MoveEvaluator = {
  difficulty: "intermediate",
  async pickMove(fen, hand, legalMoves, color, scorePile = [], drawPileSize = 20) {
    return await brain.getBestMoveForDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, "intermediate");
  },
};

const advancedEvaluator: MoveEvaluator = {
  difficulty: "advanced",
  async pickMove(fen, hand, legalMoves, color, scorePile = [], drawPileSize = 20) {
    return await brain.getBestMoveForDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, "advanced");
  },
};

const masterEvaluator: MoveEvaluator = {
  difficulty: "master",
  async pickMove(fen, hand, legalMoves, color, scorePile = [], drawPileSize = 20) {
    return await brain.getBestMoveForDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, "master");
  },
};

export const evaluators: Record<BotDifficulty, MoveEvaluator> = {
  beginner: beginnerEvaluator,
  intermediate: intermediateEvaluator,
  advanced: advancedEvaluator,
  master: masterEvaluator,
};

export async function getTopMoves(
  fen: string,
  hand: Card[],
  legalMoves: LegalMovesForCard[],
  color: Color,
  topN: number = 3,
  scorePile?: Card[],
  drawPileSize?: number,
): Promise<MoveEvaluation[]> {
  const analyzed = await brain.getBestMoves(fen, hand, scorePile ?? [], drawPileSize ?? 20, color, topN);
  return analyzed.map((m: AnalyzedMove) => ({
    cardId: m.cardId,
    move: m.move,
    score: m.hybridScore,
  }));
}

export async function evaluatePosition(fen: string, _forColor?: Color): Promise<number> {
  return await brain.evaluatePosition(fen);
}

export { brain };
