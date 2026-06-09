import 'package:flutter/material.dart';
import 'tokens.dart';

ThemeData buildAppTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg.primary,
    colorScheme: ColorScheme.dark(
      primary: AppColors.accent.primary,
      secondary: AppColors.accent.gold,
      surface: AppColors.bg.secondary,
      error: AppColors.accent.red,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.bg.primary,
      foregroundColor: AppColors.text.primary,
      elevation: 0,
    ),
    textTheme: TextTheme(
      headlineLarge: TextStyle(color: AppColors.text.primary, fontWeight: FontWeight.w800),
      headlineMedium: TextStyle(color: AppColors.text.primary, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(color: AppColors.text.primary),
      bodyMedium: TextStyle(color: AppColors.text.secondary),
      bodySmall: TextStyle(color: AppColors.text.muted),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.bg.secondary,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
    ),
  );
}
