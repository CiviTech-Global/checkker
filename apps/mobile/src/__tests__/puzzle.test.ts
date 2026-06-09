import type { Puzzle, PuzzleResult, PuzzlesListData } from "../types/puzzle";

function formatUci(uci: string): string {
  if (uci.length < 4) return uci.toUpperCase();
  const from = uci.substring(0, 2).toUpperCase();
  const to = uci.substring(2, 4).toUpperCase();
  const promotion = uci.length > 4 ? `=${uci[4].toUpperCase()}` : "";
  return `${from}-${to}${promotion}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  daily: "Daily Puzzle",
  tactics: "Tactical Puzzles",
  card_play: "Card Management",
  endgame: "Endgame Training",
  weakness: "Weakness Training",
};

describe("Puzzle types", () => {
  it("Puzzle type has correct shape", () => {
    const puzzle: Puzzle = {
      id: "p1",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: "e2e4",
      hint: "Move the pawn",
      difficulty: "easy",
      category: "tactics",
      rating: 1200,
    };
    expect(puzzle.id).toBe("p1");
    expect(puzzle.fen).toContain("rnbqkbnr");
    expect(puzzle.solution).toBe("e2e4");
    expect(puzzle.rating).toBeGreaterThan(0);
  });

  it("PuzzleResult type has correct shape", () => {
    const result: PuzzleResult = {
      correct: true,
      solution: "e2e4",
      hint: "Move the pawn",
      stats: { streak: 3, solved: 10, attempted: 12 },
    };
    expect(result.correct).toBe(true);
    expect(result.stats.streak).toBe(3);
    expect(result.stats.solved).toBe(10);
    expect(result.stats.attempted).toBe(12);
  });

  it("PuzzleResult with wrong answer", () => {
    const result: PuzzleResult = {
      correct: false,
      solution: "e2e4",
      hint: "Move the pawn",
      stats: { streak: 0, solved: 10, attempted: 11 },
    };
    expect(result.correct).toBe(false);
    expect(result.stats.streak).toBe(0);
  });

  it("PuzzlesListData type has correct shape", () => {
    const data: PuzzlesListData = {
      category: "tactics",
      puzzles: [
        { id: "p1", fen: "", solution: "", hint: "", difficulty: "easy", category: "tactics", rating: 1200 },
        { id: "p2", fen: "", solution: "", hint: "", difficulty: "medium", category: "tactics", rating: 1500 },
      ],
      count: 2,
    };
    expect(data.category).toBe("tactics");
    expect(data.puzzles).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it("PuzzlesListData with zero puzzles", () => {
    const data: PuzzlesListData = {
      category: "weakness",
      puzzles: [],
      count: 0,
    };
    expect(data.puzzles).toHaveLength(0);
    expect(data.count).toBe(0);
  });
});

describe("formatUci", () => {
  it("formats standard move", () => {
    expect(formatUci("e2e4")).toBe("E2-E4");
  });

  it("formats knight move", () => {
    expect(formatUci("g1f3")).toBe("G1-F3");
  });

  it("formats promotion", () => {
    expect(formatUci("e7e8q")).toBe("E7-E8=Q");
  });

  it("formats promotion to rook", () => {
    expect(formatUci("a7a8r")).toBe("A7-A8=R");
  });

  it("handles short input", () => {
    expect(formatUci("e4")).toBe("E4");
  });

  it("handles empty string", () => {
    expect(formatUci("")).toBe("");
  });

  it("converts to uppercase", () => {
    expect(formatUci("E2E4")).toBe("E2-E4");
  });

  it("handles queenside castle notation", () => {
    expect(formatUci("e1c1")).toBe("E1-C1");
  });

  it("handles kingside castle notation", () => {
    expect(formatUci("e1g1")).toBe("E1-G1");
  });
});

describe("CATEGORY_LABELS", () => {
  it("maps daily category", () => {
    expect(CATEGORY_LABELS["daily"]).toBe("Daily Puzzle");
  });

  it("maps tactics category", () => {
    expect(CATEGORY_LABELS["tactics"]).toBe("Tactical Puzzles");
  });

  it("maps card_play category", () => {
    expect(CATEGORY_LABELS["card_play"]).toBe("Card Management");
  });

  it("maps endgame category", () => {
    expect(CATEGORY_LABELS["endgame"]).toBe("Endgame Training");
  });

  it("maps weakness category", () => {
    expect(CATEGORY_LABELS["weakness"]).toBe("Weakness Training");
  });

  it("returns undefined for unknown category", () => {
    expect(CATEGORY_LABELS["unknown"]).toBeUndefined();
  });

  it("has exactly 5 labels", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(5);
  });

  it("all label values are non-empty strings", () => {
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
