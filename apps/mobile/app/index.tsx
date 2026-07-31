import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { getAvatar, getTier } from "@checkker/shared";
import {
  colors,
  spacing,
  radius,
  gradients,
  shadows,
  typography,
} from "../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../src/utils/animations";
import { useLocalProfile } from "../src/context/LocalProfileContext";
import { lastPlayed, type LastPlayedMatch } from "../src/services/LastPlayedService";
import { haptics } from "../src/services/HapticsService";
import { onboarding } from "../src/services/OnboardingService";
import Icon, { type IconName } from "../src/components/Icon";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatModeLabel(match: LastPlayedMatch) {
  const difficulty = match.difficulty[0].toUpperCase() + match.difficulty.slice(1);
  const mode = match.mode === "ranked" ? "Ranked" : "Casual";
  return `${mode} • ${difficulty} • ${match.tc}`;
}

/* ── Header ──────────────────────────────────────────────────────────── */

function ProfileHeader({ onSettings, onProfile }: { onSettings: () => void; onProfile: () => void }) {
  const { localProfile, displayName, onlineStats } = useLocalProfile();
  const avatar = getAvatar(localProfile.avatarId);
  const tier = getTier(onlineStats.rating);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onProfile}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarSymbol}>{avatar.symbol}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.headerText}>
        <Text style={styles.displayName}>{displayName}</Text>
        <View style={styles.tierRow}>
          <Text style={styles.tierName}>{tier.label}</Text>
          <Text style={styles.rating}>{onlineStats.rating}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onSettings}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Icon name="settings" size={22} color={colors.text.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Play Now ────────────────────────────────────────────────────────── */

function PlayNowCard({ match, onPress, index }: { match: LastPlayedMatch | null; onPress: () => void; index: number }) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress(0.97);

  return (
    <Animated.View
      entering={SlideInUp.duration(350).delay(staggerDelay(index, 60) + 200).springify().damping(15)}
      style={[styles.playNowContainer, animatedStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          haptics.impact();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Play now"
      >
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.playNowGradient}
        >
          <View style={styles.playNowContent}>
            <View style={styles.playNowIconCircle}>
              <Icon name="play-now" size={32} color={colors.bg.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playNowTitle}>Play Now</Text>
              <Text style={styles.playNowSubtitle}>
                {match ? formatModeLabel(match) : "Ranked • Beginner • Blitz"}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.bg.primary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Category Grid ───────────────────────────────────────────────────── */

type CategoryItem = {
  label: string;
  icon: IconName;
  route: string;
  color?: string;
  testID?: string;
};

const CATEGORIES: CategoryItem[] = [
  { label: "Ranked", icon: "swords", route: "/game/ranked", color: colors.accent.gold },
  { label: "Casual", icon: "casual", route: "/game/casual", color: colors.accent.green },
  { label: "Play Bot", icon: "bot", route: "/bot/difficulty", color: colors.accent.blue },
  { label: "LAN", icon: "lan", route: "/lan", color: colors.accent.terraCotta },
  { label: "Puzzles", icon: "puzzles", route: "/puzzles", color: colors.accent.bronze },
  { label: "Tutorials", icon: "school", route: "/tutorial", color: colors.accent.primary },
  { label: "Friends", icon: "users", route: "/friends", color: colors.accent.goldBright },
  { label: "Leaderboard", icon: "leaderboard", route: "/leaderboard", color: colors.accent.red },
  { label: "Spectate", icon: "spectate", route: "/spectate", color: colors.accent.lapis },
  { label: "Shop", icon: "shop", route: "/shop", color: colors.accent.gold },
];

function CategoryCard({ item, index, onPress }: { item: CategoryItem; index: number; onPress: (route: string) => void }) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress(0.96);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(staggerDelay(index, 45) + 350).springify().damping(15)}
      style={[styles.categoryCell, animatedStyle]}
    >
      <TouchableOpacity
        onPress={() => {
          haptics.selection();
          onPress(item.route);
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
        style={styles.categoryButton}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View style={[styles.categoryIconCircle, { backgroundColor: `${item.color ?? colors.accent.primary}20` }]}>
          <Icon name={item.icon} size={22} color={item.color ?? colors.accent.primary} />
        </View>
        <Text style={styles.categoryLabel}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────── */

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lastMatch, setLastMatch] = useState<LastPlayedMatch | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([lastPlayed.get(), onboarding.isComplete()]).then(([match, complete]) => {
      if (!mounted) return;
      if (!complete) {
        router.replace("/onboarding");
        return;
      }
      setLastMatch(match);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const handlePlayNow = useCallback(() => {
    const match = lastMatch ?? { mode: "ranked", difficulty: "beginner", tc: "blitz", stake: "free", isBot: false };
    lastPlayed.save(match);
    const path = `/game/queue?mode=${match.mode}&difficulty=${match.difficulty}&tc=${match.tc}&stake=${match.stake}&bot=${match.isBot}`;
    router.push(path);
  }, [lastMatch, router]);

  const navigate = useCallback((route: string) => {
    router.push(route as `./${string}`);
  }, [router]);



    if (!ready) {
      return (
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: colors.text.muted }}>Loading…</Text>
        </View>
      );
    }

    return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          onSettings={() => router.push("/settings")}
          onProfile={() => router.push("/profile")}
        />

        <View style={styles.logoRow}>
          <Image source={require("../assets/logo.webp")} style={styles.logo} />
          <Text style={styles.logoText}>Checkker</Text>
        </View>

        <PlayNowCard match={lastMatch} onPress={handlePlayNow} index={0} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Play & Train</Text>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((item, i) => (
            <CategoryCard key={item.label} item={item} index={i} onPress={navigate} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    padding: 2,
    ...shadows.sm,
  },
  avatar: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colors.bg.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSymbol: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  displayName: {
    color: colors.text.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  tierName: {
    color: colors.accent.gold,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
  },
  rating: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
  },
  logoText: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
    letterSpacing: 3,
  },
  playNowContainer: {
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  playNowGradient: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  playNowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  playNowIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: "rgba(20,16,31,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  playNowTitle: {
    color: colors.bg.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
  },
  playNowSubtitle: {
    color: "rgba(20,16,31,0.75)",
    fontSize: typography.size.sm,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs / 2,
  },
  categoryCell: {
    width: "50%",
    paddingHorizontal: spacing.xs / 2,
    paddingBottom: spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryLabel: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semiBold,
  },
});
