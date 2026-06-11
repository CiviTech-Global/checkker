import '../models/card.dart';
import '../models/poker.dart';

/// Dart port of packages/poker/src/evaluator.ts — greedy best-5-card
/// extraction from a score pile, used for offline game scoring.

const Map<Rank, int> _rankOrder = {
  Rank.two: 2,
  Rank.three: 3,
  Rank.four: 4,
  Rank.five: 5,
  Rank.six: 6,
  Rank.seven: 7,
  Rank.eight: 8,
  Rank.nine: 9,
  Rank.ten: 10,
  Rank.jack: 11,
  Rank.queen: 12,
  Rank.king: 13,
  Rank.ace: 14,
};

class _FiveScore {
  final PokerHand hand;
  final int rank;
  const _FiveScore(this.hand, this.rank);
}

bool _isFlush(List<PlayingCard> cards) =>
    cards.every((c) => c.suit == cards[0].suit);

({bool isStraight, int highCard}) _isStraight(List<PlayingCard> cards) {
  final sorted = cards.map((c) => _rankOrder[c.rank]!).toSet().toList()
    ..sort((a, b) => b.compareTo(a));
  if (sorted.length < 5) return (isStraight: false, highCard: 0);
  if (sorted[0] - sorted[4] == 4) return (isStraight: true, highCard: sorted[0]);
  if (sorted[0] == 14 &&
      sorted[1] == 5 &&
      sorted[2] == 4 &&
      sorted[3] == 3 &&
      sorted[4] == 2) {
    return (isStraight: true, highCard: 5);
  }
  return (isStraight: false, highCard: 0);
}

_FiveScore _evaluateFive(List<PlayingCard> cards) {
  final counts = <Rank, int>{};
  for (final c in cards) {
    counts[c.rank] = (counts[c.rank] ?? 0) + 1;
  }
  final groups = counts.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  final flush = _isFlush(cards);
  final straight = _isStraight(cards);
  final sorted = [...cards]
    ..sort((a, b) => _rankOrder[b.rank]!.compareTo(_rankOrder[a.rank]!));

  if (flush && straight.isStraight) {
    if (straight.highCard == 14) return const _FiveScore(PokerHand.royalFlush, 14);
    return _FiveScore(PokerHand.straightFlush, straight.highCard);
  }
  if (groups[0].value == 4) {
    return _FiveScore(PokerHand.fourOfAKind, _rankOrder[groups[0].key]!);
  }
  if (groups[0].value == 3 && groups.length > 1 && groups[1].value == 2) {
    return _FiveScore(PokerHand.fullHouse, _rankOrder[groups[0].key]!);
  }
  if (flush) return _FiveScore(PokerHand.flush, _rankOrder[sorted[0].rank]!);
  if (straight.isStraight) return _FiveScore(PokerHand.straight, straight.highCard);
  if (groups[0].value == 3) {
    return _FiveScore(PokerHand.threeOfAKind, _rankOrder[groups[0].key]!);
  }
  if (groups[0].value == 2 && groups.length > 1 && groups[1].value == 2) {
    return _FiveScore(PokerHand.twoPair, _rankOrder[groups[0].key]!);
  }
  if (groups[0].value == 2) {
    return _FiveScore(PokerHand.onePair, _rankOrder[groups[0].key]!);
  }
  return _FiveScore(PokerHand.highCard, _rankOrder[sorted[0].rank]!);
}

List<List<PlayingCard>> _combinations(List<PlayingCard> arr, int k) {
  if (k == 0) return [[]];
  if (arr.length < k) return [];
  final first = arr[0];
  final rest = arr.sublist(1);
  final result = <List<PlayingCard>>[];
  for (final combo in _combinations(rest, k - 1)) {
    result.add([first, ...combo]);
  }
  result.addAll(_combinations(rest, k));
  return result;
}

PokerResult evaluateScorePile(List<PlayingCard> cards) {
  final remaining = [...cards];
  final hands = <PokerHandEntry>[];

  while (remaining.length >= 5) {
    final combos = _combinations(remaining, 5);
    var best = combos[0];
    var bestScore = const _FiveScore(PokerHand.highCard, 0);

    for (final combo in combos) {
      final score = _evaluateFive(combo);
      if (score.hand.index > bestScore.hand.index ||
          (score.hand == bestScore.hand && score.rank > bestScore.rank)) {
        best = combo;
        bestScore = score;
      }
    }

    hands.add(PokerHandEntry(
      hand: bestScore.hand,
      cards: best,
      points: pokerScores[bestScore.hand]!,
    ));

    for (final card in best) {
      remaining.remove(card);
    }
  }

  return PokerResult(
    hands: hands,
    leftover: remaining,
    total: hands.fold(0, (s, h) => s + h.points),
  );
}
