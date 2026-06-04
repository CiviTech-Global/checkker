import type { Card, Color } from "@checkker/shared";

export interface LessonStep {
  id: number;
  instruction: string;
  hint: string;
  expectedMove?: string;
  isInfoOnly?: boolean;
  adaptiveHints?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

export interface LessonConfig {
  id: number;
  title: string;
  description: string;
  fen: string;
  hand: Card[];
  color: Color;
  steps: LessonStep[];
  successMessage: string;
}

export interface TutorialProgress {
  completedLessonIds: number[];
  starsPerLesson: Record<number, number>;
}
