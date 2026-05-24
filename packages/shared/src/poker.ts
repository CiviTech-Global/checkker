import type { Card } from "./cards";

export enum PokerHand {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export const POKER_SCORES: Record<PokerHand, number> = {
  [PokerHand.HIGH_CARD]: 0,
  [PokerHand.ONE_PAIR]: 1,
  [PokerHand.TWO_PAIR]: 3,
  [PokerHand.THREE_OF_A_KIND]: 4,
  [PokerHand.STRAIGHT]: 6,
  [PokerHand.FLUSH]: 8,
  [PokerHand.FULL_HOUSE]: 10,
  [PokerHand.FOUR_OF_A_KIND]: 14,
  [PokerHand.STRAIGHT_FLUSH]: 18,
  [PokerHand.ROYAL_FLUSH]: 25,
};

export interface PokerResult {
  hands: Array<{ hand: PokerHand; cards: Card[]; points: number }>;
  leftover: Card[];
  total: number;
}
