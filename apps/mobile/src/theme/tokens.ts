export const colors = {
  bg: {
    primary: "#0b1a12",       // deep casino green-black
    secondary: "#142b1e",     // dark felt green
    tertiary: "#1c3a28",      // mid felt green
    felt: "#1a5c35",          // classic casino felt
  },
  text: {
    primary: "#f2ede4",       // warm white (high contrast on dark green)
    secondary: "#d4c9a8",     // light gold / parchment
    muted: "#8a9b8e",         // sage grey-green (readable on dark)
    dark: "#0b1a12",
  },
  accent: {
    primary: "#1a8a4a",       // rich casino green
    secondary: "#0f6b35",     // darker casino green
    gold: "#d4a843",          // gold leaf
    goldBright: "#f5d680",    // bright gold
    green: "#34d058",         // bright emerald (for success/positive)
    red: "#e04040",           // bright crimson (high contrast)
    burgundy: "#9e2a3a",      // deep burgundy
    blue: "#4a9edd",          // bright sapphire (high contrast on dark)
    bronze: "#cd7f32",        // bronze
  },
  board: {
    light: "#c8b078",         // warm tan (lighter for contrast)
    dark: "#2a6830",          // rich green felt
  },
  highlight: {
    legal: "rgba(52,208,88,0.50)",
    selected: "rgba(212,168,67,0.55)",
    lastMove: "rgba(245,214,128,0.35)",
  },
  overlay: "rgba(0,0,0,0.82)",
  cardFace: "#faf5eb",        // ivory
  cardBack: "#0f3d22",        // dark green
  border: {
    gold: "rgba(212,168,67,0.45)",
    subtle: "rgba(242,237,228,0.10)",
  },
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const typography = {
  fontFamily: {
    default: undefined as string | undefined,
    display: undefined as string | undefined,
    mono: "monospace",
  },
  size: { xs: 12, sm: 14, body: 16, md: 18, lg: 24, xl: 48 },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semiBold: "600" as const,
    bold: "700" as const,
    extraBold: "800" as const,
  },
} as const;

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 } as const;

export const shadows = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
  gold: { shadowColor: "#d4a843", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
} as const;

export const motion = { fast: 150, normal: 250, slow: 350, pulse: 1000 } as const;

export const gradients: Record<string, [string, string, ...string[]]> = {
  glass: ["rgba(242,237,228,0.07)", "rgba(242,237,228,0.02)"],
  accent: ["#1a8a4a", "#0f6b35"],
  gold: ["#d4a843", "#cd7f32"],
  goldToBronze: ["#f5d680", "#cd7f32"],
  success: ["#34d058", "#1a8a4a"],
  error: ["#e04040", "#9e2a3a"],
  crimsonToBlack: ["#e04040", "#0b1a12"],
  burgundy: ["#9e2a3a", "#4a1018"],
  casinoGreen: ["#1a8a4a", "#0f3d22"],
  velvet: ["#142b1e", "#1c3a28", "#0b1a12"],
};

export const springConfig = {
  gentle: { damping: 15, stiffness: 150 },
  bouncy: { damping: 10, stiffness: 180 },
  snappy: { damping: 20, stiffness: 300 },
  luxe: { damping: 18, stiffness: 120 },
} as const;

export const glassStyle = {
  backgroundColor: "rgba(242,237,228,0.06)",
  borderWidth: 1,
  borderColor: "rgba(212,168,67,0.25)",
} as const;

export const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  k: { white: "\u2654", black: "\u265A" },
  q: { white: "\u2655", black: "\u265B" },
  r: { white: "\u2656", black: "\u265C" },
  b: { white: "\u2657", black: "\u265D" },
  n: { white: "\u2658", black: "\u265E" },
  p: { white: "\u2659", black: "\u265F" },
};
