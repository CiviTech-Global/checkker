import 'dart:math';

class RatingTier {
  final String name;
  final int min;
  final int max;
  final String label;

  const RatingTier({required this.name, required this.min, required this.max, required this.label});
}

const List<RatingTier> ratingTiers = [
  RatingTier(name: 'pawn', min: 0, max: 999, label: 'Pawn'),
  RatingTier(name: 'knight', min: 1000, max: 1399, label: 'Knight'),
  RatingTier(name: 'bishop', min: 1400, max: 1699, label: 'Bishop'),
  RatingTier(name: 'rook', min: 1700, max: 1999, label: 'Rook'),
  RatingTier(name: 'queen', min: 2000, max: 2299, label: 'Queen'),
  RatingTier(name: 'king', min: 2300, max: 999999, label: 'King'),
];

const int placementGames = 10;

RatingTier getTier(int rating) {
  for (final tier in ratingTiers) {
    if (rating >= tier.min && rating <= tier.max) return tier;
  }
  return ratingTiers[0];
}

double expectedScore(int ratingA, int ratingB) {
  return 1.0 / (1.0 + pow(10, (ratingB - ratingA) / 400.0));
}

int newRating(int rating, double expected, double actual, {int kFactor = 32}) {
  return (rating + kFactor * (actual - expected)).round();
}
