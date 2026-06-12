import 'package:flutter_test/flutter_test.dart';

import 'package:checkker_mobile/models/card.dart';
import 'package:checkker_mobile/models/poker.dart';
import 'package:checkker_mobile/services/poker_evaluator.dart';

PlayingCard c(Rank rank, Suit suit) => PlayingCard(suit: suit, rank: rank);

void main() {
  group('evaluateScorePile hand detection', () {
    test('royal flush scores 25', () {
      final result = evaluateScorePile([
        c(Rank.ace, Suit.spades),
        c(Rank.king, Suit.spades),
        c(Rank.queen, Suit.spades),
        c(Rank.jack, Suit.spades),
        c(Rank.ten, Suit.spades),
      ]);
      expect(result.hands, hasLength(1));
      expect(result.hands[0].hand, PokerHand.royalFlush);
      expect(result.total, 25);
    });

    test('straight flush scores 18', () {
      final result = evaluateScorePile([
        c(Rank.nine, Suit.hearts),
        c(Rank.eight, Suit.hearts),
        c(Rank.seven, Suit.hearts),
        c(Rank.six, Suit.hearts),
        c(Rank.five, Suit.hearts),
      ]);
      expect(result.hands[0].hand, PokerHand.straightFlush);
      expect(result.total, 18);
    });

    test('wheel (A-2-3-4-5) counts as a straight', () {
      final result = evaluateScorePile([
        c(Rank.ace, Suit.spades),
        c(Rank.two, Suit.hearts),
        c(Rank.three, Suit.clubs),
        c(Rank.four, Suit.diamonds),
        c(Rank.five, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.straight);
      expect(result.total, 6);
    });

    test('four of a kind scores 14', () {
      final result = evaluateScorePile([
        c(Rank.seven, Suit.spades),
        c(Rank.seven, Suit.hearts),
        c(Rank.seven, Suit.clubs),
        c(Rank.seven, Suit.diamonds),
        c(Rank.two, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.fourOfAKind);
      expect(result.total, 14);
    });

    test('full house scores 10', () {
      final result = evaluateScorePile([
        c(Rank.king, Suit.spades),
        c(Rank.king, Suit.hearts),
        c(Rank.king, Suit.clubs),
        c(Rank.three, Suit.diamonds),
        c(Rank.three, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.fullHouse);
      expect(result.total, 10);
    });

    test('flush scores 8', () {
      final result = evaluateScorePile([
        c(Rank.king, Suit.clubs),
        c(Rank.nine, Suit.clubs),
        c(Rank.six, Suit.clubs),
        c(Rank.four, Suit.clubs),
        c(Rank.two, Suit.clubs),
      ]);
      expect(result.hands[0].hand, PokerHand.flush);
      expect(result.total, 8);
    });

    test('three of a kind scores 4', () {
      final result = evaluateScorePile([
        c(Rank.five, Suit.spades),
        c(Rank.five, Suit.hearts),
        c(Rank.five, Suit.clubs),
        c(Rank.nine, Suit.diamonds),
        c(Rank.king, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.threeOfAKind);
      expect(result.total, 4);
    });

    test('two pair scores 3', () {
      final result = evaluateScorePile([
        c(Rank.five, Suit.spades),
        c(Rank.five, Suit.hearts),
        c(Rank.nine, Suit.clubs),
        c(Rank.nine, Suit.diamonds),
        c(Rank.king, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.twoPair);
      expect(result.total, 3);
    });

    test('one pair scores 1', () {
      final result = evaluateScorePile([
        c(Rank.five, Suit.spades),
        c(Rank.five, Suit.hearts),
        c(Rank.nine, Suit.clubs),
        c(Rank.jack, Suit.diamonds),
        c(Rank.king, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.onePair);
      expect(result.total, 1);
    });

    test('high card scores 0', () {
      final result = evaluateScorePile([
        c(Rank.two, Suit.spades),
        c(Rank.five, Suit.hearts),
        c(Rank.nine, Suit.clubs),
        c(Rank.jack, Suit.diamonds),
        c(Rank.king, Suit.spades),
      ]);
      expect(result.hands[0].hand, PokerHand.highCard);
      expect(result.total, 0);
    });
  });

  group('evaluateScorePile pile handling', () {
    test('fewer than 5 cards yields no hands and full leftover', () {
      final pile = [
        c(Rank.king, Suit.spades),
        c(Rank.king, Suit.hearts),
        c(Rank.king, Suit.clubs),
      ];
      final result = evaluateScorePile(pile);
      expect(result.hands, isEmpty);
      expect(result.leftover, hasLength(3));
      expect(result.total, 0);
    });

    test('empty pile scores zero', () {
      final result = evaluateScorePile([]);
      expect(result.hands, isEmpty);
      expect(result.leftover, isEmpty);
      expect(result.total, 0);
    });

    test('greedily extracts the best hand first from a large pile', () {
      // 10 cards: a flush in clubs plus a pair of kings + filler.
      final result = evaluateScorePile([
        c(Rank.king, Suit.clubs),
        c(Rank.nine, Suit.clubs),
        c(Rank.six, Suit.clubs),
        c(Rank.four, Suit.clubs),
        c(Rank.two, Suit.clubs),
        c(Rank.king, Suit.hearts),
        c(Rank.king, Suit.spades),
        c(Rank.three, Suit.diamonds),
        c(Rank.eight, Suit.hearts),
        c(Rank.jack, Suit.diamonds),
      ]);
      expect(result.hands, hasLength(2));
      expect(result.hands[0].hand, PokerHand.flush);
      expect(result.leftover, isEmpty);
      expect(result.total, greaterThanOrEqualTo(8 + 1));
    });
  });
}
