import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  reducedMotion: boolean;
  boardTheme: string;
  pieceTheme: string;
  cardBack: string;
}

const DEFAULTS: AppSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  reducedMotion: false,
  boardTheme: "classic",
  pieceTheme: "default",
  cardBack: "default",
};

const STORAGE_KEY = "@checkker/settings";

class SettingsServiceClass {
  private _settings: AppSettings = { ...DEFAULTS };
  private _loaded = false;

  get settings(): AppSettings {
    return { ...this._settings };
  }

  get loaded(): boolean {
    return this._loaded;
  }

  async load(): Promise<AppSettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._settings = { ...DEFAULTS, ...parsed };
      }
    } catch {
      // ignore
    }
    this._loaded = true;
    return { ...this._settings };
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    } catch {
      // ignore
    }
  }

  async setSoundEnabled(value: boolean): Promise<void> {
    this._settings.soundEnabled = value;
    await this.persist();
  }

  async setHapticEnabled(value: boolean): Promise<void> {
    this._settings.hapticEnabled = value;
    await this.persist();
  }

  async setReducedMotion(value: boolean): Promise<void> {
    this._settings.reducedMotion = value;
    await this.persist();
  }

  async setBoardTheme(value: string): Promise<void> {
    this._settings.boardTheme = value;
    await this.persist();
  }

  async setPieceTheme(value: string): Promise<void> {
    this._settings.pieceTheme = value;
    await this.persist();
  }

  async setCardBack(value: string): Promise<void> {
    this._settings.cardBack = value;
    await this.persist();
  }
}

export const appSettings = new SettingsServiceClass();
