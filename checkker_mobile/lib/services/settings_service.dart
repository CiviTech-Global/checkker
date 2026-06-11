import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  final bool soundEnabled;
  final bool musicEnabled;
  final double musicVolume; // 0..1
  final bool hapticEnabled;
  final bool reducedMotion;
  final String boardTheme;
  final String pieceTheme;
  final String cardBack;

  const AppSettings({
    this.soundEnabled = true,
    this.musicEnabled = false,
    this.musicVolume = 0.5,
    this.hapticEnabled = true,
    this.reducedMotion = false,
    this.boardTheme = 'classic',
    this.pieceTheme = 'default',
    this.cardBack = 'default',
  });

  AppSettings copyWith({
    bool? soundEnabled,
    bool? musicEnabled,
    double? musicVolume,
    bool? hapticEnabled,
    bool? reducedMotion,
    String? boardTheme,
    String? pieceTheme,
    String? cardBack,
  }) {
    return AppSettings(
      soundEnabled: soundEnabled ?? this.soundEnabled,
      musicEnabled: musicEnabled ?? this.musicEnabled,
      musicVolume: musicVolume ?? this.musicVolume,
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
      musicEnabled: prefs.getBool(_kMusicEnabled) ?? false,
      musicVolume: prefs.getDouble(_kMusicVolume) ?? 0.5,
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
    await prefs.setBool(_kMusicEnabled, newSettings.musicEnabled);
    await prefs.setDouble(_kMusicVolume, newSettings.musicVolume);
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

  Future<void> setMusicEnabled(bool value) async {
    await update(_settings.copyWith(musicEnabled: value));
  }

  Future<void> setMusicVolume(double value) async {
    await update(_settings.copyWith(musicVolume: value.clamp(0.0, 1.0)));
  }

  /// Wipe all locally stored data (settings, streaks, wallet session).
  Future<void> clearAllData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _settings = const AppSettings();
    notifyListeners();
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
  static const String _kMusicEnabled = 'music_enabled';
  static const String _kMusicVolume = 'music_volume';
  static const String _kHapticEnabled = 'haptic_enabled';
  static const String _kReducedMotion = 'reduced_motion';
  static const String _kBoardTheme = 'board_theme';
  static const String _kPieceTheme = 'piece_theme';
  static const String _kCardBack = 'card_back';
}
