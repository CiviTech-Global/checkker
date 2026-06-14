// ── Dark Violet Esports palette ──────────────────────────────────────────
// Deep violet-black surfaces, neon-violet brand accent, amber for points and
// ratings. Keys are intentionally unchanged from the previous casino theme so
// every component re-skins automatically. Semantic notes kept where a key's
// meaning maps onto a different hue (e.g. `accent.gold` = amber, not gold leaf).
export const colors = {
  bg: {
    primary: "#14101F",       // deep violet-black (app background)
    secondary: "#1E1830",     // raised panel
    tertiary: "#2A2240",      // card / chip surface
    felt: "#221B38",          // board frame
    parchment: "#EDE9F7",     // light lavender surface (book/light cards)
    parchmentDark: "#D9D2EC", // dimmed lavender
  },
  text: {
    primary: "#F4F1FB",       // near-white lavender
    secondary: "#C9BEE8",     // soft lavender
    muted: "#8B82A8",         // muted violet-grey
    dark: "#14101F",
    onParchment: "#241C3A",   // deep violet text on light surfaces
  },
  accent: {
    primary: "#A855F7",       // brand violet
    secondary: "#7C3AED",     // deeper violet
    gold: "#F0B43C",          // amber (ratings, points, coins)
    goldBright: "#FFD27A",    // bright amber
    green: "#34E5A1",         // neon mint (success / positive / white odds)
    red: "#FF4D6D",           // neon rose (negative / critical)
    burgundy: "#7A1F3D",      // deep rose
    blue: "#5BC0FF",          // neon cyan (info / secondary)
    bronze: "#C77DFF",        // light violet
    lapis: "#3B2E6E",         // muted indigo
    terraCotta: "#F0883E",    // warm ember accent
  },
  board: {
    light: "#D7CFEC",         // pale lavender squares
    dark: "#4B3F77",          // violet squares
  },
  highlight: {
    legal: "rgba(52,229,161,0.45)",
    selected: "rgba(168,85,247,0.55)",
    lastMove: "rgba(168,85,247,0.32)",
  },
  overlay: "rgba(8,6,16,0.86)",
  cardFace: "#F7F4FE",        // near-white card
  cardBack: "#3A2E5E",        // violet card back
  border: {
    gold: "rgba(168,85,247,0.45)",   // violet glow border (key kept)
    subtle: "rgba(244,241,251,0.12)",
    lapis: "rgba(59,46,110,0.45)",
    ornate: "rgba(168,85,247,0.70)",
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
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 12 },
  // Neon-violet glow (key kept as `gold` so existing glow usages re-skin).
  gold: { shadowColor: "#A855F7", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 8 },
  glow: { shadowColor: "#A855F7", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
} as const;

export const motion = { fast: 150, normal: 250, slow: 350, pulse: 1000 } as const;

export const gradients: Record<string, [string, string, ...string[]]> = {
  glass: ["rgba(168,85,247,0.12)", "rgba(168,85,247,0.03)"],
  accent: ["#A855F7", "#7C3AED"],
  gold: ["#F0B43C", "#C77DFF"],
  goldToBronze: ["#FFD27A", "#C77DFF"],
  success: ["#34E5A1", "#0FA968"],
  error: ["#FF4D6D", "#9E2A3A"],
  crimsonToBlack: ["#FF4D6D", "#14101F"],
  burgundy: ["#7A1F3D", "#3A1018"],
  casinoGreen: ["#A855F7", "#3A2E5E"],
  velvet: ["#1E1830", "#2A2240", "#14101F"],
  parchment: ["#EDE9F7", "#D9D2EC"],
  persian: ["#3B2E6E", "#5B46A8"],
  ornateGold: ["#FFD27A", "#F0B43C", "#C77DFF"],
  burgundyDeep: ["#7A1F3D", "#3A1018"],
  neonViolet: ["#C77DFF", "#A855F7", "#7C3AED"],
};

export const springConfig = {
  gentle: { damping: 15, stiffness: 150 },
  bouncy: { damping: 10, stiffness: 180 },
  snappy: { damping: 20, stiffness: 300 },
  luxe: { damping: 18, stiffness: 120 },
} as const;

export const glassStyle = {
  backgroundColor: "rgba(168,85,247,0.08)",
  borderWidth: 1,
  borderColor: "rgba(168,85,247,0.28)",
} as const;

export const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  k: { white: "\u2654", black: "\u265A" },
  q: { white: "\u2655", black: "\u265B" },
  r: { white: "\u2656", black: "\u265C" },
  b: { white: "\u2657", black: "\u265D" },
  n: { white: "\u2658", black: "\u265E" },
  p: { white: "\u2659", black: "\u265F" },
};
