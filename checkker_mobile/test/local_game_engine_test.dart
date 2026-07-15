import 'package:flutter_test/flutter_test.dart';

import 'package:checkker_mobile/models/card.dart';
import 'package:checkker_mobile/services/local_game_engine.dart';

void main() {
  group('LocalGameEngine', () {
    test('deals 3 cards to each player at start', () {
      final engine = LocalGameEngine();
      expect(engine.hand, hasLength(3));
      expect(engine.opponentHandCount, 3);
      // Usually 46, but the mulligan rule may redraw an unplayable hand.
      expect(engine.drawPileCount, lessThanOrEqualTo(52 - 6));
      expect(engine.drawPileCount, greaterThan(0));
      expect(engine.turn, 'white');
      expect(engine.result, isNull);
    });

    test('starting hand always has at least one legal move', () {
      for (var i = 0; i < 10; i++) {
        final engine = LocalGameEngine();
        expect(
          engine.legalMovesForTurn().any((g) => g.moves.isNotEmpty),
          isTrue,
        );
      }
    });

    test('rejects playing a card not in hand', () {
      final engine = LocalGameEngine();
      final result = engine.playCard('Zz', 'e2e4');
      expect(result.success, isFalse);
      expect(result.error, isNotNull);
    });

    test('playing a legal move advances the turn and consumes the card', () {
      final engine = LocalGameEngine();
      final legal =
          engine.legalMovesForTurn().firstWhere((g) => g.moves.isNotEmpty);
      final move = legal.moves.first;
      final result = engine.playCard(legal.card.id, move);
      expect(result.success, isTrue);
      expect(engine.lastMoveFrom, move.substring(0, 2));
      expect(engine.lastMoveTo, move.substring(2, 4));
      expect(engine.turn, 'black');
    });

    test('rejects a move the card does not allow', () {
      final engine = LocalGameEngine();
      final legal = engine.legalMovesForTurn();
      final nonWild = legal
          .where((g) => cardToPiece(g.card) != PieceType.wild && g.moves.isNotEmpty)
          .toList();
      if (nonWild.isEmpty) return; // Rare hand of all aces.
      final group = nonWild.first;
      final otherMoves = legal
          .where((g) => g != group)
          .expand((g) => g.moves)
          .where((m) => !group.moves.contains(m))
          .toList();
      if (otherMoves.isEmpty) return;
      final result = engine.playCard(group.card.id, otherMoves.first);
      expect(result.success, isFalse);
    });

    test('resignation ends the game and scores it', () {
      final engine = LocalGameEngine();
      engine.resign('white');
      expect(engine.isOver, isTrue);
      expect(engine.result!.type, LocalGameResultType.resignation);
      expect(engine.result!.winner, 'black');
      final scores = engine.getScores();
      expect(scores, isNotNull);
      // Black gets 25 chess points for the resignation; empty score piles.
      expect(scores!.blackTotal, greaterThanOrEqualTo(25));
      expect(scores.winner, 'black');
    });

    test('getScores returns null while the game is in progress', () {
      final engine = LocalGameEngine();
      expect(engine.getScores(), isNull);
    });

    test('getLiveScores returns poker results for both sides', () {
      final engine = LocalGameEngine();
      final liveScores = engine.getLiveScores();
      expect(liveScores.whitePoker.total, 0);
      expect(liveScores.blackPoker.total, 0);
      expect(liveScores.whitePoker.hands, isEmpty);
      expect(liveScores.blackPoker.hands, isEmpty);
    });
  });

  group('pickLocalBotMove', () {
    for (final difficulty in ['beginner', 'intermediate', 'advanced']) {
      test('$difficulty bot picks a legal move', () {
        final engine = LocalGameEngine();
        final botMove = pickLocalBotMove(engine, difficulty);
        expect(botMove, isNotNull);
        final group = engine
            .legalMovesForTurn()
            .firstWhere((g) => g.card.id == botMove!.cardId);
        final allowed = cardToPiece(group.card) == PieceType.wild ||
            group.moves.contains(botMove!.move);
        expect(allowed, isTrue);
      });
    }

    test('bot and engine can play a full sequence of moves', () {
      final engine = LocalGameEngine();
      for (var i = 0; i < 20 && !engine.isOver; i++) {
        final move = pickLocalBotMove(engine, 'intermediate');
        if (move == null) break;
        final result = engine.playCard(move.cardId, move.move);
        expect(result.success, isTrue);
      }
      // The game either continues or ended legitimately — no crashes.
      expect(engine.fen, isNotEmpty);
    });
  });
}
