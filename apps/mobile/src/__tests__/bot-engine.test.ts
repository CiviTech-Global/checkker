import { pickOnlineBotMove, isEndgame } from "../bot/engine";
import type { BotConfiguration, BotMaturity, Card } from "@checkker/shared";
import { cardId } from "@checkker/shared";

const defaultConfig: BotConfiguration = {
  enabled: true,
  difficulty: "intermediate",
  strategy: "balanced",
  patience: 50,
  deepThinking: 40,
  riskTolerance: 50,
  thinkingDelayMs: 1500,
  autoRematch: false,
  allowTakeover: true,
};

const defaultMaturity: BotMaturity = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  maturityScore: 0,
  unlockedTraits: [],
};

const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function makeCard(rank: string, suit: string): Card {
  return { rank, suit } as Card;
}

describe("pickOnlineBotMove", () => {
  it("picks a legal move from a starting hand", () => {
    const hand = [makeCard("9", "hearts"), makeCard("J", "clubs"), makeCard("A", "spades")];
    const pick = pickOnlineBotMove({
      fen: startingFen,
      hand,
      config: defaultConfig,
      maturity: defaultMaturity,
      myColor: "white",
    });
    expect(pick).not.toBeNull();
    expect(pick!.move.length).toBeGreaterThanOrEqual(4);
    expect(hand.some((c) => cardId(c) === pick!.cardId)).toBe(true);
  });

  it("returns null for an empty hand", () => {
    const pick = pickOnlineBotMove({
      fen: startingFen,
      hand: [],
      config: defaultConfig,
      maturity: defaultMaturity,
    });
    expect(pick).toBeNull();
  });
});

describe("isEndgame", () => {
  it("starting position is not endgame", () => {
    expect(isEndgame(startingFen)).toBe(false);
  });

  it("no queens is endgame", () => {
    expect(isEndgame("rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1")).toBe(true);
  });
});
