import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:checkker_mobile/main.dart';

void main() {
  testWidgets('App launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: CheckkerApp()));
    // Allow socket connection timers to fire
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Checkker'), findsOneWidget);
  });
}
