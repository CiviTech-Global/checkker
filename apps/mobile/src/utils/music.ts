import { Platform } from "react-native";
import { appSettings } from "../services/SettingsService";

/**
 * Procedural background music: a slow ambient chord pad that loops through a
 * four-chord progression. Web-only (AudioContext), mirroring sounds.ts —
 * native platforms silently no-op until a bundled music asset is added.
 */

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _timer: ReturnType<typeof setInterval> | null = null;
let _playing = false;
let _chordIndex = 0;

// Am – F – C – G progression, low register (frequencies in Hz).
const PROGRESSION: number[][] = [
  [220.0, 261.63, 329.63], // A minor
  [174.61, 220.0, 261.63], // F major
  [130.81, 164.81, 196.0], // C major
  [196.0, 246.94, 293.66], // G major
];

const CHORD_SECONDS = 4;

function getCtx(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (_ctx) return _ctx;
  try {
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (AC) _ctx = new AC();
  } catch {
    /* unsupported */
  }
  return _ctx;
}

function playChord(ctx: AudioContext, freqs: number[]): void {
  if (!_masterGain) return;
  const now = ctx.currentTime;
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    // Soft attack and release so chords blend into a pad.
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08, now + 1.2);
    g.gain.setValueAtTime(0.08, now + CHORD_SECONDS - 1.2);
    g.gain.linearRampToValueAtTime(0, now + CHORD_SECONDS);
    osc.connect(g).connect(_masterGain);
    osc.start(now);
    osc.stop(now + CHORD_SECONDS + 0.05);
  }
}

export function startMusic(): void {
  if (_playing) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  _masterGain = ctx.createGain();
  _masterGain.gain.value = appSettings.settings.musicVolume;
  _masterGain.connect(ctx.destination);

  _playing = true;
  _chordIndex = 0;
  playChord(ctx, PROGRESSION[0]);
  _timer = setInterval(() => {
    if (!_playing || !_ctx) return;
    _chordIndex = (_chordIndex + 1) % PROGRESSION.length;
    playChord(_ctx, PROGRESSION[_chordIndex]);
  }, CHORD_SECONDS * 1000);
}

export function stopMusic(): void {
  _playing = false;
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  if (_masterGain) {
    try {
      _masterGain.disconnect();
    } catch {
      /* already disconnected */
    }
    _masterGain = null;
  }
}

export function setMusicVolume(volume: number): void {
  if (_masterGain) {
    _masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
}

/** Start or stop based on the current persisted setting. */
export function syncMusicWithSettings(): void {
  if (appSettings.settings.musicEnabled) {
    setMusicVolume(appSettings.settings.musicVolume);
    startMusic();
  } else {
    stopMusic();
  }
}
