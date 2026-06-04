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
  const [skills] = useState<SkillData>(DEFAULT_SKILLS);

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
            <Text style={styles.avatarText}>{"\u265A"}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.playerName}>Player</Text>
        <Text style={styles.ratingBadge}>1200 ELO</Text>
        <Text style={styles.styleBadge}>Balanced</Text>
      </Animated.View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="Games" value={0} index={0} />
        <StatCard label="Wins" value={0} index={1} />
        <StatCard label="Win Rate" value="--" index={2} />
        <StatCard label="Streak" value={0} index={3} />
      </View>

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

      {/* Weaknesses */}
      <Animated.View
        entering={FadeIn.duration(300).delay(500)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Areas to Improve</Text>
        <Text style={styles.weaknessText}>{"\u2022"} Play more games to generate analysis</Text>
      </Animated.View>

      {/* Recommended Puzzles */}
      <Animated.View
        entering={FadeIn.duration(300).delay(600)}
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
  styleBadge: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: "500",
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
  weaknessText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
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
