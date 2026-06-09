import 'card.dart';

enum PokerHand {
  highCard,
  onePair,
  twoPair,
  threeOfAKind,
  straight,
  flush,
  fullHouse,
  fourOfAKind,
  straightFlush,
  royalFlush,
}

const Map<PokerHand, int> pokerScores = {
  PokerHand.highCard: 0,
  PokerHand.onePair: 1,
  PokerHand.twoPair: 3,
  PokerHand.threeOfAKind: 4,
  PokerHand.straight: 6,
  PokerHand.flush: 8,
  PokerHand.fullHouse: 10,
  PokerHand.fourOfAKind: 14,
  PokerHand.straightFlush: 18,
  PokerHand.royalFlush: 25,
};

const Map<PokerHand, String> pokerHandNames = {
  PokerHand.highCard: 'High Card',
  PokerHand.onePair: 'Pair',
  PokerHand.twoPair: 'Two Pair',
  PokerHand.threeOfAKind: 'Three of a Kind',
  PokerHand.straight: 'Straight',
  PokerHand.flush: 'Flush',
  PokerHand.fullHouse: 'Full House',
  PokerHand.fourOfAKind: 'Four of a Kind',
  PokerHand.straightFlush: 'Straight Flush',
  PokerHand.royalFlush: 'Royal Flush',
};

class PokerHandEntry {
  final PokerHand hand;
  final List<PlayingCard> cards;
  final int points;

  const PokerHandEntry({required this.hand, required this.cards, required this.points});

  factory PokerHandEntry.fromJson(Map<String, dynamic> json) {
    return PokerHandEntry(
      hand: PokerHand.values[json['hand'] as int],
      cards: (json['cards'] as List).map((c) => PlayingCard.fromJson(c as Map<String, dynamic>)).toList(),
      points: json['points'] as int,
    );
  }
}

class PokerResult {
  final List<PokerHandEntry> hands;
  final List<PlayingCard> leftover;
  final int total;

  const PokerResult({required this.hands, required this.leftover, required this.total});

  factory PokerResult.fromJson(Map<String, dynamic> json) {
    return PokerResult(
      hands: (json['hands'] as List).map((h) => PokerHandEntry.fromJson(h as Map<String, dynamic>)).toList(),
      leftover: (json['leftover'] as List).map((c) => PlayingCard.fromJson(c as Map<String, dynamic>)).toList(),
      total: json['total'] as int,
    );
  }
}
