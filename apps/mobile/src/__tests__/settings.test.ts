import { appSettings } from "../services/SettingsService";
import type { AppSettings } from "../services/SettingsService";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const MockAsyncStorage =
  require("@react-native-async-storage/async-storage").default;

describe("SettingsService defaults", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("soundEnabled defaults to true", () => {
    expect(appSettings.settings.soundEnabled).toBe(true);
  });

  it("hapticEnabled defaults to true", () => {
    expect(appSettings.settings.hapticEnabled).toBe(true);
  });

  it("reducedMotion defaults to false", () => {
    expect(appSettings.settings.reducedMotion).toBe(false);
  });

  it("boardTheme defaults to classic", () => {
    expect(appSettings.settings.boardTheme).toBe("classic");
  });

  it("pieceTheme defaults to default", () => {
    expect(appSettings.settings.pieceTheme).toBe("default");
  });

  it("cardBack defaults to default", () => {
    expect(appSettings.settings.cardBack).toBe("default");
  });

  it("loaded is false initially", () => {
    expect(appSettings.loaded).toBe(false);
  });
});

describe("SettingsService updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("setSoundEnabled updates value and persists", async () => {
    await appSettings.setSoundEnabled(false);
    expect(appSettings.settings.soundEnabled).toBe(false);
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("setHapticEnabled updates value and persists", async () => {
    await appSettings.setHapticEnabled(false);
    expect(appSettings.settings.hapticEnabled).toBe(false);
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("setReducedMotion updates value and persists", async () => {
    await appSettings.setReducedMotion(true);
    expect(appSettings.settings.reducedMotion).toBe(true);
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("setBoardTheme updates value and persists", async () => {
    await appSettings.setBoardTheme("ocean");
    expect(appSettings.settings.boardTheme).toBe("ocean");
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("setPieceTheme updates value and persists", async () => {
    await appSettings.setPieceTheme("neo");
    expect(appSettings.settings.pieceTheme).toBe("neo");
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("setCardBack updates value and persists", async () => {
    await appSettings.setCardBack("retro");
    expect(appSettings.settings.cardBack).toBe("retro");
    expect(MockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it("multiple updates are independent", async () => {
    await appSettings.setSoundEnabled(false);
    await appSettings.setBoardTheme("dark");
    expect(appSettings.settings.soundEnabled).toBe(false);
    expect(appSettings.settings.boardTheme).toBe("dark");
    expect(appSettings.settings.hapticEnabled).toBe(true);
  });
});

describe("SettingsService persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("load returns defaults when no stored data", async () => {
    MockAsyncStorage.getItem.mockResolvedValue(null);
    const settings = await appSettings.load();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.boardTheme).toBe("classic");
    expect(appSettings.loaded).toBe(true);
  });

  it("load merges stored data with defaults", async () => {
    MockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ soundEnabled: false, boardTheme: "dark" }),
    );
    const settings = await appSettings.load();
    expect(settings.soundEnabled).toBe(false);
    expect(settings.boardTheme).toBe("dark");
    expect(settings.hapticEnabled).toBe(true);
  });

  it("load handles malformed JSON gracefully", async () => {
    MockAsyncStorage.getItem.mockResolvedValue("not-json");
    const settings = await appSettings.load();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.boardTheme).toBe("classic");
  });

  it("setSoundEnabled calls AsyncStorage.setItem with correct key", async () => {
    await appSettings.setSoundEnabled(false);
    expect(MockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@checkker/settings",
      expect.any(String),
    );
  });

  it("persist stores all settings as JSON", async () => {
    await appSettings.setSoundEnabled(false);
    const callArg = MockAsyncStorage.setItem.mock.calls[0][1];
    const parsed = JSON.parse(callArg);
    expect(parsed.soundEnabled).toBe(false);
    expect(parsed.boardTheme).toBe("classic");
  });

  it("load is called once, sets loaded flag", async () => {
    MockAsyncStorage.getItem.mockResolvedValue(null);
    expect(appSettings.loaded).toBe(false);
    await appSettings.load();
    expect(appSettings.loaded).toBe(true);
  });
});
