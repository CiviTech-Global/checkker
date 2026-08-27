import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
  shadows,
} from "../../src/theme/tokens";
import { staggerDelay } from "../../src/utils/animations";
import { useSocket } from "../../src/hooks/useSocket";
import { useWallet } from "../../src/hooks/useWallet";
import { useLocalProfile, type SimpleStats } from "../../src/context/LocalProfileContext";
import Icon from "../../src/components/Icon";
import { getAvatar, AVATARS, getTier } from "@checkker/shared";

type StatsTab = "all" | "offline" | "online";

function StatCard({
  label,
  value,
  index,
}: {
  label: string;
  value: string | number;
  index: number;
}) {
  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(staggerDelay(index, 60))}
      style={[styles.statCard, glassStyle]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function combineStats(a: SimpleStats, b: SimpleStats): SimpleStats {
  return {
    gamesPlayed: a.gamesPlayed + b.gamesPlayed,
    wins: a.wins + b.wins,
    losses: a.losses + b.losses,
    draws: a.draws + b.draws,
    currentStreak: a.currentStreak + b.currentStreak,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    rating: Math.max(a.rating, b.rating),
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    connected,
    getProfile,
    onProfileData,
    authState,
    authRequest,
    authVerify,
    onAuthChallenge,
    onAuthError,
  } = useSocket();
  const wallet = useWallet();
  const {
    localProfile,
    offlineStats,
    onlineStats,
    displayName,
    updateOfflineName,
    updateAvatar,
    cacheWalletAddress,
    syncFromServer,
    getHistory,
  } = useLocalProfile();

  const [activeTab, setActiveTab] = useState<StatsTab>("all");
  const [serverGames, setServerGames] = useState<any[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localProfile.offlineName);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const authAttemptedRef = useRef<string | null>(null);

  // Sync online stats when server data arrives
  useEffect(() => {
    onProfileData((data) => {
      if (Array.isArray(data.recentGames)) {
        setServerGames(data.recentGames);
      }
      const profile = data.profile ?? data.user;
      if (profile) {
        syncFromServer({
          gamesPlayed: profile.gamesPlayed,
          wins: profile.wins,
          losses: profile.losses,
          draws: profile.draws,
          currentStreak: profile.currentStreak,
          bestStreak: profile.bestStreak,
          rating: profile.rating,
        });
      }
    });
  }, [onProfileData, syncFromServer]);

  // Fetch server profile if connected
  useEffect(() => {
    if (connected) getProfile();
  }, [connected, getProfile]);

  // Listen for auth challenge and sign it
  useEffect(() => {
    onAuthChallenge(async (data) => {
      if (!wallet.address) return;
      try {
        const signature = await wallet.sign(data.message);
        if (signature) {
          authVerify(wallet.address, signature);
        }
      } catch {
        // Signing failed; leave wallet connected but unauthenticated
      }
    });
  }, [onAuthChallenge, wallet.address, wallet.sign, authVerify]);

  useEffect(() => {
    onAuthError(() => {
      authAttemptedRef.current = null;
    });
  }, [onAuthError]);

  const isServerAuthenticated = authState?.profile != null;
  const walletVerifiedNoProfile = authState != null && authState.profile == null;

  const handleSignIn = useCallback(async () => {
    if (!wallet.address) {
      await wallet.connect();
    }
    const address = wallet.address ?? localProfile.walletAddress;
    if (address && connected && !isServerAuthenticated) {
      authAttemptedRef.current = address;
      authRequest(address);
    }
  }, [wallet, connected, isServerAuthenticated, localProfile.walletAddress, authRequest]);

  // Get stats for current tab
  const currentStats: SimpleStats =
    activeTab === "all"
      ? combineStats(offlineStats, onlineStats)
      : activeTab === "offline"
      ? offlineStats
      : onlineStats;
  const ratingTier = getTier(currentStats.rating);

  const winRate =
    currentStats.gamesPlayed > 0
      ? `${Math.round((currentStats.wins / currentStats.gamesPlayed) * 100)}%`
      : "--";

  // Game history filtered by tab
  const historyFilter =
    activeTab === "offline"
      ? { mode: ["bot", "lan"] as any }
      : activeTab === "online"
      ? { mode: ["ranked", "casual"] as any }
      : undefined;
  const gameHistory = getHistory(historyFilter, 10);

  const avatar = getAvatar(localProfile.avatarId);
  const walletAddress = localProfile.walletAddress ?? wallet.address;

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length >= 1) {
      updateOfflineName(trimmed);
    } else {
      setNameInput(localProfile.offlineName);
    }
    setEditingName(false);
  };

  const handleConnectWallet = async () => {
    await wallet.connect();
    if (wallet.address) {
      cacheWalletAddress(wallet.address);
      if (connected && !authState) {
        authAttemptedRef.current = wallet.address;
        authRequest(wallet.address);
      }
    }
  };

  // Update cached wallet when wallet connects and start server auth if needed
  useEffect(() => {
    if (wallet.address && wallet.isConnected) {
      cacheWalletAddress(wallet.address);
      if (connected && !authState && authAttemptedRef.current !== wallet.address) {
        authAttemptedRef.current = wallet.address;
        authRequest(wallet.address);
      }
    } else {
      authAttemptedRef.current = null;
    }
  }, [wallet.address, wallet.isConnected, connected, authState, cacheWalletAddress, authRequest]);

  const handleSelectAvatar = (id: string) => {
    updateAvatar(id);
    setShowAvatarPicker(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => router.push("/profile/edit")} style={styles.backBtn}>
          <Icon name="pencil" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Avatar & Name */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.avatarSection}
      >
        <TouchableOpacity onPress={() => setShowAvatarPicker(!showAvatarPicker)}>
          <LinearGradient
            colors={gradients.goldToBronze}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{avatar?.symbol ?? "\u265A"}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Editable name */}
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              ref={nameInputRef}
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              maxLength={32}
              autoFocus
              selectTextOnFocus
            />
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setNameInput(localProfile.offlineName); setEditingName(true); }}>
            <Text style={styles.playerName}>{displayName}</Text>
          </TouchableOpacity>
        )}

        {localProfile.onlineName && (
          <Text style={styles.offlineNameHint}>Offline: {localProfile.offlineName}</Text>
        )}

        <View style={styles.ratingRow}>
          <Text style={styles.ratingBadge}>{currentStats.rating} ELO</Text>
          <Text style={styles.tierBadge}>{ratingTier.label}</Text>
        </View>

        {walletAddress && (
          <Text style={styles.walletText}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </Text>
        )}
      </Animated.View>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.section, glassStyle]}>
          <Text style={styles.sectionTitle}>Choose Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((av) => (
              <TouchableOpacity
                key={av.id}
                style={[
                  styles.avatarCell,
                  localProfile.avatarId === av.id && styles.avatarSelected,
                ]}
                onPress={() => handleSelectAvatar(av.id)}
              >
                <Text style={styles.avatarSymbol}>{av.symbol}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Stats Tab Selector */}
      <Animated.View entering={FadeIn.duration(300).delay(150)} style={styles.tabRow}>
        {(["all", "offline", "online"] as StatsTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="Games" value={currentStats.gamesPlayed} index={0} />
        <StatCard label="Wins" value={currentStats.wins} index={1} />
        <StatCard label="Win Rate" value={winRate} index={2} />
        <StatCard label="Streak" value={currentStats.currentStreak} index={3} />
      </View>

      {/* W/L/D Breakdown */}
      <Animated.View
        entering={FadeIn.duration(300).delay(250)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Record</Text>
        <View style={styles.recordRow}>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.accent.green }]}>{currentStats.wins}</Text>
            <Text style={styles.recordLabel}>Wins</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.accent.red }]}>{currentStats.losses}</Text>
            <Text style={styles.recordLabel}>Losses</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.text.muted }]}>{currentStats.draws}</Text>
            <Text style={styles.recordLabel}>Draws</Text>
          </View>
        </View>
      </Animated.View>

      {/* Wallet Section */}
      <Animated.View
        entering={FadeIn.duration(300).delay(300)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Wallet</Text>
        {walletAddress ? (
          <View style={styles.walletConnected}>
            <Text style={styles.walletAddr}>
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
            </Text>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
            {isServerAuthenticated ? (
              authState?.isGuest ? (
                <View style={[styles.authBadge, { backgroundColor: colors.accent.blue + "26" }]}>
                  <Text style={[styles.authBadgeText, { color: colors.accent.blue }]}>Guest</Text>
                </View>
              ) : (
                <View style={[styles.authBadge, { backgroundColor: colors.accent.green + "26" }]}>
                  <Text style={[styles.authBadgeText, { color: colors.accent.green }]}>Signed In</Text>
                </View>
              )
            ) : walletVerifiedNoProfile ? (
              <TouchableOpacity
                style={[styles.authBadge, { backgroundColor: colors.accent.blue + "26" }]}
                onPress={() => router.push("/auth/setup")}
              >
                <Text style={[styles.authBadgeText, { color: colors.accent.blue }]}>Complete Setup</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.authBadge, { backgroundColor: colors.accent.gold + "26" }]}
                onPress={handleSignIn}
              >
                <Text style={[styles.authBadgeText, { color: colors.accent.gold }]}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.connectBtn} onPress={handleConnectWallet}>
            <Text style={styles.connectBtnText}>Connect Wallet</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Online Games with replays */}
      {serverGames.length > 0 && activeTab !== "offline" && (
        <Animated.View
          entering={FadeIn.duration(300).delay(350)}
          style={[styles.section, glassStyle]}
        >
          <Text style={styles.sectionTitle}>Online Games — Tap to Replay</Text>
          {serverGames.map((game) => {
            const resultColor =
              game.result === "win"
                ? colors.accent.green
                : game.result === "loss"
                ? colors.accent.red
                : colors.text.muted;
            const ratingDelta =
              game.myRatingAfter != null && game.myRatingBefore != null
                ? game.myRatingAfter - game.myRatingBefore
                : null;
            return (
              <TouchableOpacity
                key={game.id}
                style={styles.gameRow}
                onPress={() => router.push(`/replay/${game.id}`)}
                activeOpacity={0.6}
              >
                <Text style={[styles.gameResult, { color: resultColor }]}>
                  {game.result === "win" ? "W" : game.result === "loss" ? "L" : "D"}
                </Text>
                <Text style={styles.gameMode}>{game.mode}</Text>
                <Text style={styles.gameOpponent}>{game.opponentName ?? "--"}</Text>
                {ratingDelta != null && (
                  <Text
                    style={[
                      styles.gameDifficulty,
                      { color: ratingDelta >= 0 ? colors.accent.green : colors.accent.red },
                    ]}
                  >
                    {ratingDelta >= 0 ? "+" : ""}{ratingDelta}
                  </Text>
                )}
                <Icon name="chevron-right" size={14} color={colors.text.muted} />
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Game History */}
      {gameHistory.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(300).delay(400)}
          style={[styles.section, glassStyle]}
        >
          <Text style={styles.sectionTitle}>Recent Games</Text>
          {gameHistory.map((game, i) => {
            const resultColor =
              game.result === "win"
                ? colors.accent.green
                : game.result === "loss"
                ? colors.accent.red
                : colors.text.muted;
            return (
              <View key={game.id} style={styles.gameRow}>
                <Text style={[styles.gameResult, { color: resultColor }]}>
                  {game.result === "win" ? "W" : game.result === "loss" ? "L" : "D"}
                </Text>
                <Text style={styles.gameMode}>{game.mode}</Text>
                <Text style={styles.gameDifficulty}>{game.difficulty ?? "--"}</Text>
                <Text style={styles.gameOpponent}>{game.opponentName ?? "--"}</Text>
                <Text style={styles.gameDate}>
                  {new Date(game.playedAt).toLocaleDateString()}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Recommended Puzzles */}
      <Animated.View
        entering={FadeIn.duration(300).delay(500)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Recommended Puzzles</Text>
        <TouchableOpacity
          style={styles.puzzleBtn}
          onPress={() => router.push("/puzzles")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="puzzles" size={16} color={colors.text.primary} />
            <Text style={styles.puzzleBtnText}>Start Training</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: colors.text.primary, fontWeight: "600" },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 2,
  },
  avatarSection: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.gold,
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    color: colors.accent.gold,
  },
  playerName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
  },
  offlineNameHint: {
    fontSize: 12,
    color: colors.text.muted,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.gold,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    minWidth: 150,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  
  ratingBadge: {
    fontSize: 14,
    color: colors.accent.bronze,
    fontWeight: "600",
    backgroundColor: "rgba(205,127,50,0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.gold,
    overflow: "hidden",
  },
  
  tierBadge: {
    fontSize: 12,
    color: colors.accent.gold,
    fontWeight: "700",
    backgroundColor: "rgba(212,168,67,0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.gold,
    overflow: "hidden",
  },
  
  walletText: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: "monospace",
  },

  /* Tab selector */
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.md - 2,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "rgba(205,175,100,0.2)",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.muted,
    textTransform: "capitalize",
  },
  tabTextActive: {
    color: colors.accent.gold,
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
    marginBottom: spacing.xxs,
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  recordItem: {
    alignItems: "center",
    gap: 2,
  },
  recordValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  recordLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },

  /* Avatar picker */
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  avatarCell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: "rgba(205,175,100,0.15)",
  },
  avatarSymbol: { fontSize: 28 },

  /* Wallet */
  walletConnected: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  walletAddr: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: "monospace",
  },
  connectedBadge: {
    backgroundColor: "rgba(100,200,100,0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent.green,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent.green,
  },
  authBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
  },
  authBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  connectBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  connectBtnText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  /* Game history */
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  gameResult: {
    fontSize: 16,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
  },
  gameMode: {
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: "capitalize",
    width: 50,
  },
  gameDifficulty: {
    fontSize: 13,
    color: colors.text.muted,
    textTransform: "capitalize",
    width: 60,
  },
  gameOpponent: {
    fontSize: 13,
    color: colors.text.muted,
    flex: 1,
  },
  gameDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  puzzleBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  puzzleBtnText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
