import type { Card } from "@checkker/shared";
import { PokerHand, POKER_SCORES } from "@checkker/shared";

const RANK_ORDER: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

const RANK_SCORE: Record<string, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "10": 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
};

export interface PokerPotentialResult {
  currentValue: number;
  potentialValue: number;
  handName: string;
  cardsNeeded: number;
  estimatedFinalScore: number;
  drawQuality: number;
}

function getRankCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  }
  return counts;
}

function getSuitCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1);
  }
  return counts;
}

function hasStraightDraw(ranks: number[]): { possible: boolean; gap: number } {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.length < 4) return { possible: false, gap: 99 };

  let minGap = 99;
  for (let i = 0; i <= unique.length - 4; i++) {
    const window = unique.slice(i, i + 4);
    const gaps = window[3] - window[0];
    if (gaps <= 4 && gaps < minGap) {
      minGap = gaps;
    }
  }

  if (ranks.includes(14)) {
    const withAceLow = [1, ...unique.filter((r) => r <= 5)].sort((a, b) => a - b);
    if (withAceLow.length >= 4) {
      for (let i = 0; i <= withAceLow.length - 4; i++) {
        const window = withAceLow.slice(i, i + 4);
        const gaps = window[3] - window[0];
        if (gaps <= 4 && gaps < minGap) {
          minGap = gaps;
        }
      }
    }
  }

  return { possible: minGap <= 4, gap: minGap };
}

export function evaluatePokerPotential(scorePile: Card[], cardsInHand: Card[], deckSize: number): PokerPotentialResult {
  const allCards = [...scorePile, ...cardsInHand];
  const groupSize = allCards.length;
  const rankCounts = getRankCounts(allCards);
  const suitCounts = getSuitCounts(allCards);
  const ranks = allCards.map((c) => RANK_ORDER[c.rank]).sort((a, b) => b - a);

  let currentValue = 0;
  let currentHandName = "No hand yet";
  let bestPotential = 0;
  let cardsNeeded = 5;
  let drawQuality = 0;

  if (groupSize >= 5) {
    const flushSuit = [...suitCounts.entries()].find(([, count]) => count >= 5);
    const quad = [...rankCounts.entries()].find(([, count]) => count >= 4);
    const triple = [...rankCounts.entries()].find(([, count]) => count >= 3);
    const pairs = [...rankCounts.entries()].filter(([, count]) => count >= 2);
    const straightInfo = hasStraightDraw(ranks);

    if (flushSuit && straightInfo.possible && straightInfo.gap <= 0) {
      const flushRanks = allCards.filter((c) => c.suit === flushSuit[0]).map((c) => RANK_ORDER[c.rank]);
      const maxRank = Math.max(...flushRanks);
      if (maxRank === 14) { currentValue = POKER_SCORES[PokerHand.ROYAL_FLUSH]; currentHandName = "Royal Flush"; cardsNeeded = 0; }
      else { currentValue = POKER_SCORES[PokerHand.STRAIGHT_FLUSH]; currentHandName = "Straight Flush"; cardsNeeded = 0; }
    } else if (quad) { currentValue = POKER_SCORES[PokerHand.FOUR_OF_A_KIND]; currentHandName = "Four of a Kind"; cardsNeeded = 0; }
    else if (triple && pairs.length >= 2) { currentValue = POKER_SCORES[PokerHand.FULL_HOUSE]; currentHandName = "Full House"; cardsNeeded = 0; }
    else if (flushSuit) { currentValue = POKER_SCORES[PokerHand.FLUSH]; currentHandName = "Flush"; cardsNeeded = 0; }
    else if (straightInfo.possible && straightInfo.gap <= 0) { currentValue = POKER_SCORES[PokerHand.STRAIGHT]; currentHandName = "Straight"; cardsNeeded = 0; }
    else if (triple) { currentValue = POKER_SCORES[PokerHand.THREE_OF_A_KIND]; currentHandName = "Three of a Kind"; cardsNeeded = 0; }
    else if (pairs.length >= 2) { currentValue = POKER_SCORES[PokerHand.TWO_PAIR]; currentHandName = "Two Pair"; cardsNeeded = 0; }
    else if (pairs.length >= 1) { currentValue = POKER_SCORES[PokerHand.ONE_PAIR]; currentHandName = "One Pair"; cardsNeeded = 0; }
    else { currentValue = POKER_SCORES[PokerHand.HIGH_CARD]; currentHandName = "High Card"; cardsNeeded = 0; }
  }

  if (groupSize < 5) {
    cardsNeeded = 5 - groupSize;

    const flushCounts = [...suitCounts.values()];
    const maxSuit = Math.max(...flushCounts, 0);

    const pairs = [...rankCounts.entries()].filter(([, count]) => count >= 2);
    const triples = [...rankCounts.entries()].filter(([, count]) => count >= 3);
    const quad = [...rankCounts.entries()].find(([, count]) => count >= 4);

    const straightInfo = hasStraightDraw(ranks);

    if (quad) { bestPotential = POKER_SCORES[PokerHand.FOUR_OF_A_KIND]; drawQuality = 90; }
    else if (triples.length >= 2) { bestPotential = POKER_SCORES[PokerHand.FULL_HOUSE]; drawQuality = 85; }
    else if (triples.length === 1 && pairs.length >= 2) { bestPotential = POKER_SCORES[PokerHand.FULL_HOUSE]; drawQuality = 80; }
    else if (maxSuit >= 4) { bestPotential = POKER_SCORES[PokerHand.FLUSH]; drawQuality = 40; }
    else if (straightInfo.possible && straightInfo.gap <= 1 && cardsNeeded <= 1) { bestPotential = POKER_SCORES[PokerHand.STRAIGHT]; drawQuality = 60; }
    else if (triples.length === 1) { bestPotential = POKER_SCORES[PokerHand.THREE_OF_A_KIND]; drawQuality = 50; }
    else if (pairs.length >= 2) { bestPotential = POKER_SCORES[PokerHand.TWO_PAIR]; drawQuality = 45; }
    else if (pairs.length === 1) {
      bestPotential = POKER_SCORES[PokerHand.ONE_PAIR];
      if (cardsNeeded <= 1) drawQuality = 35;
      else drawQuality = 20;
    }
    else if (maxSuit >= 3) { bestPotential = POKER_SCORES[PokerHand.FLUSH]; drawQuality = 15; }
    else if (straightInfo.possible && straightInfo.gap <= 1) { bestPotential = POKER_SCORES[PokerHand.STRAIGHT]; drawQuality = 20; }
    else { bestPotential = POKER_SCORES[PokerHand.HIGH_CARD]; drawQuality = 5; }
  }

  if (groupSize >= 5) {
    bestPotential = currentValue;
    drawQuality = 100;
  }

  const highestPossibleTotal = allCards.length >= 5
    ? currentValue + Math.max(0, Math.floor((allCards.length - 5) / 5) * 10)
    : bestPotential;

  const deckFactor = Math.min(1, deckSize / 20);
  const drawPotential = cardsNeeded > 0
    ? Math.max(0, bestPotential - cardsNeeded * 3) * deckFactor
    : 0;

  const estimatedFinalScore = Math.max(currentValue, Math.min(
    25,
    currentValue + drawPotential,
  ));

  return {
    currentValue,
    potentialValue: bestPotential,
    handName: currentHandName,
    cardsNeeded,
    estimatedFinalScore,
    drawQuality,
  };
}

export function estimateCardValue(card: Card, scorePile: Card[], hand: Card[]): number {
  const rankScore = RANK_SCORE[card.rank] ?? 0;

  const withCard = [...scorePile, ...hand, card];
  const withoutCard = [...scorePile, ...hand];

  const rankCounts = getRankCounts(withCard);
  const suitCounts = getSuitCounts(withCard);
  const pairs = [...rankCounts.entries()].filter(([, count]) => count >= 2).length;
  const flushPotential = Math.max(...[...suitCounts.values()], 0);

  let value = rankScore * 0.5;
  if (pairs > 0) value += 20 * pairs;
  if (flushPotential >= 3) value += 10;
  if (flushPotential >= 4) value += 15;
  if (card.rank === "A") value += 5;
  if (card.rank === "K" || card.rank === "Q") value += 3;

  return value;
}
