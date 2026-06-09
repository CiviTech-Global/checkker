import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

const int _sampleRate = 22050;

enum _Waveform { sine, triangle, square, sawtooth }

class _Tone {
  final int freq;
  final int durationMs;
  final _Waveform waveform;
  final double gain;
  final double fadeOut;
  final double attack;
  final int delayMs;

  _Tone(
    this.freq,
    this.durationMs,
    this.waveform,
    this.gain, {
    this.fadeOut = 0.3,
    this.attack = 0.02,
    this.delayMs = 0,
  });
}

Uint8List _synthesizeWav(List<_Tone> tones) {
  const sampleRate = _sampleRate;

  int totalSamples = 0;
  for (final tone in tones) {
    final startSample = (tone.delayMs * sampleRate) ~/ 1000;
    final durationSamples = (tone.durationMs * sampleRate) ~/ 1000;
    totalSamples = math.max(totalSamples, startSample + durationSamples);
  }
  totalSamples += sampleRate ~/ 8;

  final buffer = Float32List(totalSamples);

  for (final tone in tones) {
    final startSample = (tone.delayMs * sampleRate) ~/ 1000;
    final durationSamples = (tone.durationMs * sampleRate) ~/ 1000;
    final endSample = math.min(startSample + durationSamples, totalSamples);
    final attackEnd = startSample + (durationSamples * tone.attack).toInt();
    final fadeOutStart = startSample + (durationSamples * (1 - tone.fadeOut)).toInt();

    for (int i = startSample; i < endSample; i++) {
      final t = (i - startSample) / sampleRate;
      double sample = _waveSample(tone.waveform, tone.freq, t);

      double envelope = 1.0;
      if (i < attackEnd && attackEnd > startSample) {
        envelope = (i - startSample) / (attackEnd - startSample).toDouble();
      }
      if (i >= fadeOutStart && endSample > fadeOutStart) {
        envelope *= (endSample - i) / (endSample - fadeOutStart).toDouble();
      }

      buffer[i] += sample * tone.gain * envelope;
    }
  }

  const echoDelaySamples = sampleRate ~/ 12;
  const echoGain = 0.18;
  for (int i = echoDelaySamples; i < totalSamples; i++) {
    buffer[i] += buffer[i - echoDelaySamples] * echoGain;
  }

  double peak = 0.0;
  for (int i = 0; i < totalSamples; i++) {
    peak = math.max(peak, buffer[i].abs());
  }
  final normalizeFactor = peak > 1.0 ? 1.0 / peak : 1.0;

  final pcmData = Int16List(totalSamples);
  for (int i = 0; i < totalSamples; i++) {
    final clamped = (buffer[i] * normalizeFactor).clamp(-1.0, 1.0);
    final soft = clamped * (1.5 - 0.5 * clamped * clamped);
    pcmData[i] = (soft * 32767).toInt();
  }

  return _buildWav(pcmData, sampleRate);
}

double _waveSample(_Waveform wf, int freq, double t) {
  switch (wf) {
    case _Waveform.sine:
      return math.sin(2 * math.pi * freq * t);
    case _Waveform.triangle:
      final phase = (t * freq) % 1.0;
      return 2 * (2 * phase - 1).abs() - 1;
    case _Waveform.square:
      return math.sin(2 * math.pi * freq * t) >= 0 ? 1.0 : -1.0;
    case _Waveform.sawtooth:
      return 2 * ((t * freq) % 1.0) - 1;
  }
}

Uint8List _buildWav(Int16List pcmData, int sampleRate) {
  final numChannels = 1;
  final bitsPerSample = 16;
  final byteRate = sampleRate * numChannels * bitsPerSample ~/ 8;
  final blockAlign = numChannels * bitsPerSample ~/ 8;
  final dataSize = pcmData.lengthInBytes;
  final fileSize = 44 + dataSize;

  final bytes = BytesBuilder();

  bytes.add([0x52, 0x49, 0x46, 0x46]); // "RIFF"
  bytes.add(_u32(fileSize - 8));
  bytes.add([0x57, 0x41, 0x56, 0x45]); // "WAVE"

  bytes.add([0x66, 0x6D, 0x74, 0x20]); // "fmt "
  bytes.add(_u32(16));
  bytes.add(_u16(1)); // PCM
  bytes.add(_u16(numChannels));
  bytes.add(_u32(sampleRate));
  bytes.add(_u32(byteRate));
  bytes.add(_u16(blockAlign));
  bytes.add(_u16(bitsPerSample));

  bytes.add([0x64, 0x61, 0x74, 0x61]); // "data"
  bytes.add(_u32(dataSize));

  final header = bytes.toBytes();
  final out = Uint8List(header.length + dataSize);
  out.setRange(0, header.length, header);

  final pcmBytes = pcmData.buffer.asUint8List();
  out.setRange(header.length, out.length, pcmBytes);

  return out;
}

List<int> _u16(int value) => [value & 0xFF, (value >> 8) & 0xFF];
List<int> _u32(int value) => [
  value & 0xFF,
  (value >> 8) & 0xFF,
  (value >> 16) & 0xFF,
  (value >> 24) & 0xFF,
];

void main() {
  final outDir = Directory('assets/sounds');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  final sounds = {
    'move': [
      _Tone(820, 55, _Waveform.triangle, 0.38, attack: 0.03, fadeOut: 0.45),
      _Tone(1230, 28, _Waveform.sine, 0.12, attack: 0.03, fadeOut: 0.75, delayMs: 2),
      _Tone(828, 55, _Waveform.triangle, 0.08, attack: 0.03, fadeOut: 0.45, delayMs: 1),
    ],
    'capture': [
      _Tone(200, 140, _Waveform.triangle, 0.48, attack: 0.02, fadeOut: 0.35),
      _Tone(420, 75, _Waveform.square, 0.10, attack: 0.02, fadeOut: 0.55),
      _Tone(95, 220, _Waveform.sine, 0.22, attack: 0.02, fadeOut: 0.45),
      _Tone(60, 280, _Waveform.sine, 0.12, attack: 0.05, fadeOut: 0.40, delayMs: 30),
    ],
    'check': [
      _Tone(1100, 110, _Waveform.sine, 0.32, attack: 0.02, fadeOut: 0.35),
      _Tone(1650, 55, _Waveform.sine, 0.14, attack: 0.02, fadeOut: 0.75, delayMs: 45),
      _Tone(2200, 40, _Waveform.sine, 0.08, attack: 0.02, fadeOut: 0.80, delayMs: 80),
    ],
    'checkmate': [
      _Tone(1400, 70, _Waveform.sawtooth, 0.18, attack: 0.03, fadeOut: 0.45),
      _Tone(220, 420, _Waveform.triangle, 0.28, attack: 0.04, fadeOut: 0.45, delayMs: 70),
      _Tone(330, 360, _Waveform.sine, 0.16, attack: 0.04, fadeOut: 0.45, delayMs: 70),
      _Tone(440, 300, _Waveform.sine, 0.10, attack: 0.04, fadeOut: 0.55, delayMs: 70),
      _Tone(110, 520, _Waveform.sine, 0.20, attack: 0.06, fadeOut: 0.65, delayMs: 120),
      _Tone(55, 600, _Waveform.sine, 0.12, attack: 0.08, fadeOut: 0.70, delayMs: 150),
    ],
    'castle': [
      _Tone(700, 45, _Waveform.triangle, 0.32, attack: 0.03, fadeOut: 0.45),
      _Tone(900, 45, _Waveform.triangle, 0.26, attack: 0.03, fadeOut: 0.45, delayMs: 90),
      _Tone(650, 60, _Waveform.sine, 0.08, attack: 0.05, fadeOut: 0.50, delayMs: 120),
    ],
    'promotion': [
      _Tone(600, 55, _Waveform.sine, 0.18, attack: 0.03, fadeOut: 0.45),
      _Tone(900, 55, _Waveform.sine, 0.20, attack: 0.03, fadeOut: 0.45, delayMs: 50),
      _Tone(1200, 55, _Waveform.sine, 0.22, attack: 0.03, fadeOut: 0.45, delayMs: 100),
      _Tone(1600, 140, _Waveform.sine, 0.28, attack: 0.03, fadeOut: 0.55, delayMs: 150),
      _Tone(2000, 100, _Waveform.sine, 0.10, attack: 0.05, fadeOut: 0.60, delayMs: 180),
    ],
    'game_start': [
      _Tone(523, 110, _Waveform.triangle, 0.28, attack: 0.03, fadeOut: 0.25),
      _Tone(659, 110, _Waveform.triangle, 0.30, attack: 0.03, fadeOut: 0.25, delayMs: 110),
      _Tone(784, 110, _Waveform.triangle, 0.32, attack: 0.03, fadeOut: 0.25, delayMs: 220),
      _Tone(1047, 240, _Waveform.sine, 0.36, attack: 0.03, fadeOut: 0.45, delayMs: 330),
      _Tone(784, 190, _Waveform.sine, 0.10, attack: 0.03, fadeOut: 0.45, delayMs: 330),
      _Tone(1319, 180, _Waveform.sine, 0.08, attack: 0.04, fadeOut: 0.50, delayMs: 360),
    ],
    'game_over': [
      _Tone(622, 140, _Waveform.triangle, 0.28, attack: 0.03, fadeOut: 0.25),
      _Tone(523, 140, _Waveform.triangle, 0.26, attack: 0.03, fadeOut: 0.25, delayMs: 130),
      _Tone(415, 140, _Waveform.triangle, 0.24, attack: 0.03, fadeOut: 0.25, delayMs: 260),
      _Tone(311, 340, _Waveform.sine, 0.30, attack: 0.04, fadeOut: 0.50, delayMs: 400),
      _Tone(80, 520, _Waveform.sine, 0.18, attack: 0.06, fadeOut: 0.60, delayMs: 400),
      _Tone(55, 650, _Waveform.sine, 0.10, attack: 0.08, fadeOut: 0.70, delayMs: 480),
    ],
  };

  for (final entry in sounds.entries) {
    final wav = _synthesizeWav(entry.value);
    final file = File('${outDir.path}/${entry.key}.wav');
    file.writeAsBytesSync(wav);
    print('Generated ${file.path} (${wav.length} bytes)');
  }

  print('Done — ${sounds.length} sound assets generated.');
}
