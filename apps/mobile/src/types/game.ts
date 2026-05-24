import type { Card, Color, MoveRecord, GameResult, TimeControl, PlayerState } from "@gambit/shared";

export interface GameClientState {
  id: string;
  fen: string;
  turn: Color;
  color: Color;
  hand: Card[];
  scorePile: Card[];
  timeRemainingMs: number;
  opponent: {
    hand: (null)[];
    scorePile: Card[];
    timeRemainingMs: number;
  };
  drawPileCount: number;
  moveHistory: MoveRecord[];
  result: GameResult | null;
  timeControl: TimeControl;
}

export interface GameStartPayload extends GameClientState {
  gameId: string;
}

export type GameUpdatePayload = GameClientState;

export interface MoveErrorPayload {
  error: string;
}

export interface GameOverPayload {
  result: GameResult;
}
