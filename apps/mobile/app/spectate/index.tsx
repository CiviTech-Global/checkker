import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
} from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import type { BotDifficulty } from "@checkker/shared";

type DifficultyInfo = {
  id: BotDifficulty;
  label: string;
  description: string[];
  stars: number;
  color: string;
};

const DIFFICULTIES: DifficultyInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: ["For new players.", "The bot blunders."],
    stars: 1,
    color: colors.accent.green,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: ["A fair challenge.", "Plays solid chess."],
    stars: 2,
    color: colors.accent.gold,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: ["Strong play. Only", "for experienced."],
    stars: 3,
    color: colors.accent.bronze,
  },
  {
    id: "master",
    label: "Master",
    description: ["Near-perfect play.", "Are you sure?"],
    stars: 4,
    color: colors.accent.red,
  },
];

/* ── Animated Stars ─────────────────────────────────────────────────── */

function AnimatedStars({
  count,
  color,
  baseDelay,
}: {
  count: number;
  color: string;
  baseDelay: number;
}) {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 4 }, (_, i) => (
        <Animated.Text
          key={i}
          entering={FadeIn.duration(200).delay(baseDelay + i * 100)}
          style={[styles.star, { color: i < count ? color : colors.text.muted }]}
        >
          {i < count ? "\u2666" : "\u2662"}
        </Animated.Text>
      ))}
    </View>
  );
}

/* ── Difficulty Card ────────────────────────────────────────────────── */

function DifficultyCard({
  difficulty,
  index,
  onPress,
  disabled,
}: {
  difficulty: DifficultyInfo;
  index: number;
  onPress: () => void;
  disabled: boolean;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={FadeInRight.duration(300).delay(staggerDelay(index, 80))}
      style={[animatedStyle, disabled && { opacity: 0.6 }]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <View style={[styles.card, glassStyle]}>
          <View
            style={[styles.leftBorder, { backgroundColor: difficulty.color }]}
          />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <AnimatedStars
                count={difficulty.stars}
                color={difficulty.color}
                baseDelay={staggerDelay(index, 80) + 200}
              />
            </View>
            <Text style={styles.cardTitle}>{difficulty.label}</Text>
            {difficulty.description.map((line, i) => (
              <Text key={i} style={styles.cardDesc}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Loading Spinner (Rotating Knight) ──────────────────────────────── */

function KnightSpinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(360, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [rotation]);

  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Animated.Text style={[styles.spinnerPiece, rotStyle]}>
        {"\u265E"}
      </Animated.Text>
      <Text style={styles.loadingText}>Setting up the match...</Text>
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

export default function SpectatePickerScreen() {
  const router = useRouter();
  const { connected, startSpectateGame, spectateState } = useSocket();
  const [step, setStep] = useState<"white" | "black" | "loading">("white");
  const [whiteDifficulty, setWhiteDifficulty] = useState<BotDifficulty | null>(null);

  useEffect(() => {
    if (step === "loading" && spectateState?.gameId) {
      router.replace(`/spectate/${spectateState.gameId}`);
    }
  }, [spectateState, step]);

  const handlePickWhite = (difficulty: BotDifficulty) => {
    setWhiteDifficulty(difficulty);
    setStep("black");
  };

  const handlePickBlack = (difficulty: BotDifficulty) => {
    if (!connected || !whiteDifficulty) {
      Alert.alert("Not connected", "Waiting for server connection...");
      return;
    }
    setStep("loading");
    startSpectateGame(whiteDifficulty, difficulty);
  };

  const headerText =
    step === "white"
      ? "Choose White Bot"
      : step === "black"
      ? "Choose Black Bot"
      : "Starting Match...";

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === "black") {
              setStep("white");
              setWhiteDifficulty(null);
            } else {
              router.canGoBack() ? router.back() : router.replace("/");
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Animated.Text
          entering={FadeIn.duration(400).delay(100)}
          style={styles.headerTitle}
        >
          {headerText}
        </Animated.Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        <View style={[styles.stepDot, step !== "white" && styles.stepDotDone]} />
        <View style={[styles.stepLine, step === "white" && { opacity: 0.3 }]} />
        <View style={[styles.stepDot, step === "loading" && styles.stepDotDone]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {step === "white" && (
          <>
            <Text style={styles.sectionLabel}>{"\u2654"} White Bot</Text>
            {DIFFICULTIES.map((diff, index) => (
              <DifficultyCard
                key={diff.id}
                difficulty={diff}
                index={index}
                onPress={() => handlePickWhite(diff.id)}
                disabled={false}
              />
            ))}
          </>
        )}
        {step === "black" && (
          <>
            <Text style={styles.sectionLabel}>{"\u265A"} Black Bot</Text>
            {DIFFICULTIES.map((diff, index) => (
              <DifficultyCard
                key={diff.id}
                difficulty={diff}
                index={index}
                onPress={() => handlePickBlack(diff.id)}
                disabled={false}
              />
            ))}
            <TouchableOpacity onPress={() => { setStep("white"); setWhiteDifficulty(null); }} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.text.muted, fontSize: 14, textAlign: "center" }}>{"\u2190 Change White Bot"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Loading Overlay */}
      {step === "loading" && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
          <KnightSpinner />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.gold,
    opacity: 0.4,
  },
  stepDotDone: {
    opacity: 1,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.accent.gold,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  card: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  leftBorder: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 20,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  spinnerPiece: {
    fontSize: 64,
    color: colors.accent.gold,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
