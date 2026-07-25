import type { Socket } from "socket.io";
import type { GameServer } from "../GameServer";
import type { BotDifficulty, TimeControl } from "@checkker/shared";
import { brain } from "../bot/evaluators";
import { playerStore } from "../PlayerStore";

export function registerBotHandlers(
  socket: Socket,
  server: GameServer,
) {
  socket.on("start_bot_game", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
    server.getBotManager().createBotGame(socket, socket.id, difficulty, tc);
  });

  socket.on("request_bot", ({ difficulty, tc }: { difficulty: BotDifficulty; tc: TimeControl }) => {
    server.getBotManager().createBotGame(socket, socket.id, difficulty, tc);
  });

  socket.on("start_spectate_bot_game", ({ whiteDifficulty, blackDifficulty }: { whiteDifficulty: BotDifficulty; blackDifficulty: BotDifficulty }) => {
    server.getSpectateManager().createSpectateGame(socket, whiteDifficulty, blackDifficulty, "blitz");
  });

  socket.on("spectate_pause", ({ gameId }: { gameId: string }) => {
    if (!server.getSpectateManager().isOwner(gameId, socket.id)) return;
    server.getSpectateManager().pause(gameId);
  });

  socket.on("spectate_resume", ({ gameId }: { gameId: string }) => {
    if (!server.getSpectateManager().isOwner(gameId, socket.id)) return;
    server.getSpectateManager().resume(gameId);
  });

  socket.on("spectate_step_forward", ({ gameId }: { gameId: string }) => {
    if (!server.getSpectateManager().isOwner(gameId, socket.id)) return;
    server.getSpectateManager().stepForward(gameId);
  });

  socket.on("spectate_step_backward", ({ gameId, currentIndex }: { gameId: string; currentIndex: number }) => {
    if (!server.getSpectateManager().isOwner(gameId, socket.id)) return;
    server.getSpectateManager().stepBackward(gameId, currentIndex);
  });

  socket.on("spectate_leave", ({ gameId }: { gameId: string }) => {
    if (!server.getSpectateManager().isOwner(gameId, socket.id)) return;
    server.getSpectateManager().dispose(gameId);
  });

  socket.on("request_adaptive_bot", ({ tc }: { tc: TimeControl }) => {
    const difficulty = brain.getAdaptiveDifficulty(socket.id);
    server.getBotManager().createBotGame(socket, socket.id, difficulty, tc);
  });

  socket.on("get_adaptive_difficulty", () => {
    const difficulty = brain.getAdaptiveDifficulty(socket.id);
    socket.emit("adaptive_difficulty", { difficulty });
  });

  socket.on("get_cluster_stats", () => {
    const stats = brain.getClusterStats();
    socket.emit("cluster_stats", { clusters: stats });
  });

  socket.on("get_player_dashboard", () => {
    const model = brain.getPlayerModel(socket.id);
    const profile = playerStore.getOrCreate(socket.id);
    socket.emit("player_dashboard", {
      profile,
      model,
      skillGraph: {
        opening: 45,
        middlegame: 50,
        endgame: 35,
        cards: 60,
        poker: 40,
      },
    });
  });

  socket.on("find_match", () => {
    const suggestion = brain.findMatch(socket.id);
    if (suggestion) {
      socket.emit("match_suggestion", suggestion);
    }
  });
}
