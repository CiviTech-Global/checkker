import { verifyMessage } from "ethers";
import { v4 as uuid } from "uuid";

/** Pending authentication challenges keyed by wallet address */
const pendingChallenges = new Map<string, { nonce: string; message: string; expiresAt: number }>();

/** Generate a challenge message for wallet signature verification */
export function createChallenge(walletAddress: string): { nonce: string; message: string } {
  const nonce = uuid();
  const timestamp = new Date().toISOString();
  const message = `Sign in to Checkker\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

  pendingChallenges.set(walletAddress.toLowerCase(), {
    nonce,
    message,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute expiry
  });

  return { nonce, message };
}

/** Verify a signed challenge and return the recovered address */
export function verifyChallenge(
  walletAddress: string,
  signature: string
): { valid: boolean; error?: string } {
  const key = walletAddress.toLowerCase();
  const challenge = pendingChallenges.get(key);

  if (!challenge) {
    return { valid: false, error: "No pending challenge for this address" };
  }

  if (Date.now() > challenge.expiresAt) {
    pendingChallenges.delete(key);
    return { valid: false, error: "Challenge expired" };
  }

  try {
    const recovered = verifyMessage(challenge.message, signature);
    pendingChallenges.delete(key);

    if (recovered.toLowerCase() !== key) {
      return { valid: false, error: "Signature does not match wallet address" };
    }

    return { valid: true };
  } catch {
    pendingChallenges.delete(key);
    return { valid: false, error: "Invalid signature" };
  }
}

/** Cleanup expired challenges (call periodically) */
export function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [key, challenge] of pendingChallenges) {
    if (now > challenge.expiresAt) {
      pendingChallenges.delete(key);
    }
  }
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}

/* ── Session tokens ──────────────────────────────────────────────────────
 * Issued after a successful signature verification so clients can re-auth
 * on reconnect/page reload without prompting the wallet to sign again.
 */

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (reduced from 7 days)

interface Session {
  walletAddress: string;
  expiresAt: number;
  /** IP at creation time — used as a lightweight theft deterrent. */
  ip: string;
}

const sessions = new Map<string, Session>();

/** Create a session token for an authenticated wallet. */
export function createSession(walletAddress: string, ip: string = "unknown"): string {
  const token = uuid() + uuid().replace(/-/g, "");
  sessions.set(token, {
    walletAddress: walletAddress.toLowerCase(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    ip,
  });
  return token;
}

/** Resolve a session token to its wallet address, or null if invalid/expired. */
export function verifySession(token: string, currentIp?: string): string | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  // IP mismatch: if both the creation IP and current IP are known and differ,
  // reject the session (potential token theft). Skip check when IP is unknown
  // (e.g. server-to-server calls or clients behind changing NAT).
  if (currentIp && session.ip !== "unknown" && currentIp !== session.ip) {
    sessions.delete(token);
    return null;
  }
  return session.walletAddress;
}

/** Invalidate a session token (logout). */
export function revokeSession(token: string): void {
  sessions.delete(token);
}

/** Revoke all sessions for a wallet address (force re-auth everywhere). */
export function revokeAllSessionsForWallet(walletAddress: string): void {
  const lower = walletAddress.toLowerCase();
  for (const [token, session] of sessions) {
    if (session.walletAddress === lower) {
      sessions.delete(token);
    }
  }
}
