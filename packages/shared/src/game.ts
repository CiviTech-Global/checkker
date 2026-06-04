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

export type BotDifficulty = "beginner" | "intermediate" | "advanced" | "master";

export type BotPersonality = "aggressive" | "defensive" | "tricky" | "classical";

export interface BotConfig {
  difficulty: BotDifficulty;
  personality?: BotPersonality;
  playAsColor?: Color;
}

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
  whitePoker: PokerResult;
  blackPoker: PokerResult;
  whiteTotal: number;
  blackTotal: number;
  winner: "white" | "black" | "draw";
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number; // positive=wins, negative=losses
  bestStreak: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface GameOdds {
  whiteWinPct: number;
  blackWinPct: number;
  drawPct: number;
}

export interface MoveEvaluation {
  cardId: string;
  move: string;
  score: number;
}

export interface SpectateConfig {
  whiteDifficulty: BotDifficulty;
  blackDifficulty: BotDifficulty;
}

export function scoreGame(
  result: GameResult,
  whitePoker: PokerResult,
  blackPoker: PokerResult,
): ScoredGame {
  let whiteChess = 0;
  let blackChess = 0;

  switch (result.type) {
    case "checkmate":
    case "resignation":
    case "timeout": {
      const scores = CHESS_SCORES[result.type];
      whiteChess = result.winner === "white" ? scores.winner : scores.loser;
      blackChess = result.winner === "black" ? scores.winner : scores.loser;
      break;
    }
    case "draw": {
      whiteChess = CHESS_SCORES.draw.each;
      blackChess = CHESS_SCORES.draw.each;
      break;
    }
    case "deckExhausted": {
      whiteChess = CHESS_SCORES.deckExhausted.each;
      blackChess = CHESS_SCORES.deckExhausted.each;
      break;
    }
  }

  const whiteTotal = whiteChess + whitePoker.total;
  const blackTotal = blackChess + blackPoker.total;

  return {
    whitePoker,
    blackPoker,
    whiteTotal,
    blackTotal,
    winner: whiteTotal > blackTotal ? "white" : blackTotal > whiteTotal ? "black" : "draw",
  };
}
