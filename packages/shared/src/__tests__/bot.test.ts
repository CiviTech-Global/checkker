import {
  DEFAULT_BOT_CONFIG,
  DEFAULT_BOT_MATURITY,
  BOT_TRAITS,
  calculateMaturityScore,
  refreshMaturity,
  recordBotGameResult,
  getEvaluationMultiplier,
  getDelayReductionMs,
  applyMaturityToConfig,
  getStrategyWeights,
  serializeBotConfig,
  deserializeBotConfig,
  serializeBotMaturity,
  deserializeBotMaturity,
} from "../bot";
import type { BotMaturity } from "../bot";

describe("bot configuration defaults", () => {
  it("has sensible default config", () => {
    expect(DEFAULT_BOT_CONFIG.enabled).toBe(false);
    expect(DEFAULT_BOT_CONFIG.difficulty).toBe("intermediate");
    expect(DEFAULT_BOT_CONFIG.strategy).toBe("balanced");
    expect(DEFAULT_BOT_CONFIG.patience).toBe(50);
  });

  it("has zeroed default maturity", () => {
    expect(DEFAULT_BOT_MATURITY.maturityScore).toBe(0);
    expect(DEFAULT_BOT_MATURITY.unlockedTraits).toEqual([]);
  });
});

describe("maturity calculation", () => {
  it("starts at zero", () => {
    expect(calculateMaturityScore(DEFAULT_BOT_MATURITY)).toBe(0);
  });

  it("caps at 100", () => {
    const maturity: BotMaturity = {
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 200,
      wins: 200,
      bestStreak: 100,
      currentStreak: 100,
    };
    expect(calculateMaturityScore(maturity)).toBe(100);
  });

  it("increases with wins and streaks", () => {
    const afterWin = recordBotGameResult(DEFAULT_BOT_MATURITY, "win");
    expect(afterWin.maturityScore).toBeGreaterThan(0);
    expect(afterWin.currentStreak).toBe(1);
  });

  it("resets current streak on loss", () => {
    const afterWin = recordBotGameResult(DEFAULT_BOT_MATURITY, "win");
    const afterLoss = recordBotGameResult(afterWin, "loss");
    expect(afterLoss.currentStreak).toBe(0);
  });

  it("keeps best streak after a loss", () => {
    const first = recordBotGameResult(DEFAULT_BOT_MATURITY, "win");
    const second = recordBotGameResult(first, "win");
    const third = recordBotGameResult(second, "loss");
    expect(third.bestStreak).toBe(2);
    expect(third.currentStreak).toBe(0);
  });
});

describe("traits", () => {
  it("unlocks battle_tested after 10 games", () => {
    let maturity = DEFAULT_BOT_MATURITY;
    for (let i = 0; i < 10; i++) {
      maturity = recordBotGameResult(maturity, "win");
    }
    const refreshed = refreshMaturity(maturity);
    expect(refreshed.unlockedTraits).toContain("battle_tested");
  });

  it("unlocks streak_hunter after 5-win streak", () => {
    let maturity = DEFAULT_BOT_MATURITY;
    for (let i = 0; i < 5; i++) {
      maturity = recordBotGameResult(maturity, "win");
    }
    expect(maturity.unlockedTraits).toContain("streak_hunter");
  });

  it("unlocks grandmaster_bot at 80+ score", () => {
    const maturity = refreshMaturity({
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 60,
      wins: 55,
      bestStreak: 10,
      currentStreak: 10,
    });
    expect(maturity.maturityScore).toBeGreaterThanOrEqual(80);
    expect(maturity.unlockedTraits).toContain("grandmaster_bot");
  });

  it("evaluation multiplier is bounded", () => {
    const maturity = refreshMaturity({
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 200,
      wins: 200,
      bestStreak: 100,
      currentStreak: 100,
    });
    expect(getEvaluationMultiplier(maturity)).toBeLessThanOrEqual(1.05);
  });

  it("delay reduction does not exceed largest trait", () => {
    const maturity = refreshMaturity({
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 200,
      wins: 200,
      bestStreak: 100,
      currentStreak: 100,
    });
    const maxTraitReduction = Math.max(...BOT_TRAITS.map((t) => t.delayReductionMs));
    expect(getDelayReductionMs(maturity)).toBe(maxTraitReduction);
  });
});

describe("applyMaturityToConfig", () => {
  it("reduces delay based on traits", () => {
    const maturity = refreshMaturity({
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 200,
      wins: 200,
      bestStreak: 100,
      currentStreak: 100,
    });
    const effective = applyMaturityToConfig(DEFAULT_BOT_CONFIG, maturity);
    expect(effective.thinkingDelayMs).toBeLessThan(DEFAULT_BOT_CONFIG.thinkingDelayMs);
    expect(effective.deepThinking).toBeGreaterThan(DEFAULT_BOT_CONFIG.deepThinking);
  });

  it("does not drop delay below 500ms", () => {
    const maturity = refreshMaturity({
      ...DEFAULT_BOT_MATURITY,
      gamesPlayed: 200,
      wins: 200,
      bestStreak: 100,
      currentStreak: 100,
    });
    const config = { ...DEFAULT_BOT_CONFIG, thinkingDelayMs: 500 };
    const effective = applyMaturityToConfig(config, maturity);
    expect(effective.thinkingDelayMs).toBe(500);
  });
});

describe("strategy weights", () => {
  it("aggressive favors captures and checks", () => {
    const weights = getStrategyWeights("aggressive");
    expect(weights.captureBonus).toBeGreaterThan(1);
    expect(weights.checkBonus).toBeGreaterThan(1);
    expect(weights.safetyPenalty).toBeLessThan(1);
  });

  it("defensive favors safety", () => {
    const weights = getStrategyWeights("defensive");
    expect(weights.safetyPenalty).toBeGreaterThan(1);
    expect(weights.captureBonus).toBeLessThan(1);
  });

  it("balanced is neutral", () => {
    const weights = getStrategyWeights("balanced");
    expect(weights.captureBonus).toBe(1);
    expect(weights.checkBonus).toBe(1);
    expect(weights.safetyPenalty).toBe(1);
    expect(weights.pokerWeight).toBe(1);
  });
});

describe("serialization", () => {
  it("round-trips config", () => {
    const json = serializeBotConfig(DEFAULT_BOT_CONFIG);
    const parsed = deserializeBotConfig(json);
    expect(parsed).toEqual(DEFAULT_BOT_CONFIG);
  });

  it("returns defaults for null config", () => {
    expect(deserializeBotConfig(null)).toEqual(DEFAULT_BOT_CONFIG);
  });

  it("returns defaults for invalid json", () => {
    expect(deserializeBotConfig("not-json")).toEqual(DEFAULT_BOT_CONFIG);
  });

  it("round-trips maturity and refreshes score", () => {
    const maturity = recordBotGameResult(DEFAULT_BOT_MATURITY, "win");
    const json = serializeBotMaturity(maturity);
    const parsed = deserializeBotMaturity(json);
    expect(parsed.gamesPlayed).toBe(1);
    expect(parsed.wins).toBe(1);
    expect(parsed.maturityScore).toBeGreaterThan(0);
  });

  it("returns default maturity for invalid json", () => {
    expect(deserializeBotMaturity("not-json")).toEqual(DEFAULT_BOT_MATURITY);
  });
});
