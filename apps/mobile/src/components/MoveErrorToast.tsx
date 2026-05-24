import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

interface MoveErrorToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function MoveErrorToast({ message, onDismiss }: MoveErrorToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.accent.red,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    zIndex: 100,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
