import type { Socket } from "socket.io";
import type { Match } from "./types";
import type { Color } from "@checkker/shared";
import type { GameServer } from "../GameServer";
import { v4 as uuid } from "uuid";
import { playerStore } from "../PlayerStore";

export function registerInGameHandlers(
  socket: Socket,
  server: GameServer,
  getMatches: () => Map<string, Match>,
  moveRateLimiter: { allow: (id: string, key: string) => boolean },
) {
  socket.on("play_move", async ({ gameId, card, move }: { gameId: string; card: string; move: string }) => {
    if (!moveRateLimiter.allow(socket.id, "play_move")) {
      socket.emit("move_error", { error: "Rate limit exceeded. Slow down." });
      return;
    }
    const match = getMatches().get(gameId);
    if (!match) return;
    const { game, white, black } = match;

    if (socket.id !== white.id && socket.id !== black.id) return;
    const color: Color = socket.id === white.id ? "white" : "black";
    if (game.getState().turn !== color) return;

    const result = game.playCard(card, move);
    if (result.success) {
      if (match.dbGameId && playerStore.isDbEnabled) {
        try {
          const { GameMoveRepository } = await import("@checkker/database");
          const state = game.getState();
          const moveHistory = state.moveHistory;
          const latest = moveHistory[moveHistory.length - 1];
          await GameMoveRepository.create({
            gameId: match.dbGameId,
            moveNumber: moveHistory.length,
            fen: state.fen,
            moveUci: move,
            san: latest?.move,
            cardRank: card.slice(0, -1),
            cardSuit: card.slice(-1),
            color,
          });
        } catch {
          // Non-fatal: game continues even if move persistence fails
        }
      }

      server.broadcastGamePublic(gameId);
      if (game.isOver()) {
        server.handleGameOverPublic(gameId);
        game.dispose();
      } else {
        server.sendCoachingTipPublic(match, socket.id).catch(() => {});
        server.sendSpectatorCommentPublic(match).catch(() => {});
      }
    } else {
      socket.emit("move_error", { error: result.error });
    }
  });

  socket.on("chat_message", ({ gameId, text }: { gameId: string; text: string }) => {
    const match = getMatches().get(gameId);
    if (!match) return;
    if (socket.id !== match.white.id && socket.id !== match.black.id) return;

    const profile = playerStore.getOrCreate(socket.id);
    const msg = {
      id: uuid(),
      senderId: socket.id,
      senderName: profile.displayName,
      text: text.slice(0, 200),
      timestamp: Date.now(),
    };
    match.chatHistory.push(msg);
    match.white.socket.emit("chat_message", msg);
    match.black.socket.emit("chat_message", msg);
  });

  socket.on("resign", ({ gameId }: { gameId: string }) => {
    const match = getMatches().get(gameId);
    if (!match) return;
    const { game, white, black } = match;
    if (socket.id !== white.id && socket.id !== black.id) return;
    const color: Color = socket.id === white.id ? "white" : "black";
    game.resign(color);
    server.broadcastGamePublic(gameId);
    server.handleGameOverPublic(gameId);
    game.dispose();
  });

  socket.on("rematch_request", ({ gameId }: { gameId: string }) => {
    const match = server.findEndedMatchPublic(gameId, socket.id);
    if (!match) return;
    match.rematchRequests.add(socket.id);
    const otherPlayer = socket.id === match.white.id ? match.black : match.white;
    otherPlayer.socket.emit("rematch_requested", { gameId });
    if (match.rematchRequests.has(match.white.id) && match.rematchRequests.has(match.black.id)) {
      server.endGamePublic(gameId);
      server.startGamePublic(match.black, match.white, match.tc, match.mode, match.difficulty, match.stake);
    }
  });

  socket.on("undo_move", ({ gameId: _gameId }: { gameId: string }) => {
    // Only allowed for bot games — handled by BotManager
  });
}
