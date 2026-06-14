import { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, glassStyle, gradients, springConfig, shadows } from "../theme/tokens";
import { useSpringPress, staggerDelay } from "../utils/animations";
import type { GameResult, Color, ScoredGame, PokerResult } from "@checkker/shared";
import { PokerHand } from "@checkker/shared";

export interface BetSettlementInfo {
  outcome: "win" | "loss" | "draw";
  betAmountUsd: number;
  txHash: string;
}

interface GameResultOverlayProps {
  visible: boolean;
  result: GameResult | null;
  playerColor: Color;
  scores?: ScoredGame | null;
  onRematch?: () => void;
  onHome: () => void;
  rematchPending?: boolean;
  opponentWantsRematch?: boolean;
  betSettlement?: BetSettlementInfo | null;
}

const HAND_NAMES: Record<number, string> = {
  [PokerHand.HIGH_CARD]: "High Card",
  [PokerHand.ONE_PAIR]: "Pair",
  [PokerHand.TWO_PAIR]: "Two Pair",
  [PokerHand.THREE_OF_A_KIND]: "Three of a Kind",
  [PokerHand.STRAIGHT]: "Straight",
  [PokerHand.FLUSH]: "Flush",
  [PokerHand.FULL_HOUSE]: "Full House",
  [PokerHand.FOUR_OF_A_KIND]: "Four of a Kind",
  [PokerHand.STRAIGHT_FLUSH]: "Straight Flush",
  [PokerHand.ROYAL_FLUSH]: "Royal Flush",
};

function resultLabel(r: GameResult): string {
  switch (r.type) {
    case "checkmate": return "Checkmate";
    case "draw": return "Draw";
    case "resignation": return "Resignation";
    case "timeout": return "Time Out";
    case "deckExhausted": return "Deck Exhausted";
  }
}

function resultReason(r: GameResult): string {
  switch (r.type) {
    case "checkmate": return r.winner === "white" ? "White delivers checkmate" : "Black delivers checkmate";
    case "draw": return `Draw by ${r.reason}`;
    case "resignation": return r.winner === "white" ? "Black resigned" : "White resigned";
    case "timeout": return r.winner === "white" ? "Black ran out of time" : "White ran out of time";
    case "deckExhausted": return "Both decks exhausted";
  }
}

function pokerSummary(poker: PokerResult): string {
  if (poker.hands.length === 0) return "No poker hand";
  return poker.hands.map((h) => `${HAND_NAMES[h.hand] ?? "?"} (+${h.points})`).join(", ");
}

/* ── Count-Up Score ─────────────────────────────────────────────────── */

function AnimatedScore({
  target,
  delay: d,
}: {
  target: number | null;
  delay: number;
}) {
  const displayValue = useSharedValue(0);

  useEffect(() => {
    if (target != null) {
      displayValue.value = 0;
      displayValue.value = withDelay(
        d,
        withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [target, d, displayValue]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: target != null ? 1 : 0.5,
  }));

  return (
    <Animated.Text style={[styles.scoreVal, textStyle]}>
      {target ?? "-"}
    </Animated.Text>
  );
}

/* ── Confetti Particle ──────────────────────────────────────────────── */

const CONFETTI_COLORS = [
  colors.accent.primary,
  colors.accent.gold,
  colors.accent.green,
  colors.accent.bronze,
  colors.accent.goldBright,
  colors.accent.blue,
];

function ConfettiParticle({ index }: { index: number }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + (index % 4) * 2;

  useEffect(() => {
    const angle = (index / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = 80 + Math.random() * 100;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance - 40;

    translateX.value = withDelay(
      100 + index * 30,
      withSpring(targetX, { damping: 12, stiffness: 80 })
    );
    translateY.value = withDelay(
      100 + index * 30,
      withSpring(targetY, { damping: 12, stiffness: 80 })
    );
    rotation.value = withDelay(
      100 + index * 30,
      withTiming(360 + Math.random() * 360, { duration: 1200 })
    );
    opacity.value = withDelay(
      800 + index * 30,
      withTiming(0, { duration: 600 })
    );
  }, [index, translateX, translateY, opacity, rotation]);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
        },
        particleStyle,
      ]}
    />
  );
}

function ConfettiBurst() {
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);
  return (
    <View style={styles.confettiContainer}>
      {particles.map((i) => (
        <ConfettiParticle key={i} index={i} />
      ))}
    </View>
  );
}

/* ── Action Button ──────────────────────────────────────────────────── */

function ActionButton({
  label,
  primary,
  onPress,
  delay: d,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
  delay: number;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(d)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={primary ? styles.primaryBtn : styles.secondaryBtn}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={primary ? styles.primaryText : styles.secondaryText}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Main Overlay ───────────────────────────────────────────────────── */

export default function GameResultOverlay({
  visible,
  result,
  playerColor,
  scores,
  onRematch,
  onHome,
  rematchPending,
  opponentWantsRematch,
  betSettlement,
}: GameResultOverlayProps) {
  if (!result) return null;

  const winner = "winner" in result ? result.winner : null;
  const isDraw = result.type === "draw" || result.type === "deckExhausted";
  const playerWon = winner === playerColor;

  const headerText = isDraw ? "Draw" : playerWon ? "You Win!" : "You Lose";
  const headerColor: string = isDraw
    ? colors.accent.blue
    : playerWon
    ? colors.accent.gold
    : colors.text.muted;

  const playerTotal = scores
    ? playerColor === "white"
      ? scores.whiteTotal
      : scores.blackTotal
    : null;
  const opponentTotal = scores
    ? playerColor === "white"
      ? scores.blackTotal
      : scores.whiteTotal
    : null;
  const playerPoker = scores
    ? playerColor === "white"
      ? scores.whitePoker
      : scores.blackPoker
    : null;
  const opponentPoker = scores
    ? playerColor === "white"
      ? scores.blackPoker
      : scores.whitePoker
    : null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        entering={FadeIn.duration(300)}
        style={styles.scrim}
      >
        {/* Confetti for wins */}
        {playerWon && <ConfettiBurst />}

        <Animated.View
          entering={SlideInUp.duration(400).springify().damping(14)}
        >
          <View style={[styles.card, glassStyle]}>
            <LinearGradient
              colors={gradients.glass }
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <Animated.Text
              entering={FadeIn.duration(300).delay(staggerDelay(0, 100))}
              style={[styles.header, { color: headerColor }]}
            >
              {headerText}
            </Animated.Text>

            {/* Scores */}
            <Animated.View
              entering={FadeIn.duration(300).delay(staggerDelay(1, 100))}
              style={styles.scoreRow}
            >
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>You</Text>
                <AnimatedScore target={playerTotal} delay={300} />
                {playerPoker && (
                  <Text style={styles.pokerDetail}>
                    {pokerSummary(playerPoker)}
                  </Text>
                )}
              </View>
              <Text style={styles.vs}>vs</Text>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Opponent</Text>
                <AnimatedScore target={opponentTotal} delay={500} />
                {opponentPoker && (
                  <Text style={styles.pokerDetail}>
                    {pokerSummary(opponentPoker)}
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* Result detail */}
            <Animated.View
              entering={FadeIn.duration(300).delay(staggerDelay(2, 100))}
              style={styles.detailBox}
            >
              <Text style={styles.reason}>{resultReason(result)}</Text>
              <Text style={styles.type}>({resultLabel(result)})</Text>
            </Animated.View>

            {/* Bet Settlement */}
            {betSettlement && (
              <Animated.View
                entering={FadeIn.duration(300).delay(staggerDelay(3, 100))}
                style={styles.betSettlementBox}
              >
                <Text
                  style={[
                    styles.betAmount,
                    betSettlement.outcome === "win" && { color: colors.accent.green },
                    betSettlement.outcome === "loss" && { color: colors.accent.red },
                    betSettlement.outcome === "draw" && { color: colors.accent.blue },
                  ]}
                >
                  {betSettlement.outcome === "win" && `+$${betSettlement.betAmountUsd.toFixed(2)}`}
                  {betSettlement.outcome === "loss" && `-$${betSettlement.betAmountUsd.toFixed(2)}`}
                  {betSettlement.outcome === "draw" && `$${betSettlement.betAmountUsd.toFixed(2)} Refunded`}
                </Text>
                <Text style={styles.txHash}>
                  Tx: {betSettlement.txHash.slice(0, 6)}...{betSettlement.txHash.slice(-4)}
                </Text>
              </Animated.View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {onRematch && (
                <ActionButton
                  label={
                    rematchPending
                      ? "Waiting..."
                      : opponentWantsRematch
                      ? "Accept Rematch"
                      : "Rematch"
                  }
                  primary
                  onPress={onRematch}
                  delay={staggerDelay(4, 100)}
                />
              )}
              <ActionButton
                label="Return Home"
                onPress={onHome}
                delay={staggerDelay(5, 100)}
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: 320,
    alignItems: "center",
    gap: spacing.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border.gold,
    ...shadows.gold,
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: { fontSize: 28, fontWeight: "700", zIndex: 1 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    zIndex: 1,
  },
  scoreBox: { alignItems: "center" },
  scoreLabel: { fontSize: 12, color: colors.text.muted },
  scoreVal: { fontSize: 36, fontWeight: "700", color: colors.text.primary },
  pokerDetail: {
    fontSize: 10,
    color: colors.text.muted,
    textAlign: "center",
    maxWidth: 120,
    marginTop: 2,
  },
  vs: { fontSize: 16, color: colors.text.muted },
  detailBox: { alignItems: "center", gap: spacing.xxs, zIndex: 1 },
  reason: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
  type: { fontSize: 12, color: colors.text.muted },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    zIndex: 1,
  },
  primaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
  },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
  },
  secondaryText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  confettiContainer: {
    position: "absolute",
    top: "40%",
    left: "50%",
    width: 0,
    height: 0,
    zIndex: 10,
  },
  confettiParticle: {
    position: "absolute",
  },
  betSettlementBox: {
    alignItems: "center",
    gap: spacing.xxs,
    zIndex: 1,
  },
  betAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  txHash: {
    fontSize: 10,
    color: colors.text.muted,
  },
});
