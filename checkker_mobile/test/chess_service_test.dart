import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter_test/flutter_test.dart';

import 'package:checkker_mobile/models/card.dart';
import 'package:checkker_mobile/services/chess_service.dart';

PlayingCard c(Rank rank, [Suit suit = Suit.spades]) =>
    PlayingCard(suit: suit, rank: rank);

void main() {
  group('getLegalMovesForCard on the starting position', () {
    late chess_lib.Chess game;

    setUp(() {
      game = chess_lib.Chess();
    });

    test('pawn card (3-9) allows the 16 pawn moves', () {
      final moves = getLegalMovesForCard(game, c(Rank.five));
      expect(moves, hasLength(16));
      expect(moves, contains('e2e4'));
      expect(moves, contains('e2e3'));
    });

    test('jack moves knights only', () {
      final moves = getLegalMovesForCard(game, c(Rank.jack));
      expect(moves.toSet(), {'b1a3', 'b1c3', 'g1f3', 'g1h3'});
    });

    test('queen card has no moves at the start', () {
      expect(getLegalMovesForCard(game, c(Rank.queen)), isEmpty);
    });

    test('ten (rook) card has no moves at the start', () {
      expect(getLegalMovesForCard(game, c(Rank.ten)), isEmpty);
    });

    test('ace is wild and allows all 20 opening moves', () {
      expect(getLegalMovesForCard(game, c(Rank.ace)), hasLength(20));
    });
  });

  test('getLegalMovesForHand groups moves per card', () {
    final game = chess_lib.Chess();
    final hand = [c(Rank.five), c(Rank.jack), c(Rank.queen)];
    final grouped = getLegalMovesForHand(game, hand);
    expect(grouped, hasLength(3));
    expect(grouped[0].piece, PieceType.pawn);
    expect(grouped[0].moves, hasLength(16));
    expect(grouped[1].piece, PieceType.knight);
    expect(grouped[1].moves, hasLength(4));
    expect(grouped[2].piece, PieceType.queen);
    expect(grouped[2].moves, isEmpty);
  });

  group('getCaptureBonus', () {
    test('pawn capture gives 1 card', () {
      expect(getCaptureBonus('p', false), 1);
    });

    test('knight, bishop and rook captures give 2 cards', () {
      expect(getCaptureBonus('n', false), 2);
      expect(getCaptureBonus('b', false), 2);
      expect(getCaptureBonus('r', false), 2);
    });

    test('queen capture gives 3 cards', () {
      expect(getCaptureBonus('q', false), 3);
    });

    test('giving check adds one bonus card', () {
      expect(getCaptureBonus('p', true), 2);
      expect(getCaptureBonus('q', true), 4);
    });
  });
}
