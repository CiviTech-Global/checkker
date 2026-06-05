import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
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
import { getAvatar, AVATARS } from "@checkker/shared";

interface SkillData {
  opening: number;
  middlegame: number;
  endgame: number;
  cards: number;
  poker: number;
}

const DEFAULT_SKILLS: SkillData = {
  opening: 45,
  middlegame: 50,
  endgame: 35,
  cards: 60,
  poker: 40,
};

function SkillBar({
  label,
  value,
  color,
  index,
}: {
  label: string;
  value: number;
  color: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(staggerDelay(index, 80))}
      style={styles.skillRow}
    >
      <Text style={styles.skillLabel}>{label}</Text>
      <View style={styles.skillTrack}>
        <View style={[styles.skillFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.skillValue}>{value}</Text>
    </Animated.View>
  );
}

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

export default function ProfileScreen() {
  const router = useRouter();
  const { connected, getProfile, onProfileData, authState } = useSocket();
  const [skills] = useState<SkillData>(DEFAULT_SKILLS);
  const [profileData, setProfileData] = useState<{
    profile: any;
    recentGames: any[];
    rank?: number;
    user?: any;
  } | null>(null);

  useEffect(() => {
    onProfileData((data) => setProfileData(data));
  }, [onProfileData]);

  useEffect(() => {
    if (connected) getProfile();
  }, [connected, getProfile]);

  const profile = profileData?.profile;
  const user = profileData?.user;
  const displayName = profile?.displayName ?? user?.username ?? "Player";
  const rating = profile?.rating ?? user?.rating ?? 1200;
  const gamesPlayed = profile?.gamesPlayed ?? user?.gamesPlayed ?? 0;
  const wins = profile?.wins ?? user?.wins ?? 0;
  const losses = profile?.losses ?? user?.losses ?? 0;
  const draws = profile?.draws ?? user?.draws ?? 0;
  const currentStreak = profile?.currentStreak ?? user?.currentStreak ?? 0;
  const avatarId = profile?.avatarId ?? user?.avatarId ?? "king_white";
  const avatar = getAvatar(avatarId);
  const winRate = gamesPlayed > 0 ? `${Math.round((wins / gamesPlayed) * 100)}%` : "--";
  const rank = profileData?.rank;
  const walletAddress = authState?.walletAddress ?? profile?.walletAddress;

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
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Avatar & Name */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.avatarSection}
      >
        <LinearGradient
          colors={gradients.goldToBronze}
          style={styles.avatarRing}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{avatar?.symbol ?? "\u265A"}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.playerName}>{displayName}</Text>
        <Text style={styles.ratingBadge}>{rating} ELO</Text>
        {rank != null && (
          <Text style={styles.rankBadge}>Rank #{rank}</Text>
        )}
        {walletAddress && (
          <Text style={styles.walletText}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </Text>
        )}
      </Animated.View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="Games" value={gamesPlayed} index={0} />
        <StatCard label="Wins" value={wins} index={1} />
        <StatCard label="Win Rate" value={winRate} index={2} />
        <StatCard label="Streak" value={currentStreak} index={3} />
      </View>

      {/* W/L/D Breakdown */}
      <Animated.View
        entering={FadeIn.duration(300).delay(250)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Record</Text>
        <View style={styles.recordRow}>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.accent.green }]}>{wins}</Text>
            <Text style={styles.recordLabel}>Wins</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.accent.red }]}>{losses}</Text>
            <Text style={styles.recordLabel}>Losses</Text>
          </View>
          <View style={styles.recordItem}>
            <Text style={[styles.recordValue, { color: colors.text.muted }]}>{draws}</Text>
            <Text style={styles.recordLabel}>Draws</Text>
          </View>
        </View>
      </Animated.View>

      {/* Skill Radar */}
      <Animated.View
        entering={FadeIn.duration(300).delay(300)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Skill Breakdown</Text>
        <SkillBar label="Opening" value={skills.opening} color={colors.accent.green} index={0} />
        <SkillBar label="Middlegame" value={skills.middlegame} color={colors.accent.blue} index={1} />
        <SkillBar label="Endgame" value={skills.endgame} color={colors.accent.gold} index={2} />
        <SkillBar label="Card Play" value={skills.cards} color={colors.accent.primary} index={3} />
        <SkillBar label="Poker" value={skills.poker} color={colors.accent.red} index={4} />
      </Animated.View>

      {/* Recent Games */}
      {profileData?.recentGames && profileData.recentGames.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(300).delay(400)}
          style={[styles.section, glassStyle]}
        >
          <Text style={styles.sectionTitle}>Recent Games</Text>
          {profileData.recentGames.map((game: any, i: number) => (
            <View key={game.id ?? i} style={styles.gameRow}>
              <Text style={[
                styles.gameResult,
                { color: game.winnerUserId === authState?.walletAddress ? colors.accent.green : game.resultType === "draw" ? colors.text.muted : colors.accent.red },
              ]}>
                {game.winnerUserId === authState?.walletAddress ? "W" : game.resultType === "draw" ? "D" : "L"}
              </Text>
              <Text style={styles.gameMode}>{game.mode}</Text>
              <Text style={styles.gameDifficulty}>{game.difficulty}</Text>
              <Text style={styles.gameDate}>
                {game.endedAt ? new Date(game.endedAt).toLocaleDateString() : ""}
              </Text>
            </View>
          ))}
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
          <Text style={styles.puzzleBtnText}>{"\u2666"} Start Training</Text>
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
  rankBadge: {
    fontSize: 13,
    color: colors.accent.gold,
    fontWeight: "600",
  },
  walletText: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: "monospace",
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
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  skillLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    width: 80,
  },
  skillTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.subtle,
    borderRadius: 4,
    overflow: "hidden",
  },
  skillFill: {
    height: "100%",
    borderRadius: 4,
  },
  skillValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.primary,
    width: 28,
    textAlign: "right",
  },
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
    width: 60,
  },
  gameDifficulty: {
    fontSize: 13,
    color: colors.text.muted,
    textTransform: "capitalize",
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
