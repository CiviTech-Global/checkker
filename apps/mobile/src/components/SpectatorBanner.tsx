import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
} from "react-native-reanimated";
import { colors, spacing, radius } from "../theme/tokens";

interface SpectatorBannerProps {
  comment: string | null;
  onDismiss: () => void;
}

export default function SpectatorBanner({ comment, onDismiss }: SpectatorBannerProps) {
  useEffect(() => {
    if (comment) {
      const timer = setTimeout(onDismiss, 6000);
      return () => clearTimeout(timer);
    }
  }, [comment]);

  if (!comment) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify().damping(14)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Text style={styles.prefix}>{"\uD83C\uDFB0"} Announcer:</Text>
      <Text style={styles.commentText}>{comment}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(26,138,74,0.15)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    width: "100%",
    maxWidth: 480,
  },
  prefix: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent.goldBright,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: colors.text.primary,
    fontStyle: "italic",
  },
});
