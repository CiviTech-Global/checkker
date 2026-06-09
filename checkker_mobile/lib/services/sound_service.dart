import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

/// Sound service for game audio feedback.
///
/// Synthesizes procedural WAV tones in-memory to match the React Native app's
/// sound design (Web Audio API on web, base64-encoded PCM16 WAV on native).
///
/// All sounds are generated on-the-fly — no bundled assets required.
class SoundService {
  static final SoundService _instance = SoundService._internal();
  factory SoundService() => _instance;
  SoundService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool enabled = true;

  // ── Public API ────────────────────────────────────────────────────────

  Future<void> playMove() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(800, 60, _Waveform.triangle, 0.4, fadeOut: 0.5),
      _Tone(1200, 30, _Waveform.sine, 0.15, fadeOut: 0.8),
    ]);
  }

  Future<void> playCapture() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(180, 150, _Waveform.triangle, 0.5, fadeOut: 0.4),
      _Tone(400, 80, _Waveform.square, 0.12, fadeOut: 0.6),
      _Tone(90, 200, _Waveform.sine, 0.25, fadeOut: 0.5),
    ]);
  }

  Future<void> playCheck() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(1100, 120, _Waveform.sine, 0.35, fadeOut: 0.4),
      _Tone(1650, 60, _Waveform.sine, 0.15, fadeOut: 0.8, delayMs: 50),
    ]);
  }

  Future<void> playCheckmate() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(1400, 80, _Waveform.sawtooth, 0.2, fadeOut: 0.5),
      _Tone(220, 400, _Waveform.triangle, 0.3, fadeOut: 0.5, delayMs: 60),
      _Tone(330, 350, _Waveform.sine, 0.18, fadeOut: 0.5, delayMs: 60),
      _Tone(440, 300, _Waveform.sine, 0.12, fadeOut: 0.6, delayMs: 60),
      _Tone(110, 500, _Waveform.sine, 0.22, fadeOut: 0.7, delayMs: 100),
    ]);
  }

  Future<void> playCastle() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(700, 50, _Waveform.triangle, 0.35, fadeOut: 0.5),
      _Tone(900, 50, _Waveform.triangle, 0.3, fadeOut: 0.5, delayMs: 80),
    ]);
  }

  Future<void> playPromotion() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(600, 60, _Waveform.sine, 0.2, fadeOut: 0.5),
      _Tone(900, 60, _Waveform.sine, 0.22, fadeOut: 0.5, delayMs: 50),
      _Tone(1200, 60, _Waveform.sine, 0.24, fadeOut: 0.5, delayMs: 100),
      _Tone(1600, 150, _Waveform.sine, 0.3, fadeOut: 0.6, delayMs: 150),
    ]);
  }

  Future<void> playGameStart() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(523, 120, _Waveform.triangle, 0.3, fadeOut: 0.3, delayMs: 0),
      _Tone(659, 120, _Waveform.triangle, 0.32, fadeOut: 0.3, delayMs: 120),
      _Tone(784, 120, _Waveform.triangle, 0.34, fadeOut: 0.3, delayMs: 240),
      _Tone(1047, 250, _Waveform.sine, 0.38, fadeOut: 0.5, delayMs: 360),
      _Tone(784, 200, _Waveform.sine, 0.12, fadeOut: 0.5, delayMs: 360),
    ]);
  }

  Future<void> playGameOver() async {
    if (!enabled) return;
    await _playMultiTone([
      _Tone(622, 150, _Waveform.triangle, 0.32, fadeOut: 0.3, delayMs: 0),
      _Tone(523, 150, _Waveform.triangle, 0.30, fadeOut: 0.3, delayMs: 140),
      _Tone(415, 150, _Waveform.triangle, 0.28, fadeOut: 0.3, delayMs: 280),
      _Tone(311, 350, _Waveform.sine, 0.35, fadeOut: 0.6, delayMs: 420),
      _Tone(80, 500, _Waveform.sine, 0.2, fadeOut: 0.7, delayMs: 420),
    ]);
  }

  void dispose() {
    _player.dispose();
  }

  // ── Synthesis engine ──────────────────────────────────────────────────

  Future<void> _playMultiTone(List<_Tone> tones) async {
    try {
      final wavBytes = _synthesizeWav(tones);
      await _player.play(BytesSource(wavBytes));
    } catch (e) {
      // Silently ignore audio errors
    }
  }

  /// Synthesize a mono PCM16 WAV file from multiple overlapping tones.
  Uint8List _synthesizeWav(List<_Tone> tones) {
    const sampleRate = 22050;

    // Determine total duration
    int totalSamples = 0;
    for (final tone in tones) {
      final startSample = (tone.delayMs * sampleRate) ~/ 1000;
      final durationSamples = (tone.durationMs * sampleRate) ~/ 1000;
      totalSamples = max(totalSamples, startSample + durationSamples);
    }
    // Add a small tail for fade-outs
    totalSamples += sampleRate ~/ 10;

    final buffer = Float32List(totalSamples);

    for (final tone in tones) {
      final startSample = (tone.delayMs * sampleRate) ~/ 1000;
      final durationSamples = (tone.durationMs * sampleRate) ~/ 1000;
      final endSample = min(startSample + durationSamples, totalSamples);
      final fadeOutStart = startSample + (durationSamples * (1 - tone.fadeOut)).toInt();

      for (int i = startSample; i < endSample; i++) {
        final t = (i - startSample) / sampleRate;
        double sample;

        switch (tone.waveform) {
          case _Waveform.sine:
            sample = sin(2 * pi * tone.freq * t);
          case _Waveform.triangle:
            final phase = (t * tone.freq) % 1.0;
            sample = 2 * (2 * phase - 1).abs() - 1;
          case _Waveform.square:
            sample = sin(2 * pi * tone.freq * t) >= 0 ? 1.0 : -1.0;
          case _Waveform.sawtooth:
            sample = 2 * ((t * tone.freq) % 1.0) - 1;
        }

        // Envelope: fade out portion
        double envelope = 1.0;
        if (i >= fadeOutStart) {
          envelope = (endSample - i) / (endSample - fadeOutStart).toDouble();
        }

        buffer[i] += sample * tone.gain * envelope;
      }
    }

    // Soft clipping / normalization
    double peak = 0.0;
    for (int i = 0; i < totalSamples; i++) {
      peak = max(peak, buffer[i].abs());
    }
    final normalizeFactor = peak > 1.0 ? 1.0 / peak : 1.0;

    // Convert to PCM16
    final pcmData = Int16List(totalSamples);
    for (int i = 0; i < totalSamples; i++) {
      final clamped = (buffer[i] * normalizeFactor).clamp(-1.0, 1.0);
      pcmData[i] = (clamped * 32767).toInt();
    }

    return _buildWav(pcmData, sampleRate);
  }

  Uint8List _buildWav(Int16List pcmData, int sampleRate) {
    final numChannels = 1;
    final bitsPerSample = 16;
    final byteRate = sampleRate * numChannels * bitsPerSample ~/ 8;
    final blockAlign = numChannels * bitsPerSample ~/ 8;
    final dataSize = pcmData.lengthInBytes;
    final fileSize = 44 + dataSize;

    final bytes = BytesBuilder();

    // RIFF header
    bytes.add([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    bytes.add(_u32(fileSize - 8));
    bytes.add([0x57, 0x41, 0x56, 0x45]); // "WAVE"

    // fmt chunk
    bytes.add([0x66, 0x6D, 0x74, 0x20]); // "fmt "
    bytes.add(_u32(16)); // chunk size
    bytes.add(_u16(1)); // audio format = PCM
    bytes.add(_u16(numChannels));
    bytes.add(_u32(sampleRate));
    bytes.add(_u32(byteRate));
    bytes.add(_u16(blockAlign));
    bytes.add(_u16(bitsPerSample));

    // data chunk
    bytes.add([0x64, 0x61, 0x74, 0x61]); // "data"
    bytes.add(_u32(dataSize));

    final result = bytes.toBytes();
    final out = Uint8List(result.length + dataSize);
    out.setRange(0, result.length, result);

    // Copy PCM data (little-endian)
    final pcmBytes = pcmData.buffer.asUint8List();
    out.setRange(result.length, out.length, pcmBytes);

    return out;
  }

  List<int> _u16(int value) => [value & 0xFF, (value >> 8) & 0xFF];
  List<int> _u32(int value) => [
    value & 0xFF,
    (value >> 8) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 24) & 0xFF,
  ];
}

enum _Waveform { sine, triangle, square, sawtooth }

class _Tone {
  final int freq;
  final int durationMs;
  final _Waveform waveform;
  final double gain;
  final double fadeOut;
  final int delayMs;

  _Tone(
    this.freq,
    this.durationMs,
    this.waveform,
    this.gain, {
    this.fadeOut = 0.3,
    this.delayMs = 0,
  });
}
