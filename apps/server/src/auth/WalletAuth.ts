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
}
