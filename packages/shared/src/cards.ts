export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "2", "3", "4", "5", "6", "7", "8", "9",
  "10", "J", "Q", "K", "A",
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type ChessPiece = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type PieceType = ChessPiece | "wild";

export const CARD_TO_PIECE: Record<Rank, PieceType> = {
  "K": "king",
  "Q": "queen",
  "J": "knight",
  "10": "rook",
  "2": "bishop",
  "3": "pawn",
  "4": "pawn",
  "5": "pawn",
  "6": "pawn",
  "7": "pawn",
  "8": "pawn",
  "9": "pawn",
  "A": "wild",
} as const;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function cardToPiece(card: Card): PieceType {
  return CARD_TO_PIECE[card.rank];
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit[0]}`;
}
