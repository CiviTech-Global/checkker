import { Chess } from "chess.js";
import { getLegalMovesForHand } from "@checkker/chess";
import { type LessonConfig, type LessonStep } from "./types";
import { LESSONS } from "./lessons";

export class TutorialEngine {
  private chess: Chess;
  private currentLesson: LessonConfig | null = null;
  private currentStepIndex: number = 0;
  private completed: boolean = false;
  private mistakeCount: number = 0;
  private hintUsageCount: number = 0;
  private stepStartTime: number = 0;

  constructor() {
    this.chess = new Chess();
  }

  loadLesson(lessonId: number): LessonConfig {
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }
    this.chess = new Chess();
    this.chess.load(lesson.fen);
    this.currentLesson = lesson;
    this.currentStepIndex = 0;
    this.completed = false;
    this.mistakeCount = 0;
    this.hintUsageCount = 0;
    this.stepStartTime = Date.now();
    return lesson;
  }

  getState() {
    if (!this.currentLesson) {
      throw new Error("No lesson loaded. Call loadLesson() first.");
    }
    return {
      fen: this.chess.fen(),
      hand: this.currentLesson.hand,
      legalMoves: getLegalMovesForHand(this.chess, this.currentLesson.hand),
      currentStep: this.currentLesson.steps[this.currentStepIndex],
      stepIndex: this.currentStepIndex,
      totalSteps: this.currentLesson.steps.length,
      isComplete: this.completed,
    };
  }

  validateMove(cardId: string, uciMove: string) {
    if (!this.currentLesson) {
      throw new Error("No lesson loaded");
    }
    const step = this.currentLesson.steps[this.currentStepIndex];

    if (step.isInfoOnly) {
      this.currentStepIndex++;
      return {
        correct: true,
        lessonComplete: false,
        message: "",
        nextFen: this.chess.fen(),
      };
    }

    if (step.expectedMove && uciMove !== step.expectedMove) {
      return {
        correct: false,
        lessonComplete: false,
        message: `Not quite. ${step.hint}`,
        nextFen: this.chess.fen(),
      };
    }

    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    try {
      if (uciMove.length >= 5) {
        this.chess.move({ from, to, promotion: uciMove.slice(4, 5) });
      } else {
        this.chess.move({ from, to });
      }
    } catch {
      return {
        correct: false,
        lessonComplete: false,
        message: `That move isn't valid. ${step.hint}`,
        nextFen: this.chess.fen(),
      };
    }

    // Keep the turn on the player's color so subsequent steps
    // can compute legal moves for the player's pieces correctly.
    const playerTurn = this.currentLesson.color === "white" ? "w" : "b";
    if (this.chess.turn() !== playerTurn) {
      const fen = this.chess.fen();
      const parts = fen.split(" ");
      parts[1] = playerTurn;
      this.chess.load(parts.join(" "));
    }

    this.currentStepIndex++;

    if (this.currentStepIndex >= this.currentLesson.steps.length) {
      this.completed = true;
      return {
        correct: true,
        lessonComplete: true,
        message: "Lesson complete!",
        nextFen: this.chess.fen(),
      };
    }

    return {
      correct: true,
      lessonComplete: false,
      message: "Great move!",
      nextFen: this.chess.fen(),
    };
  }

  advanceStep(): boolean {
    if (!this.currentLesson) return false;
    if (this.currentStepIndex >= this.currentLesson.steps.length - 1) {
      return false;
    }
    this.currentStepIndex++;
    return true;
  }

  getHint(): string {
    if (!this.currentLesson) {
      throw new Error("No lesson loaded");
    }
    return this.currentLesson.steps[this.currentStepIndex].hint;
  }

  resetLesson(): void {
    if (this.currentLesson) {
      this.chess = new Chess();
      this.chess.load(this.currentLesson.fen);
      this.currentStepIndex = 0;
      this.completed = false;
    }
  }

  getLesson(id: number): LessonConfig | undefined {
    return LESSONS.find(l => l.id === id);
  }

  getAllLessons(): LessonConfig[] {
    return [...LESSONS];
  }

  isLessonComplete(): boolean {
    return this.completed;
  }

  recordMistake(): void {
    this.mistakeCount++;
  }

  recordHintUsage(): void {
    this.hintUsageCount++;
  }

  getAdaptiveFeedback(): { message: string; encouragement: boolean } {
    const timeSinceStep = Date.now() - this.stepStartTime;
    const isStruggling = this.mistakeCount >= 3 || timeSinceStep > 30000;
    const step = this.currentLesson?.steps[this.currentStepIndex];

    if (isStruggling && step?.adaptiveHints?.length) {
      const hintIdx = Math.min(this.mistakeCount - 1, step.adaptiveHints.length - 1);
      return {
        message: step.adaptiveHints[Math.max(0, hintIdx)],
        encouragement: true,
      };
    }

    if (this.mistakeCount === 0 && timeSinceStep < 10000) {
      return { message: "Excellent instincts!", encouragement: true };
    }

    if (this.mistakeCount >= 2) {
      return {
        message: "Take your time \u2014 consider which piece the card can move.",
        encouragement: true,
      };
    }

    return { message: "", encouragement: false };
  }
}
