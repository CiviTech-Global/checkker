import { TutorialEngine } from "../tutorial/TutorialEngine";
import { TutorialStorage } from "../tutorial/TutorialStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe("TutorialEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loadLesson returns correct lesson config", () => {
    const engine = new TutorialEngine();
    const lesson = engine.loadLesson(1);
    expect(lesson.id).toBe(1);
    expect(lesson.title).toBeDefined();
    expect(lesson.steps.length).toBeGreaterThan(0);
  });

  test("validateMove accepts correct move", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    engine.validateMove("", "");
    const result = engine.validateMove("4h", "e2e4");
    expect(result.correct).toBe(true);
    expect(result.lessonComplete).toBe(true);
  });

  test("validateMove rejects wrong move", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    engine.validateMove("", "");
    const result = engine.validateMove("4h", "e2e3");
    expect(result.correct).toBe(false);
  });

  test("info-only step advances without validating", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    const state = engine.getState();
    expect(state.currentStep.isInfoOnly).toBe(true);
    const result = engine.validateMove("", "");
    expect(result.correct).toBe(true);
    expect(result.lessonComplete).toBe(false);
  });

  test("completing all steps marks lesson complete", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    const firstResult = engine.validateMove("", "");
    expect(firstResult.correct).toBe(true);
    const secondResult = engine.validateMove("4h", "e2e4");
    expect(secondResult.correct).toBe(true);
    expect(secondResult.lessonComplete).toBe(true);
    expect(engine.isLessonComplete()).toBe(true);
  });

  test("getHint returns current step hint", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    const hint = engine.getHint();
    expect(hint).toBeDefined();
    expect(typeof hint).toBe("string");
  });

  test("resetLesson restores initial state", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(1);
    engine.validateMove("", "");
    engine.resetLesson();
    const state = engine.getState();
    expect(state.stepIndex).toBe(0);
    expect(state.isComplete).toBe(false);
  });

  test("lesson 8 accepts any legal move", () => {
    const engine = new TutorialEngine();
    engine.loadLesson(8);
    engine.validateMove("", "");
    const result = engine.validateMove("4h", "e2e4");
    expect(result.correct).toBe(true);
    expect(result.lessonComplete).toBe(true);
  });

  test("all 8 lessons load without error", () => {
    const engine = new TutorialEngine();
    for (let i = 1; i <= 8; i++) {
      expect(() => engine.loadLesson(i)).not.toThrow();
    }
  });
});

describe("TutorialStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TutorialStorage saves and loads progress", async () => {
    const storage = new TutorialStorage();
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;

    AsyncStorage.getItem.mockResolvedValue(null);

    const initial = await storage.loadProgress();
    expect(initial.completedLessonIds).toEqual([]);

    await storage.markLessonComplete(1, 3);
    expect(AsyncStorage.setItem).toHaveBeenCalled();

    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ completedLessonIds: [1], starsPerLesson: { 1: 3 } }),
    );
    const loaded = await storage.loadProgress();
    expect(loaded.completedLessonIds).toContain(1);
  });

  test("lessons unlock sequentially", () => {
    const storage = new TutorialStorage();
    const progress = { completedLessonIds: [1, 2, 3], starsPerLesson: {} };
    expect(storage.isLessonUnlocked(1, progress)).toBe(true);
    expect(storage.isLessonUnlocked(2, progress)).toBe(true);
    expect(storage.isLessonUnlocked(4, progress)).toBe(true);
    expect(storage.isLessonUnlocked(5, progress)).toBe(false);
  });

  test("resetProgress clears stored data", async () => {
    const storage = new TutorialStorage();
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await storage.resetProgress();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
