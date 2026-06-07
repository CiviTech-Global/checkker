import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
} from "react-native-reanimated";
import { colors, spacing, radius } from "../theme/tokens";
import Icon from "./Icon";

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon name="spectate" size={12} color={colors.accent.goldBright} />
        <Text style={styles.prefix}>Announcer:</Text>
      </View>
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
