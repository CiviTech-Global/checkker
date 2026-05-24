export const colors = {
  bg: { primary: "#1a1a2e", secondary: "#2a2a4a", tertiary: "#3a3a5a" },
  text: { primary: "#e0e0e0", secondary: "#b0b0b0", muted: "#888888", dark: "#1a1a2e" },
  accent: { primary: "#4a4a8a", secondary: "#2a2a4a", gold: "#ffd700", green: "#4ade80", red: "#ff4444", blue: "#4a90d9" },
  board: { light: "#f0d9b5", dark: "#b58863" },
  highlight: { legal: "rgba(0,255,136,0.53)", selected: "rgba(255,215,0,0.53)", lastMove: "rgba(255,255,0,0.40)" },
  overlay: "rgba(0,0,0,0.75)",
  cardFace: "#f5f5f0",
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const typography = {
  fontFamily: { default: undefined as string | undefined, mono: "monospace" },
  size: { xs: 12, sm: 14, body: 16, md: 18, lg: 24, xl: 48 },
  weight: { regular: "400" as const, medium: "500" as const, semiBold: "600" as const, bold: "700" as const },
} as const;

export const radius = { sm: 4, md: 8, lg: 12, full: 999 } as const;

export const shadows = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
} as const;

export const motion = { fast: 150, normal: 250, slow: 350, pulse: 1000 } as const;

export const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  k: { white: "♔", black: "♚" },
  q: { white: "♕", black: "♛" },
  r: { white: "♖", black: "♜" },
  b: { white: "♗", black: "♝" },
  n: { white: "♘", black: "♞" },
  p: { white: "♙", black: "♟" },
};
