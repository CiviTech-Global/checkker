import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Sound service for game audio feedback.
///
/// Plays pre-generated WAV assets from `assets/sounds/` via a pooled fleet of
/// [AudioPlayer] instances. This avoids the platform instabilities that
/// procedural [BytesSource] and temp-file I/O can have during gameplay.
class SoundService {
  static final SoundService _instance = SoundService._internal();
  factory SoundService() => _instance;
  SoundService._internal();

  static const int _playerCount = 4;

  final List<AudioPlayer> _players = [];
  final List<bool> _busy = [];
  int _roundRobin = 0;

  bool enabled = true;
  double volume = 1.0;
  bool _initialized = false;

  /// Call once before playing any sounds (e.g. in [main]).
  Future<void> init() async {
    if (_initialized) return;
    try {
      for (int i = 0; i < _playerCount; i++) {
        final p = AudioPlayer(playerId: 'sound_pool_$i');
        // Low-latency mode (Android SoundPool) plays short SFX reliably; on
        // platforms that don't support it the call throws and we keep the
        // default media player. Config failures must not disable all audio,
        // so each is best-effort.
        try {
          await p.setReleaseMode(ReleaseMode.stop);
          await p.setPlayerMode(PlayerMode.lowLatency);
        } catch (e) {
          debugPrint('[SoundService] player $i config warning: $e');
        }
        _players.add(p);
        _busy.add(false);
      }
      _initialized = true;
      debugPrint('[SoundService] init OK — $_playerCount players ready');
    } catch (e, st) {
      debugPrint('[SoundService] init FAILED: $e');
      debugPrintStack(stackTrace: st);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  Future<void> playMove() async => _playAsset('sounds/move.wav');
  Future<void> playCapture() async => _playAsset('sounds/capture.wav');
  Future<void> playCheck() async => _playAsset('sounds/check.wav');
  Future<void> playCheckmate() async => _playAsset('sounds/checkmate.wav');
  Future<void> playCastle() async => _playAsset('sounds/castle.wav');
  Future<void> playPromotion() async => _playAsset('sounds/promotion.wav');
  Future<void> playGameStart() async => _playAsset('sounds/game_start.wav');
  Future<void> playGameOver() async => _playAsset('sounds/game_over.wav');

  /// Play every sound in sequence with a small gap — useful for testing.
  Future<void> testAllSounds() async {
    const gap = Duration(milliseconds: 500);
    await playMove();
    await Future.delayed(gap);
    await playCapture();
    await Future.delayed(gap);
    await playCheck();
    await Future.delayed(gap);
    await playCastle();
    await Future.delayed(gap);
    await playPromotion();
    await Future.delayed(gap);
    await playCheckmate();
    await Future.delayed(gap);
    await playGameStart();
    await Future.delayed(Duration(milliseconds: 1000));
    await playGameOver();
  }

  Future<void> dispose() async {
    for (final p in _players) {
      await p.dispose();
    }
    _players.clear();
    _busy.clear();
    _initialized = false;
  }

  // ── Internal playback ─────────────────────────────────────────────────

  Future<void> _playAsset(String assetPath) async {
    if (!enabled) {
      debugPrint('[SoundService] skipped (disabled)');
      return;
    }
    // Lazily (re)initialize so a startup hiccup never permanently mutes audio.
    if (!_initialized) {
      await init();
      if (!_initialized) {
        debugPrint('[SoundService] skipped (init unavailable)');
        return;
      }
    }

    final idx = _pickPlayer();
    final player = _players[idx];
    _busy[idx] = true;

    try {
      debugPrint('[SoundService] playing $assetPath on player $idx');
      await player.setVolume(volume);
      await player.play(AssetSource(assetPath));
      debugPrint('[SoundService] play() returned for player $idx');
    } catch (e, st) {
      debugPrint('[SoundService] play error: $e');
      debugPrintStack(stackTrace: st);
    } finally {
      // Estimate duration from file size (very rough: ~22kHz mono 16-bit).
      // Most sounds are under 1 sec; game_over is ~2.5 sec.
      final estimatedMs = assetPath.contains('game_over')
          ? 2800
          : assetPath.contains('game_start') || assetPath.contains('checkmate')
              ? 1800
              : 800;
      Future.delayed(Duration(milliseconds: estimatedMs), () {
        _busy[idx] = false;
      });
    }
  }

  int _pickPlayer() {
    for (int i = 0; i < _playerCount; i++) {
      final idx = (_roundRobin + i) % _playerCount;
      if (!_busy[idx]) {
        _roundRobin = (idx + 1) % _playerCount;
        return idx;
      }
    }
    final idx = _roundRobin % _playerCount;
    _roundRobin = (_roundRobin + 1) % _playerCount;
    return idx;
  }
}
