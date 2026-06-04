import { evaluateScorePile } from "../evaluator";
import { PokerHand, POKER_SCORES } from "@checkker/shared";
import type { Card } from "@checkker/shared";

/* ── helpers ─────────────────────────────────────────────────────────── */

function c(rank: string, suit: "clubs" | "diamonds" | "hearts" | "spades"): Card {
  return { rank, suit } as Card;
}

/* ── All 10 hand types ───────────────────────────────────────────────── */

describe("evaluateScorePile — hand types", () => {
  it("royal flush = 25 pts", () => {
    const cards = [
      c("A", "spades"), c("K", "spades"), c("Q", "spades"),
      c("J", "spades"), c("10", "spades"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands.length).toBe(1);
    expect(result.hands[0].hand).toBe(PokerHand.ROYAL_FLUSH);
    expect(result.total).toBe(POKER_SCORES[PokerHand.ROYAL_FLUSH]);
    expect(result.total).toBe(25);
  });

  it("straight flush = 18 pts", () => {
    const cards = [
      c("9", "hearts"), c("8", "hearts"), c("7", "hearts"),
      c("6", "hearts"), c("5", "hearts"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.STRAIGHT_FLUSH);
    expect(result.total).toBe(18);
  });

  it("four of a kind = 14 pts", () => {
    const cards = [
      c("7", "clubs"), c("7", "diamonds"), c("7", "hearts"),
      c("7", "spades"), c("2", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.FOUR_OF_A_KIND);
    expect(result.total).toBe(14);
  });

  it("full house = 10 pts", () => {
    const cards = [
      c("K", "clubs"), c("K", "diamonds"), c("K", "hearts"),
      c("4", "spades"), c("4", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.FULL_HOUSE);
    expect(result.total).toBe(10);
  });

  it("flush = 8 pts", () => {
    const cards = [
      c("A", "diamonds"), c("10", "diamonds"), c("7", "diamonds"),
      c("4", "diamonds"), c("2", "diamonds"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.FLUSH);
    expect(result.total).toBe(8);
  });

  it("straight = 6 pts", () => {
    const cards = [
      c("9", "clubs"), c("8", "diamonds"), c("7", "hearts"),
      c("6", "spades"), c("5", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.STRAIGHT);
    expect(result.total).toBe(6);
  });

  it("three of a kind = 4 pts", () => {
    const cards = [
      c("Q", "clubs"), c("Q", "diamonds"), c("Q", "hearts"),
      c("3", "spades"), c("2", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.THREE_OF_A_KIND);
    expect(result.total).toBe(4);
  });

  it("two pair = 3 pts", () => {
    const cards = [
      c("J", "clubs"), c("J", "diamonds"), c("5", "hearts"),
      c("5", "spades"), c("2", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.TWO_PAIR);
    expect(result.total).toBe(3);
  });

  it("one pair = 1 pt", () => {
    const cards = [
      c("A", "clubs"), c("A", "diamonds"), c("9", "hearts"),
      c("6", "spades"), c("3", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.ONE_PAIR);
    expect(result.total).toBe(1);
  });

  it("high card = 0 pts", () => {
    const cards = [
      c("A", "clubs"), c("10", "diamonds"), c("7", "hearts"),
      c("4", "spades"), c("2", "hearts"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.HIGH_CARD);
    expect(result.total).toBe(0);
  });
});

/* ── Edge cases ──────────────────────────────────────────────────────── */

describe("evaluateScorePile — edge cases", () => {
  it("wheel straight (A-2-3-4-5)", () => {
    const cards = [
      c("A", "clubs"), c("2", "diamonds"), c("3", "hearts"),
      c("4", "spades"), c("5", "clubs"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands[0].hand).toBe(PokerHand.STRAIGHT);
    expect(result.total).toBe(6);
  });

  it("empty pile → no hands, total 0", () => {
    const result = evaluateScorePile([]);
    expect(result.hands.length).toBe(0);
    expect(result.total).toBe(0);
    expect(result.leftover.length).toBe(0);
  });

  it("< 5 cards → no hands, total 0", () => {
    const cards = [c("A", "clubs"), c("K", "diamonds"), c("Q", "hearts")];
    const result = evaluateScorePile(cards);
    expect(result.hands.length).toBe(0);
    expect(result.total).toBe(0);
    expect(result.leftover.length).toBe(3);
  });

  it("10 cards → two hands extracted (greedy best-first)", () => {
    const cards = [
      // first hand: flush in spades
      c("A", "spades"), c("K", "spades"), c("Q", "spades"),
      c("J", "spades"), c("10", "spades"),
      // remaining: pair of 5s + junk
      c("5", "clubs"), c("5", "diamonds"), c("3", "hearts"),
      c("7", "clubs"), c("2", "hearts"),
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands.length).toBe(2);
    expect(result.total).toBeGreaterThan(0);
    expect(result.leftover.length).toBe(0);
  });

  it("leftover cards tracked correctly", () => {
    const cards = [
      c("A", "clubs"), c("K", "diamonds"), c("Q", "hearts"),
      c("J", "spades"), c("10", "clubs"),
      c("9", "diamonds"), c("8", "hearts"), // 7 cards → 1 hand + 2 leftover
    ];
    const result = evaluateScorePile(cards);
    expect(result.hands.length).toBe(1);
    expect(result.leftover.length).toBe(2);
  });
});
