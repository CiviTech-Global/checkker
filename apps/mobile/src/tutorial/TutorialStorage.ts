import type { TutorialProgress } from "./types";

const STORAGE_KEY = "@checkker/tutorial_progress";

let memoryStore: TutorialProgress = { completedLessonIds: [], starsPerLesson: {} };

async function getAsyncStorage() {
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    return mod.default;
  } catch {
    return null;
  }
}

export class TutorialStorage {
  async loadProgress(): Promise<TutorialProgress> {
    const store = await getAsyncStorage();
    if (store) {
      try {
        const data = await store.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data) as TutorialProgress;
      } catch { /* fall through */ }
    }
    return memoryStore;
  }

  async markLessonComplete(lessonId: number, stars?: number): Promise<void> {
    const progress = await this.loadProgress();
    if (!progress.completedLessonIds.includes(lessonId)) {
      progress.completedLessonIds.push(lessonId);
    }
    progress.starsPerLesson[lessonId] = stars ?? 3;
    memoryStore = progress;

    const store = await getAsyncStorage();
    if (store) {
      try {
        await store.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch { /* ignore */ }
    }
  }

  isLessonUnlocked(lessonId: number, progress: TutorialProgress): boolean {
    if (lessonId === 1) return true;
    return progress.completedLessonIds.includes(lessonId - 1);
  }

  async resetProgress(): Promise<void> {
    memoryStore = { completedLessonIds: [], starsPerLesson: {} };
    const store = await getAsyncStorage();
    if (store) {
      try {
        await store.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
    }
  }
}
