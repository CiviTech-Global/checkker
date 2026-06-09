import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  final bool soundEnabled;
  final bool hapticEnabled;
  final bool reducedMotion;
  final String boardTheme;
  final String pieceTheme;
  final String cardBack;

  const AppSettings({
    this.soundEnabled = true,
    this.hapticEnabled = true,
    this.reducedMotion = false,
    this.boardTheme = 'classic',
    this.pieceTheme = 'default',
    this.cardBack = 'default',
  });

  AppSettings copyWith({
    bool? soundEnabled,
    bool? hapticEnabled,
    bool? reducedMotion,
    String? boardTheme,
    String? pieceTheme,
    String? cardBack,
  }) {
    return AppSettings(
      soundEnabled: soundEnabled ?? this.soundEnabled,
      hapticEnabled: hapticEnabled ?? this.hapticEnabled,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      boardTheme: boardTheme ?? this.boardTheme,
      pieceTheme: pieceTheme ?? this.pieceTheme,
      cardBack: cardBack ?? this.cardBack,
    );
  }
}

class SettingsService extends ChangeNotifier {
  static final SettingsService _instance = SettingsService._internal();
  factory SettingsService() => _instance;
  SettingsService._internal();

  AppSettings _settings = const AppSettings();
  AppSettings get settings => _settings;

  bool _initialized = false;
  bool get initialized => _initialized;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _settings = AppSettings(
      soundEnabled: prefs.getBool(_kSoundEnabled) ?? true,
      hapticEnabled: prefs.getBool(_kHapticEnabled) ?? true,
      reducedMotion: prefs.getBool(_kReducedMotion) ?? false,
      boardTheme: prefs.getString(_kBoardTheme) ?? 'classic',
      pieceTheme: prefs.getString(_kPieceTheme) ?? 'default',
      cardBack: prefs.getString(_kCardBack) ?? 'default',
    );
    _initialized = true;
    notifyListeners();
  }

  Future<void> update(AppSettings newSettings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kSoundEnabled, newSettings.soundEnabled);
    await prefs.setBool(_kHapticEnabled, newSettings.hapticEnabled);
    await prefs.setBool(_kReducedMotion, newSettings.reducedMotion);
    await prefs.setString(_kBoardTheme, newSettings.boardTheme);
    await prefs.setString(_kPieceTheme, newSettings.pieceTheme);
    await prefs.setString(_kCardBack, newSettings.cardBack);
    _settings = newSettings;
    notifyListeners();
  }

  Future<void> setSoundEnabled(bool value) async {
    await update(_settings.copyWith(soundEnabled: value));
  }

  Future<void> setHapticEnabled(bool value) async {
    await update(_settings.copyWith(hapticEnabled: value));
  }

  Future<void> setReducedMotion(bool value) async {
    await update(_settings.copyWith(reducedMotion: value));
  }

  Future<void> setBoardTheme(String value) async {
    await update(_settings.copyWith(boardTheme: value));
  }

  Future<void> setPieceTheme(String value) async {
    await update(_settings.copyWith(pieceTheme: value));
  }

  Future<void> setCardBack(String value) async {
    await update(_settings.copyWith(cardBack: value));
  }

  static const String _kSoundEnabled = 'sound_enabled';
  static const String _kHapticEnabled = 'haptic_enabled';
  static const String _kReducedMotion = 'reduced_motion';
  static const String _kBoardTheme = 'board_theme';
  static const String _kPieceTheme = 'piece_theme';
  static const String _kCardBack = 'card_back';
}
