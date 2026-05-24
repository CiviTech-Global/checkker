import { Chess } from "chess.js";
import { cardToPiece, type Card, type PieceType, type Color } from "@gambit/shared";

export { Chess };
export type { PieceType };

export interface LegalMovesForCard {
  card: Card;
  piece: PieceType;
  moves: string[];
}

const FILE_LETTERS = new Set(["a", "b", "c", "d", "e", "f", "g", "h"]);

export function getLegalMovesForCard(game: Chess, card: Card): string[] {
  const piece = cardToPiece(card);
  if (piece === "wild") {
    return game.moves({ verbose: false });
  }
  return game.moves({ verbose: false }).filter((move) => {
    if (piece === "pawn") {
      return FILE_LETTERS.has(move[0]);
    }
    if (move === "O-O" || move === "O-O-O") {
      return piece === "king";
    }
    return move[0] === getPieceChar(piece);
  });
}

export function getLegalMovesForHand(
  game: Chess,
  hand: Card[]
): LegalMovesForCard[] {
  return hand.map((card) => ({
    card,
    piece: cardToPiece(card),
    moves: getLegalMovesForCard(game, card),
  }));
}

function getPieceChar(piece: PieceType): string | undefined {
  switch (piece) {
    case "king": return "K";
    case "queen": return "Q";
    case "rook": return "R";
    case "bishop": return "B";
    case "knight": return "N";
    case "pawn": return "";
    case "wild": return undefined;
  }
}

export function getCaptureBonus(capturedPiece: string, isCheck: boolean): number {
  let bonus = 1;
  switch (capturedPiece) {
    case "q": bonus += 2; break;
    case "r": bonus += 1; break;
    case "n":
    case "b": bonus += 1; break;
  }
  if (isCheck) bonus += 1;
  return bonus;
}

export function isCheck(game: Chess): boolean {
  return game.isCheck();
}

export function isCheckmate(game: Chess): boolean {
  return game.isCheckmate();
}

export function isDraw(game: Chess): boolean {
  return game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() ||
    game.isInsufficientMaterial();
}
