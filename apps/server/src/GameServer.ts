import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { GameEngine } from "./GameEngine";
import type { TimeControl, Color } from "@gambit/shared";

interface Player {
  id: string;
  socket: Socket;
  rating: number;
}

interface Match {
  game: GameEngine;
  white: Player;
  black: Player;
}

export class GameServer {
  private io: SocketServer;
  private queue: Array<{ player: Player; tc: TimeControl }> = [];
  private matches = new Map<string, Match>();

  constructor(io: SocketServer) {
    this.io = io;
  }

  handleConnection(socket: Socket): void {
    socket.on("join_queue", ({ rating, tc }: { rating: number; tc: TimeControl }) => {
      const player: Player = { id: socket.id, socket, rating };
      this.addToQueue(player, tc);
    });

    socket.on("play_move", ({ gameId, card, move }: { gameId: string; card: string; move: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      const { game, white, black } = match;

      if (socket.id !== white.id && socket.id !== black.id) return;
      const color: Color = socket.id === white.id ? "white" : "black";
      if (game.getState().turn !== color) return;

      const result = game.playCard(card, move);
      if (result.success) {
        this.broadcastGame(gameId);
        if (game.isOver()) {
          this.endGame(gameId);
        }
      } else {
        socket.emit("move_error", { error: result.error });
      }
    });

    socket.on("resign", ({ gameId }: { gameId: string }) => {
      const match = this.matches.get(gameId);
      if (!match) return;
      const { game, white, black } = match;
      const color: Color = socket.id === white.id ? "white" : "black";
      game.resign(color);
      this.broadcastGame(gameId);
      this.endGame(gameId);
    });

    socket.on("disconnect", () => {
      this.removeFromQueue(socket.id);
      for (const [gameId, match] of this.matches) {
        if (match.white.id === socket.id || match.black.id === socket.id) {
          const color: Color = match.white.id === socket.id ? "white" : "black";
          match.game.timeOut(color);
          this.broadcastGame(gameId);
          this.endGame(gameId);
        }
      }
    });
  }

  private addToQueue(player: Player, tc: TimeControl): void {
    const opponent = this.queue.find((q) => q.tc === tc && Math.abs(q.player.rating - player.rating) <= 150);
    if (opponent) {
      this.queue = this.queue.filter((q) => q !== opponent);
      this.startGame(opponent.player, player, tc);
    } else {
      this.queue.push({ player, tc });
    }
  }

  private startGame(p1: Player, p2: Player, tc: TimeControl): void {
    const game = new GameEngine(p1.rating, p2.rating, tc);

    const match: Match = {
      game,
      white: p1,
      black: p2,
    };

    this.matches.set(game.id, match);

    p1.socket.emit("game_start", {
      ...game.getPublicState("white"),
      color: "white",
      gameId: game.id,
    });

    p2.socket.emit("game_start", {
      ...game.getPublicState("black"),
      color: "black",
      gameId: game.id,
    });
  }

  private broadcastGame(gameId: string): void {
    const match = this.matches.get(gameId);
    if (!match) return;
    const { game, white, black } = match;
    white.socket.emit("game_update", game.getPublicState("white"));
    black.socket.emit("game_update", game.getPublicState("black"));

    if (game.getResult()) {
      white.socket.emit("game_over", { result: game.getResult() });
      black.socket.emit("game_over", { result: game.getResult() });
    }
  }

  private endGame(gameId: string): void {
    this.matches.delete(gameId);
  }

  private removeFromQueue(socketId: string): void {
    this.queue = this.queue.filter((q) => q.player.id !== socketId);
  }
}
