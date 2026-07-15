import type {
  Card,
  Color,
  MoveRecord,
  GameResult,
  TimeControl,
  ScoredGame,
  MoveEvaluation,
  GameOdds,
  PlayerProfile,
  ChatMessage,
  PokerResult,
} from "@checkker/shared";

export type { MoveEvaluation, GameOdds, PlayerProfile, ChatMessage };

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
  bestMoves?: { white: MoveEvaluation[]; black: MoveEvaluation[] };
  odds?: GameOdds;
  playerProfile?: PlayerProfile;
  opponentProfile?: PlayerProfile;
  /** Live poker results for both sides (authoritative from server). */
  liveScores?: {
    whitePoker: PokerResult;
    blackPoker: PokerResult;
  };
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
  scores?: ScoredGame;
}
