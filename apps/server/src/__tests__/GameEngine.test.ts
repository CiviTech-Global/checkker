import { GameEngine } from "../GameEngine";
import type { Card } from "@checkker/shared";
import { cardId, createDeck } from "@checkker/shared";

/* ── helpers ─────────────────────────────────────────────────────────── */

function c(rank: string, suit: "clubs" | "diamonds" | "hearts" | "spades"): Card {
  return { rank, suit } as Card;
}

/**
 * Build a 52-card deck where the top N cards (popped first) are specified.
 * drawToFull pops from the end, so the last element is drawn first.
 * White draws 3, then black draws 3. So the array end should be:
 * [...rest, bh[2], bh[1], bh[0], wh[2], wh[1], wh[0]]
 */
function testDeck(whiteHand: Card[], blackHand: Card[]): Card[] {
  const top = [
    ...blackHand.slice().reverse(),
    ...whiteHand.slice().reverse(),
  ];
  const used = new Set(top.map((cd) => `${cd.rank}-${cd.suit}`));
  const rest = createDeck().filter((cd) => !used.has(`${cd.rank}-${cd.suit}`));
  return [...rest, ...top];
}

/** Standard hands that will always have legal moves in the starting position:
 *  Pawn cards (3-9) always have legal moves since white has 8 pawns. */
const STD_WHITE: Card[] = [c("5", "clubs"), c("6", "hearts"), c("7", "spades")];
const STD_BLACK: Card[] = [c("3", "diamonds"), c("4", "clubs"), c("8", "hearts")];

function createTestEngine() {
  return new GameEngine(1200, 1200, "blitz", testDeck(STD_WHITE, STD_BLACK));
}

/* ── Constructor state ───────────────────────────────────────────────── */

describe("GameEngine — constructor", () => {
  it("starts with 3 cards each, correct draw pile size, white's turn", () => {
    const engine = createTestEngine();
    const state = engine.getState();
    expect(state.white.hand.length).toBe(3);
    expect(state.black.hand.length).toBe(3);
    expect(state.drawPile.length).toBe(52 - 6);
    expect(state.turn).toBe("white");
    expect(state.result).toBeNull();
    engine.dispose();
  });

  it("accepts injected deck with expected cards", () => {
    const engine = createTestEngine();
    const state = engine.getState();
    const whiteIds = state.white.hand.map(cardId).sort();
    const expectedWhite = STD_WHITE.map(cardId).sort();
    expect(whiteIds).toEqual(expectedWhite);
    engine.dispose();
  });
});

/* ── playCard basics ─────────────────────────────────────────────────── */

describe("GameEngine — playCard", () => {
  it("valid move succeeds and removes card from hand", () => {
    const engine = createTestEngine();
    const legalMoves = engine.getLegalMoves();
    const entry = legalMoves.find((e) => e.moves.length > 0)!;
    expect(entry).toBeDefined();
    const cid = cardId(entry.card);
    const move = entry.moves[0];
    const result = engine.playCard(cid, move);
    expect(result.success).toBe(true);
    expect(engine.getState().turn).toBe("black");
    engine.dispose();
  });

  it("invalid card → error", () => {
    const engine = createTestEngine();
    const result = engine.playCard("FAKE_CARD", "e2e4");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Card not in hand");
    engine.dispose();
  });

  it("illegal move for card → error", () => {
    const engine = createTestEngine();
    // Pawn card can't do knight moves
    const cid = cardId(STD_WHITE[0]); // "5c" — pawn
    const result = engine.playCard(cid, "b1c3"); // knight move
    expect(result.success).toBe(false);
    expect(result.error).toContain("Illegal move");
    engine.dispose();
  });

  it("game over → error", () => {
    const engine = createTestEngine();
    engine.resign("white");
    const legalMoves = engine.getLegalMoves();
    const entry = legalMoves.find((e) => e.moves.length > 0);
    if (entry) {
      const result = engine.playCard(cardId(entry.card), entry.moves[0]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Game already ended");
    }
    engine.dispose();
  });
});

/* ── Live scores ─────────────────────────────────────────────────────── */

describe("GameEngine — live scores", () => {
  it("returns PokerResult objects for both colors", () => {
    const engine = createTestEngine();
    const liveScores = engine.getLiveScores();
    expect(liveScores).toHaveProperty("whitePoker");
    expect(liveScores).toHaveProperty("blackPoker");
    expect(liveScores.whitePoker).toEqual({ hands: [], leftover: [], total: 0 });
    expect(liveScores.blackPoker).toEqual({ hands: [], leftover: [], total: 0 });
    engine.dispose();
  });

  it("updates live scores after a capture", () => {
    const wh: Card[] = [c("A", "clubs"), c("5", "hearts"), c("6", "spades")];
    const bh: Card[] = [c("3", "diamonds"), c("4", "clubs"), c("8", "hearts")];
    const engine = new GameEngine(1200, 1200, "blitz", testDeck(wh, bh));

    engine.playCard(cardId(c("5", "hearts")), "e2e4");
    engine.playCard(cardId(c("3", "diamonds")), "d7d5");
    engine.playCard(cardId(c("6", "spades")), "e4d5");

    const liveScores = engine.getLiveScores();
    expect(liveScores.whitePoker.leftover.length).toBe(1);
    expect(liveScores.blackPoker.leftover.length).toBe(0);
    engine.dispose();
  });
});

/* ── Captures and scoring ────────────────────────────────────────────── */

describe("GameEngine — captures", () => {
  it("non-capture move puts card in deadPile", () => {
    const engine = createTestEngine();
    const legalMoves = engine.getLegalMoves();
    // Pawn forward is a non-capture in starting position
    const entry = legalMoves.find((e) => e.piece === "pawn" && e.moves.length > 0)!;
    const cid = cardId(entry.card);
    const move = entry.moves[0]; // e.g. a2a3 or similar
    engine.playCard(cid, move);
    const state = engine.getState();
    expect(state.deadPile.length).toBe(1);
    expect(state.white.scorePile.length).toBe(0);
    engine.dispose();
  });

  it("capture with a regular card puts the played card in scorePile", () => {
    // White: Ace + two pawn cards. Black: three pawn cards.
    const wh: Card[] = [c("A", "clubs"), c("5", "hearts"), c("6", "spades")];
    const bh: Card[] = [c("3", "diamonds"), c("4", "clubs"), c("8", "hearts")];
    const engine = new GameEngine(1200, 1200, "blitz", testDeck(wh, bh));

    // White plays e2-e4 with a pawn card.
    const whitePawn = cardId(c("5", "hearts"));
    engine.playCard(whitePawn, "e2e4");

    // Black plays d7-d5 with a pawn card.
    const blackPawn = cardId(c("3", "diamonds"));
    engine.playCard(blackPawn, "d7d5");

    // White captures e4xd5 with the other pawn card.
    const capturingPawn = cardId(c("6", "spades"));
    engine.playCard(capturingPawn, "e4d5");

    const state = engine.getState();
    expect(state.white.scorePile.length).toBe(1);
    expect(state.white.scorePile[0].rank).toBe("6");
    engine.dispose();
  });
});

/* ── Wild card behavior ──────────────────────────────────────────────── */

describe("GameEngine — ace/wild", () => {
  it("ace can play any legal move (wild card)", () => {
    const wh: Card[] = [c("A", "clubs"), c("5", "hearts"), c("5", "spades")];
    const bh: Card[] = [c("3", "diamonds"), c("3", "clubs"), c("3", "hearts")];
    const deck = testDeck(wh, bh);
    const engine = new GameEngine(1200, 1200, "blitz", deck);

    // Ace can do knight move b1c3
    const aceId = cardId(c("A", "clubs"));
    const result = engine.playCard(aceId, "b1c3");
    expect(result.success).toBe(true);
    engine.dispose();
  });

  it("ace non-capture goes to deadPile", () => {
    const wh: Card[] = [c("A", "clubs"), c("5", "hearts"), c("5", "spades")];
    const bh: Card[] = [c("3", "diamonds"), c("3", "clubs"), c("3", "hearts")];
    const deck = testDeck(wh, bh);
    const engine = new GameEngine(1200, 1200, "blitz", deck);

    const aceId = cardId(c("A", "clubs"));
    engine.playCard(aceId, "e2e4");
    const state = engine.getState();
    const aceInDead = state.deadPile.some(
      (cd) => cd.rank === "A" && cd.suit === "clubs"
    );
    expect(aceInDead).toBe(true);
    engine.dispose();
  });

  it("ace capture goes to deadPile, not scorePile", () => {
    // White: Ace + two pawn cards. Black: three pawn cards.
    const wh: Card[] = [c("A", "clubs"), c("5", "hearts"), c("6", "spades")];
    const bh: Card[] = [c("3", "diamonds"), c("4", "clubs"), c("8", "hearts")];
    const engine = new GameEngine(1200, 1200, "blitz", testDeck(wh, bh));

    // White plays e2-e4 with a pawn card.
    engine.playCard(cardId(c("5", "hearts")), "e2e4");

    // Black plays d7-d5 with a pawn card.
    engine.playCard(cardId(c("3", "diamonds")), "d7d5");

    // White captures e4xd5 with the Ace (wild).
    const aceId = cardId(c("A", "clubs"));
    engine.playCard(aceId, "e4d5");

    const state = engine.getState();
    expect(state.white.scorePile.length).toBe(0);
    const aceInDead = state.deadPile.some(
      (cd) => cd.rank === "A" && cd.suit === "clubs"
    );
    expect(aceInDead).toBe(true);
    engine.dispose();
  });
});

/* ── Turn alternation ────────────────────────────────────────────────── */

describe("GameEngine — turn alternation", () => {
  it("white → black → white", () => {
    const engine = createTestEngine();
    expect(engine.getState().turn).toBe("white");

    // White plays
    const wm = engine.getLegalMoves();
    const we = wm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(we.card), we.moves[0]);
    expect(engine.getState().turn).toBe("black");

    // Black plays
    const bm = engine.getLegalMoves();
    const be = bm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(be.card), be.moves[0]);
    expect(engine.getState().turn).toBe("white");
    engine.dispose();
  });

  it("player has 2 cards after playing, 3 when turn comes back", () => {
    const engine = createTestEngine();
    expect(engine.getState().white.hand.length).toBe(3);

    // White plays a card
    const wm = engine.getLegalMoves();
    const we = wm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(we.card), we.moves[0]);
    const afterWhite = engine.getState();
    expect(afterWhite.white.hand.length).toBe(2);
    expect(afterWhite.black.hand.length).toBe(3);

    // Black plays
    const bm = engine.getLegalMoves();
    const be = bm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(be.card), be.moves[0]);

    // White's turn again — should have drawn back to 3
    expect(engine.getState().white.hand.length).toBe(3);
    engine.dispose();
  });
});

/* ── Game endings ────────────────────────────────────────────────────── */

describe("GameEngine — game endings", () => {
  it("resignation sets correct result", () => {
    const engine = createTestEngine();
    engine.resign("white");
    expect(engine.isOver()).toBe(true);
    const result = engine.getResult()!;
    expect(result.type).toBe("resignation");
    if (result.type === "resignation") {
      expect(result.winner).toBe("black");
    }
    engine.dispose();
  });

  it("timeout sets correct result", () => {
    const engine = createTestEngine();
    engine.timeOut("black");
    expect(engine.isOver()).toBe(true);
    const result = engine.getResult()!;
    expect(result.type).toBe("timeout");
    if (result.type === "timeout") {
      expect(result.winner).toBe("white");
    }
    engine.dispose();
  });

  it("getScores returns null when game not over", () => {
    const engine = createTestEngine();
    expect(engine.getScores()).toBeNull();
    engine.dispose();
  });

  it("getScores returns scored game after resignation", () => {
    const engine = createTestEngine();
    engine.resign("black");
    const scores = engine.getScores()!;
    expect(scores).not.toBeNull();
    expect(scores.whiteTotal).toBeGreaterThanOrEqual(25);
    engine.dispose();
  });
});

/* ── Live timers ─────────────────────────────────────────────────────── */

describe("GameEngine — live timers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("getPublicState subtracts elapsed time from the player to move", () => {
    const engine = createTestEngine();
    const initial = engine.getPublicState("white").timeRemainingMs;
    jest.advanceTimersByTime(5000);
    const after = engine.getPublicState("white").timeRemainingMs;
    expect(initial - after).toBe(5000);
    engine.dispose();
  });

  it("getPublicState does not subtract time after the game ends", () => {
    const engine = createTestEngine();
    engine.resign("black");
    const initial = engine.getPublicState("white").timeRemainingMs;
    jest.advanceTimersByTime(5000);
    const after = engine.getPublicState("white").timeRemainingMs;
    expect(after).toBe(initial);
    engine.dispose();
  });

  it("startTimeoutCheck fires onTick each second and onTimeout when the clock expires", () => {
    const onTick = jest.fn();
    const onTimeout = jest.fn();
    const engine = createTestEngine();
    engine.startTimeoutCheck({ onTick, onTimeout });

    jest.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(420000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(engine.getPublicState("white").timeRemainingMs).toBe(0);
    expect(engine.isOver()).toBe(true);
    engine.dispose();
  });
});

/* ── Draw mechanics ──────────────────────────────────────────────────── */

describe("GameEngine — draw mechanics", () => {
  it("hand refills to 3 after opponent's turn", () => {
    const engine = createTestEngine();

    // White plays
    const wm = engine.getLegalMoves();
    const we = wm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(we.card), we.moves[0]);

    // Black plays
    const bm = engine.getLegalMoves();
    const be = bm.find((e) => e.moves.length > 0)!;
    engine.playCard(cardId(be.card), be.moves[0]);

    // White's turn again — should have 3 cards
    expect(engine.getState().white.hand.length).toBe(3);
    engine.dispose();
  });
});

/* ── Deck exhaustion ─────────────────────────────────────────────────── */

/**
 * Build a deck of exactly 6 cards: 3 for white, 3 for black, empty draw pile.
 * Like testDeck we rely on the fact that drawToFull pops from the array end,
 * so white's hand is the last 3 entries and black's the 3 before that.
 */
function sixCardDeck(whiteHand: Card[], blackHand: Card[]): Card[] {
  return [
    ...blackHand.slice().reverse(),
    ...whiteHand.slice().reverse(),
  ];
}

describe("GameEngine — deck exhaustion", () => {
  /**
   * Rule under test: when a player must draw and the draw pile is empty,
   * GameEngine reshuffles the dead pile once. If the pile is empty *again*
   * after that single reshuffle, the game ends with result "deckExhausted".
   *
   * A 6-card deck makes this reachable deterministically:
   *   - construction draws all 6 cards (pile empty);
   *   - play 1 (white)  -> dead [c1], black still has 3, no redraw;
   *   - play 2 (black)  -> dead [c1,c2], white drops to 2 and eats ONE
   *     reshuffled card back (draws 1, pile 1 left);
   *   - play 3 (white)  -> black eats the last pile card (pile 0);
   *   - play 4 (black)  -> white drops to 2, pile empty, the single allowed
   *     reshuffle is spent -> result = deckExhausted.
   *
   * All six cards are pawn ranks (both sides play one-square pawn advances on
   * distinct files) so every play is legal and non-capturing — the deck, not
   * the board, is the variable under test.
   */
  it("ends with deckExhausted when the single dead-pile reshuffle is spent", () => {
    const whiteHand = [c("3", "clubs"), c("3", "diamonds"), c("3", "hearts")];
    const blackHand = [c("4", "clubs"), c("4", "diamonds"), c("4", "hearts")];
    const engine = new GameEngine(1200, 1200, "blitz", sixCardDeck(whiteHand, blackHand));

    // Construction consumes the whole deck: 3 cards each, empty pile.
    const initial = engine.getState();
    expect(initial.drawPile.length).toBe(0);
    expect(initial.white.hand.length).toBe(3);
    expect(initial.black.hand.length).toBe(3);
    expect(initial.result).toBeNull();

    // play 1: white e-pawn, no capture.
    expect(engine.playCard(cardId(c("3", "clubs")), "e2e3")).toEqual({ success: true });
    expect(engine.getState().result).toBeNull(); // first reshuffle not yet needed
    expect(engine.getState().deadPile.length).toBe(1);

    // play 2: black e-pawn. White's refill afterwards reshuffles 2 dead
    // cards and draws 1, so the pile is down to 1 — game still live.
    expect(engine.playCard(cardId(c("4", "clubs")), "e7e6")).toEqual({ success: true });
    expect(engine.getState().result).toBeNull();
    expect(engine.getState().drawPile.length).toBe(1);
    expect(engine.getState().white.hand.length).toBe(3);

    // play 3: white d-pawn, no capture. Black's refill takes the last card.
    expect(engine.playCard(cardId(c("3", "diamonds")), "d2d3")).toEqual({ success: true });
    expect(engine.getState().result).toBeNull();
    expect(engine.getState().drawPile.length).toBe(0);

    // play 4: black d-pawn. White's refill now needs a second reshuffle:
    // the pile is empty and the reshuffle flag is already spent.
    expect(engine.playCard(cardId(c("4", "diamonds")), "d7d6")).toEqual({ success: true });

    const result = engine.getState().result;
    expect(result).not.toBeNull();
    expect(result!.type).toBe("deckExhausted");
    expect(engine.isOver()).toBe(true);

    // Any further play is rejected on the ended game.
    expect(engine.playCard(cardId(c("3", "hearts")), "a2a3")).toEqual({
      success: false,
      error: "Game already ended",
    });
    engine.dispose();
  });
});
