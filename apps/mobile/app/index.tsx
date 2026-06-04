import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  SlideInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  gradients,
  shadows,
} from "../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../src/utils/animations";

/* ── Ornamental Divider ────────────────────────────────────────────── */

function OrnamentDivider({ delay = 0 }: { delay?: number }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(delay)}
      style={styles.dividerRow}
    >
      <View style={styles.dividerLine} />
      <Text style={styles.dividerSymbol}>{"\u2666"}</Text>
      <View style={styles.dividerLine} />
    </Animated.View>
  );
}

/* ── Grid Menu Button ──────────────────────────────────────────────── */

function GridButton({
  label,
  symbol,
  index,
  onPress,
  disabled = false,
}: {
  label: string;
  symbol: string;
  index: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={SlideInUp.duration(350)
        .delay(staggerDelay(index, 60) + 300)
        .springify()
        .damping(15)}
      style={[styles.gridCell, animatedStyle, disabled && { opacity: 0.45 }]}
    >
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        activeOpacity={disabled ? 1 : 0.9}
        style={styles.gridButtonOuter}
      >
        <View style={styles.gridButton}>
          <Text style={styles.gridSymbol}>{symbol}</Text>
          <Text style={styles.gridLabel}>
            {label}
            {disabled ? "\nComing Soon" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Full-Width Button ─────────────────────────────────────────────── */

function WideButton({
  label,
  symbol,
  index,
  onPress,
}: {
  label: string;
  symbol: string;
  index: number;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={SlideInUp.duration(350)
        .delay(staggerDelay(index, 60) + 300)
        .springify()
        .damping(15)}
      style={[styles.wideCell, animatedStyle]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={styles.wideButtonOuter}
      >
        <LinearGradient
          colors={gradients.casinoGreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.wideButtonGradient}
        >
          <Text style={styles.wideSymbol}>{symbol}</Text>
          <Text style={styles.wideLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradients.velvet}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <ScrollView
        style={[styles.scrollRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Animated.View
          entering={FadeIn.duration(500).springify().damping(12)}
          style={styles.titleContainer}
        >
          <LinearGradient
            colors={gradients.goldToBronze}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.titleGradientMask}
          >
            <Text style={styles.title}>Checkker</Text>
          </LinearGradient>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeIn.duration(400).delay(200)}
          style={styles.subtitle}
        >
          Chess + Poker
        </Animated.Text>

        <OrnamentDivider delay={250} />

        {/* 2-Column Grid */}
        <View style={styles.grid}>
          <GridButton
            label="Play ranked"
            symbol={"\u2694"}
            index={0}
            onPress={() => router.push("/game/queue?mode=ranked")}
            disabled
          />
          <GridButton
            label="Play casual"
            symbol={"\u265F"}
            index={1}
            onPress={() => router.push("/game/casual")}
            disabled
          />
          <GridButton
            label="Play vs. Bot"
            symbol={"\u265E"}
            index={2}
            onPress={() => router.push("/bot/difficulty")}
          />
          <GridButton
            label="Local network"
            symbol={"\u2318"}
            index={3}
            onPress={() => router.push("/lan")}
          />
          <GridButton
            label="Tutorials"
            symbol={"\u2605"}
            index={4}
            onPress={() => router.push("/tutorial")}
          />
          <GridButton
            label="Puzzles"
            symbol={"\u2666"}
            index={5}
            onPress={() => router.push("/puzzles")}
          />
        </View>

        {/* Full-width Watch Bot vs Bot button */}
        <WideButton
          label="Watch Bot vs. Bot"
          symbol={"\uD83D\uDC41"}
          index={6}
          onPress={() => router.push("/spectate")}
        />
      </ScrollView>

      {/* Profile circle — bottom-left, absolutely positioned */}
      <Animated.View
        entering={FadeIn.duration(400).delay(600)}
        style={[styles.profileCircle, { bottom: insets.bottom + spacing.md, left: spacing.md }]}
      >
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          activeOpacity={0.8}
        >
          <View style={styles.profileInner}>
            <Text style={styles.profileIcon}>{"\u265A"}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const GRID_GAP = spacing.sm;

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  titleContainer: {
    marginBottom: spacing.xxs,
    ...shadows.gold,
  },
  titleGradientMask: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.bg.primary,
    letterSpacing: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 5,
    textTransform: "uppercase",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "70%",
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.gold,
  },
  dividerSymbol: {
    color: colors.accent.gold,
    fontSize: 14,
    marginHorizontal: spacing.sm,
  },

  /* ── Grid ───────────────────────────────────────────────────────── */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: GRID_GAP,
    width: "100%",
    maxWidth: 340,
  },
  gridCell: {
    width: "47%",
  },
  gridButtonOuter: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.gold,
    overflow: "hidden",
  },
  gridButton: {
    backgroundColor: colors.cardFace,
    borderRadius: radius.lg - 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 90,
  },
  gridSymbol: {
    fontSize: 28,
    color: colors.text.dark,
    marginBottom: spacing.xxs,
  },
  gridLabel: {
    color: colors.text.dark,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  /* ── Wide button ────────────────────────────────────────────────── */
  wideCell: {
    width: "100%",
    maxWidth: 340,
    marginTop: spacing.xs,
  },
  wideButtonOuter: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent.gold,
    overflow: "hidden",
  },
  wideButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg - 1,
  },
  wideSymbol: {
    fontSize: 22,
  },
  wideLabel: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* ── Profile circle ─────────────────────────────────────────────── */
  profileCircle: {
    position: "absolute",
  },
  profileInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bg.secondary,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.gold,
  },
  profileIcon: {
    fontSize: 24,
    color: colors.accent.goldBright,
  },
});
