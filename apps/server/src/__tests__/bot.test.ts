// Requirements:
//   - Install jest, ts-jest, @types/jest in apps/server:
//       npm i -D jest ts-jest @types/jest
//   - Add to apps/server/package.json scripts: "test": "jest"
//   - Create apps/server/jest.config.js:
//       module.exports = {
//         preset: "ts-jest",
//         testEnvironment: "node",
//         roots: ["<rootDir>/src"],
//       };
//
// Run: npm test -w @checkker/server

import { Chess, getLegalMovesForHand } from "@checkker/chess";
import { cardId, createDeck } from "@checkker/shared";
import type { Card } from "@checkker/shared";
import { evaluators, type MoveEvaluator } from "../bot/evaluators";
import { BotPlayer } from "../bot/BotPlayer";
import { GameEngine } from "../GameEngine";

// Deterministic deck where white and black get pawn cards (always have legal moves)
function botTestDeck(): Card[] {
  const wh: Card[] = [
    { suit: "clubs", rank: "5" },
    { suit: "hearts", rank: "6" },
    { suit: "spades", rank: "7" },
  ];
  const bh: Card[] = [
    { suit: "diamonds", rank: "3" },
    { suit: "clubs", rank: "4" },
    { suit: "hearts", rank: "8" },
  ];
  const top = [...bh.slice().reverse(), ...wh.slice().reverse()];
  const used = new Set(top.map((c) => `${c.rank}-${c.suit}`));
  const rest = createDeck().filter((c) => !used.has(`${c.rank}-${c.suit}`));
  return [...rest, ...top];
}

// ---------------------------------------------------------------------------
// 1. Evaluator tests
// ---------------------------------------------------------------------------

// Since individual evaluators are not exported, we access them through the
// evaluators record.

describe("evaluators", () => {
  // ---- Beginner -----------------------------------------------------------

  describe("beginner", () => {
    const beginner = evaluators.beginner;

    it("returns a legal move from the legal moves list", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const hand = [{ suit: "hearts" as const, rank: "4" as const }];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await beginner.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      expect(result!.cardId).toBe("4h");
      expect(result!.move.length).toBeGreaterThanOrEqual(4);
      // Verify the move is actually in the legal list
      const uciMoves = legalMoves.flatMap((lm) => lm.moves);
      expect(uciMoves).toContain(result!.move);
    });

    it("handles randomness across multiple calls", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const hand = [{ suit: "spades" as const, rank: "4" as const }];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const r = await beginner.pickMove(fen, hand, legalMoves, "white");
        expect(r).not.toBeNull();
        results.add(r!.move);
      }
      // With randomness, we should see multiple distinct moves
      // (Pawns have 16 possible moves from start – e2-e4, e2-e3, d2-d4, etc.)
      expect(results.size).toBeGreaterThan(1);
    });

    it("returns null when legal moves list is empty", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const result = await beginner.pickMove(fen, [], [], "white");
      expect(result).toBeNull();
    });
  });

  // ---- Intermediate -------------------------------------------------------

  describe("intermediate", () => {
    const intermediate = evaluators.intermediate;

    it("picks a legal pawn move from the position", async () => {
      const fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
      const hand = [{ suit: "hearts" as const, rank: "4" as const }];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await intermediate.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      expect(result!.cardId).toBe("4h");
      const legalPawnMoves = legalMoves[0].moves;
      expect(legalPawnMoves).toContain(result!.move);
    });

    it("returns null for empty legal moves", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const result = await intermediate.pickMove(fen, [], [], "white");
      expect(result).toBeNull();
    });
  });

  // ---- Advanced -----------------------------------------------------------

  describe("advanced", () => {
    const advanced = evaluators.advanced;

    it("works without crashing and returns a score", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const hand = [
        { suit: "spades" as const, rank: "K" as const },
        { suit: "hearts" as const, rank: "4" as const },
      ];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await advanced.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      expect(result!.score).toBeDefined();
      expect(typeof result!.score).toBe("number");
    });

    it("evaluates different moves and picks one", async () => {
      // Use a pawn card which won't get penalized like high-value cards
      const fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
      const hand = [{ suit: "hearts" as const, rank: "4" as const }];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await advanced.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      expect(result!.score).toBeDefined();
      expect(typeof result!.score).toBe("number");
    });

    it("returns null for empty legal moves", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const result = await advanced.pickMove(fen, [], [], "white");
      expect(result).toBeNull();
    });
  });

  // ---- Master -------------------------------------------------------------

  describe("master", () => {
    const master = evaluators.master;

    it("finds a strong move in a winning position", async () => {
      // White queen on b1, black king on a8 — many strong moves available
      const fen = "k7/8/8/8/8/8/8/1Q2K3 w - - 0 1";
      const hand = [{ suit: "hearts" as const, rank: "Q" as const }];
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await master.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      // Master should find some move — exact move depends on evaluation
      expect(result!.move.length).toBeGreaterThanOrEqual(4);
    });

    it("prefers a checking move over a non-checking move", async () => {
      // Rook on h1 can give check with Rh8+ (h1h8)
      const fen = "k7/8/8/8/8/8/8/K6R w - - 0 1";
      const hand = [{ suit: "hearts" as const, rank: "10" as const }]; // rook
      const legalMoves = getLegalMovesForHand(new Chess(fen), hand);
      const result = await master.pickMove(fen, hand, legalMoves, "white");
      expect(result).not.toBeNull();
      expect(result!.move).toBe("h1h8");
    });

    it("returns null for empty legal moves", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const result = await master.pickMove(fen, [], [], "white");
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. BotPlayer tests
// ---------------------------------------------------------------------------

// Helper: find the first legal move for a color in a GameEngine
function firstMoveFor(game: GameEngine, color: "white" | "black"): { cardId: string; move: string } | null {
  const state = game.getState();
  const chess = new Chess(state.fen);
  const hand = color === "white" ? state.white.hand : state.black.hand;
  const legalMoves = getLegalMovesForHand(chess, hand);
  for (const entry of legalMoves) {
    if (entry.moves.length > 0) {
      return { cardId: cardId(entry.card), move: entry.moves[0] };
    }
  }
  return null;
}

describe("BotPlayer", () => {
  describe("playTurn", () => {
    jest.setTimeout(30000);

    it("plays a move on its turn", async () => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 100,
        evaluator: evaluators.beginner,
      });

      const whiteMove = firstMoveFor(game, "white");
      expect(whiteMove).not.toBeNull();
      const playResult = game.playCard(whiteMove!.cardId, whiteMove!.move);
      expect(playResult.success).toBe(true);

      await bot.playTurn(game);
      expect(game.isOver() || game.getState().turn === "white").toBe(true);
    });

    it("respects a custom delay", async () => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 200,
        evaluator: evaluators.beginner,
      });

      const whiteMove = firstMoveFor(game, "white");
      expect(whiteMove).not.toBeNull();
      game.playCard(whiteMove!.cardId, whiteMove!.move);

      const start = Date.now();
      await bot.playTurn(game);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(150);
      expect(game.getState().turn).toBe("white");
    });

    it("returns immediately when the game is already over", async () => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 0,
        evaluator: evaluators.beginner,
      });

      game.resign("white");
      expect(game.isOver()).toBe(true);

      await bot.playTurn(game);
    });

    it("returns immediately when it is not its turn", async () => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 0,
        evaluator: evaluators.beginner,
      });

      await bot.playTurn(game);
    });

    it("resigns when the evaluator returns null", async () => {
      const alwaysNull: MoveEvaluator = {
        difficulty: "beginner",
        pickMove: async () => null,
      };

      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 0,
        evaluator: alwaysNull,
      });

      const whiteMove = firstMoveFor(game, "white");
      expect(whiteMove).not.toBeNull();
      game.playCard(whiteMove!.cardId, whiteMove!.move);

      expect(game.isOver()).toBe(false);
      await bot.playTurn(game);
      expect(game.isOver()).toBe(true);
    });

    it("does not call playCard while already thinking", async () => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty: "beginner",
        delayMs: 500,
        evaluator: evaluators.beginner,
      });

      const whiteMove = firstMoveFor(game, "white");
      expect(whiteMove).not.toBeNull();
      game.playCard(whiteMove!.cardId, whiteMove!.move);

      const firstPlay = bot.playTurn(game);
      const secondPlay = bot.playTurn(game);

      await Promise.all([firstPlay, secondPlay]);

      expect(game.isOver() || game.getState().turn === "white").toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Integration tests
// ---------------------------------------------------------------------------

describe("integration: evaluators + BotPlayer", () => {
  jest.setTimeout(60000);
  it.each(["beginner", "intermediate", "advanced", "master"] as const)(
    "BotPlayer with %s difficulty completes a turn without crashing",
    async (difficulty) => {
      const game = new GameEngine(1000, 400, "blitz", botTestDeck());
      const bot = new BotPlayer({
        color: "black",
        difficulty,
        delayMs: 100,
        evaluator: evaluators[difficulty],
      });

      const whiteMove = firstMoveFor(game, "white");
      expect(whiteMove).not.toBeNull();
      game.playCard(whiteMove!.cardId, whiteMove!.move);

      await bot.playTurn(game);

      expect(game.isOver() || game.getState().turn === "white").toBe(true);
    },
  );
});
