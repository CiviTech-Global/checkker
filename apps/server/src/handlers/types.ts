import type { Socket } from "socket.io";
import type { GameEngine } from "../GameEngine";
import type { BotDifficulty, TimeControl, ChatMessage, GameMode, StakeLevel } from "@checkker/shared";
import type { BetSetup } from "../betting/BetManager";

export interface Player {
  id: string;
  socket: Socket;
  rating: number;
  casual: boolean;
  walletAddress?: string;
  userId?: string;
  isBot?: boolean;
}

export interface Match {
  game: GameEngine;
  white: Player;
  black: Player;
  tc: TimeControl;
  mode: GameMode;
  difficulty: BotDifficulty;
  stake: StakeLevel;
  rematchRequests: Set<string>;
  chatHistory: ChatMessage[];
  betSetup: BetSetup | null;
  dbGameId?: string;
}

export interface PendingBetGame {
  white: Player;
  black: Player;
  tc: TimeControl;
  mode: GameMode;
  difficulty: BotDifficulty;
  betSetup: BetSetup;
  whiteDeposited: boolean;
  blackDeposited: boolean;
}

export interface PrivateInvite {
  inviteId: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  tc: TimeControl;
  createdAt: number;
}

export interface AuthEntry {
  walletAddress?: string;
  userId: string;
  isGuest?: boolean;
}

export const INVITE_TTL_MS = 5 * 60 * 1000;
