import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:checkker_mobile/main.dart';
import 'package:checkker_mobile/services/settings_service.dart';

void main() {
  testWidgets('App launches smoke test', (WidgetTester tester) async {
    // A configured server URL clears the first-run setup gate so the app lands
    // on the home menu.
    SharedPreferences.setMockInitialValues({'server_url': 'http://localhost:3001'});
    await SettingsService().load();

    await tester.pumpWidget(const ProviderScope(child: CheckkerApp()));
    // Allow socket connection timers to fire
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Checkker'), findsOneWidget);
  });

  testWidgets('First run shows the server setup gate', (WidgetTester tester) async {
    // No saved server URL → the setup screen gates the menu.
    SharedPreferences.setMockInitialValues({});
    await SettingsService().load();

    await tester.pumpWidget(const ProviderScope(child: CheckkerApp()));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Connect to Server'), findsOneWidget);
  });
}
