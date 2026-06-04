import { v4 as uuid } from "uuid";
import type { PlayerProfile } from "@checkker/shared";

class PlayerStore {
  private profiles = new Map<string, PlayerProfile>();

  getOrCreate(socketId: string, displayName?: string): PlayerProfile {
    const existing = this.profiles.get(socketId);
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
    this.profiles.set(socketId, profile);
    return profile;
  }

  updateAfterGame(socketId: string, outcome: "win" | "loss" | "draw"): void {
    const profile = this.profiles.get(socketId);
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

  get(socketId: string): PlayerProfile | null {
    return this.profiles.get(socketId) ?? null;
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
}

export const playerStore = new PlayerStore();
