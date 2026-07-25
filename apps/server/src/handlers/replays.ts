import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";

export function registerReplayHandlers(socket: Socket) {
  socket.on("get_game_moves", async ({ gameId }: { gameId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("game_moves", { gameId, moves: [] });
      return;
    }
    try {
      const { GameMoveRepository, GameRepository } = await import("@checkker/database");
      const gameRecord = await GameRepository.findById(gameId);
      if (!gameRecord || (gameRecord.whiteUserId !== auth.userId && gameRecord.blackUserId !== auth.userId)) {
        socket.emit("game_moves", { gameId, moves: [] });
        return;
      }
      const moves = await GameMoveRepository.getByGameId(gameId);
      socket.emit("game_moves", { gameId, moves });
    } catch {
      socket.emit("game_moves", { gameId, moves: [] });
    }
  });
}
