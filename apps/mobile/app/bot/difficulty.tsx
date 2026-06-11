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
import type { BotDifficulty, BotPersonality } from "@checkker/shared";
import Icon from "../../src/components/Icon";

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
      <Text style={styles.loadingText}>Starting game...</Text>
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

type PersonalityInfo = {
  id: BotPersonality;
  label: string;
  symbol: string;
  description: string;
  color: string;
};

const PERSONALITIES: PersonalityInfo[] = [
  { id: "classical", label: "The Strategist", symbol: "\u265A", description: "Plays solid, principled chess", color: colors.accent.blue },
  { id: "aggressive", label: "The Gambler", symbol: "\u2666", description: "Loves captures and risks", color: colors.accent.red },
  { id: "defensive", label: "The Fortress", symbol: "\u2656", description: "Patience and iron defense", color: colors.accent.green },
  { id: "tricky", label: "The Trickster", symbol: "\u2655", description: "Unexpected moves and traps", color: colors.accent.gold },
];

export default function BotDifficultyScreen() {
  const router = useRouter();
  const { connected, startBotGame, gameState } = useSocket();
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty | null>(null);

  useEffect(() => {
    if (loading && gameState && "gameId" in gameState) {
      setLoading(false);
      router.replace(`/game/${gameState.gameId}?mode=bot`);
    }
  }, [gameState, loading]);

  const handleSelectDifficulty = (difficulty: BotDifficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleSelectPersonality = (personality: BotPersonality) => {
    if (!selectedDifficulty) return;
    if (!connected) {
      const offlineDifficulty = selectedDifficulty === "master" ? "advanced" : selectedDifficulty;
      Alert.alert(
        "Not connected",
        "You're offline. Play a local bot game instead?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Play Offline",
            onPress: () => router.push(`/offline?difficulty=${offlineDifficulty}`),
          },
        ]
      );
      return;
    }
    setLoading(true);
    startBotGame(selectedDifficulty, "blitz");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Animated.Text
          entering={FadeIn.duration(400).delay(100)}
          style={styles.headerTitle}
        >
          {selectedDifficulty == null ? "Choose Difficulty" : `${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)} Bot`}
        </Animated.Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Difficulty Cards or Personality Picker */}
      <View style={styles.content}>
        {selectedDifficulty == null ? (
          DIFFICULTIES.map((diff, index) => (
            <DifficultyCard
              key={diff.id}
              difficulty={diff}
              index={index}
              onPress={() => handleSelectDifficulty(diff.id)}
              disabled={loading}
            />
          ))
        ) : (
          <>
            <Animated.Text entering={FadeIn.duration(300)} style={styles.sectionLabel}>
              Choose Opponent Style
            </Animated.Text>
            {PERSONALITIES.map((p, index) => (
              <Animated.View
                key={p.id}
                entering={FadeInRight.duration(300).delay(staggerDelay(index, 80))}
              >
                <TouchableOpacity
                  onPress={() => handleSelectPersonality(p.id)}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <View style={[styles.card, glassStyle, { borderWidth: 1, borderColor: colors.border.gold }]}>
                    <View style={[styles.leftBorder, { backgroundColor: p.color }]} />
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.star, { color: p.color }]}>{p.symbol}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{p.label}</Text>
                      <Text style={styles.cardDesc}>{p.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
            <TouchableOpacity
              onPress={() => {
                const offlineDifficulty = selectedDifficulty === "master" ? "advanced" : selectedDifficulty;
                router.push(`/offline?difficulty=${offlineDifficulty}`);
              }}
              style={{ marginTop: spacing.xs }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Icon name="lan" size={14} color={colors.text.muted} />
                <Text style={{ color: colors.text.muted, fontSize: 14 }}>Play offline (no connection needed)</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedDifficulty(null)} style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Icon name="arrow-back" size={14} color={colors.text.muted} />
                <Text style={{ color: colors.text.muted, fontSize: 14 }}>Change Difficulty</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.overlay}
        >
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
