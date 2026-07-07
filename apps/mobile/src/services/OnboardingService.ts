import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@checkker/onboardingComplete";
const NAME_KEY = "@checkker/onboardingName";
const BACKGROUND_KEY = "@checkker/onboardingBackground";

export type PlayerBackground = "chess" | "poker" | "new";

class OnboardingServiceClass {
  async isComplete(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw === "true";
    } catch {
      return false;
    }
  }

  async markComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }

  async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(NAME_KEY);
      await AsyncStorage.removeItem(BACKGROUND_KEY);
    } catch {
      // ignore
    }
  }

  async setBackground(background: PlayerBackground): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKGROUND_KEY, background);
    } catch {
      // ignore
    }
  }

  async getBackground(): Promise<PlayerBackground | null> {
    try {
      const raw = await AsyncStorage.getItem(BACKGROUND_KEY);
      if (raw === "chess" || raw === "poker" || raw === "new") return raw;
      return null;
    } catch {
      return null;
    }
  }

  async setName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(NAME_KEY, name.trim() || "Player");
    } catch {
      // ignore
    }
  }
}

export const onboarding = new OnboardingServiceClass();
