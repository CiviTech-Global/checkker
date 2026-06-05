import { v4 as uuid } from "uuid";
import type { PlayerProfile } from "@checkker/shared";

/** Whether the database is available (set by server startup) */
let dbEnabled = false;
let UserRepo: typeof import("@checkker/database").UserRepository | null = null;

export async function initPlayerStoreDb(): Promise<void> {
  try {
    const db = await import("@checkker/database");
    UserRepo = db.UserRepository;
    dbEnabled = true;
    console.log("[PlayerStore] Database-backed mode enabled");
  } catch {
    console.log("[PlayerStore] Database not available, using in-memory mode");
  }
}

/**
 * Maps socket ID → PlayerProfile for active sessions.
 * In DB mode, this is a cache; in memory mode, this is the only store.
 */
const sessionCache = new Map<string, PlayerProfile>();

/** Maps wallet address → socket ID for authenticated users */
const walletToSocket = new Map<string, string>();

class PlayerStore {
  /** Get or create a profile. In DB mode, walletAddress triggers DB lookup. */
  getOrCreate(socketId: string, displayName?: string): PlayerProfile {
    const existing = sessionCache.get(socketId);
    if (existing) return existing;

    const profile: PlayerProfile = {
      id: uuid(),
      displayName: displayName ?? `Player-${socketId.slice(0, 4)}`,
      rating: 1000,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    sessionCache.set(socketId, profile);
    return profile;
  }

  /** Load profile from DB by wallet address and cache it for the socket session */
  async loadFromWallet(socketId: string, walletAddress: string): Promise<PlayerProfile | null> {
    if (!dbEnabled || !UserRepo) return null;

    const user = await UserRepo.findByWallet(walletAddress.toLowerCase());
    if (!user) return null;

    const profile: PlayerProfile = {
      id: user.id,
      displayName: user.username,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      walletAddress: user.walletAddress,
      avatarId: user.avatarId,
    };

    sessionCache.set(socketId, profile);
    walletToSocket.set(walletAddress.toLowerCase(), socketId);
    return profile;
  }

  /** Register a new user in the DB and cache the profile */
  async registerUser(
    socketId: string,
    walletAddress: string,
    username: string,
    avatarId?: string
  ): Promise<PlayerProfile | null> {
    if (!dbEnabled || !UserRepo) return null;

    const user = await UserRepo.create({
      walletAddress: walletAddress.toLowerCase(),
      username,
      avatarId,
    });

    const profile: PlayerProfile = {
      id: user.id,
      displayName: user.username,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      walletAddress: user.walletAddress,
      avatarId: user.avatarId,
    };

    sessionCache.set(socketId, profile);
    walletToSocket.set(walletAddress.toLowerCase(), socketId);
    return profile;
  }

  /** Check if a username is available */
  async isUsernameTaken(username: string): Promise<boolean> {
    if (!dbEnabled || !UserRepo) return false;
    return UserRepo.isUsernameTaken(username);
  }

  updateAfterGame(socketId: string, outcome: "win" | "loss" | "draw"): void {
    const profile = sessionCache.get(socketId);
    if (!profile) return;

    profile.gamesPlayed++;

    switch (outcome) {
      case "win":
        profile.wins++;
        profile.currentStreak = profile.currentStreak > 0 ? profile.currentStreak + 1 : 1;
        if (profile.currentStreak > profile.bestStreak) {
          profile.bestStreak = profile.currentStreak;
        }
        break;
      case "loss":
        profile.losses++;
        profile.currentStreak = profile.currentStreak < 0 ? profile.currentStreak - 1 : -1;
        break;
      case "draw":
        profile.draws++;
        profile.currentStreak = 0;
        break;
    }
  }

  /** Persist stats to DB after game (call after updateAfterGame) */
  async persistAfterGame(
    socketId: string,
    outcome: "win" | "loss" | "draw",
    ratingBefore: number,
    ratingAfter: number
  ): Promise<void> {
    if (!dbEnabled || !UserRepo) return;

    const profile = sessionCache.get(socketId);
    if (!profile?.walletAddress) return;

    await UserRepo.updateAfterGame(profile.id, {
      outcome,
      ratingBefore,
      ratingAfter,
    });

    // Update cached rating
    profile.rating = ratingAfter;
  }

  get(socketId: string): PlayerProfile | null {
    return sessionCache.get(socketId) ?? null;
  }

  getByWallet(walletAddress: string): PlayerProfile | null {
    const socketId = walletToSocket.get(walletAddress.toLowerCase());
    if (!socketId) return null;
    return sessionCache.get(socketId) ?? null;
  }

  remove(socketId: string): void {
    const profile = sessionCache.get(socketId);
    if (profile?.walletAddress) {
      walletToSocket.delete(profile.walletAddress.toLowerCase());
    }
    sessionCache.delete(socketId);
  }

  createBotProfile(difficulty: string, rating: number): PlayerProfile {
    return {
      id: `bot-${difficulty}`,
      displayName: `Bot (${difficulty})`,
      rating,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  get isDbEnabled(): boolean {
    return dbEnabled;
  }
}

export const playerStore = new PlayerStore();
