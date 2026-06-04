import { AIBrain } from "../orchestrator";
import { evaluatePokerPotential } from "../evaluator/PokerPotential";
import { Chess } from "chess.js";
import { getLegalMovesForHand } from "@checkker/chess";
import { createDeck } from "@checkker/shared";

let brain: AIBrain;

beforeEach(() => {
  brain = new AIBrain();
});

describe("AIBrain", () => {
  describe("evaluatePosition", () => {
    it("should evaluate starting position near 0", async () => {
      const score = await brain.evaluatePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      expect(Math.abs(score)).toBeLessThan(250);
    });

    it("should give non-zero score after e4", async () => {
      const chess = new Chess();
      chess.move("e4");
      const score = await brain.evaluatePosition(chess.fen());
      expect(score).not.toBe(0);
    });
  });

  describe("getBestMoves", () => {
    it("should return ranked moves for a position", async () => {
      const chess = new Chess();
      const fen = chess.fen();
      const deck = createDeck();
      const hand = deck.slice(0, 3);

      const moves = await brain.getBestMoves(fen, hand, [], 40, "white", 3);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves[0].rank).toBe(1);
      expect(moves[0].isBestMove).toBe(true);
    });
  });

  describe("evaluatePokerAware", () => {
    it("should return hybrid score with poker potential", async () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const deck = createDeck();
      const hand = deck.slice(0, 3);
      const scorePile = deck.slice(3, 8);

      const result = await brain.evaluatePokerAware(fen, hand, scorePile, 40, "white");
      expect(result.chessScore).toBeDefined();
      expect(result.pokerPotential).toBeDefined();
      expect(result.hybridScore).toBeDefined();
    });
  });
});

describe("PokerPotential", () => {
  it("should detect flush potential", () => {
    const deck = createDeck();
    const hearts = deck.filter((c) => c.suit === "hearts").slice(0, 3);
    const hand = deck.slice(0, 2);

    const result = evaluatePokerPotential(hearts, hand, 40);
    expect(result.potentialValue).toBeGreaterThan(0);
  });

  it("should return 0 current value with empty pile", () => {
    const result = evaluatePokerPotential([], [], 40);
    expect(result.currentValue).toBe(0);
    expect(result.cardsNeeded).toBe(5);
  });
});

describe("MoveExplainer", () => {
  it("should return explanation for a legal move", async () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const explanation = await brain.getMoveExplainer().explainMove(fen, "e2e4", "2h", "white");
    expect(explanation.text.length).toBeGreaterThan(0);
    expect(explanation.type).toBeDefined();
    expect(explanation.priority).toBeDefined();
  });
});

describe("AdaptiveBot", () => {
  it("should create player model on first access", () => {
    const model = brain.getPlayerModel("test-player-1");
    expect(model.id).toBe("test-player-1");
    expect(model.estimatedSkill).toBe(1000);
  });

  it("should recommend beginner for low-skill players", () => {
    const model = brain.getPlayerModel("weak-player");
    model.estimatedSkill = 400;
    const diff = brain.getAdaptiveDifficulty("weak-player");
    expect(diff).toBe("beginner");
  });

  it("should recommend master for high-skill players", () => {
    const model = brain.getPlayerModel("strong-player");
    model.estimatedSkill = 2000;
    const diff = brain.getAdaptiveDifficulty("strong-player");
    expect(diff).toBe("master");
  });
});

describe("getBestMoveForDifficulty", () => {
  it("should return a move for beginner difficulty", async () => {
    const chess = new Chess();
    const fen = chess.fen();
    const deck = createDeck();
    const hand = deck.slice(0, 3);
    const legalMoves = getLegalMovesForHand(chess, hand);

    const result = await brain.getBestMoveForDifficulty(fen, hand, legalMoves, [], 40, "white", "beginner");
    expect(result).not.toBeNull();
    expect(result!.cardId).toBeDefined();
    expect(result!.move).toBeDefined();
  });

  it("should return a move for master difficulty", async () => {
    const chess = new Chess();
    const fen = chess.fen();
    const deck = createDeck();
    const hand = deck.slice(0, 3);
    const legalMoves = getLegalMovesForHand(chess, hand);

    const result = await brain.getBestMoveForDifficulty(fen, hand, legalMoves, [], 40, "white", "master");
    expect(result).not.toBeNull();
  });
});
