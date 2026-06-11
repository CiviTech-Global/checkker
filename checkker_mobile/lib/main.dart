import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:reown_appkit/reown_appkit.dart';
import 'router.dart';
import 'services/music_service.dart';
import 'services/settings_service.dart';
import 'services/sound_service.dart';
import 'services/wallet_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await WalletService().load();
  await SettingsService().load();
  await SoundService().init();
  SoundService().enabled = SettingsService().settings.soundEnabled;
  final settings = SettingsService().settings;
  if (settings.musicEnabled) {
    // Fire and forget — don't block first frame on audio start.
    MusicService().start(volume: settings.musicVolume);
  }
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
          accent100: const Color(0xFFD4A843),
          accent090: const Color(0xFFD4A843),
          accent080: const Color(0xFFCD7F32),
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
