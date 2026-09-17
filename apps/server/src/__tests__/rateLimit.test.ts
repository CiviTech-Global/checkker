import { SocketRateLimiter } from "../rateLimit";

describe("SocketRateLimiter", () => {
  it("allows normal requests and throttles rapid requests per socket and event", () => {
    const limiter = new SocketRateLimiter({
      capacity: 2,
      refillRate: 1,
    });

    expect(limiter.allow("socket-1", "chat_message")).toBe(true);
    expect(limiter.allow("socket-1", "chat_message")).toBe(true);

    // Same socket + same event is now throttled.
    expect(limiter.allow("socket-1", "chat_message")).toBe(false);

    // A different event has its own bucket.
    expect(limiter.allow("socket-1", "send_friend_request")).toBe(true);

    // A different socket also has its own bucket.
    expect(limiter.allow("socket-2", "chat_message")).toBe(true);
  });
});