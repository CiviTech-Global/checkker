import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
} from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import type { BotDifficulty } from "@checkker/shared";
import { BET_AMOUNTS_USD } from "@checkker/shared";

type DifficultyTier = {
  id: BotDifficulty;
  label: string;
  betUsd: number;
  stars: number;
  color: string;
};

const TIERS: DifficultyTier[] = [
  { id: "beginner", label: "Beginner", betUsd: BET_AMOUNTS_USD.beginner, stars: 1, color: colors.accent.green },
  { id: "intermediate", label: "Intermediate", betUsd: BET_AMOUNTS_USD.intermediate, stars: 2, color: colors.accent.gold },
  { id: "advanced", label: "Advanced", betUsd: BET_AMOUNTS_USD.advanced, stars: 3, color: colors.accent.bronze },
  { id: "master", label: "Master", betUsd: BET_AMOUNTS_USD.master, stars: 4, color: colors.accent.red },
];

function TierCard({
  tier,
  index,
  onPress,
  disabled,
}: {
  tier: DifficultyTier;
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
          <View style={[styles.leftBorder, { backgroundColor: tier.color }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.starsRow}>
                {Array.from({ length: 4 }, (_, i) => (
                  <Text key={i} style={[styles.star, { color: i < tier.stars ? tier.color : colors.text.muted }]}>
                    {i < tier.stars ? "\u2666" : "\u2662"}
                  </Text>
                ))}
              </View>
            </View>
            <Text style={styles.cardTitle}>{tier.label}</Text>
            <Text style={styles.betText}>Bet: ${tier.betUsd}</Text>
          </View>
          <View style={styles.betBadge}>
            <Text style={styles.betBadgeText}>${tier.betUsd}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RankedScreen() {
  const router = useRouter();
  const {
    connected,
    gameState,
    depositStatus,
    joinRanked,
    onBetCancelled,
    onQueueJoined,
  } = useSocket();
  const [searching, setSearching] = useState(false);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ betAmountUsd: number } | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${(gameState as any).gameId}`);
    }
  }, [gameState]);

  useEffect(() => {
    onQueueJoined((data) => setQueueInfo({ betAmountUsd: data.betAmountUsd }));
    onBetCancelled((data) => {
      setCancelReason(data.reason);
      setSearching(false);
    });
  }, [onQueueJoined, onBetCancelled]);

  const handleSelectTier = (tier: DifficultyTier) => {
    if (!connected) return;
    setSelectedTier(tier);
    setSearching(true);
    setCancelReason(null);
    joinRanked(tier.id, "blitz");
  };

  // Deposit waiting screen
  if (depositStatus) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.depositSection}>
          <Text style={styles.title}>Confirm Bet</Text>
          <Text style={styles.depositAmount}>${depositStatus.betAmountUsd}</Text>
          <Text style={styles.depositWei}>{depositStatus.betAmountWei} wei</Text>

          <View style={styles.depositChecks}>
            <View style={styles.depositRow}>
              <Text style={styles.depositIcon}>{depositStatus.myDeposit ? "\u2705" : "\u23F3"}</Text>
              <Text style={styles.depositLabel}>Your deposit</Text>
            </View>
            <View style={styles.depositRow}>
              <Text style={styles.depositIcon}>{depositStatus.opponentDeposit ? "\u2705" : "\u23F3"}</Text>
              <Text style={styles.depositLabel}>Opponent deposit</Text>
            </View>
          </View>

          {!depositStatus.myDeposit && (
            <Text style={styles.depositHint}>
              Send {depositStatus.betAmountWei} wei to the contract to confirm your bet.
            </Text>
          )}
        </Animated.View>
      </View>
    );
  }

  // Searching screen
  if (searching) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Checkker</Text>
        <Text style={styles.subtitle}>Ranked Match</Text>

        <View style={styles.searchingSection}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Searching for opponent...</Text>
          {selectedTier && (
            <Text style={styles.modeText}>
              Ranked {selectedTier.label} {"\u2022"} Bet ${selectedTier.betUsd} {"\u2022"} Blitz
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setSearching(false);
            setSelectedTier(null);
          }}
        >
          <Text style={styles.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ranked Play</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.Text entering={FadeIn.duration(300).delay(100)} style={styles.sectionLabel}>
        Choose Your Tier
      </Animated.Text>

      {cancelReason && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.cancelNotice}>
          <Text style={styles.cancelNoticeText}>{cancelReason}</Text>
        </Animated.View>
      )}

      <View style={styles.content}>
        {TIERS.map((tier, index) => (
          <TierCard
            key={tier.id}
            tier={tier}
            index={index}
            onPress={() => handleSelectTier(tier)}
            disabled={!connected}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    width: "100%",
    position: "absolute",
    top: 0,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: colors.text.primary, fontWeight: "600" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.accent.gold, textAlign: "center", letterSpacing: 2 },
  title: { fontSize: 36, fontWeight: "800", color: colors.accent.gold, letterSpacing: 3 },
  subtitle: { fontSize: 16, color: colors.text.secondary },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: colors.accent.gold, letterSpacing: 1, marginBottom: spacing.sm, textAlign: "center", marginTop: spacing.xxl + spacing.xl },
  content: { width: "100%", paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: { borderRadius: radius.lg, marginBottom: spacing.md, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: colors.border.gold },
  leftBorder: { width: 4 },
  cardContent: { flex: 1, padding: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  starsRow: { flexDirection: "row", gap: 2 },
  star: { fontSize: 20, fontWeight: "700" },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.text.primary },
  betText: { fontSize: 14, color: colors.accent.gold, marginTop: 4, fontWeight: "600" },
  betBadge: { justifyContent: "center", paddingHorizontal: spacing.md },
  betBadgeText: { fontSize: 20, fontWeight: "800", color: colors.accent.gold },
  // Searching
  searchingSection: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  searchText: { fontSize: 16, color: colors.text.primary, marginTop: spacing.md },
  modeText: { fontSize: 14, color: colors.text.muted },
  cancelBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary, marginTop: spacing.xl },
  cancelText: { color: colors.text.primary, fontSize: 16, fontWeight: "600" },
  cancelNotice: { backgroundColor: "rgba(255,100,100,0.15)", borderRadius: radius.md, padding: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  cancelNoticeText: { color: colors.accent.red, fontSize: 14, textAlign: "center" },
  // Deposit
  depositSection: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  depositAmount: { fontSize: 48, fontWeight: "800", color: colors.accent.gold },
  depositWei: { fontSize: 14, color: colors.text.muted },
  depositChecks: { gap: spacing.sm, marginTop: spacing.md },
  depositRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  depositIcon: { fontSize: 20 },
  depositLabel: { fontSize: 16, color: colors.text.primary },
  depositHint: { fontSize: 13, color: colors.text.secondary, textAlign: "center", marginTop: spacing.md },
});
