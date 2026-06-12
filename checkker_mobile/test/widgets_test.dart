import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:checkker_mobile/models/card.dart';
import 'package:checkker_mobile/widgets/card_hand.dart';
import 'package:checkker_mobile/widgets/chess_board.dart';
import 'package:checkker_mobile/widgets/chess_square.dart';

Widget _wrap(Widget child) => MaterialApp(
      home: Scaffold(body: Center(child: child)),
    );

// Keep the board small enough to fit the default 800x600 test viewport.
Widget _wrapBoard(Widget board) => _wrap(SizedBox(width: 360, child: board));

void main() {
  group('CardHand', () {
    final cards = [
      const PlayingCard(suit: Suit.spades, rank: Rank.king),
      const PlayingCard(suit: Suit.hearts, rank: Rank.five),
      const PlayingCard(suit: Suit.diamonds, rank: Rank.ace),
    ];

    testWidgets('renders all cards with rank and piece labels', (tester) async {
      await tester.pumpWidget(_wrap(CardHand(cards: cards, onCardTap: (_) {})));
      expect(find.text('K'), findsOneWidget);
      expect(find.text('5'), findsOneWidget);
      expect(find.text('A'), findsOneWidget);
      expect(find.text('King'), findsOneWidget);
      expect(find.text('Pawn'), findsOneWidget);
      expect(find.text('Wild'), findsOneWidget);
    });

    testWidgets('tapping a card invokes the callback with its index', (tester) async {
      int? tapped;
      await tester.pumpWidget(
        _wrap(CardHand(cards: cards, onCardTap: (i) => tapped = i)),
      );
      await tester.tap(find.text('5'));
      expect(tapped, 1);
    });

    testWidgets('does not invoke the callback when disabled', (tester) async {
      int? tapped;
      await tester.pumpWidget(
        _wrap(CardHand(cards: cards, disabled: true, onCardTap: (i) => tapped = i)),
      );
      await tester.tap(find.text('5'));
      expect(tapped, isNull);
    });

    testWidgets('pads short hands with empty slots up to 3', (tester) async {
      await tester.pumpWidget(_wrap(CardHand(
        cards: [cards.first],
        onCardTap: (_) {},
      )));
      expect(find.text('K'), findsOneWidget);
      // Only one real card rendered; the rest are empty slot containers.
      expect(find.byType(GestureDetector), findsOneWidget);
    });
  });

  group('ChessBoard', () {
    testWidgets('renders 64 squares with coordinates', (tester) async {
      await tester.pumpWidget(_wrapBoard(ChessBoard(onSquarePress: (_) {})));
      expect(find.byType(ChessSquare), findsNWidgets(64));
      // Rank and file labels.
      expect(find.text('8'), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.text('a'), findsOneWidget);
      expect(find.text('h'), findsOneWidget);
    });

    testWidgets('tapping a square reports its algebraic name', (tester) async {
      String? pressed;
      await tester.pumpWidget(
        _wrapBoard(ChessBoard(onSquarePress: (sq) => pressed = sq)),
      );
      final e2 = find.byWidgetPredicate(
        (w) => w is ChessSquare && w.square == 'e2',
      );
      expect(e2, findsOneWidget);
      await tester.tap(e2);
      expect(pressed, 'e2');
    });

    testWidgets('non-interactive board ignores taps', (tester) async {
      String? pressed;
      await tester.pumpWidget(_wrapBoard(ChessBoard(
        interactive: false,
        onSquarePress: (sq) => pressed = sq,
      )));
      final e2 = find.byWidgetPredicate(
        (w) => w is ChessSquare && w.square == 'e2',
      );
      await tester.tap(e2);
      expect(pressed, isNull);
    });
  });
}
