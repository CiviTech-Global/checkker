import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const bg = _Bg();
  static const text = _Text();
  static const accent = _Accent();
  static const board = _Board();
  static const highlight = _Highlight();

  // Dark Violet Esports palette. Keys unchanged so widgets re-skin
  // automatically; some semantic names (e.g. `accent.gold` = amber) map onto
  // a new hue.
  static const Color overlay = Color(0xDB080610);
  static const Color cardFace = Color(0xFFF7F4FE);
  static const Color cardBack = Color(0xFF3A2E5E);

  static const border = _Border();
}

class _Bg {
  const _Bg();
  Color get primary => const Color(0xFF14101F);
  Color get secondary => const Color(0xFF1E1830);
  Color get tertiary => const Color(0xFF2A2240);
  Color get felt => const Color(0xFF221B38);
  Color get parchment => const Color(0xFFEDE9F7);
  Color get parchmentDark => const Color(0xFFD9D2EC);
}

class _Text {
  const _Text();
  Color get primary => const Color(0xFFF4F1FB);
  Color get secondary => const Color(0xFFC9BEE8);
  Color get muted => const Color(0xFF8B82A8);
  Color get dark => const Color(0xFF14101F);
  Color get onParchment => const Color(0xFF241C3A);
}

class _Accent {
  const _Accent();
  Color get primary => const Color(0xFFA855F7); // brand violet
  Color get secondary => const Color(0xFF7C3AED);
  Color get gold => const Color(0xFFF0B43C); // amber (ratings, points)
  Color get goldBright => const Color(0xFFFFD27A);
  Color get green => const Color(0xFF34E5A1); // neon mint
  Color get red => const Color(0xFFFF4D6D); // neon rose
  Color get burgundy => const Color(0xFF7A1F3D);
  Color get blue => const Color(0xFF5BC0FF); // neon cyan
  Color get bronze => const Color(0xFFC77DFF);
  Color get lapis => const Color(0xFF3B2E6E);
  Color get terraCotta => const Color(0xFFF0883E);
}

class _Board {
  const _Board();
  Color get light => const Color(0xFFD7CFEC);
  Color get dark => const Color(0xFF4B3F77);
}

class _Highlight {
  const _Highlight();
  Color get legal => const Color(0x7334E5A1);
  Color get selected => const Color(0x8CA855F7);
  Color get lastMove => const Color(0x52A855F7);
}

class _Border {
  const _Border();
  Color get gold => const Color(0x73A855F7); // violet glow
  Color get subtle => const Color(0x1FF4F1FB);
  Color get lapis => const Color(0x733B2E6E);
  Color get ornate => const Color(0xB3A855F7);
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
  // Neon-violet glow (key kept as `gold`).
  static List<BoxShadow> get gold => [
    BoxShadow(color: AppColors.accent.primary.withValues(alpha: 0.55), blurRadius: 16),
  ];
  static List<BoxShadow> get glow => [
    BoxShadow(color: AppColors.accent.primary.withValues(alpha: 0.6), blurRadius: 22),
  ];
}

class AppGradients {
  AppGradients._();

  static const glass = [Color(0x1FA855F7), Color(0x08A855F7)];
  static const accentGreen = [Color(0xFFA855F7), Color(0xFF7C3AED)];
  static const gold = [Color(0xFFF0B43C), Color(0xFFC77DFF)];
  static const goldToBronze = [Color(0xFFFFD27A), Color(0xFFC77DFF)];
  static const success = [Color(0xFF34E5A1), Color(0xFF0FA968)];
  static const error = [Color(0xFFFF4D6D), Color(0xFF9E2A3A)];
  static const casinoGreen = [Color(0xFFA855F7), Color(0xFF3A2E5E)];
  static const velvet = [Color(0xFF1E1830), Color(0xFF2A2240), Color(0xFF14101F)];
  static const parchment = [Color(0xFFEDE9F7), Color(0xFFD9D2EC)];
  static const ornateGold = [Color(0xFFFFD27A), Color(0xFFF0B43C), Color(0xFFC77DFF)];
  static const burgundyDeep = [Color(0xFF7A1F3D), Color(0xFF3A1018)];
  static const neonViolet = [Color(0xFFC77DFF), Color(0xFFA855F7), Color(0xFF7C3AED)];
}

class AppMotion {
  AppMotion._();
  static const int fast = 150;
  static const int normal = 250;
  static const int slow = 350;
  static const int pulse = 1000;
}

const glassDecoration = BoxDecoration(
  color: Color(0x14A855F7),
  border: Border.fromBorderSide(
    BorderSide(color: Color(0x47A855F7), width: 1),
  ),
);

class AppSizes {
  AppSizes._();

  static double contentMaxWidth(double screenWidth) {
    if (screenWidth >= 1024) return 600;
    if (screenWidth >= 600) return 520;
    return screenWidth;
  }

  static double cardWidth(double screenWidth) =>
      (screenWidth / 6.5).clamp(48.0, 80.0);

  static double cardHeight(double cardW) => cardW * 1.375;

  static double miniCardWidth(double screenWidth) =>
      cardWidth(screenWidth) * 0.625;

  static int gridColumns(double screenWidth, double minItemWidth) =>
      (screenWidth / minItemWidth).floor().clamp(3, 8);

  static bool isTablet(double screenWidth) => screenWidth >= 600;
}

const Map<String, Map<String, String>> pieceUnicode = {
  'k': {'white': '\u2654', 'black': '\u265A'},
  'q': {'white': '\u2655', 'black': '\u265B'},
  'r': {'white': '\u2656', 'black': '\u265C'},
  'b': {'white': '\u2657', 'black': '\u265D'},
  'n': {'white': '\u2658', 'black': '\u265E'},
  'p': {'white': '\u2659', 'black': '\u265F'},
};
