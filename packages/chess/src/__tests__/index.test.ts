import { Chess } from "chess.js";
import { getLegalMovesForCard, getLegalMovesForHand, getCaptureBonus } from "../index";
import type { Card } from "@checkker/shared";
import { cardToPiece } from "@checkker/shared";

/* ── helpers ─────────────────────────────────────────────────────────── */

function card(rank: string, suit: string = "clubs"): Card {
  return { rank, suit } as Card;
}

/* ── Card → piece mapping ────────────────────────────────────────────── */

describe("cardToPiece mapping", () => {
  it.each([
    ["K", "king"],
    ["Q", "queen"],
    ["J", "knight"],
    ["10", "rook"],
    ["2", "bishop"],
    ["3", "pawn"],
    ["4", "pawn"],
    ["5", "pawn"],
    ["6", "pawn"],
    ["7", "pawn"],
    ["8", "pawn"],
    ["9", "pawn"],
    ["A", "wild"],
  ] as const)("rank %s → %s", (rank, expected) => {
    expect(cardToPiece(card(rank))).toBe(expected);
  });
});

/* ── Pawn (ranks 3-9) ───────────────────────────────────────────────── */

describe("Pawn moves (ranks 3-9)", () => {
  it("can move forward one square", () => {
    // Both kings required by chess.js
    const game = new Chess("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e2e3");
  });

  it("can move forward two squares from initial rank", () => {
    const game = new Chess("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e2e4");
  });

  it("cannot move forward two squares from non-initial rank", () => {
    const game = new Chess("4k3/8/8/8/8/4P3/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e3e4");
    expect(moves).not.toContain("e3e5");
  });

  it("can capture diagonally", () => {
    const game = new Chess("4k3/8/8/8/8/3p4/4P3/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e2d3");
  });

  it("can perform en passant", () => {
    const game = new Chess("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e5d6");
  });

  it("promotes with 4 variants", () => {
    const game = new Chess("k7/4P3/8/8/8/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    expect(moves).toContain("e7e8q");
    expect(moves).toContain("e7e8r");
    expect(moves).toContain("e7e8b");
    expect(moves).toContain("e7e8n");
  });

  it("is blocked by own piece", () => {
    const game = new Chess("4k3/8/8/8/8/4P3/4P3/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("5"));
    // e2 pawn is blocked by e3 pawn — only the e3 pawn can move
    expect(moves).not.toContain("e2e3");
    expect(moves).toContain("e3e4");
  });
});

/* ── Knight (J) ──────────────────────────────────────────────────────── */

describe("Knight moves (J)", () => {
  it("L-shape from center", () => {
    const game = new Chess("4k3/8/8/8/4N3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("J"));
    expect(moves).toContain("e4f6");
    expect(moves).toContain("e4d6");
    expect(moves).toContain("e4g5");
    expect(moves).toContain("e4g3");
    expect(moves).toContain("e4f2");
    expect(moves).toContain("e4d2");
    expect(moves).toContain("e4c3");
    expect(moves).toContain("e4c5");
    expect(moves.length).toBe(8);
  });

  it("can jump over pieces", () => {
    const game = new Chess("4k3/8/8/3PP3/3PN3/3PP3/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("J"));
    expect(moves.length).toBeGreaterThan(0);
  });

  it("can capture opponent piece", () => {
    const game = new Chess("4k3/8/8/8/4N3/8/5p2/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("J"));
    expect(moves).toContain("e4f2");
  });

  it("cannot land on own piece", () => {
    const game = new Chess("4k3/8/3P4/8/4N3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("J"));
    expect(moves).not.toContain("e4d6");
  });
});

/* ── Bishop (2) ──────────────────────────────────────────────────────── */

describe("Bishop moves (2)", () => {
  it("moves diagonally", () => {
    const game = new Chess("4k3/8/8/8/4B3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("2"));
    expect(moves).toContain("e4d3");
    expect(moves).toContain("e4f5");
    expect(moves).toContain("e4d5");
    expect(moves).toContain("e4f3");
  });

  it("is blocked by pieces", () => {
    const game = new Chess("4k3/8/8/3P4/4B3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("2"));
    expect(moves).not.toContain("e4d5");
    expect(moves).not.toContain("e4c6");
  });
});

/* ── Rook (10) ───────────────────────────────────────────────────────── */

describe("Rook moves (10)", () => {
  it("moves horizontally and vertically", () => {
    const game = new Chess("4k3/8/8/8/4R3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("10"));
    expect(moves).toContain("e4e2");
    expect(moves).toContain("e4e8");
    expect(moves).toContain("e4a4");
    expect(moves).toContain("e4h4");
  });

  it("is blocked by pieces", () => {
    const game = new Chess("4k3/8/8/4P3/4R3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("10"));
    expect(moves).not.toContain("e4e5");
    expect(moves).not.toContain("e4e6");
  });
});

/* ── Queen (Q) ───────────────────────────────────────────────────────── */

describe("Queen moves (Q)", () => {
  it("moves in all 8 directions", () => {
    const game = new Chess("4k3/8/8/8/4Q3/8/8/4K3 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("Q"));
    // diagonals
    expect(moves).toContain("e4d3");
    expect(moves).toContain("e4f5");
    // ranks/files
    expect(moves).toContain("e4e8");
    expect(moves).toContain("e4a4");
    // Queen should have many moves (not checking exact count as king is on same file)
    expect(moves.length).toBeGreaterThan(20);
  });
});

/* ── King (K) ────────────────────────────────────────────────────────── */

describe("King moves (K)", () => {
  it("moves one square any direction", () => {
    const game = new Chess("7k/8/8/8/4K3/8/8/8 w - - 0 1");
    const moves = getLegalMovesForCard(game, card("K"));
    expect(moves).toContain("e4e5");
    expect(moves).toContain("e4d4");
    expect(moves).toContain("e4f5");
    expect(moves.length).toBe(8);
  });

  it("can castle kingside", () => {
    const game = new Chess("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
    const moves = getLegalMovesForCard(game, card("K"));
    expect(moves).toContain("e1g1");
  });

  it("can castle queenside", () => {
    const game = new Chess("4k3/8/8/8/8/8/8/R3K3 w Q - 0 1");
    const moves = getLegalMovesForCard(game, card("K"));
    expect(moves).toContain("e1c1");
  });

  it("cannot castle through check", () => {
    // Black rook on f8 attacks f1, preventing kingside castling
    const game = new Chess("4kr2/8/8/8/8/8/8/4K2R w K - 0 1");
    const moves = getLegalMovesForCard(game, card("K"));
    expect(moves).not.toContain("e1g1");
  });
});

/* ── Ace / Wild (A) ──────────────────────────────────────────────────── */

describe("Wild / Ace (A)", () => {
  it("returns ALL legal moves for the side", () => {
    const game = new Chess(); // starting position
    const aceMoves = getLegalMovesForCard(game, card("A"));
    const allMoves = game.moves({ verbose: true }).map(
      (m) => m.from + m.to + (m.promotion ?? "")
    );
    expect(aceMoves.sort()).toEqual(allMoves.sort());
  });
});

/* ── getLegalMovesForHand ─────────────────────────────────────────────── */

describe("getLegalMovesForHand", () => {
  it("returns one entry per card", () => {
    const game = new Chess();
    const hand: Card[] = [card("5"), card("J"), card("A")];
    const result = getLegalMovesForHand(game, hand);
    expect(result.length).toBe(3);
    expect(result[0].piece).toBe("pawn");
    expect(result[1].piece).toBe("knight");
    expect(result[2].piece).toBe("wild");
  });
});

/* ── getCaptureBonus ─────────────────────────────────────────────────── */

describe("getCaptureBonus", () => {
  it("pawn capture (no check) = 1", () => {
    expect(getCaptureBonus("p", false)).toBe(1);
  });

  it("knight capture (no check) = 2", () => {
    expect(getCaptureBonus("n", false)).toBe(2);
  });

  it("bishop capture (no check) = 2", () => {
    expect(getCaptureBonus("b", false)).toBe(2);
  });

  it("rook capture (no check) = 2", () => {
    expect(getCaptureBonus("r", false)).toBe(2);
  });

  it("queen capture (no check) = 3", () => {
    expect(getCaptureBonus("q", false)).toBe(3);
  });

  it("each +1 when giving check", () => {
    expect(getCaptureBonus("p", true)).toBe(2);
    expect(getCaptureBonus("q", true)).toBe(4);
  });
});
