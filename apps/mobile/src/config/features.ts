/**
 * Feature flags for the Checkker app.
 * Toggle flags to enable/disable features across the app.
 */
export const features = {
  /** When true, game and tutorial screens use the Three.js 3D board */
  use3DBoard: false,

  /** Smart matchmaking uses player models for better pairings (server-side default: on) */
  smartMatchmaking: true,

  /** Show AI coaching tips after each move in-game */
  aiCoaching: true,

  /** Show AI spectator commentary during games (requires LLM) */
  aiSpectator: true,

  /** Enable the AI Brain dashboard / My Profile screen */
  aiDashboard: true,

  /** Enable the puzzle training mode */
  puzzleMode: true,

  /** Enable bot personality selection */
  botPersonality: true,

  /** Dev-only tools (demo data, etc.) — auto-enabled in dev builds */
  devMode: __DEV__,
} as const;
