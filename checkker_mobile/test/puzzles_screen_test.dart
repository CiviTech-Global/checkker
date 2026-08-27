import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:checkker_mobile/screens/puzzles/puzzles_screen.dart';

void main() {
  testWidgets('renders puzzle categories', (tester) async {
    SharedPreferences.setMockInitialValues({});

    final router = GoRouter(
      initialLocation: '/puzzles',
      routes: [
        GoRoute(
          path: '/puzzles',
          builder: (context, state) => const PuzzlesScreen(),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );

    await tester.pumpAndSettle();

    expect(find.text('Daily Puzzle'), findsOneWidget);
    expect(find.text('Tactical Puzzles'), findsOneWidget);
    expect(find.text('Card Management'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Weakness Training'), 200);

    expect(find.text('Endgame Training'), findsOneWidget);
    expect(find.text('Weakness Training'), findsOneWidget);
  });

  testWidgets('tapping a puzzle category navigates to play', (tester) async {
    SharedPreferences.setMockInitialValues({});

    final router = GoRouter(
      initialLocation: '/puzzles',
      routes: [
        GoRoute(
          path: '/puzzles',
          builder: (context, state) => const PuzzlesScreen(),
        ),
        GoRoute(
          path: '/puzzles/play/:category',
          builder: (context, state) {
            final category = state.pathParameters['category'];
            return Scaffold(body: Text('Play: $category'));
          },
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.text('Tactical Puzzles'));
    await tester.pumpAndSettle();

    expect(find.text('Play: tactics'), findsOneWidget);
  });
}
