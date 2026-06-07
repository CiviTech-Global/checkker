/**
 * Local persistence layer.
 *
 * Uses expo-sqlite on native (iOS/Android) and localStorage on web.
 * All public functions share the same signature regardless of backend.
 */

import { Platform } from "react-native";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface LocalProfile {
  offlineName: string;
  avatarId: string;
  walletAddress: string | null;
  onlineName: string | null;
}

export interface StatsRow {
  offGamesPlayed: number;
  offWins: number;
  offLosses: number;
  offDraws: number;
  offCurrentStreak: number;
  offBestStreak: number;
  offRating: number;
  onGamesPlayed: number;
  onWins: number;
  onLosses: number;
  onDraws: number;
  onCurrentStreak: number;
  onBestStreak: number;
  onRating: number;
}

export type GameMode = "bot" | "lan" | "ranked" | "casual";
export type GameOutcome = "win" | "loss" | "draw";
export type GameResultType = "checkmate" | "resignation" | "timeout" | "draw" | "deckExhausted";

export interface GameHistoryRow {
  id: number;
  mode: GameMode;
  difficulty: string | null;
  result: GameOutcome;
  resultType: GameResultType | null;
  opponentName: string | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  moveCount: number;
  playedAt: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function randomAlphanumeric(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_PROFILE: LocalProfile = {
  offlineName: "Player-" + randomAlphanumeric(4),
  avatarId: "king_white",
  walletAddress: null,
  onlineName: null,
};

const DEFAULT_STATS: StatsRow = {
  offGamesPlayed: 0, offWins: 0, offLosses: 0, offDraws: 0,
  offCurrentStreak: 0, offBestStreak: 0, offRating: 1000,
  onGamesPlayed: 0, onWins: 0, onLosses: 0, onDraws: 0,
  onCurrentStreak: 0, onBestStreak: 0, onRating: 1000,
};

const isWeb = Platform.OS === "web";

/* ═══════════════════════════════════════════════════════════════════════
 *  WEB BACKEND — localStorage
 * ═══════════════════════════════════════════════════════════════════════ */

const LS_PROFILE = "checkker_profile";
const LS_STATS = "checkker_stats";
const LS_HISTORY = "checkker_history";

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently fail */ }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  NATIVE BACKEND — expo-sqlite (lazy loaded to avoid web crash)
 * ═══════════════════════════════════════════════════════════════════════ */

let _db: any = null;

function getDb(): any {
  if (_db) return _db;
  // Dynamic require so the module is never loaded on web
  const SQLite = require("expo-sqlite");
  _db = SQLite.openDatabaseSync("checkker.db");
  return _db;
}

/* ═══════════════════════════════════════════════════════════════════════
 *  PUBLIC API
 * ═══════════════════════════════════════════════════════════════════════ */

export function initLocalDb(): void {
  if (isWeb) {
    // Seed defaults if missing
    if (!localStorage.getItem(LS_PROFILE)) {
      lsWrite(LS_PROFILE, DEFAULT_PROFILE);
    }
    if (!localStorage.getItem(LS_STATS)) {
      lsWrite(LS_STATS, DEFAULT_STATS);
    }
    if (!localStorage.getItem(LS_HISTORY)) {
      lsWrite(LS_HISTORY, []);
    }
    return;
  }

  // Native: create SQLite tables
  const d = getDb();

  d.execSync(`
    CREATE TABLE IF NOT EXISTS local_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      offline_name TEXT NOT NULL,
      avatar_id TEXT NOT NULL DEFAULT 'king_white',
      wallet_address TEXT,
      online_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  d.execSync(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      off_games_played INTEGER DEFAULT 0,
      off_wins INTEGER DEFAULT 0,
      off_losses INTEGER DEFAULT 0,
      off_draws INTEGER DEFAULT 0,
      off_current_streak INTEGER DEFAULT 0,
      off_best_streak INTEGER DEFAULT 0,
      off_rating INTEGER DEFAULT 1000,
      on_games_played INTEGER DEFAULT 0,
      on_wins INTEGER DEFAULT 0,
      on_losses INTEGER DEFAULT 0,
      on_draws INTEGER DEFAULT 0,
      on_current_streak INTEGER DEFAULT 0,
      on_best_streak INTEGER DEFAULT 0,
      on_rating INTEGER DEFAULT 1000
    );
  `);

  d.execSync(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      difficulty TEXT,
      result TEXT NOT NULL,
      result_type TEXT,
      opponent_name TEXT,
      rating_before INTEGER,
      rating_after INTEGER,
      move_count INTEGER DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const profileRow = d.getFirstSync("SELECT id FROM local_profile LIMIT 1");
  if (!profileRow) {
    const name = "Player-" + randomAlphanumeric(4);
    d.runSync(
      "INSERT INTO local_profile (id, offline_name, avatar_id) VALUES (1, ?, 'king_white')",
      [name],
    );
  }

  const statsRow = d.getFirstSync("SELECT id FROM stats LIMIT 1");
  if (!statsRow) {
    d.runSync("INSERT INTO stats (id) VALUES (1)");
  }
}

/* ── Profile ─────────────────────────────────────────────────────────── */

export function getLocalProfile(): LocalProfile {
  if (isWeb) {
    return lsRead<LocalProfile>(LS_PROFILE, DEFAULT_PROFILE);
  }

  const d = getDb();
  const row: {
    offline_name: string;
    avatar_id: string;
    wallet_address: string | null;
    online_name: string | null;
  } | null = d.getFirstSync("SELECT offline_name, avatar_id, wallet_address, online_name FROM local_profile WHERE id = 1");

  if (!row) {
    return { offlineName: "Player", avatarId: "king_white", walletAddress: null, onlineName: null };
  }
  return {
    offlineName: row.offline_name,
    avatarId: row.avatar_id,
    walletAddress: row.wallet_address,
    onlineName: row.online_name,
  };
}

export function updateLocalProfile(
  fields: Partial<{ offlineName: string; avatarId: string; walletAddress: string; onlineName: string }>,
): void {
  if (isWeb) {
    const current = lsRead<LocalProfile>(LS_PROFILE, DEFAULT_PROFILE);
    lsWrite(LS_PROFILE, { ...current, ...fields });
    return;
  }

  const d = getDb();
  const sets: string[] = [];
  const vals: (string | null)[] = [];

  if (fields.offlineName !== undefined) { sets.push("offline_name = ?"); vals.push(fields.offlineName); }
  if (fields.avatarId !== undefined) { sets.push("avatar_id = ?"); vals.push(fields.avatarId); }
  if (fields.walletAddress !== undefined) { sets.push("wallet_address = ?"); vals.push(fields.walletAddress); }
  if (fields.onlineName !== undefined) { sets.push("online_name = ?"); vals.push(fields.onlineName); }

  if (sets.length === 0) return;
  d.runSync(`UPDATE local_profile SET ${sets.join(", ")} WHERE id = 1`, vals);
}

/* ── Stats ───────────────────────────────────────────────────────────── */

export function getStats(): StatsRow {
  if (isWeb) {
    return lsRead<StatsRow>(LS_STATS, DEFAULT_STATS);
  }

  const d = getDb();
  const row: {
    off_games_played: number;
    off_wins: number;
    off_losses: number;
    off_draws: number;
    off_current_streak: number;
    off_best_streak: number;
    off_rating: number;
    on_games_played: number;
    on_wins: number;
    on_losses: number;
    on_draws: number;
    on_current_streak: number;
    on_best_streak: number;
    on_rating: number;
  } | null = d.getFirstSync("SELECT * FROM stats WHERE id = 1");

  if (!row) return { ...DEFAULT_STATS };

  return {
    offGamesPlayed: row.off_games_played,
    offWins: row.off_wins,
    offLosses: row.off_losses,
    offDraws: row.off_draws,
    offCurrentStreak: row.off_current_streak,
    offBestStreak: row.off_best_streak,
    offRating: row.off_rating,
    onGamesPlayed: row.on_games_played,
    onWins: row.on_wins,
    onLosses: row.on_losses,
    onDraws: row.on_draws,
    onCurrentStreak: row.on_current_streak,
    onBestStreak: row.on_best_streak,
    onRating: row.on_rating,
  };
}

export function recordOfflineGame(
  outcome: GameOutcome,
  details: {
    mode: GameMode;
    difficulty?: string;
    resultType?: GameResultType;
    opponentName?: string;
    moveCount?: number;
  },
): StatsRow {
  const current = getStats();

  // Compute streaks
  let newStreak = current.offCurrentStreak;
  if (outcome === "win") {
    newStreak = newStreak >= 0 ? newStreak + 1 : 1;
  } else if (outcome === "loss") {
    newStreak = newStreak <= 0 ? newStreak - 1 : -1;
  } else {
    newStreak = 0;
  }
  const newBestStreak = Math.max(current.offBestStreak, newStreak);

  if (isWeb) {
    const updated: StatsRow = {
      ...current,
      offGamesPlayed: current.offGamesPlayed + 1,
      offWins: current.offWins + (outcome === "win" ? 1 : 0),
      offLosses: current.offLosses + (outcome === "loss" ? 1 : 0),
      offDraws: current.offDraws + (outcome === "draw" ? 1 : 0),
      offCurrentStreak: newStreak,
      offBestStreak: newBestStreak,
    };
    lsWrite(LS_STATS, updated);

    // Append to history
    const history = lsRead<GameHistoryRow[]>(LS_HISTORY, []);
    history.unshift({
      id: Date.now(),
      mode: details.mode,
      difficulty: details.difficulty ?? null,
      result: outcome,
      resultType: details.resultType ?? null,
      opponentName: details.opponentName ?? null,
      ratingBefore: current.offRating,
      ratingAfter: current.offRating,
      moveCount: details.moveCount ?? 0,
      playedAt: new Date().toISOString(),
    });
    // Keep max 100 entries
    if (history.length > 100) history.length = 100;
    lsWrite(LS_HISTORY, history);

    return updated;
  }

  // Native: SQLite
  const d = getDb();

  d.runSync(
    `UPDATE stats SET
      off_games_played = off_games_played + 1,
      off_wins = off_wins + ?,
      off_losses = off_losses + ?,
      off_draws = off_draws + ?,
      off_current_streak = ?,
      off_best_streak = ?
    WHERE id = 1`,
    [
      outcome === "win" ? 1 : 0,
      outcome === "loss" ? 1 : 0,
      outcome === "draw" ? 1 : 0,
      newStreak,
      newBestStreak,
    ],
  );

  d.runSync(
    `INSERT INTO game_history (mode, difficulty, result, result_type, opponent_name, rating_before, rating_after, move_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      details.mode,
      details.difficulty ?? null,
      outcome,
      details.resultType ?? null,
      details.opponentName ?? null,
      current.offRating,
      current.offRating,
      details.moveCount ?? 0,
    ],
  );

  return getStats();
}

export function syncOnlineStats(serverStats: {
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  currentStreak?: number;
  bestStreak?: number;
  rating?: number;
}): StatsRow {
  if (isWeb) {
    const current = lsRead<StatsRow>(LS_STATS, DEFAULT_STATS);
    const updated: StatsRow = {
      ...current,
      onGamesPlayed: serverStats.gamesPlayed ?? 0,
      onWins: serverStats.wins ?? 0,
      onLosses: serverStats.losses ?? 0,
      onDraws: serverStats.draws ?? 0,
      onCurrentStreak: serverStats.currentStreak ?? 0,
      onBestStreak: serverStats.bestStreak ?? 0,
      onRating: serverStats.rating ?? 1000,
    };
    lsWrite(LS_STATS, updated);
    return updated;
  }

  const d = getDb();
  d.runSync(
    `UPDATE stats SET
      on_games_played = ?,
      on_wins = ?,
      on_losses = ?,
      on_draws = ?,
      on_current_streak = ?,
      on_best_streak = ?,
      on_rating = ?
    WHERE id = 1`,
    [
      serverStats.gamesPlayed ?? 0,
      serverStats.wins ?? 0,
      serverStats.losses ?? 0,
      serverStats.draws ?? 0,
      serverStats.currentStreak ?? 0,
      serverStats.bestStreak ?? 0,
      serverStats.rating ?? 1000,
    ],
  );
  return getStats();
}

/* ── Reset / Clear (used by dev tools) ────────────────────────────────── */

export function resetStats(): StatsRow {
  if (isWeb) {
    lsWrite(LS_STATS, DEFAULT_STATS);
    return { ...DEFAULT_STATS };
  }

  const d = getDb();
  d.runSync(
    `UPDATE stats SET
      off_games_played=0, off_wins=0, off_losses=0, off_draws=0,
      off_current_streak=0, off_best_streak=0, off_rating=1000,
      on_games_played=0, on_wins=0, on_losses=0, on_draws=0,
      on_current_streak=0, on_best_streak=0, on_rating=1000
    WHERE id = 1`,
  );
  return { ...DEFAULT_STATS };
}

export function clearGameHistory(): void {
  if (isWeb) {
    lsWrite(LS_HISTORY, []);
    return;
  }

  const d = getDb();
  d.runSync("DELETE FROM game_history");
}

export function writeStats(stats: StatsRow): void {
  if (isWeb) {
    lsWrite(LS_STATS, stats);
    return;
  }

  const d = getDb();
  d.runSync(
    `UPDATE stats SET
      off_games_played=?, off_wins=?, off_losses=?, off_draws=?,
      off_current_streak=?, off_best_streak=?, off_rating=?,
      on_games_played=?, on_wins=?, on_losses=?, on_draws=?,
      on_current_streak=?, on_best_streak=?, on_rating=?
    WHERE id = 1`,
    [
      stats.offGamesPlayed, stats.offWins, stats.offLosses, stats.offDraws,
      stats.offCurrentStreak, stats.offBestStreak, stats.offRating,
      stats.onGamesPlayed, stats.onWins, stats.onLosses, stats.onDraws,
      stats.onCurrentStreak, stats.onBestStreak, stats.onRating,
    ],
  );
}

/* ── Game History ─────────────────────────────────────────────────────── */

export function getGameHistory(
  filter?: { mode?: GameMode | GameMode[] },
  limit: number = 20,
): GameHistoryRow[] {
  if (isWeb) {
    let history = lsRead<GameHistoryRow[]>(LS_HISTORY, []);

    if (filter?.mode) {
      const modes = Array.isArray(filter.mode) ? filter.mode : [filter.mode];
      history = history.filter((h) => modes.includes(h.mode));
    }

    return history.slice(0, limit);
  }

  // Native: SQLite
  const d = getDb();
  let sql = "SELECT * FROM game_history";
  const params: any[] = [];

  if (filter?.mode) {
    if (Array.isArray(filter.mode)) {
      const placeholders = filter.mode.map(() => "?").join(", ");
      sql += ` WHERE mode IN (${placeholders})`;
      params.push(...filter.mode);
    } else {
      sql += " WHERE mode = ?";
      params.push(filter.mode);
    }
  }

  sql += " ORDER BY played_at DESC LIMIT ?";
  params.push(limit);

  const rows: {
    id: number;
    mode: string;
    difficulty: string | null;
    result: string;
    result_type: string | null;
    opponent_name: string | null;
    rating_before: number | null;
    rating_after: number | null;
    move_count: number;
    played_at: string;
  }[] = d.getAllSync(sql, params);

  return rows.map((r: any) => ({
    id: r.id,
    mode: r.mode as GameMode,
    difficulty: r.difficulty,
    result: r.result as GameOutcome,
    resultType: r.result_type as GameResultType | null,
    opponentName: r.opponent_name,
    ratingBefore: r.rating_before,
    ratingAfter: r.rating_after,
    moveCount: r.move_count,
    playedAt: r.played_at,
  }));
}
