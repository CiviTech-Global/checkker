import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:reown_appkit/reown_appkit.dart';
import 'router.dart';
import 'services/analytics_service.dart';
import 'services/music_service.dart';
import 'services/settings_service.dart';
import 'services/socket_service.dart';
import 'services/sound_service.dart';
import 'services/wallet_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Sentry crash reporting before anything else.
  await AnalyticsService().init();

  // Crash reporting: route framework and platform errors through the
  // analytics service so a backend can be attached in one place.
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    AnalyticsService().recordError(details.exception, details.stack);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    AnalyticsService().recordError(error, stack, fatal: true);
    return true;
  };

  await WalletService().load();
  await SettingsService().load();
  // Apply a custom server address (e.g. another machine's [ip]:port) before
  // the socket is first used, so the app connects to the right host.
  final savedUrl = SettingsService().settings.serverUrl;
  if (savedUrl.isNotEmpty) {
    SocketService().setServerUrl(savedUrl);
  }
  await SoundService().init();
  SoundService().enabled = SettingsService().settings.soundEnabled;
  final settings = SettingsService().settings;
  if (settings.musicEnabled) {
    // Fire and forget — don't block first frame on audio start.
    MusicService().start(volume: settings.musicVolume);
  }
  AnalyticsService().logEvent('app_start');
  runApp(const ProviderScope(child: CheckkerApp()));
}

class CheckkerApp extends StatelessWidget {
  const CheckkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ReownAppKitModalTheme(
      isDarkMode: true,
      themeData: ReownAppKitModalThemeData(
        darkColors: ReownAppKitModalColors.darkMode.copyWith(
          accent100: const Color(0xFFA855F7),
          accent090: const Color(0xFFA855F7),
          accent080: const Color(0xFF7C3AED),
        ),
      ),
      child: MaterialApp.router(
        title: 'Checkker',
        theme: buildAppTheme(),
        routerConfig: goRouter,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
