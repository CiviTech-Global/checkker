import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:reown_appkit/reown_appkit.dart';
import 'router.dart';
import 'services/wallet_service.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  WalletService().load();
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
