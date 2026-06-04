import { scoreGame, CHESS_SCORES } from "../game";
import type { GameResult } from "../game";
import { PokerHand, POKER_SCORES } from "../poker";
import type { PokerResult } from "../poker";

/* ── helpers ─────────────────────────────────────────────────────────── */

function emptyPoker(total = 0): PokerResult {
  return { hands: [], leftover: [], total };
}

function pokerWith(total: number): PokerResult {
  return { hands: [], leftover: [], total };
}

/* ── Checkmate scoring ───────────────────────────────────────────────── */

describe("scoreGame — checkmate", () => {
  it("winner gets 30 + poker, loser gets 0 + poker", () => {
    const result: GameResult = { type: "checkmate", winner: "white" };
    const scored = scoreGame(result, pokerWith(5), pokerWith(3));
    expect(scored.whiteTotal).toBe(30 + 5);
    expect(scored.blackTotal).toBe(0 + 3);
    expect(scored.winner).toBe("white");
  });

  it("black winner", () => {
    const result: GameResult = { type: "checkmate", winner: "black" };
    const scored = scoreGame(result, pokerWith(5), pokerWith(3));
    expect(scored.whiteTotal).toBe(0 + 5);
    expect(scored.blackTotal).toBe(30 + 3);
    expect(scored.winner).toBe("black");
  });
});

/* ── Draw scoring ────────────────────────────────────────────────────── */

describe("scoreGame — draw", () => {
  const drawReasons = ["stalemate", "threefold", "fiftyMove", "insufficientMaterial"] as const;

  it.each(drawReasons)("draw (%s): each gets 10 + poker", (reason) => {
    const result: GameResult = { type: "draw", reason };
    const scored = scoreGame(result, pokerWith(4), pokerWith(4));
    expect(scored.whiteTotal).toBe(10 + 4);
    expect(scored.blackTotal).toBe(10 + 4);
    expect(scored.winner).toBe("draw");
  });
});

/* ── Resignation scoring ─────────────────────────────────────────────── */

describe("scoreGame — resignation", () => {
  it("winner gets 25, loser gets 0", () => {
    const result: GameResult = { type: "resignation", winner: "white" };
    const scored = scoreGame(result, emptyPoker(), emptyPoker());
    expect(scored.whiteTotal).toBe(25);
    expect(scored.blackTotal).toBe(0);
    expect(scored.winner).toBe("white");
  });
});

/* ── Timeout scoring ─────────────────────────────────────────────────── */

describe("scoreGame — timeout", () => {
  it("winner gets 25, loser gets 0", () => {
    const result: GameResult = { type: "timeout", winner: "black" };
    const scored = scoreGame(result, emptyPoker(), emptyPoker());
    expect(scored.whiteTotal).toBe(0);
    expect(scored.blackTotal).toBe(25);
    expect(scored.winner).toBe("black");
  });
});

/* ── Deck exhausted ──────────────────────────────────────────────────── */

describe("scoreGame — deckExhausted", () => {
  it("each gets 0 + poker", () => {
    const result: GameResult = { type: "deckExhausted" };
    const scored = scoreGame(result, pokerWith(8), pokerWith(3));
    expect(scored.whiteTotal).toBe(0 + 8);
    expect(scored.blackTotal).toBe(0 + 3);
    expect(scored.winner).toBe("white");
  });
});

/* ── Winner determination ────────────────────────────────────────────── */

describe("scoreGame — winner determination", () => {
  it("tie → draw", () => {
    const result: GameResult = { type: "checkmate", winner: "white" };
    // white: 30 + 0 = 30, black: 0 + 30 = 30
    const scored = scoreGame(result, pokerWith(0), pokerWith(30));
    expect(scored.winner).toBe("draw");
  });

  it("poker can overcome chess disadvantage", () => {
    const result: GameResult = { type: "checkmate", winner: "white" };
    // white: 30 + 0 = 30, black: 0 + 50 = 50 — black wins via poker
    const scored = scoreGame(result, pokerWith(0), pokerWith(50));
    expect(scored.winner).toBe("black");
  });
});
