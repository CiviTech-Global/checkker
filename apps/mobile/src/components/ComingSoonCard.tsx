import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, radius, glassStyle } from "../theme/tokens";
import Icon from "./Icon";

interface ComingSoonCardProps {
  label?: string;
  index?: number;
}

export default function ComingSoonCard({ label = "Real betting", index = 0 }: ComingSoonCardProps) {
  const pulse = useSharedValue(1);

  pulse.value = withRepeat(
    withTiming(1.15, { duration: 1200 }),
    -1,
    true
  );

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300).delay(index * 80)} style={[styles.card, glassStyle]}>
      <View style={styles.leftBorder} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Icon name="locked" size={18} color={colors.accent.gold} />
          <Text style={styles.title}>{label}</Text>
        </View>
        <Text style={styles.subtitle}>Free play is ready now</Text>
        <View style={styles.pill}>
          <Animated.View style={[styles.dot, dotStyle]} />
          <Text style={styles.pillText}>Coming Soon</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.gold,
    opacity: 0.85,
  },
  leftBorder: {
    width: 4,
    backgroundColor: colors.accent.gold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.gold,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 0.5,
  },
});
