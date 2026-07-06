/**
 * Lightweight in-memory token-bucket rate limiter for Socket.IO events.
 * Buckets are keyed by socket id + event name and pruned periodically.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  /** Maximum number of tokens in the bucket. */
  capacity: number;
  /** Tokens refilled per second. */
  refillRate: number;
}

export class SocketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  private key(socketId: string, event: string): string {
    return `${socketId}:${event}`;
  }

  allow(socketId: string, event: string): boolean {
    const k = this.key(socketId, event);
    const now = Date.now();
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = { tokens: this.options.capacity, lastRefill: now };
      this.buckets.set(k, bucket);
    }

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.options.capacity,
      bucket.tokens + elapsedSeconds * this.options.refillRate
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return false;
    }
    bucket.tokens -= 1;
    return true;
  }

  /** Remove stale buckets that have been idle for more than maxAgeMs. */
  prune(maxAgeMs = 5 * 60 * 1000): void {
    const now = Date.now();
    for (const [k, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAgeMs) {
        this.buckets.delete(k);
      }
    }
  }
}
