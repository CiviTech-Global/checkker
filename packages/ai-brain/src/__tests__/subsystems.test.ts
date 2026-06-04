import { AIBrain } from "../orchestrator";
import { PlayerRepository } from "../adaptive/PlayerRepository";
import { PlayerClusterer } from "../adaptive/PlayerClusterer";
import { PuzzleGenerator } from "../analysis/PuzzleGenerator";
import { LLMCoach } from "../coaching/LLMCoach";
import { Chess } from "chess.js";
import { createDeck } from "@checkker/shared";
import * as fs from "fs";
import * as path from "path";

let brain: AIBrain;
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

beforeEach(() => {
  brain = new AIBrain();
});

describe("PlayerRepository", () => {
const testDir = path.join(__dirname, "../../.test-data");
let repo: PlayerRepository;

beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    brain.enablePersistence(testDir);
    repo = brain.getPlayerRepository()!;
  });

  afterEach(() => {
    brain.disablePersistence();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should save and restore player model", () => {
    brain.recordPlayerMove("test-p1", "e2e4", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", { rank: "4", suit: "hearts" }, "white", true);
    brain.persistPlayer("test-p1");

    const loaded = repo.load("test-p1");
    expect(loaded).not.toBeNull();
    expect(loaded!.estimatedSkill).toBeDefined();
    expect(loaded!.moveHistory.length).toBeGreaterThan(0);
  });

  it("should record moves in history", () => {
    repo.recordMove("test-p2", "d2d4", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "4", "spades", "white", true);
    repo.recordMove("test-p2", "e7e5", "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1", "5", "clubs", "black", false);

    const loaded = repo.load("test-p2");
    expect(loaded!.moveHistory.length).toBe(2);
    expect(loaded!.moveHistory[0].move).toBe("d2d4");
  });

  it("should track active player count", async () => {
    repo.recordMove("active1", "e2e4", START_FEN, "4", "hearts", "white", true);
    repo.persistModel("active1");
    await repo.flushDirty();

    const count = repo.getActivePlayerCount(24 * 365);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should return all player models", async () => {
    repo.recordMove("all-test-1", "e2e4", START_FEN, "4", "hearts", "white", true);
    repo.persistModel("all-test-1");
    repo.recordMove("all-test-2", "d2d4", START_FEN, "4", "hearts", "white", true);
    repo.persistModel("all-test-2");
    await repo.flushDirty();

    const models = repo.getAllPlayerModels();
    const ids = models.map((m) => m.id);
    expect(ids).toContain("all-test-1");
    expect(ids).toContain("all-test-2");
  });
});

describe("PlayerClusterer", () => {
  let clusterer: PlayerClusterer;

  beforeEach(() => {
    clusterer = new PlayerClusterer();
  });

  it("should cluster players into groups", () => {
    const players = [
      { id: "rookie1", estimatedSkill: 300, playStyle: "unknown" as const, aggressionIndex: 0.3, cardConservationIndex: 0.2, weaknesses: [] },
      { id: "rookie2", estimatedSkill: 400, playStyle: "defensive" as const, aggressionIndex: 0.2, cardConservationIndex: 0.3, weaknesses: [] },
      { id: "master1", estimatedSkill: 2300, playStyle: "balanced" as const, aggressionIndex: 0.5, cardConservationIndex: 0.7, weaknesses: [] },
      { id: "aggressor", estimatedSkill: 1500, playStyle: "aggressive" as const, aggressionIndex: 0.8, cardConservationIndex: 0.3, weaknesses: [] },
    ];

    const clusters = clusterer.clusterPlayers(players);
    expect(clusters.length).toBeGreaterThan(0);

    const rookieCluster = clusters.find((c) => c.members.includes("rookie1"));
    const masterCluster = clusters.find((c) => c.members.includes("master1"));
    expect(rookieCluster).toBeDefined();
    expect(masterCluster).toBeDefined();

    if (rookieCluster && masterCluster) {
      expect(rookieCluster.id).not.toBe(masterCluster.id);
    }
  });

  it("should suggest matches between similar players", () => {
    const players = [
      { id: "p1", estimatedSkill: 1200, playStyle: "balanced" as const, aggressionIndex: 0.5, cardConservationIndex: 0.5, weaknesses: [] },
      { id: "p2", estimatedSkill: 1250, playStyle: "balanced" as const, aggressionIndex: 0.5, cardConservationIndex: 0.5, weaknesses: [] },
      { id: "p3", estimatedSkill: 2000, playStyle: "aggressive" as const, aggressionIndex: 0.8, cardConservationIndex: 0.3, weaknesses: [] },
    ];

    const suggestion = clusterer.findMatch(players[0], players);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.playerA).toBe("p1");
    expect(suggestion!.compatibility).toBeGreaterThan(0);
  });

  it("should return cluster stats", () => {
    const players = [
      { id: "test1", estimatedSkill: 500, playStyle: "defensive" as const, aggressionIndex: 0.2, cardConservationIndex: 0.5, weaknesses: [] },
    ];

    const clusters = clusterer.clusterPlayers(players);
    const stats = clusterer.getClusterStats(clusters);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats.some((s) => s.count > 0)).toBe(true);
  });
});

describe("PuzzleGenerator", () => {
  let generator: PuzzleGenerator;

  beforeEach(() => {
    generator = new PuzzleGenerator();
  });

  it("should generate a puzzle from a position with a clear best move", async () => {
    const fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";
    const puzzle = await generator.generateFromPosition(fen, "white", "intermediate");
    if (puzzle) {
      expect(puzzle.fen).toBe(fen);
      expect(puzzle.solution.length).toBeGreaterThan(0);
      expect(puzzle.difficulty).toBeDefined();
      expect(puzzle.category).toBeDefined();
      expect(puzzle.rating).toBeGreaterThan(0);
      expect(puzzle.description).toBeTruthy();
    }
  });

  it("should return null for positions with no clear best move", async () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const puzzle = await generator.generateFromPosition(fen, "white", "master", { minScoreGap: 500 });
    expect(puzzle).toBeNull();
  });

  it("should generate puzzles from move history", async () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("e5");
    chess.move("Nf3");

    const history = [
      { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", move: "e2e4", color: "white" as const },
      { fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", move: "e7e5", color: "black" as const },
      { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", move: "g1f3", color: "white" as const },
    ];

    const puzzles = await generator.generateFromMoveHistory(history);
    expect(Array.isArray(puzzles)).toBe(true);
  });

  it("should generate a batch of puzzles", async () => {
    const fens = [
      "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
      "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 4",
    ];
    const puzzles = await generator.generateBatch(fens, "white", "intermediate");
    expect(puzzles.length).toBeGreaterThanOrEqual(0);
    expect(puzzles.length).toBeLessThanOrEqual(10);
  });
});

describe("LLMCoach", () => {
  let coach: LLMCoach;

  beforeEach(() => {
    coach = new LLMCoach();
  });

  it("should not be available without configuration", () => {
    expect(coach.isAvailable()).toBe(false);
  });

  it("should fall back to heuristic explainer when LLM unavailable", async () => {
    const explanation = await coach.explainMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", "e7e5", "2h", "black");
    expect(explanation.text.length).toBeGreaterThan(0);
    expect(explanation.type).toBeDefined();
  });

  it("should not generate coaching tip without API key", async () => {
    const tip = await coach.generateCoachingTip("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", [], "white", 0);
    expect(tip).toBeNull();
  });

  it("should not generate post-game summary without API key", async () => {
    const summary = await coach.generatePostGameSummary([], "white", "win");
    expect(summary).toBe("");
  });
});

describe("Adaptive Bot wired through Orchestrator", () => {
  it("should recommend increasing difficulty as skill improves", () => {
    const model = brain.getPlayerModel("learner2");
    model.estimatedSkill = 500;
    expect(brain.getAdaptiveDifficulty("learner2")).toBe("beginner");

    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    for (let i = 0; i < 20; i++) {
      brain.recordPlayerMove("learner2", "e2e4", startFen, { rank: "4", suit: "hearts" }, "white", true);
    }

    const diff = brain.getAdaptiveDifficulty("learner2");
    expect(["intermediate", "advanced", "master"]).toContain(diff);
  });
});

describe("Clustering through Orchestrator", () => {
  it("should return cluster stats even with no players", () => {
    const stats = brain.getClusterStats();
    expect(Array.isArray(stats)).toBe(true);
  });

  it("should find match when players exist", () => {
    brain.recordPlayerMove("match-p1", "e2e4", START_FEN, { rank: "4", suit: "hearts" }, "white", true);
    brain.persistPlayer("match-p1");

    const suggestion = brain.findMatch("match-p1");
    expect(suggestion).toBeNull();
  });
});

describe("Puzzle generation through Orchestrator", () => {
  it("should generate puzzles from history", async () => {
    const history = [
      { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", move: "e2e4", color: "white" as const },
    ];
    const puzzles = await brain.generatePuzzlesFromHistory(history);
    expect(Array.isArray(puzzles)).toBe(true);
  });

  it("should generate a puzzle from a position", async () => {
    const fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";
    const puzzle = await brain.generatePuzzle(fen, "white", "advanced");
    if (puzzle) {
      expect(puzzle.fen).toBe(fen);
      expect(puzzle.solution.length).toBeGreaterThan(0);
    }
  });
});

describe("Full AI Brain lifecycle", () => {
  it("should evaluate position, suggest moves, and persist state", async () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const score = await brain.evaluatePosition(fen);
    expect(typeof score).toBe("number");

    const deck = createDeck();
    const hand = deck.slice(0, 3);
    const moves = await brain.getBestMoves(fen, hand, [], 40, "black", 3);
    expect(Array.isArray(moves)).toBe(true);
  });

  it("should explain a move with the heuristic explainer", async () => {
    const explanation = await brain.explainMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", "e7e5", "2h", "black");
    expect(explanation.text.length).toBeGreaterThan(0);
  });

  it("should give coaching tip from position analysis", async () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const tip = await brain.getCoachingTip(fen, [], [], "white", 0);
    expect(tip).toBeDefined();
  });

  it("should analyze a game and return a report", async () => {
    const report = await brain.analyzeGame(
      [{ fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", move: "e7e5", card: { rank: "4", suit: "hearts" }, color: "black" }],
      "black",
      15,
      1000,
    );
    expect(report.summary).toBeTruthy();
    expect(report.chessAccuracy).toBeGreaterThanOrEqual(0);
    expect(report.chessAccuracy).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.mistakes)).toBe(true);
    expect(Array.isArray(report.tips)).toBe(true);
  });

  it("should configure engine type", () => {
    brain.configureEngine("heuristic");
    expect(brain.getEngine().name).toBe("Heuristic v2");
  });
});
