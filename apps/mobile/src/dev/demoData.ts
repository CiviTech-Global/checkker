/**
 * Demo data generator for dev tools.
 *
 * Creates realistic profile stats, game history, and fake leaderboard
 * entries so developers can test UI without playing dozens of games.
 */

import { AVATARS } from "@checkker/shared";
import {
  updateLocalProfile,
  recordOfflineGame,
  syncOnlineStats,
  resetStats,
  clearGameHistory,
  writeStats,
  type GameMode,
  type GameOutcome,
  type GameResultType,
} from "../db/LocalDatabase";

/* ── Leaderboard entry shape (matches leaderboard screen) ──────────── */

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CHESS_USERNAMES = [
  "GrandMaster_42", "KnightRider", "QueenGambit", "PawnStorm99",
  "BishopSlayer", "RookEndgame", "CheckMateKing", "DarkSquares",
  "Sicilian_Def", "CastleCrusher", "EnPassantPro", "ForkMaster",
  "Fianchetto77", "BlitzBandit", "ZugzwangZen", "TacticsNinja",
  "KingsIndian", "SlavDefender", "Gambit_Queen", "PinAndWin",
  "DoubleCheck", "Tempo_Thief", "Isolated_Pawn", "OpenFile_99",
  "Skewer_King",
];

const OPPONENT_NAMES = [
  "AlphaBot", "ChessMaster", "Rookie_22", "BlitzKing",
  "QuietMoves", "Attacker99", "EndgamePro", "OpeningGuru",
  "TacticFan", "PawnPusher", "KnightHop", "BishopPair",
];

const MODES: GameMode[] = ["bot", "lan", "ranked", "casual"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const RESULT_TYPES: GameResultType[] = ["checkmate", "resignation", "timeout", "draw"];

/* ── Create Demo Data ──────────────────────────────────────────────── */

export function createDemoData(): LeaderboardEntry[] {
  // 1. Set profile name
  updateLocalProfile({ offlineName: "DemoPlayer" });

  // 2. Clear existing data first
  clearGameHistory();
  resetStats();

  // 3. Generate ~30 game history entries with varied data
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 30; i++) {
    const outcomes: GameOutcome[] = ["win", "win", "win", "loss", "loss", "draw"];
    const outcome = pick(outcomes); // ~50% win, ~33% loss, ~17% draw
    const mode = pick(MODES);
    const difficulty = mode === "bot" ? pick(DIFFICULTIES) : undefined;

    const resultType: GameResultType =
      outcome === "draw" ? "draw" : pick(["checkmate", "resignation", "timeout"] as GameResultType[]);

    recordOfflineGame(outcome, {
      mode,
      difficulty,
      resultType,
      opponentName: mode === "bot" ? undefined : pick(OPPONENT_NAMES),
      moveCount: randInt(12, 65),
    });
  }

  // 4. Override stats to desired values (recordOfflineGame already set offline stats,
  //    but we want specific numbers + online stats)
  writeStats({
    offGamesPlayed: 30,
    offWins: 18,
    offLosses: 8,
    offDraws: 4,
    offCurrentStreak: 5,
    offBestStreak: 7,
    offRating: 1450,
    onGamesPlayed: 20,
    onWins: 12,
    onLosses: 5,
    onDraws: 3,
    onCurrentStreak: 3,
    onBestStreak: 5,
    onRating: 1620,
  });

  // 5. Generate 25 fake leaderboard entries
  const leaderboard: LeaderboardEntry[] = CHESS_USERNAMES.map((username, i) => {
    const rating = randInt(800, 2400);
    // Higher rating = higher win rate
    const winPct = Math.min(0.85, Math.max(0.25, (rating - 600) / 2400));
    const gamesPlayed = randInt(15, 120);
    const wins = Math.round(gamesPlayed * winPct);
    const draws = Math.round(gamesPlayed * randInt(5, 15) / 100);
    const losses = gamesPlayed - wins - draws;

    return {
      id: `demo_${i}`,
      username,
      avatarId: pick(AVATARS).id,
      rating,
      wins,
      losses: Math.max(0, losses),
      draws,
      gamesPlayed,
    };
  });

  // Sort by rating descending
  leaderboard.sort((a, b) => b.rating - a.rating);

  return leaderboard;
}

/* ── Delete Demo Data ──────────────────────────────────────────────── */

export function deleteDemoData(): void {
  // Reset stats to zeros
  resetStats();

  // Clear game history
  clearGameHistory();

  // Reset profile name back to random "Player-XXXX"
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  updateLocalProfile({ offlineName: `Player-${suffix}` });
}
