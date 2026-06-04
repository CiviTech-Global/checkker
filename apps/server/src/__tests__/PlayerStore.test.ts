import { playerStore } from "../PlayerStore";

// Create a fresh isolated store for testing
// Since playerStore is a singleton, we test it directly

describe("PlayerStore", () => {
  const testId1 = `test-socket-${Date.now()}-1`;
  const testId2 = `test-socket-${Date.now()}-2`;

  it("creates a profile with defaults", () => {
    const profile = playerStore.getOrCreate(testId1);
    expect(profile.id).toBeTruthy();
    expect(profile.displayName).toContain("Player-");
    expect(profile.rating).toBe(1000);
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.wins).toBe(0);
    expect(profile.losses).toBe(0);
    expect(profile.draws).toBe(0);
    expect(profile.currentStreak).toBe(0);
    expect(profile.bestStreak).toBe(0);
  });

  it("creates a profile with custom display name", () => {
    const profile = playerStore.getOrCreate(testId2, "Alice");
    expect(profile.displayName).toBe("Alice");
  });

  it("returns existing profile on subsequent calls", () => {
    const p1 = playerStore.getOrCreate(testId1);
    const p2 = playerStore.getOrCreate(testId1);
    expect(p1).toBe(p2);
  });

  it("gets a profile by socket id", () => {
    const profile = playerStore.get(testId1);
    expect(profile).not.toBeNull();
    expect(profile!.rating).toBe(1000);
  });

  it("returns null for unknown socket id", () => {
    expect(playerStore.get("nonexistent")).toBeNull();
  });

  it("updates stats after a win", () => {
    playerStore.updateAfterGame(testId1, "win");
    const p = playerStore.get(testId1)!;
    expect(p.gamesPlayed).toBe(1);
    expect(p.wins).toBe(1);
    expect(p.currentStreak).toBe(1);
    expect(p.bestStreak).toBe(1);
  });

  it("updates streak on consecutive wins", () => {
    playerStore.updateAfterGame(testId1, "win");
    const p = playerStore.get(testId1)!;
    expect(p.wins).toBe(2);
    expect(p.currentStreak).toBe(2);
    expect(p.bestStreak).toBe(2);
  });

  it("resets streak on loss", () => {
    playerStore.updateAfterGame(testId1, "loss");
    const p = playerStore.get(testId1)!;
    expect(p.losses).toBe(1);
    expect(p.currentStreak).toBe(-1);
    expect(p.bestStreak).toBe(2); // Best streak preserved
  });

  it("tracks consecutive losses", () => {
    playerStore.updateAfterGame(testId1, "loss");
    const p = playerStore.get(testId1)!;
    expect(p.currentStreak).toBe(-2);
  });

  it("resets streak on draw", () => {
    playerStore.updateAfterGame(testId1, "draw");
    const p = playerStore.get(testId1)!;
    expect(p.draws).toBe(1);
    expect(p.currentStreak).toBe(0);
  });

  it("creates bot profiles", () => {
    const bot = playerStore.createBotProfile("advanced", 1400);
    expect(bot.displayName).toBe("Bot (advanced)");
    expect(bot.rating).toBe(1400);
    expect(bot.id).toBe("bot-advanced");
  });
});
