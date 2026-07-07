import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { colors, radius, spacing, typography } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { useBot } from "../../src/context/BotContext";
import { lastPlayed, type LastPlayedMatch } from "../../src/services/LastPlayedService";
import { haptics } from "../../src/services/HapticsService";
import Icon from "../../src/components/Icon";

/* ── Deposit countdown ───────────────────────────────────────────────── */

function DepositPanel({
  deadline,
  betAmountUsd,
  myDeposit,
  opponentDeposit,
}: {
  deadline: Date;
  betAmountUsd: number;
  myDeposit: boolean;
  opponentDeposit: boolean;
}) {
  const [remainingMs, setRemainingMs] = useState(() => deadline.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = deadline.getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const expired = remainingMs <= 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeText = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <Animated.View entering={SlideInUp.duration(300)} style={styles.depositCard}>
      <View style={styles.depositHeader}>
        <Icon name="wallet" size={20} color={colors.accent.gold} />
        <Text style={styles.depositTitle}>Confirm Your Bet</Text>
      </View>
      <Text style={styles.depositAmount}>${betAmountUsd.toFixed(2)}</Text>

      <View style={styles.depositStatusRow}>
        <View style={styles.depositPill}>
          <Text style={[styles.depositPillText, myDeposit && { color: colors.accent.green }]}>
            {myDeposit ? "✓ You deposited" : "⏳ Waiting for you"}
          </Text>
        </View>
        <View style={styles.depositPill}>
          <Text style={[styles.depositPillText, opponentDeposit && { color: colors.accent.green }]}>
            {opponentDeposit ? "✓ Opponent deposited" : "⏳ Waiting for opponent"}
          </Text>
        </View>
      </View>

      <Text style={[styles.depositTimer, expired && { color: colors.accent.red }]}>
        {expired ? "Deposit window expired" : `Time remaining: ${timeText}`}
      </Text>
    </Animated.View>
  );
}

/* ── Queue screen ────────────────────────────────────────────────────── */

export default function QueueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    tc?: string;
    stake?: string;
    bot?: string;
  }>();
  const mode = params.mode ?? "ranked";
  const difficulty = params.difficulty ?? "beginner";
  const tc = params.tc ?? "blitz";
  const stake = (params.stake ?? "free") as "free" | "bet";
  const isBot = params.bot === "true";

  const { connected, joinRanked, joinCasualDifficulty, gameState, requestBot, onBotFallbackOffer, onQueueError, depositStatus } = useSocket();
  const { setInBotMatch } = useBot();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botOffer, setBotOffer] = useState<{ tc: string } | null>(null);
  const deadlineRef = useRef<Date | null>(null);

  useEffect(() => {
    setInBotMatch(isBot);
  }, [isBot, setInBotMatch]);

  useEffect(() => {
    lastPlayed.save({ mode: mode as LastPlayedMatch["mode"], difficulty, tc, stake, isBot });
  }, [mode, difficulty, tc, stake, isBot]);

  useEffect(() => {
    if (connected && !searching && !error) {
      setSearching(true);
      if (mode === "casual") {
        joinCasualDifficulty(difficulty, tc, isBot, stake);
      } else {
        joinRanked(difficulty, tc, isBot, stake);
      }
    }
  }, [connected, searching, error, mode, difficulty, tc, isBot, stake, joinCasualDifficulty, joinRanked]);

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${gameState.gameId}`);
    }
  }, [gameState, router]);

  useEffect(() => {
    onBotFallbackOffer((data) => setBotOffer(data));
  }, [onBotFallbackOffer]);

  useEffect(() => {
    onQueueError((msg) => {
      setSearching(false);
      setError(msg);
      haptics.loss();
    });
  }, [onQueueError]);

  useEffect(() => {
    if (depositStatus && !deadlineRef.current) {
      deadlineRef.current = new Date(Date.now() + depositStatus.timeoutMs);
    }
  }, [depositStatus]);

  const handleAcceptBot = useCallback(() => {
    if (!botOffer) return;
    requestBot("intermediate", botOffer.tc);
    setBotOffer(null);
  }, [botOffer, requestBot]);

  const handleKeepSearching = useCallback(() => {
    if (!botOffer) return;
    // Fallback to old join_queue for keep-searching path
    setSearching(true);
    setBotOffer(null);
  }, [botOffer]);

  return (
    <View style={styles.container}>
      <Animated.Text entering={FadeIn.duration(300)} style={styles.title}>
        {mode === "casual" ? "Casual Match" : "Ranked Match"}
      </Animated.Text>
      <Text style={styles.subtitle}>
        {difficulty[0].toUpperCase() + difficulty.slice(1)} • {tc} • {stake === "bet" ? "Bet" : "Free"}
      </Text>

      {error ? (
        <View style={styles.centerBox}>
          <Icon name="incorrect" size={40} color={colors.accent.red} />
          <Text style={[styles.searchText, { color: colors.accent.red, marginTop: spacing.md }]}>{error}</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace("/")}>
            <Text style={styles.cancelText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : depositStatus ? (
        <View style={styles.centerBox}>
          <DepositPanel
            deadline={deadlineRef.current ?? new Date(Date.now() + depositStatus.timeoutMs)}
            betAmountUsd={depositStatus.betAmountUsd}
            myDeposit={depositStatus.myDeposit}
            opponentDeposit={depositStatus.opponentDeposit}
          />
          <Text style={styles.waitingText}>Game starts once both deposits are confirmed.</Text>
        </View>
      ) : searching ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Searching for opponent…</Text>
          {isBot && (
            <View style={styles.botBadge}>
              <Text style={styles.botBadgeText}>🤖 Bot Delegate Active</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Connecting to server…</Text>
        </View>
      )}

      {botOffer && (
        <Animated.View entering={SlideInUp.duration(300)} style={styles.botModal}>
          <Text style={styles.modalTitle}>No opponent found</Text>
          <Text style={styles.modalText}>Would you like to play against a bot instead?</Text>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptBot}>
            <Text style={styles.acceptText}>Play vs Bot (Intermediate)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepSearchingBtn} onPress={handleKeepSearching}>
            <Text style={styles.keepSearchingText}>Keep Searching</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {!depositStatus && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace("/")}>
          <Text style={styles.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
    color: colors.accent.gold,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  centerBox: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
  },
  searchText: {
    fontSize: typography.size.body,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  waitingText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  botBadge: {
    backgroundColor: `${colors.accent.gold}20`,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  botBadgeText: {
    fontSize: typography.size.sm,
    color: colors.accent.gold,
    fontWeight: typography.weight.bold,
  },
  cancelBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    marginTop: spacing.lg,
  },
  cancelText: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semiBold,
  },
  botModal: {
    position: "absolute",
    top: "35%",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    zIndex: 100,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  modalTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalText: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    textAlign: "center",
  },
  acceptBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    width: "100%",
    alignItems: "center",
  },
  acceptText: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semiBold,
  },
  keepSearchingBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.text.muted,
    width: "100%",
    alignItems: "center",
  },
  keepSearchingText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
  },
  depositCard: {
    width: "100%",
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  depositHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  depositTitle: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  depositAmount: {
    color: colors.accent.gold,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
  },
  depositStatusRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  depositPill: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  depositPillText: {
    color: colors.text.muted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
  },
  depositTimer: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
