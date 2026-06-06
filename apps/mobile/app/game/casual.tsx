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
import { useWallet } from "../../src/hooks/useWallet";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import type { BotDifficulty } from "@checkker/shared";
import { BET_AMOUNTS_USD, isFreeGame } from "@checkker/shared";

type DifficultyTier = {
  id: BotDifficulty;
  label: string;
  betUsd: number;
  isFree: boolean;
  stars: number;
  color: string;
};

const TIERS: DifficultyTier[] = [
  { id: "beginner", label: "Beginner", betUsd: 0, isFree: true, stars: 1, color: colors.accent.green },
  { id: "intermediate", label: "Intermediate", betUsd: BET_AMOUNTS_USD.intermediate, isFree: false, stars: 2, color: colors.accent.gold },
  { id: "advanced", label: "Advanced", betUsd: BET_AMOUNTS_USD.advanced, isFree: false, stars: 3, color: colors.accent.bronze },
  { id: "master", label: "Master", betUsd: BET_AMOUNTS_USD.master, isFree: false, stars: 4, color: colors.accent.red },
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
            <Text style={styles.betText}>
              {tier.isFree ? "Play Free" : `Bet: $${tier.betUsd}`}
            </Text>
          </View>
          <View style={styles.betBadge}>
            <Text style={[styles.betBadgeText, tier.isFree && { color: colors.accent.green }]}>
              {tier.isFree ? "FREE" : `$${tier.betUsd}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CasualScreen() {
  const router = useRouter();
  const {
    connected,
    gameState,
    depositStatus,
    joinCasual,
    joinCasualDifficulty,
    requestBot,
    onBotFallbackOffer,
    onBetCancelled,
  } = useSocket();
  const [searching, setSearching] = useState(false);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier | null>(null);
  const [botOffer, setBotOffer] = useState<{ tc: string } | null>(null);
  const [depositTxPending, setDepositTxPending] = useState(false);
  const [depositTxSent, setDepositTxSent] = useState(false);
  const wallet = useWallet();

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${(gameState as any).gameId}`);
    }
  }, [gameState]);

  useEffect(() => {
    onBotFallbackOffer((data) => setBotOffer(data));
    onBetCancelled(() => {
      setSearching(false);
      setSelectedTier(null);
    });
  }, [onBotFallbackOffer, onBetCancelled]);

  const handleSelectTier = (tier: DifficultyTier) => {
    if (!connected) return;
    setSelectedTier(tier);
    setSearching(true);
    joinCasualDifficulty(tier.id, "blitz");
  };

  const handleDeposit = async () => {
    if (!depositStatus || depositTxPending || depositTxSent) return;
    setDepositTxPending(true);
    try {
      const txHash = await wallet.depositToEscrow(
        depositStatus.contractAddress,
        depositStatus.gameId,
        depositStatus.betAmountWei
      );
      if (txHash) {
        setDepositTxSent(true);
      }
    } catch {
      // error is set on wallet.error
    }
    setDepositTxPending(false);
  };

  // Deposit waiting screen for paid casual tiers
  if (depositStatus && selectedTier && !selectedTier.isFree) {
    const { formatEther } = require("ethers");
    const displayAmount = (() => {
      try { return parseFloat(formatEther(depositStatus.betAmountWei)).toFixed(4); }
      catch { return depositStatus.betAmountWei; }
    })();

    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.depositSection}>
          <Text style={styles.title}>Confirm Bet</Text>
          <Text style={styles.depositAmount}>${depositStatus.betAmountUsd}</Text>
          <Text style={styles.depositWei}>{displayAmount} BNB</Text>

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

          {!depositStatus.myDeposit && !depositTxSent && (
            <TouchableOpacity
              style={[styles.depositBtn, depositTxPending && styles.depositBtnDisabled]}
              onPress={handleDeposit}
              disabled={depositTxPending}
            >
              {depositTxPending ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.depositBtnText}>Deposit {displayAmount} BNB</Text>
              )}
            </TouchableOpacity>
          )}

          {depositTxSent && !depositStatus.myDeposit && (
            <View style={styles.confirmingRow}>
              <ActivityIndicator size="small" color={colors.accent.gold} />
              <Text style={styles.confirmingText}>Confirming on-chain...</Text>
            </View>
          )}

          {wallet.error && (
            <Text style={styles.depositError}>{wallet.error}</Text>
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
        <Text style={styles.subtitle}>Casual Match</Text>

        <View style={styles.searchingSection}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Searching for opponent...</Text>
          {selectedTier && (
            <Text style={styles.modeText}>
              Casual {selectedTier.label} {"\u2022"}{" "}
              {selectedTier.isFree ? "Free" : `$${selectedTier.betUsd}`} {"\u2022"} Blitz
            </Text>
          )}
        </View>

        {botOffer && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.botModal}>
            <Text style={styles.modalTitle}>No opponent found</Text>
            <Text style={styles.modalText}>Would you like to play against a bot instead?</Text>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => {
                requestBot(selectedTier?.id ?? "intermediate", botOffer.tc);
                setBotOffer(null);
              }}
            >
              <Text style={styles.acceptText}>Play vs Bot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keepSearchingBtn}
              onPress={() => {
                joinCasualDifficulty(selectedTier?.id ?? "beginner", botOffer.tc);
                setBotOffer(null);
              }}
            >
              <Text style={styles.keepSearchingText}>Keep Searching</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

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

  // Difficulty selection screen
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Casual Play</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.Text entering={FadeIn.duration(300).delay(100)} style={styles.sectionLabel}>
        Choose Difficulty
      </Animated.Text>

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
  // Bot modal
  botModal: { position: "absolute", top: "40%", left: spacing.lg, right: spacing.lg, backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: spacing.md, zIndex: 100 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text.primary },
  modalText: { fontSize: 14, color: colors.text.secondary, textAlign: "center" },
  acceptBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accent.primary, width: "100%", alignItems: "center" },
  acceptText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  keepSearchingBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.text.muted, width: "100%", alignItems: "center" },
  keepSearchingText: { color: colors.text.primary, fontSize: 14 },
  // Deposit
  depositSection: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  depositAmount: { fontSize: 48, fontWeight: "800", color: colors.accent.gold },
  depositWei: { fontSize: 14, color: colors.text.muted },
  depositChecks: { gap: spacing.sm, marginTop: spacing.md },
  depositRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  depositIcon: { fontSize: 20 },
  depositLabel: { fontSize: 16, color: colors.text.primary },
  depositBtn: {
    backgroundColor: colors.accent.gold,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    minWidth: 200,
    alignItems: "center",
  },
  depositBtnDisabled: { opacity: 0.5 },
  depositBtnText: { color: colors.bg.primary, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  confirmingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  confirmingText: { fontSize: 14, color: colors.accent.gold },
  depositError: { fontSize: 13, color: colors.accent.red, textAlign: "center", marginTop: spacing.sm },
});
