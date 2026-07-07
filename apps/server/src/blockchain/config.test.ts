import { isBettingEnabled } from "./config";

describe("blockchain config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("disables betting when blockchain env vars are missing", () => {
    delete process.env.BSC_RPC_URL;
    delete process.env.CHECKKER_CONTRACT_ADDRESS;
    delete process.env.REFEREE_PRIVATE_KEY;
    expect(isBettingEnabled()).toBe(false);
  });

  it("enables betting in development when blockchain env vars are present", () => {
    process.env.NODE_ENV = "development";
    process.env.BSC_RPC_URL = "https://example.com";
    process.env.CHECKKER_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.REFEREE_PRIVATE_KEY = "0xabcd";
    expect(isBettingEnabled()).toBe(true);
  });

  it("disables betting in production by default even with blockchain env vars", () => {
    process.env.NODE_ENV = "production";
    process.env.BSC_RPC_URL = "https://example.com";
    process.env.CHECKKER_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.REFEREE_PRIVATE_KEY = "0xabcd";
    expect(isBettingEnabled()).toBe(false);
  });

  it("allows explicit override to enable betting in production", () => {
    process.env.NODE_ENV = "production";
    process.env.CHECKKER_BETTING_ENABLED = "true";
    process.env.BSC_RPC_URL = "https://example.com";
    process.env.CHECKKER_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.REFEREE_PRIVATE_KEY = "0xabcd";
    expect(isBettingEnabled()).toBe(true);
  });
});
