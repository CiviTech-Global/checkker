import type { Card } from "./cards";
import type { PokerResult } from "./poker";

export type TimeControl = "bullet" | "blitz" | "rapid" | "classical";

export const TIME_CONTROL_SECONDS: Record<TimeControl, number> = {
  bullet: 180,
  blitz: 420,
  rapid: 900,
  classical: 1500,
};

export type GameResult =
  | { type: "checkmate"; winner: Color }
  | { type: "draw"; reason: "stalemate" | "threefold" | "fiftyMove" | "insufficientMaterial" }
  | { type: "resignation"; winner: Color }
  | { type: "timeout"; winner: Color }
  | { type: "deckExhausted" };

export const CHESS_SCORES = {
  checkmate: { winner: 30, loser: 0 },
  draw: { each: 10 },
  resignation: { winner: 25, loser: 0 },
  timeout: { winner: 25, loser: 0 },
  deckExhausted: { each: 0 },
} as const;

export type Color = "white" | "black";

export interface PlayerState {
  color: Color;
  hand: Card[];
  scorePile: Card[];
  timeRemainingMs: number;
  rating: number;
}

export interface GameState {
  id: string;
  fen: string;
  turn: Color;
  white: PlayerState;
  black: PlayerState;
  drawPile: Card[];
  deadPile: Card[];
  moveHistory: MoveRecord[];
  result: GameResult | null;
  timeControl: TimeControl;
}

export interface MoveRecord {
  move: string;
  card: Card;
  color: Color;
  captured?: { type: string; color: Color };
  bonusCards?: number;
}

export interface ScoredGame {
  game: GameState;
  whitePoker: PokerResult;
  blackPoker: PokerResult;
  whiteTotal: number;
  blackTotal: number;
  winner: "white" | "black" | "draw";
}
