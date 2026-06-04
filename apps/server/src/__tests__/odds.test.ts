import { calculateOdds } from "../odds";

describe("calculateOdds", () => {
  it("returns roughly even odds at starting position", async () => {
    const odds = await calculateOdds("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(odds.whiteWinPct).toBeGreaterThan(30);
    expect(odds.whiteWinPct).toBeLessThan(70);
    expect(odds.blackWinPct).toBeGreaterThan(30);
    expect(odds.blackWinPct).toBeLessThan(70);
    expect(odds.drawPct).toBeGreaterThan(0);
    expect(odds.whiteWinPct + odds.blackWinPct + odds.drawPct).toBe(100);
  });

  it("skews towards white when black is missing a rook", async () => {
    // Black missing queen-side rook
    const odds = await calculateOdds("1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1");
    expect(odds.whiteWinPct).toBeGreaterThan(odds.blackWinPct);
  });

  it("skews towards black when white is missing a rook", async () => {
    // White missing queen-side rook
    const odds = await calculateOdds("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w Kkq - 0 1");
    expect(odds.blackWinPct).toBeGreaterThan(odds.whiteWinPct);
  });

  it("always returns valid percentages that sum to 100", async () => {
    const positions = [
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
    ];
    for (const fen of positions) {
      const odds = await calculateOdds(fen);
      expect(odds.whiteWinPct).toBeGreaterThanOrEqual(0);
      expect(odds.blackWinPct).toBeGreaterThanOrEqual(0);
      expect(odds.drawPct).toBeGreaterThan(0);
      expect(odds.whiteWinPct + odds.blackWinPct + odds.drawPct).toBe(100);
    }
  });
});
