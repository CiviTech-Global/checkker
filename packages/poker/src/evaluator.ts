import type { Card } from "@gambit/shared";
import { PokerHand, POKER_SCORES, type PokerResult } from "@gambit/shared";

const RANK_ORDER: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
}

function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

function isStraight(cards: Card[]): { isStraight: boolean; highCard: number } {
  const sorted = [...cards].map((c) => RANK_ORDER[c.rank]).sort((a, b) => b - a);
  const unique = [...new Set(sorted)];

  if (unique.length < 5) return { isStraight: false, highCard: 0 };

  const high = unique[0];
  if (unique[0] - unique[4] === 4) return { isStraight: true, highCard: high };

  if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
    return { isStraight: true, highCard: 5 };
  }

  return { isStraight: false, highCard: 0 };
}

function getRankCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  }
  return counts;
}

function evaluateFive(cards: Card[]): { hand: PokerHand; rank: number } {
  const counts = getRankCounts(cards);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const flush = isFlush(cards);
  const straightResult = isStraight(cards);
  const straight = straightResult.isStraight;

  if (flush && straight) {
    if (straightResult.highCard === 14) {
      return { hand: PokerHand.ROYAL_FLUSH, rank: 14 };
    }
    return { hand: PokerHand.STRAIGHT_FLUSH, rank: straightResult.highCard };
  }

  if (groups[0][1] === 4) {
    return { hand: PokerHand.FOUR_OF_A_KIND, rank: RANK_ORDER[groups[0][0]] };
  }

  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return { hand: PokerHand.FULL_HOUSE, rank: RANK_ORDER[groups[0][0]] };
  }

  if (flush) {
    return { hand: PokerHand.FLUSH, rank: RANK_ORDER[cards[0].rank] };
  }

  if (straight) {
    return { hand: PokerHand.STRAIGHT, rank: straightResult.highCard };
  }

  if (groups[0][1] === 3) {
    return { hand: PokerHand.THREE_OF_A_KIND, rank: RANK_ORDER[groups[0][0]] };
  }

  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    return { hand: PokerHand.TWO_PAIR, rank: RANK_ORDER[groups[0][0]] };
  }

  if (groups[0][1] === 2) {
    return { hand: PokerHand.ONE_PAIR, rank: RANK_ORDER[groups[0][0]] };
  }

  return { hand: PokerHand.HIGH_CARD, rank: RANK_ORDER[cards[0].rank] };
}

function combinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: Card[][] = [];
  const first = arr[0];
  const rest = arr.slice(1);
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  result.push(...combinations(rest, k));
  return result;
}

export function evaluateScorePile(cards: Card[]): PokerResult {
  const remaining = [...cards];
  const hands: PokerResult["hands"] = [];

  while (remaining.length >= 5) {
    const combos = combinations(remaining, 5);
    let best = combos[0];
    let bestScore = { hand: PokerHand.HIGH_CARD, rank: 0 };

    for (const combo of combos) {
      const score = evaluateFive(combo);
      if (score.hand > bestScore.hand || (score.hand === bestScore.hand && score.rank > bestScore.rank)) {
        best = combo;
        bestScore = score;
      }
    }

    hands.push({
      hand: bestScore.hand,
      cards: best,
      points: POKER_SCORES[bestScore.hand],
    });

    for (const card of best) {
      const idx = remaining.findIndex(
        (c) => c.rank === card.rank && c.suit === card.suit
      );
      if (idx !== -1) remaining.splice(idx, 1);
    }
  }

  return {
    hands,
    leftover: remaining,
    total: hands.reduce((s, h) => s + h.points, 0),
  };
}
