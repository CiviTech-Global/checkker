export interface RatingTier {
  name: string;
  min: number;
  max: number;
  label: string;
}

export const RATING_TIERS: RatingTier[] = [
  { name: "pawn", min: 0, max: 999, label: "Pawn" },
  { name: "knight", min: 1000, max: 1399, label: "Knight" },
  { name: "bishop", min: 1400, max: 1699, label: "Bishop" },
  { name: "rook", min: 1700, max: 1999, label: "Rook" },
  { name: "queen", min: 2000, max: 2299, label: "Queen" },
  { name: "king", min: 2300, max: Infinity, label: "King" },
];

export function getTier(rating: number): RatingTier {
  return RATING_TIERS.find(
    (t) => rating >= t.min && rating <= t.max
  ) ?? RATING_TIERS[0];
}

export const PLACEMENT_GAMES = 10;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRating(
  rating: number,
  expected: number,
  actual: number,
  kFactor = 32
): number {
  return Math.round(rating + kFactor * (actual - expected));
}
