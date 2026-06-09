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
import { useLocalProfile } from "../src/context/LocalProfileContext";
import { getAvatar } from "@checkker/shared";
import { features } from "../src/config/features";
import Icon, { type IconName } from "../src/components/Icon";
import { useSocket } from "../src/hooks/useSocket";

/* ── Ornamental Divider ────────────────────────────────────────────── */

function OrnamentDivider({ delay = 0 }: { delay?: number }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(delay)}
      style={styles.dividerRow}
    >
      <View style={styles.dividerLine} />
      <Icon name="ornament" size={14} color={colors.accent.gold} style={{ marginHorizontal: spacing.sm }} />
      <View style={styles.dividerLine} />
    </Animated.View>
  );
}

/* ── Menu Button (vertical stack) ─────────────────────────────────── */

function MenuButton({
  label,
  symbol,
  index,
  onPress,
  disabled = false,
}: {
  label: string;
  symbol: IconName;
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
      style={[styles.menuCell, animatedStyle, disabled && { opacity: 0.45 }]}
    >
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        activeOpacity={disabled ? 1 : 0.9}
        style={styles.menuButtonOuter}
      >
        <View style={styles.menuButton}>
          <View style={styles.menuSymbolContainer}>
            <Icon name={symbol} size={24} color={colors.text.dark} />
          </View>
          <Text style={styles.menuLabel}>
            {label}
            {disabled ? " — Coming Soon" : ""}
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
  symbol: IconName;
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
          <Icon name={symbol} size={22} color={colors.text.primary} />
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
  const { localProfile } = useLocalProfile();
  const avatar = getAvatar(localProfile.avatarId);
  const { connected } = useSocket();

  return (
    <LinearGradient
      colors={gradients.velvet}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {/* Offline Banner */}
      {!connected && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.offlineBanner, { top: insets.top }]}
        >
          <Icon name="close" size={14} color={colors.accent.red} />
          <Text style={styles.offlineText}>Offline — reconnecting...</Text>
        </Animated.View>
      )}

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
            colors={gradients.ornateGold}
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

        {/* Vertical Menu Stack */}
        <View style={styles.menuStack}>
          <MenuButton
            label="Play ranked"
            symbol="ranked"
            index={0}
            onPress={() => router.push("/game/ranked")}
          />
          <MenuButton
            label="Find an opponent"
            symbol="casual"
            index={1}
            onPress={() => router.push("/game/casual")}
          />
          <MenuButton
            label="Play with AI and improve"
            symbol="bot"
            index={2}
            onPress={() => router.push("/bot/difficulty")}
          />
          <MenuButton
            label="Play on your network (LAN, Hotspot, etc.)"
            symbol="lan"
            index={3}
            onPress={() => router.push("/lan")}
          />
          <MenuButton
            label="Tutorials and trainings"
            symbol="tutorials"
            index={4}
            onPress={() => router.push("/tutorial")}
          />
          <MenuButton
            label="Puzzles"
            symbol="puzzles"
            index={5}
            onPress={() => router.push("/puzzles")}
          />
          <MenuButton
            label="Live rankings and leaderboard"
            symbol="leaderboard"
            index={6}
            onPress={() => router.push("/leaderboard")}
          />
        </View>

        {/* Full-width Watch Bot vs Bot button */}
        <WideButton
          label="Watch Bot vs. Bot"
          symbol="spectate"
          index={7}
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
            {avatar?.symbol ? (
              <Text style={styles.profileIcon}>{avatar.symbol}</Text>
            ) : (
              <Icon name="profile" size={24} color={colors.accent.goldBright} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Donate button — bottom-right */}
      <Animated.View
        entering={FadeIn.duration(400).delay(700)}
        style={[styles.profileCircle, { bottom: insets.bottom + spacing.md, right: spacing.md }]}
      >
        <TouchableOpacity
          onPress={() => router.push("/donate")}
          activeOpacity={0.8}
        >
          <View style={[styles.profileInner, styles.donateInner]}>
            <Icon name="donate" size={22} color={colors.accent.red} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Dev tools button — top-left (dev only) */}
      {features.devMode && (
        <Animated.View
          entering={FadeIn.duration(400).delay(800)}
          style={[styles.profileCircle, { top: insets.top + spacing.xs, left: spacing.md }]}
        >
          <TouchableOpacity
            onPress={() => router.push("/dev")}
            activeOpacity={0.8}
          >
            <View style={[styles.profileInner, styles.devInner]}>
              <Icon name="dev-tools" size={22} color={colors.text.muted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
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

  /* ── Vertical Menu Stack ─────────────────────────────────────────── */
  menuStack: {
    width: "100%",
    maxWidth: 380,
    gap: spacing.sm,
  },
  menuCell: {
    width: "100%",
  },
  menuButtonOuter: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.gold,
    overflow: "hidden",
  },
  menuButton: {
    backgroundColor: colors.cardFace,
    borderRadius: radius.lg - 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    gap: spacing.sm,
  },
  menuSymbolContainer: {
    width: 36,
    alignItems: "center",
  },
  menuLabel: {
    color: colors.text.dark,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },

  /* ── Wide button ────────────────────────────────────────────────── */
  wideCell: {
    width: "100%",
    maxWidth: 380,
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
  /* wideSymbol removed — now using Icon component */
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
    width: 56,
    height: 56,
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
  donateInner: {
    borderColor: colors.accent.red,
  },
  donateIcon: {
    fontSize: 22,
    color: colors.accent.red,
  },
  devInner: {
    borderColor: colors.text.muted,
  },
  devIcon: {
    fontSize: 22,
    color: colors.text.muted,
  },
  offlineBanner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(224, 64, 64, 0.15)",
  },
  offlineText: {
    fontSize: 12,
    color: colors.accent.red,
    fontWeight: "600",
  },
});
