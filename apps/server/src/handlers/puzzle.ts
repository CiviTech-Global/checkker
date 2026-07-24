import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";

export function registerPuzzleHandlers(socket: Socket) {
  socket.on("get_daily_puzzle", async () => {
    try {
      const { PuzzleRepository } = await import("@checkker/database");
      const puzzle = await PuzzleRepository.ensureDaily();
      socket.emit("daily_puzzle", { puzzle });
    } catch {
      socket.emit("daily_puzzle", { puzzle: null });
    }
  });

  socket.on("get_puzzles", async ({ category, limit }: { category?: string; limit?: number }) => {
    try {
      const { PuzzleRepository } = await import("@checkker/database");
      const effectiveCategory = category ?? "tactics";
      if (effectiveCategory === "daily") {
        const daily = await PuzzleRepository.ensureDaily();
        socket.emit("puzzles", {
          category: "daily",
          puzzles: daily ? [daily] : [],
          count: daily ? 1 : 0,
        });
        return;
      }
      const [puzzles, count] = await Promise.all([
        PuzzleRepository.getByCategory(effectiveCategory, limit ?? 20),
        PuzzleRepository.countByCategory(effectiveCategory),
      ]);
      socket.emit("puzzles", { category: effectiveCategory, puzzles, count });
    } catch {
      socket.emit("puzzles", { category: category ?? "tactics", puzzles: [], count: 0 });
    }
  });

  socket.on("submit_puzzle", async ({ puzzleId, moveUci, timeSpentMs, usedHint }: { puzzleId: string; moveUci: string; timeSpentMs: number; usedHint?: boolean }) => {
    try {
      const { PuzzleRepository } = await import("@checkker/database");
      const puzzle = await PuzzleRepository.getById(puzzleId);
      if (!puzzle) {
        socket.emit("puzzle_result", { correct: false, error: "Puzzle not found" });
        return;
      }

      const normalize = (uci: string) => uci.trim().toLowerCase();
      const correct = normalize(moveUci) === normalize(puzzle.solution);

      const auth = authenticatedSockets.get(socket.id);
      if (auth) {
        await PuzzleRepository.recordAttempt({
          puzzleId,
          userId: auth.userId,
          solved: correct,
          timeSpentMs: timeSpentMs ?? 0,
          usedHint: usedHint ?? false,
        });
      }

      const stats = auth ? await PuzzleRepository.getUserStats(auth.userId) : { streak: 0, solved: 0, attempted: 0 };
      socket.emit("puzzle_result", { correct, solution: puzzle.solution, hint: puzzle.hint, stats });
    } catch {
      socket.emit("puzzle_result", { correct: false, error: "Submission failed" });
    }
  });
}
