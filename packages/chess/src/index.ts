import { Chess } from "chess.js";
import { cardToPiece, type Card, type PieceType } from "@checkker/shared";

export { Chess };
export type { PieceType };

export interface LegalMovesForCard {
  card: Card;
  piece: PieceType;
  moves: string[];
}

export function getLegalMovesForCard(game: Chess, card: Card): string[] {
  const piece = cardToPiece(card);
  const allMoves = game.moves({ verbose: true });

  if (piece === "wild") {
    return allMoves.map((m) => m.from + m.to + (m.promotion ?? ""));
  }

  const targetType = (
    piece === "pawn" ? "p" :
    piece === "king" ? "k" :
    piece === "queen" ? "q" :
    piece === "rook" ? "r" :
    piece === "bishop" ? "b" :
    piece === "knight" ? "n" :
    null
  );
  if (!targetType) return [];

  return allMoves
    .filter((move) => move.piece === targetType)
    .map((m) => m.from + m.to + (m.promotion ?? ""));
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
