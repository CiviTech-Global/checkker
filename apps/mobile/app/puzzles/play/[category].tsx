import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Chess } from "chess.js";
import ChessBoard from "../../../src/components/ChessBoard";
import { useSocket } from "../../../src/hooks/useSocket";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
  shadows,
} from "../../../src/theme/tokens";
import { useSpringPress } from "../../../src/utils/animations";
import Icon from "../../../src/components/Icon";

const CATEGORY_LABELS: Record<string, string> = {
  daily: "Daily Puzzle",
  tactics: "Tactical Puzzles",
  card_management: "Card Management",
  endgame: "Endgame Training",
  weakness: "Weakness Training",
};

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

function parseHand(cards?: string | null): Array<{ rank: string; suit: string }> {
  if (!cards) return [];
  try {
    const parsed = JSON.parse(cards);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatUci(uci: string): string {
  if (uci.length < 4) return uci.toUpperCase();
  const from = uci.substring(0, 2).toUpperCase();
  const to = uci.substring(2, 4).toUpperCase();
  const promotion = uci.length > 4 ? `=${uci[4].toUpperCase()}` : "";
  return `${from}-${to}${promotion}`;
}

export default function PuzzlePlayScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { puzzles, puzzleResult, getPuzzles, submitPuzzle } = useSocket();

  const [puzzleList, setPuzzleList] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [solution, setSolution] = useState("");

  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);

  const awaitingResult = useRef(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    getPuzzles(category, 20);
  }, [category]);

  useEffect(() => {
    if (puzzles && puzzles.category === category) {
      setPuzzleList(puzzles.puzzles);
      setLoading(false);
      startTimeRef.current = Date.now();
    }
  }, [puzzles, category]);

  useEffect(() => {
    if (puzzleResult && awaitingResult.current) {
      awaitingResult.current = false;
      setSubmitted(true);
      setShowResult(true);
      setLastCorrect(puzzleResult.correct);
      setSolution(puzzleResult.solution);
      if (puzzleResult.correct) {
        setStreak((s) => s + 1);
        setSolved((s) => s + 1);
      } else {
        setStreak(0);
      }
    }
  }, [puzzleResult]);

  const currentPuzzle =
    puzzleList.length > 0 && currentIndex < puzzleList.length
      ? puzzleList[currentIndex]
      : null;

  const turnColor = currentPuzzle
    ? currentPuzzle.fen.split(" ")[1] === "w"
      ? "white"
      : "black"
    : "white";

  const handleSquarePress = useCallback(
    (square: string) => {
      if (submitted || !currentPuzzle) return;

      const chess = new Chess(currentPuzzle.fen);
      const legalMoves = chess.moves({ verbose: true });

      if (selectedSource === null) {
        const hasMoves = legalMoves.some((m: any) => m.from === square);
        if (hasMoves) {
          setSelectedSource(square);
          const dests = [
            ...new Set(
              legalMoves
                .filter((m: any) => m.from === square)
                .map((m: any) => m.to)
            ),
          ];
          setHighlightedSquares(dests);
        }
      } else {
        const matching = legalMoves.filter(
          (m: any) => m.from === selectedSource && m.to === square
        );

        if (matching.length === 0) {
          const hasMoves = legalMoves.some((m: any) => m.from === square);
          if (hasMoves) {
            setSelectedSource(square);
            const dests = [
              ...new Set(
                legalMoves
                  .filter((m: any) => m.from === square)
                  .map((m: any) => m.to)
              ),
            ];
            setHighlightedSquares(dests);
            return;
          }
          setSelectedSource(null);
          setHighlightedSquares([]);
          return;
        }

        const move =
          matching.length > 1
            ? matching.find((m: any) => m.promotion === "q") ?? matching[0]
            : matching[0];

        const uci = move.from + move.to + (move.promotion || "");
        const timeSpentMs = Date.now() - startTimeRef.current;
        awaitingResult.current = true;
        submitPuzzle(currentPuzzle.id, uci, timeSpentMs, false);

        setSelectedSource(null);
        setHighlightedSquares([]);
      }
    },
    [submitted, currentPuzzle, selectedSource, submitPuzzle]
  );

  const nextPuzzle = useCallback(() => {
    if (currentIndex < puzzleList.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSubmitted(false);
      setShowResult(false);
      setLastCorrect(false);
      setSolution("");
      setSelectedSource(null);
      setHighlightedSquares([]);
      startTimeRef.current = Date.now();
    } else {
      router.back();
    }
  }, [currentIndex, puzzleList.length, router]);

  const showHint = useCallback(() => {
    if (currentPuzzle?.hint) {
      Alert.alert("Hint", currentPuzzle.hint);
    }
  }, [currentPuzzle]);

  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, safeStyle]}>
        <ActivityIndicator size="large" color={colors.accent.gold} />
        <Text style={styles.loadingText}>Loading puzzles...</Text>
      </View>
    );
  }

  if (puzzleList.length === 0) {
    return (
      <View style={[styles.container, styles.centered, safeStyle]}>
        <Text style={styles.emptyText}>
          No puzzles available in this category yet.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, safeStyle]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {CATEGORY_LABELS[category] ?? "Puzzles"}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Icon name="star-filled" size={16} color={colors.accent.gold} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
          <View style={styles.solvedBadge}>
            <Icon name="completed" size={16} color={colors.accent.green} />
            <Text style={styles.solvedText}>{solved}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Puzzle counter */}
      <Text style={styles.counter}>
        Puzzle {currentIndex + 1} of {puzzleList.length}
      </Text>

      {/* Chess Board */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.boardWrapper}
      >
        <ChessBoard
          fen={currentPuzzle?.fen}
          orientation={turnColor}
          highlightedSquares={highlightedSquares}
          selectedSquare={selectedSource}
          interactive={!submitted}
          onSquarePress={handleSquarePress}
        />
      </Animated.View>

      {/* Turn indicator */}
      <Animated.View entering={FadeIn.duration(300).delay(200)}>
        <Text style={styles.turnText}>
          {turnColor === "white" ? "White to move" : "Black to move"}
        </Text>
      </Animated.View>

      {/* Card hand (card-constrained puzzles) */}
      {parseHand(currentPuzzle?.cards).length > 0 && (
        <Animated.View
          entering={FadeIn.duration(300).delay(220)}
          style={styles.handRow}
        >
          <Text style={styles.handLabel}>Your hand:</Text>
          {parseHand(currentPuzzle?.cards).map((card, i) => (
            <View key={`${card.rank}${card.suit}${i}`} style={styles.handCard}>
              <Text
                style={[
                  styles.handCardText,
                  {
                    color:
                      card.suit === "hearts" || card.suit === "diamonds"
                        ? colors.accent.red
                        : colors.text.primary,
                  },
                ]}
              >
                {card.rank}
                {SUIT_SYMBOLS[card.suit] ?? ""}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Hint button */}
      {!submitted && (
        <Animated.View
          entering={SlideInUp.duration(300).delay(250)}
          style={styles.hintRow}
        >
          <TouchableOpacity
            onPress={showHint}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.9}
            style={animatedStyle}
          >
            <LinearGradient
              colors={gradients.gold}
              style={styles.hintButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="coach" size={18} color={colors.text.dark} />
              <Text style={styles.hintButtonText}>Show Hint</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Result card */}
      {showResult && (
        <Animated.View
          entering={FadeIn.duration(400).springify().damping(15)}
          style={[
            styles.resultCard,
            {
              backgroundColor: lastCorrect
                ? "rgba(52,208,88,0.15)"
                : "rgba(224,64,64,0.15)",
              borderColor: lastCorrect
                ? colors.accent.green
                : colors.accent.red,
            },
          ]}
        >
          <Icon
            name={lastCorrect ? "completed" : "incorrect"}
            size={48}
            color={lastCorrect ? colors.accent.green : colors.accent.red}
          />
          <Text
            style={[
              styles.resultTitle,
              {
                color: lastCorrect
                  ? colors.accent.green
                  : colors.accent.red,
              },
            ]}
          >
            {lastCorrect ? "Correct!" : "Not quite"}
          </Text>
          <Text style={styles.solutionText}>
            Best move: {formatUci(solution)}
          </Text>

          <TouchableOpacity
            onPress={nextPuzzle}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.9}
            style={[animatedStyle, styles.nextButtonWrapper]}
          >
            <LinearGradient
              colors={
                lastCorrect ? gradients.success : gradients.error
              }
              style={styles.nextButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex < puzzleList.length - 1
                  ? "Next Puzzle"
                  : "Done"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 14,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.tertiary,
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    width: "100%",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: 100,
    justifyContent: "flex-end",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent.gold,
  },
  solvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  solvedText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent.green,
  },
  counter: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  boardWrapper: {
    width: "100%",
    maxWidth: 480,
    paddingHorizontal: spacing.md,
  },
  turnText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
    marginVertical: spacing.md,
    textAlign: "center",
  },
  hintRow: {
    marginBottom: spacing.md,
  },
  handRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  handLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginRight: spacing.xs,
  },
  handCard: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  handCardText: {
    fontSize: 15,
    fontWeight: "700",
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.dark,
  },
  resultCard: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  solutionText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  nextButtonWrapper: {
    width: "100%",
  },
  nextButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
});
