import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LastPlayedMatch {
  mode: "ranked" | "casual";
  difficulty: string;
  tc: string;
  stake: "free" | "bet";
  isBot: boolean;
}

const STORAGE_KEY = "@checkker/lastPlayed";

const DEFAULTS: LastPlayedMatch = {
  mode: "ranked",
  difficulty: "beginner",
  tc: "blitz",
  stake: "free",
  isBot: false,
};

class LastPlayedServiceClass {
  async get(): Promise<LastPlayedMatch> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULTS };
  }

  async save(match: Partial<LastPlayedMatch>): Promise<void> {
    try {
      const current = await this.get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...match }));
    } catch {
      // ignore
    }
  }
}

export const lastPlayed = new LastPlayedServiceClass();
