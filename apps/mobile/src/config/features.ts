/**
 * Server URL for Socket.IO connection.
 *
 * Resolution order:
 * 1. `window.__CHECKKER_SERVER_URL__` — injected by the desktop shell, which
 *    spawns the embedded game server on a random port.
 * 2. `EXPO_PUBLIC_SERVER_URL` — explicit build-time override.
 * 3. On web, derive from the page's own host so the app works when opened
 *    from another machine via http://<host-ip>:<port> — same origin when the
 *    game server serves the page, port 3001 when running the Expo dev server.
 * 4. Fallback: localhost:3001 (native dev).
 */
function resolveServerUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (window as any).__CHECKKER_SERVER_URL__;
    if (injected) return injected;
  }
  if (process.env.EXPO_PUBLIC_SERVER_URL) return process.env.EXPO_PUBLIC_SERVER_URL;
  if (typeof window !== "undefined" && window.location?.hostname) {
    const { protocol, hostname, port } = window.location;
    // Expo dev server (8081/19006) serves the page but not the game server.
    if (port === "8081" || port === "19006") {
      return `${protocol}//${hostname}:3001`;
    }
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return window.location.origin;
    }
  }
  return "http://192.168.1.105:3001";
}

export const ADDRESS_OF_SERVER = resolveServerUrl();

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
