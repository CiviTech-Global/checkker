import { cardId, cardToPiece } from "@checkker/shared";
import { LocalGameEngine } from "../offline/LocalGameEngine";
import { pickBotMove } from "../offline/LocalBot";

describe("LocalGameEngine", () => {
  test("deals 3 cards to each player at start", () => {
    const engine = new LocalGameEngine("white");
    const snap = engine.getSnapshot();
    expect(snap.hand).toHaveLength(3);
    expect(snap.opponentHandCount).toBe(3);
    // Usually 46, but the mulligan rule may redraw an unplayable opening hand.
    expect(snap.drawPileCount).toBeLessThanOrEqual(52 - 6);
    expect(snap.drawPileCount).toBeGreaterThan(0);
    expect(snap.turn).toBe("white");
    expect(snap.result).toBeNull();
  });

  test("rejects playing a card not in hand", () => {
    const engine = new LocalGameEngine("white");
    const result = engine.playCard("Zz", "e2e4");
    expect(result.success).toBe(false);
  });

  test("playing a legal move advances the turn and consumes the card", () => {
    const engine = new LocalGameEngine("white");
    const legal = engine.getLegalMoves().find((g) => g.moves.length > 0);
    expect(legal).toBeDefined();
    const before = engine.getSnapshot();
    const result = engine.playCard(cardId(legal!.card), legal!.moves[0]);
    expect(result.success).toBe(true);
    const after = engine.getSnapshot();
    expect(after.moveHistory).toHaveLength(before.moveHistory.length + 1);
    expect(after.lastMove).toEqual({
      from: legal!.moves[0].slice(0, 2),
      to: legal!.moves[0].slice(2, 4),
    });
  });

  test("rejects a move the card does not allow", () => {
    const engine = new LocalGameEngine("white");
    // Find a non-wild card and a move it can't make.
    const legal = engine.getLegalMoves();
    const nonWild = legal.find(
      (g) => cardToPiece(g.card) !== "wild" && g.moves.length > 0
    );
    if (!nonWild) return; // Rare hand of 3 aces — nothing to assert.
    const otherMoves = legal
      .filter((g) => g !== nonWild)
      .flatMap((g) => g.moves)
      .filter((m) => !nonWild.moves.includes(m));
    if (otherMoves.length === 0) return;
    const result = engine.playCard(cardId(nonWild.card), otherMoves[0]);
    expect(result.success).toBe(false);
  });

  test("resignation ends the game and scores it", () => {
    const engine = new LocalGameEngine("white");
    engine.resign("white");
    expect(engine.isOver()).toBe(true);
    expect(engine.getResult()).toEqual({ type: "resignation", winner: "black" });
    const scores = engine.getScores();
    expect(scores).not.toBeNull();
    // Black gets 25 chess points for the resignation; empty score piles.
    expect(scores!.blackTotal).toBeGreaterThanOrEqual(25);
    expect(scores!.winner).toBe("black");
  });

  test("getLiveScores returns poker results for both sides", () => {
    const engine = new LocalGameEngine("white");
    const liveScores = engine.getLiveScores();
    expect(liveScores.whitePoker.total).toBe(0);
    expect(liveScores.blackPoker.total).toBe(0);
    expect(liveScores.whitePoker.hands).toHaveLength(0);
    expect(liveScores.blackPoker.hands).toHaveLength(0);
  });
});

describe("LocalBot", () => {
  test.each(["beginner", "intermediate", "advanced"] as const)(
    "%s bot picks a legal move",
    (difficulty) => {
      const engine = new LocalGameEngine("white");
      const botMove = pickBotMove(engine, difficulty);
      expect(botMove).not.toBeNull();
      const legal = engine.getLegalMoves();
      const group = legal.find((g) => cardId(g.card) === botMove!.cardId);
      expect(group).toBeDefined();
      const allowed =
        cardToPiece(group!.card) === "wild" || group!.moves.includes(botMove!.move);
      expect(allowed).toBe(true);
    }
  );

  test("bot and engine can play a full sequence of moves", () => {
    const engine = new LocalGameEngine("white");
    for (let i = 0; i < 20 && !engine.isOver(); i++) {
      const move = pickBotMove(engine, "intermediate");
      if (!move) break;
      const result = engine.playCard(move.cardId, move.move);
      expect(result.success).toBe(true);
    }
    // The game either continues or ended legitimately — no crashes.
    expect(engine.getSnapshot().fen).toBeTruthy();
  });
});
