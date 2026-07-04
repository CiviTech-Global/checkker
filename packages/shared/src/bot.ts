import type { BotDifficulty } from "./game";

export type BotStrategy = "balanced" | "aggressive" | "defensive" | "gambler";

export interface BotConfiguration {
  /** Whether the online/delegate bot mode is active. */
  enabled: boolean;
  /** Baseline skill tier for the bot. */
  difficulty: BotDifficulty;
  /** Overall personality / play style. */
  strategy: BotStrategy;
  /** 0–100. Higher = evaluate more candidates, wait for stronger moves/cards. */
  patience: number;
  /** 0–100. Higher = deeper look-ahead and more candidate analysis. */
  deepThinking: number;
  /** 0–100. Higher = prefer captures and complex positions even if risky. */
  riskTolerance: number;
  /** Artificial delay before sending a move, in milliseconds. */
  thinkingDelayMs: number;
  /** Auto-request rematch after a game ends. */
  autoRematch: boolean;
  /** User can tap the in-game banner to disable autoplay and take over. */
  allowTakeover: boolean;
}

export interface BotMaturity {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  /** 0–100 derived score. */
  maturityScore: number;
  /** Unlocked trait identifiers. */
  unlockedTraits: string[];
}

export interface BotTrait {
  id: string;
  name: string;
  description: string;
  condition: (maturity: BotMaturity) => boolean;
  /** Small, bounded bonus applied to evaluation. 1.0 = no effect. */
  evaluationMultiplier: number;
  /** Delay reduction in milliseconds at max effect. */
  delayReductionMs: number;
}

export const DEFAULT_BOT_CONFIG: BotConfiguration = {
  enabled: false,
  difficulty: "intermediate",
  strategy: "balanced",
  patience: 50,
  deepThinking: 40,
  riskTolerance: 50,
  thinkingDelayMs: 1500,
  autoRematch: false,
  allowTakeover: true,
};

export const DEFAULT_BOT_MATURITY: BotMaturity = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  maturityScore: 0,
  unlockedTraits: [],
};

export const BOT_TRAITS: BotTrait[] = [
  {
    id: "battle_tested",
    name: "Battle-Tested",
    description: "Played 10 online bot games.",
    condition: (m) => m.gamesPlayed >= 10,
    evaluationMultiplier: 1.02,
    delayReductionMs: 100,
  },
  {
    id: "streak_hunter",
    name: "Streak Hunter",
    description: "Reached a 5-win streak.",
    condition: (m) => m.bestStreak >= 5,
    evaluationMultiplier: 1.02,
    delayReductionMs: 100,
  },
  {
    id: "endgame_specialist",
    name: "Endgame Specialist",
    description: "Won 5 rapid or classical bot games.",
    condition: () => false, // Requires time-control tracking; client can override.
    evaluationMultiplier: 1.03,
    delayReductionMs: 150,
  },
  {
    id: "blitz_master",
    name: "Blitz Master",
    description: "Played 10 blitz or bullet bot games.",
    condition: () => false, // Requires time-control tracking; client can override.
    evaluationMultiplier: 1.03,
    delayReductionMs: 300,
  },
  {
    id: "poker_face",
    name: "Poker Face",
    description: "Built 3 full-house poker hands in bot games.",
    condition: () => false, // Client-tracked poker achievement.
    evaluationMultiplier: 1.03,
    delayReductionMs: 150,
  },
  {
    id: "grandmaster_bot",
    name: "Grandmaster Bot",
    description: "Reached 80+ maturity score.",
    condition: (m) => m.maturityScore >= 80,
    evaluationMultiplier: 1.05,
    delayReductionMs: 500,
  },
];

/**
 * Clamp a number to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate a 0–100 maturity score from the bot's history.
 */
export function calculateMaturityScore(maturity: BotMaturity): number {
  const gameBonus = Math.min(maturity.gamesPlayed * 0.5, 35);
  const winBonus = Math.min(maturity.wins * 1.0, 25);
  const streakBonus = Math.min(maturity.bestStreak * 2, 20);
  const consistencyBonus =
    maturity.currentStreak > 2 ? Math.min(maturity.currentStreak * 1.5, 20) : 0;
  return clamp(Math.floor(gameBonus + winBonus + streakBonus + consistencyBonus), 0, 100);
}

/**
 * Update unlocked traits based on current maturity.
 * Returns a new maturity object with refreshed `unlockedTraits` and `maturityScore`.
 */
export function refreshMaturity(maturity: BotMaturity): BotMaturity {
  const score = calculateMaturityScore(maturity);
  const withScore = { ...maturity, maturityScore: score };
  const unlocked = BOT_TRAITS
    .filter((trait) => trait.condition(withScore))
    .map((trait) => trait.id);
  return {
    ...maturity,
    unlockedTraits: unlocked,
    maturityScore: score,
  };
}

/**
 * Record a finished bot game and return the updated maturity.
 */
export function recordBotGameResult(
  maturity: BotMaturity,
  result: "win" | "loss" | "draw",
): BotMaturity {
  const next: BotMaturity = {
    ...maturity,
    gamesPlayed: maturity.gamesPlayed + 1,
    wins: result === "win" ? maturity.wins + 1 : maturity.wins,
    losses: result === "loss" ? maturity.losses + 1 : maturity.losses,
    draws: result === "draw" ? maturity.draws + 1 : maturity.draws,
    currentStreak:
      result === "win" ? maturity.currentStreak + 1 : result === "loss" ? 0 : maturity.currentStreak,
    bestStreak: maturity.bestStreak,
  };

  if (next.currentStreak > next.bestStreak) {
    next.bestStreak = next.currentStreak;
  }

  return refreshMaturity(next);
}

/**
 * Compute the effective evaluation multiplier from unlocked traits.
 */
export function getEvaluationMultiplier(maturity: BotMaturity): number {
  const unlockedIds = new Set(maturity.unlockedTraits);
  let multiplier = 1.0;
  for (const trait of BOT_TRAITS) {
    if (unlockedIds.has(trait.id)) {
      multiplier = Math.max(multiplier, trait.evaluationMultiplier);
    }
  }
  return multiplier;
}

/**
 * Compute the total thinking-delay reduction from unlocked traits.
 */
export function getDelayReductionMs(maturity: BotMaturity): number {
  const unlockedIds = new Set(maturity.unlockedTraits);
  let reduction = 0;
  for (const trait of BOT_TRAITS) {
    if (unlockedIds.has(trait.id)) {
      reduction = Math.max(reduction, trait.delayReductionMs);
    }
  }
  return reduction;
}

/**
 * Apply maturity-derived adjustments to a bot configuration.
 * Returns a new configuration with effective delays and search depth hints.
 */
export function applyMaturityToConfig(
  config: BotConfiguration,
  maturity: BotMaturity,
): BotConfiguration {
  const delayReduction = getDelayReductionMs(maturity);
  const multiplier = getEvaluationMultiplier(maturity);

  return {
    ...config,
    thinkingDelayMs: Math.max(500, config.thinkingDelayMs - delayReduction),
    // Deep thinking gets a small maturity bump (max +10).
    deepThinking: clamp(config.deepThinking + Math.floor(maturity.maturityScore / 10), 0, 100),
    // Risk tolerance is left as user configured; multiplier is used by the engine.
  };
}

/**
 * Strategy-specific score modifiers used by the move picker.
 */
export function getStrategyWeights(strategy: BotStrategy): {
  captureBonus: number;
  checkBonus: number;
  safetyPenalty: number;
  pokerWeight: number;
} {
  switch (strategy) {
    case "aggressive":
      return { captureBonus: 1.4, checkBonus: 1.3, safetyPenalty: 0.6, pokerWeight: 1.2 };
    case "defensive":
      return { captureBonus: 0.8, checkBonus: 0.9, safetyPenalty: 1.5, pokerWeight: 0.7 };
    case "gambler":
      return { captureBonus: 1.2, checkBonus: 1.1, safetyPenalty: 0.5, pokerWeight: 1.5 };
    case "balanced":
    default:
      return { captureBonus: 1.0, checkBonus: 1.0, safetyPenalty: 1.0, pokerWeight: 1.0 };
  }
}

/**
 * Serialize a configuration for server storage (strip runtime-only fields if any).
 */
export function serializeBotConfig(config: BotConfiguration): string {
  return JSON.stringify(config);
}

/**
 * Deserialize a configuration from server storage.
 */
export function deserializeBotConfig(json: string | null): BotConfiguration {
  if (!json) return { ...DEFAULT_BOT_CONFIG };
  try {
    const parsed = JSON.parse(json) as Partial<BotConfiguration>;
    return { ...DEFAULT_BOT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_BOT_CONFIG };
  }
}

/**
 * Serialize maturity for server storage.
 */
export function serializeBotMaturity(maturity: BotMaturity): string {
  return JSON.stringify(maturity);
}

/**
 * Deserialize maturity from server storage.
 */
export function deserializeBotMaturity(json: string | null): BotMaturity {
  if (!json) return { ...DEFAULT_BOT_MATURITY };
  try {
    const parsed = JSON.parse(json) as Partial<BotMaturity>;
    return refreshMaturity({ ...DEFAULT_BOT_MATURITY, ...parsed });
  } catch {
    return { ...DEFAULT_BOT_MATURITY };
  }
}
