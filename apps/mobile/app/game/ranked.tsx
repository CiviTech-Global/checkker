import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
} from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { useWallet } from "../../src/hooks/useWallet";
import { useLocalProfile } from "../../src/context/LocalProfileContext";
import Icon from "../../src/components/Icon";
import type { BotDifficulty } from "@checkker/shared";
import { BET_AMOUNTS_USD, getBetAmountUsd } from "@checkker/shared";
import ComingSoonCard from "../../src/components/ComingSoonCard";

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

export default function RankedScreen() {
  const router = useRouter();
  const {
    connected,
    gameState,
    depositStatus,
    authState,
    serverFeatures,
    authRequest,
    joinRanked,
    onBetCancelled,
    onQueueJoined,
  } = useSocket();
  const [searching, setSearching] = useState(false);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ betAmountUsd: number } | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [depositTxPending, setDepositTxPending] = useState(false);
  const [depositTxSent, setDepositTxSent] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const wallet = useWallet();
  const { cacheWalletAddress } = useLocalProfile();

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

  const handleSelectTier = async (tier: DifficultyTier, stake: "free" | "bet") => {
    if (!connected) return;

    // Auth gate: require wallet connection only for bet games
    if (stake === "bet" && !wallet.isConnected) {
      setAuthPending(true);
      await wallet.connect();
      setAuthPending(false);
      if (!wallet.address) return; // user cancelled
      cacheWalletAddress(wallet.address);
    }

    // Auto-trigger server auth if wallet connected but not authenticated
    if (stake === "bet" && wallet.isConnected && !authState) {
      setAuthPending(true);
      authRequest(wallet.address!);
      // Auth flow completes asynchronously via socket events
      // Wait briefly then proceed — auth_success will set authState
      await new Promise((r) => setTimeout(r, 1500));
      setAuthPending(false);
    }

    setSelectedTier(tier);
    setSearching(true);
    setCancelReason(null);
    joinRanked(tier.id, "blitz", false, stake);
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

  // Auth pending screen
  if (authPending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.gold} />
        <Text style={styles.searchText}>Connecting wallet...</Text>
      </View>
    );
  }

  // Deposit waiting screen
  if (depositStatus) {
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
              style={[styles.depositBtn, depositTxPending && styles.createBtnDisabled]}
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
        <Text style={styles.subtitle}>Ranked Match</Text>

        <View style={styles.searchingSection}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Searching for opponent...</Text>
          {selectedTier && (
            <Text style={styles.modeText}>
              Ranked {selectedTier.label} {"\u2022"} Blitz
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
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
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
        {TIERS.map((tier, index) => {
          const betAmount = getBetAmountUsd(tier.id);
          const bettingEnabled = serverFeatures?.bettingEnabled ?? false;

          return (
            <View key={tier.id} style={styles.tierBlock}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierTitle}>{tier.label}</Text>
                <View style={styles.starsRow}>
                  {Array.from({ length: 4 }, (_, i) => (
                    <Text key={i} style={[styles.star, { color: i < tier.stars ? tier.color : colors.text.muted }]}>
                      {i < tier.stars ? "\u2666" : "\u2662"}
                    </Text>
                  ))}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.freeBtn, !connected && styles.actionDisabled]}
                  onPress={() => handleSelectTier(tier, "free")}
                  disabled={!connected}
                  activeOpacity={0.9}
                >
                  <Text style={styles.freeBtnText}>Play Free</Text>
                </TouchableOpacity>

                {bettingEnabled ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.betBtn, !connected && styles.actionDisabled]}
                    onPress={() => handleSelectTier(tier, "bet")}
                    disabled={!connected}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.betBtnText}>Bet ${betAmount}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.comingSoonWrap}>
                    <ComingSoonCard label={`Bet $${betAmount}`} index={index} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
  tierBlock: { marginBottom: spacing.md },
  tierHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  tierTitle: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  starsRow: { flexDirection: "row", gap: 2 },
  star: { fontSize: 18, fontWeight: "700", color: colors.accent.gold },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: "center", justifyContent: "center" },
  actionDisabled: { opacity: 0.5 },
  freeBtn: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.gold },
  freeBtnText: { color: colors.text.primary, fontSize: 16, fontWeight: "700" },
  betBtn: { backgroundColor: colors.accent.gold },
  betBtnText: { color: colors.bg.primary, fontSize: 16, fontWeight: "800" },
  comingSoonWrap: { flex: 1 },
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
  depositBtn: {
    backgroundColor: colors.accent.gold,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    minWidth: 200,
    alignItems: "center",
  },
  depositBtnText: { color: colors.bg.primary, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  confirmingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  confirmingText: { fontSize: 14, color: colors.accent.gold },
  depositError: { fontSize: 13, color: colors.accent.red, textAlign: "center", marginTop: spacing.sm },
  createBtnDisabled: { opacity: 0.5 },
});
