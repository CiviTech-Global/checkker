import type { Puzzle, PuzzleResult, PuzzlesListData } from "../types/puzzle";

type SocketEventHandler = (...args: any[]) => void;

interface MockSocket {
  on: jest.Mock;
  emit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
}

function createMockSocket(): MockSocket {
  return {
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe("Puzzle socket event handlers", () => {
  let mockSocket: MockSocket;
  let eventHandlers: Record<string, SocketEventHandler>;
  let lastDailyPuzzle: Puzzle | null;
  let lastPuzzles: PuzzlesListData | null;
  let lastPuzzleResult: PuzzleResult | null;

  function attachPuzzleListeners(socket: MockSocket): void {
    eventHandlers = {};

    socket.on.mockImplementation((event: string, handler: SocketEventHandler) => {
      eventHandlers[event] = handler;
    });

    socket.on("daily_puzzle", (data: Puzzle) => {
      lastDailyPuzzle = data;
    });

    socket.on("puzzles", (data: PuzzlesListData) => {
      lastPuzzles = data;
    });

    socket.on("puzzle_result", (data: PuzzleResult) => {
      lastPuzzleResult = data;
    });
  }

  function emitEvent(event: string, data: any): void {
    if (eventHandlers[event]) {
      eventHandlers[event](data);
    }
  }

  beforeEach(() => {
    mockSocket = createMockSocket();
    lastDailyPuzzle = null;
    lastPuzzles = null;
    lastPuzzleResult = null;
    eventHandlers = {};
    attachPuzzleListeners(mockSocket);
  });

  it("listens for daily_puzzle event", () => {
    expect(mockSocket.on).toHaveBeenCalledWith("daily_puzzle", expect.any(Function));
  });

  it("listens for puzzles event", () => {
    expect(mockSocket.on).toHaveBeenCalledWith("puzzles", expect.any(Function));
  });

  it("listens for puzzle_result event", () => {
    expect(mockSocket.on).toHaveBeenCalledWith("puzzle_result", expect.any(Function));
  });

  it("handles daily_puzzle event data correctly", () => {
    const puzzle: Puzzle = {
      id: "daily-1",
      fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
      solution: "e2e4",
      hint: "Push the pawn",
      difficulty: "easy",
      category: "daily",
      rating: 800,
    };

    emitEvent("daily_puzzle", puzzle);

    expect(lastDailyPuzzle).toEqual(puzzle);
    expect(lastDailyPuzzle?.id).toBe("daily-1");
    expect(lastDailyPuzzle?.category).toBe("daily");
  });

  it("handles puzzles event data correctly", () => {
    const data: PuzzlesListData = {
      category: "tactics",
      puzzles: [
        { id: "p1", fen: "", solution: "e2e4", hint: "", difficulty: "easy", category: "tactics", rating: 1200 },
        { id: "p2", fen: "", solution: "d2d4", hint: "", difficulty: "medium", category: "tactics", rating: 1500 },
      ],
      count: 2,
    };

    emitEvent("puzzles", data);

    expect(lastPuzzles).toEqual(data);
    expect(lastPuzzles?.category).toBe("tactics");
    expect(lastPuzzles?.puzzles).toHaveLength(2);
  });

  it("handles puzzle_result event with correct answer", () => {
    const result: PuzzleResult = {
      correct: true,
      solution: "e2e4",
      hint: "Push the pawn",
      stats: { streak: 5, solved: 20, attempted: 22 },
    };

    emitEvent("puzzle_result", result);

    expect(lastPuzzleResult).toEqual(result);
    expect(lastPuzzleResult?.correct).toBe(true);
    expect(lastPuzzleResult?.stats.streak).toBe(5);
  });

  it("handles puzzle_result event with wrong answer", () => {
    const result: PuzzleResult = {
      correct: false,
      solution: "e2e4",
      hint: "Push the pawn",
      stats: { streak: 0, solved: 20, attempted: 21 },
    };

    emitEvent("puzzle_result", result);

    expect(lastPuzzleResult?.correct).toBe(false);
    expect(lastPuzzleResult?.stats.streak).toBe(0);
  });

  it("handles empty puzzles list", () => {
    const data: PuzzlesListData = {
      category: "weakness",
      puzzles: [],
      count: 0,
    };

    emitEvent("puzzles", data);

    expect(lastPuzzles?.puzzles).toHaveLength(0);
    expect(lastPuzzles?.count).toBe(0);
  });

  it("handles null puzzle data gracefully", () => {
    emitEvent("puzzles", null);
    expect(lastPuzzles).toBeNull();

    emitEvent("puzzle_result", null);
    expect(lastPuzzleResult).toBeNull();

    emitEvent("daily_puzzle", null);
    expect(lastDailyPuzzle).toBeNull();
  });
});

describe("Puzzle socket emit functions", () => {
  let mockSocket: MockSocket;

  function emitGetPuzzles(category: string, limit?: number): void {
    mockSocket.emit("get_puzzles", { category, limit });
  }

  function emitGetDailyPuzzle(): void {
    mockSocket.emit("get_daily_puzzle");
  }

  function emitSubmitPuzzle(puzzleId: string, moveUci: string, timeSpentMs: number, usedHint: boolean): void {
    mockSocket.emit("submit_puzzle", { puzzleId, moveUci, timeSpentMs, usedHint });
  }

  beforeEach(() => {
    mockSocket = createMockSocket();
  });

  it("getPuzzles emits with category only", () => {
    emitGetPuzzles("tactics");
    expect(mockSocket.emit).toHaveBeenCalledWith("get_puzzles", {
      category: "tactics",
      limit: undefined,
    });
  });

  it("getPuzzles emits with category and limit", () => {
    emitGetPuzzles("tactics", 10);
    expect(mockSocket.emit).toHaveBeenCalledWith("get_puzzles", {
      category: "tactics",
      limit: 10,
    });
  });

  it("getPuzzles emits with endgame category", () => {
    emitGetPuzzles("endgame");
    expect(mockSocket.emit).toHaveBeenCalledWith("get_puzzles", {
      category: "endgame",
      limit: undefined,
    });
  });

  it("getPuzzles emits with card_play category", () => {
    emitGetPuzzles("card_play");
    expect(mockSocket.emit).toHaveBeenCalledWith("get_puzzles", {
      category: "card_play",
      limit: undefined,
    });
  });

  it("getDailyPuzzle emits correct event", () => {
    emitGetDailyPuzzle();
    expect(mockSocket.emit).toHaveBeenCalledWith("get_daily_puzzle");
  });

  it("submitPuzzle emits with correct payload", () => {
    emitSubmitPuzzle("p1", "e2e4", 5000, false);
    expect(mockSocket.emit).toHaveBeenCalledWith("submit_puzzle", {
      puzzleId: "p1",
      moveUci: "e2e4",
      timeSpentMs: 5000,
      usedHint: false,
    });
  });

  it("submitPuzzle emits with hint used", () => {
    emitSubmitPuzzle("p1", "e2e4", 3000, true);
    expect(mockSocket.emit).toHaveBeenCalledWith("submit_puzzle", {
      puzzleId: "p1",
      moveUci: "e2e4",
      timeSpentMs: 3000,
      usedHint: true,
    });
  });

  it("submitPuzzle emits with promotion move", () => {
    emitSubmitPuzzle("p2", "e7e8q", 8000, false);
    expect(mockSocket.emit).toHaveBeenCalledWith("submit_puzzle", {
      puzzleId: "p2",
      moveUci: "e7e8q",
      timeSpentMs: 8000,
      usedHint: false,
    });
  });

  it("submitPuzzle emits with zero time spent", () => {
    emitSubmitPuzzle("p1", "e2e4", 0, false);
    expect(mockSocket.emit).toHaveBeenCalledWith("submit_puzzle", {
      puzzleId: "p1",
      moveUci: "e2e4",
      timeSpentMs: 0,
      usedHint: false,
    });
  });

  it("each emit call uses correct event name", () => {
    emitGetDailyPuzzle();
    emitGetPuzzles("tactics");
    emitSubmitPuzzle("p1", "e2e4", 1000, false);

    expect(mockSocket.emit.mock.calls[0][0]).toBe("get_daily_puzzle");
    expect(mockSocket.emit.mock.calls[1][0]).toBe("get_puzzles");
    expect(mockSocket.emit.mock.calls[2][0]).toBe("submit_puzzle");
  });
});
