import { Chess, Move } from "chess.js";

interface ChessInternal {
  _moves(opts?: { legal?: boolean; piece?: string; square?: string }): any[];
  _makeMove(move: any): void;
}

function internal(game: Chess): ChessInternal {
  return game as unknown as ChessInternal;
}

/** Pseudo-legal moves: ignores king safety, so a move can leave/put the mover's king in check. */
export function pseudoLegalMoves(
  game: Chess,
  opts: { piece?: string; square?: string } = {}
): Move[] {
  const raw = internal(game)._moves({ legal: false, ...opts });
  return raw.map((m) => new Move(game, m));
}

/** Applies a pseudo-legal Move directly, bypassing chess.js's move() legality re-check. */
export function applyPseudoLegalMove(game: Chess, move: Move): void {
  // Move doesn't retain the raw internal move object, so re-derive it the same way
  // pseudoLegalMoves did, then filter down to the one matching this Move's lan+promotion.
  const raw = internal(game)._moves({ legal: false });
  const match = raw.find(
    (m) => (m.promotion ?? "") === (move.promotion ?? "") &&
      new Move(game, m).lan === move.lan
  );
  if (!match) throw new Error(`Could not re-derive internal move for ${move.lan}`);
  internal(game)._makeMove(match);
}
