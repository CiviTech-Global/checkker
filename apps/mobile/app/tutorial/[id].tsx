import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Card } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import { TutorialEngine } from "../../src/tutorial/TutorialEngine";
import { TutorialStorage } from "../../src/tutorial/TutorialStorage";
import { LESSONS } from "../../src/tutorial/lessons";
import ChessBoard from "../../src/components/ChessBoard";
import ChessBoardGL from "../../src/components/ChessBoardGL";
import { features } from "../../src/config/features";
import CardHand from "../../src/components/CardHand";
import type { LessonConfig, LessonStep } from "../../src/tutorial/types";
import {
  colors,
  spacing,
  radius,
  typography,
  glassStyle,
  springConfig,
  gradients,
} from "../../src/theme/tokens";
import { useSpringPress, useShake, staggerDelay } from "../../src/utils/animations";
import Icon from "../../src/components/Icon";

/* ── Step Progress Dots ─────────────────────────────────────────────── */

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <StepDot key={i} active={i <= current} index={i} />
      ))}
    </View>
  );
}

function StepDot({ active, index }: { active: boolean; index: number }) {
  const scale = useSharedValue(active ? 1 : 0.6);
  const opacity = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    scale.value = withSpring(active ? 1 : 0.6, springConfig.gentle);
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 200 });
  }, [active, scale, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        active && styles.dotActive,
        dotStyle,
      ]}
    />
  );
}

/* ── Feedback Toast ─────────────────────────────────────────────────── */

function FeedbackToast({
  message,
  correct,
}: {
  message: string;
  correct: boolean;
}) {
  const { shake, animatedStyle: shakeStyle } = useShake();

  useEffect(() => {
    if (!correct) shake();
  }, [correct, shake]);

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(14)}
      exiting={SlideOutDown.duration(200)}
      style={shakeStyle}
    >
      <View
        style={[
          styles.feedbackCard,
          glassStyle,
          correct ? styles.feedbackSuccess : styles.feedbackError,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon
            name={correct ? "completed" : "incorrect"}
            size={18}
            color={correct ? colors.accent.green : colors.accent.red}
          />
          <Text
            style={[
              styles.feedbackText,
              correct ? styles.feedbackSuccessText : styles.feedbackErrorText,
            ]}
          >
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Next Button with spring press ──────────────────────────────────── */

function NextButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={animatedStyle}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradients.accent }
          style={styles.nextButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-forward" size={18} color={colors.text.primary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

export default function TutorialLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const engineRef = useRef(new TutorialEngine());
  const storage = useRef(new TutorialStorage()).current;
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonId = parseInt(id ?? "", 10);

  const [lesson, setLesson] = useState<LessonConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fen, setFen] = useState("");
  const [hand, setHand] = useState<Card[]>([]);
  const [legalMovesMap, setLegalMovesMap] = useState<Map<string, string[]>>(new Map());
  const [currentStep, setCurrentStep] = useState<LessonStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [feedback, setFeedback] = useState<{
    message: string;
    correct: boolean;
  } | null>(null);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [hintCardIdx, setHintCardIdx] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSourceSquare, setSelectedSourceSquare] = useState<string | null>(null);
  const [instructionKey, setInstructionKey] = useState(0);

  const loadState = useCallback(() => {
    const state = engineRef.current.getState();
    setFen(state.fen);
    setHand(state.hand);
    setStepIndex(state.stepIndex);
    setTotalSteps(state.totalSteps);
    setCurrentStep(state.currentStep ?? null);
    setLessonComplete(state.isComplete);
    setInstructionKey((k) => k + 1);
    const map = new Map<string, string[]>();
    state.legalMoves.forEach(
      (entry: { card: Card; moves: string[] }) => {
        map.set(cardId(entry.card), entry.moves);
      }
    );
    setLegalMovesMap(map);
    setSelectedCardIdx(null);
    setSelectedSourceSquare(null);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!id || isNaN(lessonId)) return;
    try {
      const loaded = engineRef.current.loadLesson(lessonId);
      setLesson(loaded);
      loadState();
    } catch (err) {
      console.error(`Failed to load lesson ${lessonId}:`, err);
      const exists = LESSONS.some((l) => l.id === lessonId);
      setError(exists ? "Failed to load lesson data" : "Lesson not found");
    }
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [id, lessonId, loadState]);

  useEffect(() => {
    if (lessonComplete && lesson) {
      storage.markLessonComplete(lesson.id);
    }
  }, [lessonComplete, lesson, storage]);

  const findRecommendedCardIndex = (
    step: LessonStep | null,
    cards: Card[],
    movesMap: Map<string, string[]>
  ): number | null => {
    if (!step?.expectedMove) return null;
    for (let i = 0; i < cards.length; i++) {
      const cid = cardId(cards[i]);
      const moves = movesMap.get(cid) ?? [];
      if (moves.includes(step.expectedMove)) {
        return i;
      }
    }
    return null;
  };

  const handleNextStep = useCallback(() => {
    if (engineRef.current.advanceStep()) {
      loadState();
    } else {
      setLessonComplete(true);
      setFeedback({
        message: lesson?.successMessage ?? "Lesson complete!",
        correct: true,
      });
    }
  }, [lesson, loadState]);

  const handleCardTap = useCallback(
    (idx: number) => {
      if (isProcessing) return;
      if (currentStep?.isInfoOnly) return;
      if (lessonComplete) return;
      setSelectedCardIdx((prev) => (prev === idx ? null : idx));
      setSelectedSourceSquare(null);
      if (hintCardIdx !== null) {
        setHintCardIdx(null);
        if (hintTimerRef.current) {
          clearTimeout(hintTimerRef.current);
          hintTimerRef.current = null;
        }
      }
    },
    [isProcessing, currentStep, lessonComplete, hintCardIdx]
  );

  const handleSquarePress = useCallback(
    async (square: string) => {
      if (isProcessing || selectedCardIdx == null) return;
      const card = hand[selectedCardIdx];
      if (!card) return;
      const cid = cardId(card);
      const allMoves = legalMovesMap.get(cid) ?? [];

      let uciMove: string | undefined;

      if (selectedSourceSquare == null) {
        const hasMovesFromHere = allMoves.some((m) => m.startsWith(square));
        if (hasMovesFromHere) {
          setSelectedSourceSquare(square);
          return;
        }
        uciMove = allMoves.find((m) => m.endsWith(square));
      } else {
        uciMove = allMoves.find(
          (m) => m.startsWith(selectedSourceSquare) && m.endsWith(square)
        );
      }

      if (!uciMove) return;

      setIsProcessing(true);
      try {
        const result = engineRef.current.validateMove(cid, uciMove);
        if (result.correct) {
          if (result.lessonComplete) {
            setLessonComplete(true);
            setFeedback({
              message: lesson?.successMessage ?? "Lesson complete!",
              correct: true,
            });
          } else {
            setFeedback({
              message: result.message || "Great move!",
              correct: true,
            });
            loadState();
          }
        } else {
          setFeedback({
            message: result.message,
            correct: false,
          });
          const hintIdx = findRecommendedCardIndex(
            currentStep,
            hand,
            legalMovesMap
          );
          if (hintIdx !== null) {
            setHintCardIdx(hintIdx);
            if (hintTimerRef.current)
              clearTimeout(hintTimerRef.current);
            hintTimerRef.current = setTimeout(() => {
              setHintCardIdx(null);
              hintTimerRef.current = null;
            }, 3000);
          }
        }
      } catch {
        setFeedback({ message: "An error occurred", correct: false });
      } finally {
        setIsProcessing(false);
        setSelectedSourceSquare(null);
      }
    },
    [
      isProcessing,
      selectedCardIdx,
      hand,
      legalMovesMap,
      selectedSourceSquare,
      currentStep,
      lesson,
    ]
  );

  const handleNextLesson = useCallback(() => {
    const nextId = (lesson?.id ?? 0) + 1;
    if (nextId <= LESSONS.length) {
      router.push(`/tutorial/${nextId}`);
    } else {
      router.push("/tutorial");
    }
  }, [lesson, router]);

  const highlightedSquares = useMemo(() => {
    if (selectedCardIdx == null) return [];
    const card = hand[selectedCardIdx];
    if (!card) return [];
    const cid = cardId(card);
    const allMoves = legalMovesMap.get(cid) ?? [];
    if (selectedSourceSquare != null) {
      return allMoves
        .filter((m) => m.startsWith(selectedSourceSquare))
        .map((m) => m.slice(-2));
    }
    return allMoves.map((m) => m.slice(-2));
  }, [selectedCardIdx, hand, legalMovesMap, selectedSourceSquare]);

  const boardInteractive =
    !lessonComplete &&
    !currentStep?.isInfoOnly &&
    selectedCardIdx !== null &&
    !isProcessing;

  const displaySelectedIndex =
    hintCardIdx !== null ? hintCardIdx : selectedCardIdx;

  const cardsDisabled =
    lessonComplete || isProcessing || (currentStep?.isInfoOnly ?? false);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/tutorial")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-back" size={16} color={colors.accent.blue} />
            <Text style={styles.backBtnText}>Back</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (!lesson || !currentStep) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/tutorial")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="arrow-back" size={16} color={colors.accent.blue} />
              <Text style={styles.headerBack}>Back</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson.title}
          </Text>
          <View style={styles.stepArea}>
            <StepDots current={stepIndex} total={totalSteps} />
          </View>
        </Animated.View>

        {/* Instruction Card with glass material + crossfade on step change */}
        <Animated.View
          key={`instr-${instructionKey}`}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
        >
          <LinearGradient
            colors={gradients.glass }
            style={styles.instructionCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.instructionText}>
              {currentStep.instruction}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Board */}
        <View style={styles.boardContainer}>
          {features.use3DBoard ? (
            <ChessBoardGL
              fen={fen}
              orientation={lesson.color}
              highlightedSquares={highlightedSquares}
              interactive={boardInteractive}
              onSquarePress={handleSquarePress}
            />
          ) : (
            <ChessBoard
              fen={fen}
              orientation={lesson.color}
              highlightedSquares={highlightedSquares}
              interactive={boardInteractive}
              onSquarePress={handleSquarePress}
            />
          )}
        </View>

        {/* Card Hand */}
        <View style={styles.cardHandContainer}>
          <CardHand
            cards={hand}
            selectedIndex={displaySelectedIndex}
            onCardTap={handleCardTap}
            disabled={cardsDisabled}
          />
        </View>

        {/* Feedback Toast */}
        {feedback && (
          <FeedbackToast
            key={`fb-${feedback.message}-${feedback.correct}`}
            message={feedback.message}
            correct={feedback.correct}
          />
        )}

        {/* Next button for info-only steps */}
        {currentStep.isInfoOnly && !lessonComplete && (
          <NextButton onPress={handleNextStep} />
        )}
      </ScrollView>

      {/* Lesson Complete Overlay */}
      {lessonComplete && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.overlay}
        >
          <Animated.View
            entering={SlideInUp.duration(400).springify().damping(14)}
            style={styles.overlayContent}
          >
            <LinearGradient
              colors={gradients.glass }
              style={styles.overlayGlass}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Animated.Text
              entering={FadeIn.duration(300).delay(staggerDelay(0, 80))}
              style={styles.overlayTitle}
            >
              Lesson Complete!
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.duration(300).delay(staggerDelay(1, 80))}
              style={styles.overlayMessage}
            >
              {lesson.successMessage}
            </Animated.Text>
            <Animated.View
              entering={FadeIn.duration(300).delay(staggerDelay(2, 80))}
              style={styles.overlayButtons}
            >
              {lesson.id < LESSONS.length && (
                <TouchableOpacity
                  style={styles.overlayPrimaryBtn}
                  onPress={handleNextLesson}
                >
                  <LinearGradient
                    colors={gradients.accent }
                    style={styles.overlayPrimaryGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.overlayPrimaryBtnText}>Next Lesson</Text>
                      <Icon name="arrow-forward" size={18} color={colors.text.primary} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => router.replace("/tutorial")}
              >
                <Text style={styles.overlaySecondaryBtn}>
                  Back to List
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBack: {
    color: colors.accent.blue,
    fontSize: 16,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  stepArea: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.muted,
  },
  dotActive: {
    backgroundColor: colors.accent.gold,
  },
  instructionCard: {
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  instructionText: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  boardContainer: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  cardHandContainer: {
    alignItems: "center",
    minHeight: 96,
    justifyContent: "center",
  },
  feedbackCard: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  feedbackSuccess: {
    backgroundColor: "rgba(52, 208, 88, 0.15)",
    borderColor: "rgba(52, 208, 88, 0.3)",
  },
  feedbackError: {
    backgroundColor: "rgba(224, 64, 64, 0.15)",
    borderColor: "rgba(224, 64, 64, 0.3)",
  },
  feedbackText: {
    fontSize: typography.size.body,
    textAlign: "center",
  },
  feedbackSuccessText: {
    color: colors.accent.green,
  },
  feedbackErrorText: {
    color: colors.accent.red,
  },
  nextButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  nextButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: colors.accent.red,
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: {
    marginTop: spacing.md,
  },
  backBtnText: {
    color: colors.accent.blue,
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  overlayContent: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  overlayGlass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTitle: {
    color: colors.accent.gold,
    fontSize: 24,
    fontWeight: "700",
  },
  overlayMessage: {
    color: colors.text.secondary,
    fontSize: typography.size.body,
    textAlign: "center",
    lineHeight: 22,
  },
  overlayButtons: {
    width: "100%",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  overlayPrimaryBtn: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  overlayPrimaryGrad: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  overlayPrimaryBtnText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  overlaySecondaryBtn: {
    color: colors.text.muted,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
});
