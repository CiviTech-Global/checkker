import { Platform } from "react-native";

/* ── Web Audio Context (singleton, lazy) ─────────────────────────────── */

let _ctx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (_ctx) return _ctx;
  try {
    const AC =
      (globalThis as any).AudioContext ||
      (globalThis as any).webkitAudioContext;
    if (AC) _ctx = new AC();
  } catch { /* unsupported */ }
  return _ctx;
}

/** Resume the AudioContext (browsers require a user gesture first). */
function ensureResumed(): void {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/* ── Low-level: play an oscillator tone (web) ────────────────────────── */

type OscType = OscillatorType;

interface ToneSpec {
  freq: number;
  durationS: number;
  type?: OscType;
  gain?: number;
  /** fade-out portion 0..1 (default 0.3 = last 30%) */
  fadeOut?: number;
  /** delay before start (seconds) */
  delay?: number;
}

function schedTone(ctx: AudioContext, t: ToneSpec): void {
  const now = ctx.currentTime + (t.delay ?? 0);
  const dur = t.durationS;
  const vol = t.gain ?? 0.35;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, now);
  g.gain.setValueAtTime(vol, now);

  // Fade out
  const fadeStart = now + dur * (1 - (t.fadeOut ?? 0.3));
  g.gain.setValueAtTime(vol, fadeStart);
  g.gain.linearRampToValueAtTime(0, now + dur);

  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.01);
}

/* ── Native fallback (expo-av) ───────────────────────────────────────── */

async function playToneNative(freq: number, durationMs: number, vol: number): Promise<void> {
  try {
    const { Audio } = await import("expo-av");
    const sampleRate = 22050;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const dataSize = numSamples * 2;
    const fileSize = 44 + dataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const ws = (v: DataView, o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };
    ws(view, 0, "RIFF");
    view.setUint32(4, fileSize - 8, true);
    ws(view, 8, "WAVE");
    ws(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ws(view, 36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = i < numSamples * 0.7 ? 1 : (numSamples - i) / (numSamples * 0.3);
      const s = Math.sin(2 * Math.PI * freq * t) * vol * env;
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const uri = "data:audio/wav;base64," + btoa(bin);
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    setTimeout(() => sound.unloadAsync().catch(() => {}), durationMs + 200);
  } catch { /* ignore */ }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Public sound effects                                                 */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Chess-style move click — crisp wooden "tap".
 * Two stacked short tones give a richer percussive feel.
 */
export function playMoveSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    schedTone(ctx, { freq: 800, durationS: 0.06, type: "triangle", gain: 0.4, fadeOut: 0.5 });
    schedTone(ctx, { freq: 1200, durationS: 0.03, type: "sine", gain: 0.15, fadeOut: 0.8 });
  } else {
    playToneNative(800, 60, 0.4);
  }
}

/**
 * Capture — heavier thud + low rumble.
 */
export function playCaptureSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    schedTone(ctx, { freq: 180, durationS: 0.15, type: "triangle", gain: 0.5, fadeOut: 0.4 });
    schedTone(ctx, { freq: 400, durationS: 0.08, type: "square", gain: 0.12, fadeOut: 0.6 });
    schedTone(ctx, { freq: 90, durationS: 0.2, type: "sine", gain: 0.25, fadeOut: 0.5 });
  } else {
    playToneNative(180, 150, 0.5);
  }
}

/**
 * Check alert — sharp high ping.
 */
export function playCheckSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    schedTone(ctx, { freq: 1100, durationS: 0.12, type: "sine", gain: 0.35, fadeOut: 0.4 });
    schedTone(ctx, { freq: 1650, durationS: 0.06, type: "sine", gain: 0.15, fadeOut: 0.8, delay: 0.05 });
  } else {
    playToneNative(1100, 120, 0.35);
  }
}

/**
 * Game start — triumphant ascending fanfare (4 notes).
 */
export function playGameStartSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    // C5 → E5 → G5 → C6  (major arpeggio)
    schedTone(ctx, { freq: 523, durationS: 0.12, type: "triangle", gain: 0.3, fadeOut: 0.3, delay: 0 });
    schedTone(ctx, { freq: 659, durationS: 0.12, type: "triangle", gain: 0.32, fadeOut: 0.3, delay: 0.12 });
    schedTone(ctx, { freq: 784, durationS: 0.12, type: "triangle", gain: 0.34, fadeOut: 0.3, delay: 0.24 });
    schedTone(ctx, { freq: 1047, durationS: 0.25, type: "sine", gain: 0.38, fadeOut: 0.5, delay: 0.36 });
    // Subtle harmony under the last note
    schedTone(ctx, { freq: 784, durationS: 0.2, type: "sine", gain: 0.12, fadeOut: 0.5, delay: 0.36 });
  } else {
    playToneNative(523, 120, 0.3);
    setTimeout(() => playToneNative(659, 120, 0.32), 120);
    setTimeout(() => playToneNative(784, 120, 0.34), 240);
    setTimeout(() => playToneNative(1047, 250, 0.38), 360);
  }
}

/**
 * Game over — dramatic descending minor cascade + low rumble.
 */
export function playGameOverSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    // Eb5 → C5 → Ab4 → Eb4  (minor descent)
    schedTone(ctx, { freq: 622, durationS: 0.15, type: "triangle", gain: 0.32, fadeOut: 0.3, delay: 0 });
    schedTone(ctx, { freq: 523, durationS: 0.15, type: "triangle", gain: 0.30, fadeOut: 0.3, delay: 0.14 });
    schedTone(ctx, { freq: 415, durationS: 0.15, type: "triangle", gain: 0.28, fadeOut: 0.3, delay: 0.28 });
    schedTone(ctx, { freq: 311, durationS: 0.35, type: "sine", gain: 0.35, fadeOut: 0.6, delay: 0.42 });
    // Low rumble for gravitas
    schedTone(ctx, { freq: 80, durationS: 0.5, type: "sine", gain: 0.2, fadeOut: 0.7, delay: 0.42 });
  } else {
    playToneNative(622, 150, 0.32);
    setTimeout(() => playToneNative(523, 150, 0.30), 140);
    setTimeout(() => playToneNative(415, 150, 0.28), 280);
    setTimeout(() => playToneNative(311, 350, 0.35), 420);
  }
}

/**
 * Castling — two quick clicks (king + rook placement).
 */
export function playCastleSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    schedTone(ctx, { freq: 700, durationS: 0.05, type: "triangle", gain: 0.35, fadeOut: 0.5, delay: 0 });
    schedTone(ctx, { freq: 900, durationS: 0.05, type: "triangle", gain: 0.3, fadeOut: 0.5, delay: 0.08 });
  } else {
    playToneNative(700, 50, 0.35);
    setTimeout(() => playToneNative(900, 50, 0.3), 80);
  }
}

/**
 * Promotion — sparkle sweep upward.
 */
export function playPromotionSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    schedTone(ctx, { freq: 600, durationS: 0.06, type: "sine", gain: 0.2, fadeOut: 0.5, delay: 0 });
    schedTone(ctx, { freq: 900, durationS: 0.06, type: "sine", gain: 0.22, fadeOut: 0.5, delay: 0.05 });
    schedTone(ctx, { freq: 1200, durationS: 0.06, type: "sine", gain: 0.24, fadeOut: 0.5, delay: 0.10 });
    schedTone(ctx, { freq: 1600, durationS: 0.15, type: "sine", gain: 0.3, fadeOut: 0.6, delay: 0.15 });
  } else {
    playToneNative(600, 60, 0.2);
    setTimeout(() => playToneNative(1200, 60, 0.24), 100);
    setTimeout(() => playToneNative(1600, 150, 0.3), 150);
  }
}

/**
 * Checkmate — dramatic sting: high accent + deep chord.
 */
export function playCheckmateSound(): void {
  ensureResumed();
  const ctx = getAudioCtx();
  if (ctx) {
    // Sharp accent
    schedTone(ctx, { freq: 1400, durationS: 0.08, type: "sawtooth", gain: 0.2, fadeOut: 0.5, delay: 0 });
    // Power chord underneath
    schedTone(ctx, { freq: 220, durationS: 0.4, type: "triangle", gain: 0.3, fadeOut: 0.5, delay: 0.06 });
    schedTone(ctx, { freq: 330, durationS: 0.35, type: "sine", gain: 0.18, fadeOut: 0.5, delay: 0.06 });
    schedTone(ctx, { freq: 440, durationS: 0.3, type: "sine", gain: 0.12, fadeOut: 0.6, delay: 0.06 });
    // Final low boom
    schedTone(ctx, { freq: 110, durationS: 0.5, type: "sine", gain: 0.22, fadeOut: 0.7, delay: 0.1 });
  } else {
    playToneNative(1400, 80, 0.2);
    setTimeout(() => playToneNative(220, 400, 0.3), 60);
  }
}
