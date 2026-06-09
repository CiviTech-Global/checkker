import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const bg = _Bg();
  static const text = _Text();
  static const accent = _Accent();
  static const board = _Board();
  static const highlight = _Highlight();

  static const Color overlay = Color(0xD1000000);
  static const Color cardFace = Color(0xFFFAF5EB);
  static const Color cardBack = Color(0xFF18472A);

  static const border = _Border();
}

class _Bg {
  const _Bg();
  Color get primary => const Color(0xFF1A2E22);
  Color get secondary => const Color(0xFF243D2E);
  Color get tertiary => const Color(0xFF2E4D38);
  Color get felt => const Color(0xFF2A6B40);
  Color get parchment => const Color(0xFFF0E6D0);
  Color get parchmentDark => const Color(0xFFE0D4B8);
}

class _Text {
  const _Text();
  Color get primary => const Color(0xFFF5F0E8);
  Color get secondary => const Color(0xFFE5D9BC);
  Color get muted => const Color(0xFFB0BFAA);
  Color get dark => const Color(0xFF1A2E22);
  Color get onParchment => const Color(0xFF2A1A0E);
}

class _Accent {
  const _Accent();
  Color get primary => const Color(0xFF22944F);
  Color get secondary => const Color(0xFF18783E);
  Color get gold => const Color(0xFFD4A843);
  Color get goldBright => const Color(0xFFF5D680);
  Color get green => const Color(0xFF34D058);
  Color get red => const Color(0xFFE04040);
  Color get burgundy => const Color(0xFF8B1A2B);
  Color get blue => const Color(0xFF4A9EDD);
  Color get bronze => const Color(0xFFCD7F32);
  Color get lapis => const Color(0xFF1A3A6B);
  Color get terraCotta => const Color(0xFFC46B2A);
}

class _Board {
  const _Board();
  Color get light => const Color(0xFFC8B078);
  Color get dark => const Color(0xFF2A6830);
}

class _Highlight {
  const _Highlight();
  Color get legal => const Color(0x8034D058);
  Color get selected => const Color(0x8CD4A843);
  Color get lastMove => const Color(0x59F5D680);
}

class _Border {
  const _Border();
  Color get gold => const Color(0x80D4A843);
  Color get subtle => const Color(0x24F2EDE4);
  Color get lapis => const Color(0x661A3A6B);
  Color get ornate => const Color(0xB3D4A843);
}

class AppSpacing {
  AppSpacing._();
  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

class AppRadius {
  AppRadius._();
  static const double sm = 4;
  static const double md = 8;
  static const double lg = 12;
  static const double xl = 16;
  static const double full = 999;
}

class AppTypography {
  AppTypography._();
  static const double xs = 12;
  static const double sm = 14;
  static const double body = 16;
  static const double md = 18;
  static const double lg = 24;
  static const double xl = 48;
}

class AppShadows {
  AppShadows._();

  static List<BoxShadow> get sm => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.3), offset: const Offset(0, 2), blurRadius: 4),
  ];
  static List<BoxShadow> get md => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.4), offset: const Offset(0, 4), blurRadius: 12),
  ];
  static List<BoxShadow> get lg => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.5), offset: const Offset(0, 8), blurRadius: 24),
  ];
  static List<BoxShadow> get gold => [
    BoxShadow(color: AppColors.accent.gold.withValues(alpha: 0.45), blurRadius: 14),
  ];
}

class AppGradients {
  AppGradients._();

  static const glass = [Color(0x17F5F0E8), Color(0x08F5F0E8)];
  static const accentGreen = [Color(0xFF22944F), Color(0xFF18783E)];
  static const gold = [Color(0xFFD4A843), Color(0xFFCD7F32)];
  static const goldToBronze = [Color(0xFFF5D680), Color(0xFFCD7F32)];
  static const success = [Color(0xFF34D058), Color(0xFF1A8A4A)];
  static const error = [Color(0xFFE04040), Color(0xFF9E2A3A)];
  static const casinoGreen = [Color(0xFF22944F), Color(0xFF18472A)];
  static const velvet = [Color(0xFF243D2E), Color(0xFF2E4D38), Color(0xFF1A2E22)];
  static const parchment = [Color(0xFFF0E6D0), Color(0xFFE0D4B8)];
  static const ornateGold = [Color(0xFFF5D680), Color(0xFFD4A843), Color(0xFFCD7F32)];
  static const burgundyDeep = [Color(0xFF8B1A2B), Color(0xFF5A1018)];
}

class AppMotion {
  AppMotion._();
  static const int fast = 150;
  static const int normal = 250;
  static const int slow = 350;
  static const int pulse = 1000;
}

const glassDecoration = BoxDecoration(
  color: Color(0x14F5F0E8),
  border: Border.fromBorderSide(
    BorderSide(color: Color(0x4DD4A843), width: 1),
  ),
);

const Map<String, Map<String, String>> pieceUnicode = {
  'k': {'white': '\u2654', 'black': '\u265A'},
  'q': {'white': '\u2655', 'black': '\u265B'},
  'r': {'white': '\u2656', 'black': '\u265C'},
  'b': {'white': '\u2657', 'black': '\u265D'},
  'n': {'white': '\u2658', 'black': '\u265E'},
  'p': {'white': '\u2659', 'black': '\u265F'},
};
