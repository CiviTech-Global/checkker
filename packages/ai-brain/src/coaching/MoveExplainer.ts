import { Chess } from "chess.js";
import type { Color } from "@checkker/shared";
import { createEngine } from "../engine/factory";
import type { MoveExplanation } from "../types";

const PIECE_NAMES: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export class MoveExplainer {
  private engine = createEngine("heuristic");

  async explainMove(fen: string, move: string, cardId: string, color: Color): Promise<MoveExplanation> {
    const chess = new Chess(fen);
    const fromSq = move.slice(0, 2);
    const toSq = move.slice(2, 4);
    const promotion = move.slice(4, 5);

    const movingPiece = chess.get(fromSq as any);
    const capturedPiece = chess.get(toSq as any);

    let result;
    try {
      result = chess.move(move);
    } catch {
      return { text: `${move} is not a legal move.`, type: "warning", priority: 0 };
    }

    const evalBefore = (await this.engine.evaluate(fen)).score;
    const evalAfter = (await this.engine.evaluate(chess.fen())).score;

    const evalDelta = color === "white" ? evalAfter - evalBefore : evalBefore - evalAfter;
    const pieceName = movingPiece ? PIECE_NAMES[movingPiece.type] ?? "piece" : "piece";

    if (chess.isCheckmate()) {
      return {
        text: `Checkmate! The ${pieceName} delivers the final blow. Brilliant!`,
        type: "tactical",
        priority: 10,
      };
    }

    if (chess.isCheck()) {
      return {
        text: `Check! The ${pieceName} moves to ${toSq} attacking the king.`,
        type: "tactical",
        priority: 8,
      };
    }

    const cardRank = cardId.slice(0, -1);
    const highCardNames: Record<string, string> = {
      A: "an Ace (wild)", K: "a King", Q: "a Queen", J: "a Knight",
      "10": "a Rook (10)",
    };
    const cardDesc = highCardNames[cardRank] ?? `a ${cardRank} (${pieceName})`;

    if (capturedPiece) {
      const capturedName = PIECE_NAMES[capturedPiece.type] ?? "piece";
      const captureDesc = result.captured ? `captures a ${capturedName}` : "captures a piece";

      if (evalDelta > 100) {
        return {
          text: `Excellent capture! The ${pieceName} ${captureDesc} on ${toSq} using ${cardDesc}. Chess eval improves by ${Math.round(evalDelta / 100)} pawns.`,
          type: "tactical",
          priority: 9,
        };
      }

      if (cardRank === "A") {
        return {
          text: `The Ace (wild) ${captureDesc} on ${toSq}. Remember, Aces don't score poker points — good use as a wild card.`,
          type: "card_economy",
          priority: 6,
        };
      }

      return {
        text: `The ${pieceName} ${captureDesc} on ${toSq} using ${cardDesc}.`,
        type: "tactical",
        priority: 5,
      };
    }

    const movingToCenter = ["d4", "d5", "e4", "e5"].includes(toSq);
    if (movingPiece && (movingPiece.type === "n" || movingPiece.type === "b") && movingToCenter) {
      return {
        text: `Developing the ${pieceName} to the center (${toSq}) using ${cardDesc}. Controls key central squares.`,
        type: "positional",
        priority: 7,
      };
    }

    if (movingPiece && movingPiece.type === "k" && (move === "e1g1" || move === "e8g8")) {
      return {
        text: `Castling kingside with ${cardDesc}. King is safer, rook activates. Solid move.`,
        type: "positional",
        priority: 7,
      };
    }

    if (movingPiece && movingPiece.type === "k" && (move === "e1c1" || move === "e8c8")) {
      return {
        text: `Castling queenside with ${cardDesc}. King finds safety, rook centralizes.`,
        type: "positional",
        priority: 7,
      };
    }

    const highCards = ["A", "K", "Q", "J", "10"];
    if (highCards.includes(cardRank)) {
      return {
        text: `Moving ${pieceName} with ${cardDesc}. This is a high-value card — consider if a cheaper card could achieve the same.`,
        type: "card_economy",
        priority: 4,
      };
    }

    if (evalDelta > 50) {
      return {
        text: `Strong positional improvement with ${pieceName} to ${toSq}. Evaluation improved by ${Math.round(evalDelta / 100)} pawns.`,
        type: "positional",
        priority: 6,
      };
    }

    if (evalDelta < -50) {
      return {
        text: `The ${pieceName} moves to ${toSq} — this may weaken your position. Evaluation dropped by ${Math.round(Math.abs(evalDelta) / 100)} pawns.`,
        type: "warning",
        priority: 3,
      };
    }

    return {
      text: `${pieceName} moves from ${fromSq} to ${toSq} using ${cardDesc}.`,
      type: "strategy",
      priority: 1,
    };
  }
}
