import type { Socket } from "socket.io";
import type { Match } from "./types";
import type { Color, BotDifficulty } from "@checkker/shared";
import { brain } from "../bot/evaluators";

export function registerCoachingHandlers(
  socket: Socket,
  getMatches: () => Map<string, Match>,
) {
  socket.on("request_coaching_tip", async ({ gameId }: { gameId: string }) => {
    const match = getMatches().get(gameId);
    if (!match) return;
    if (socket.id !== match.white.id && socket.id !== match.black.id) return;

    const color: Color = socket.id === match.white.id ? "white" : "black";
    const state = match.game.getPublicState(color) as any;

    const tip = await brain.getCoachingTip(state.fen, state.hand, state.scorePile, color, state.moveHistory?.length ?? 0);
    if (tip) {
      socket.emit("coaching_tip", tip);
    }
  });

  socket.on("explain_move", async ({ fen, move, cardId, color }: { fen: string; move: string; cardId: string; color: Color }) => {
    const explanation = await brain.explainMoveLLM(fen, move, cardId, color);
    socket.emit("move_explanation", explanation);
  });

  socket.on("generate_puzzle", async ({ difficulty }: { difficulty?: BotDifficulty }) => {
    const { Chess } = await import("@checkker/chess");
    const playout = new Chess();
    const plies = 10 + Math.floor(Math.random() * 20);
    for (let i = 0; i < plies; i++) {
      const moves = playout.moves();
      if (moves.length === 0 || playout.isGameOver()) break;
      playout.move(moves[Math.floor(Math.random() * moves.length)]);
    }
    const color = playout.turn() === "w" ? "white" : "black";
    const puzzle = await brain.generatePuzzle(playout.fen(), color, difficulty ?? "intermediate");
    if (puzzle) {
      socket.emit("puzzle", { puzzle });
    }
  });
}
