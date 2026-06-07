import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, radius, shadows } from "../theme/tokens";
import Icon from "./Icon";

interface CoachingTipBannerProps {
  tip: string | null;
  onDismiss: () => void;
}

export default function CoachingTipBanner({ tip, onDismiss }: CoachingTipBannerProps) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (tip) {
      progress.value = 1;
      progress.value = withTiming(0, { duration: 8000 });
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [tip]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!tip) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(14)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Icon name="coach" size={16} color={colors.accent.gold} />
        <Text style={styles.label}>Coach</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Icon name="close" size={14} color={colors.text.muted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.tipText}>{tip}</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.gold,
    padding: spacing.sm,
    width: "100%",
    maxWidth: 480,
    ...shadows.gold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  icon: {
    fontSize: 16,
    color: colors.accent.gold,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
    flex: 1,
    textTransform: "uppercase",
  },
  dismiss: {
    fontSize: 14,
    color: colors.text.muted,
  },
  tipText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.border.subtle,
    borderRadius: 1,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.accent.gold,
    borderRadius: 1,
  },
});
