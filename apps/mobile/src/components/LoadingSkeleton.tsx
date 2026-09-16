import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "../theme/tokens";

interface LoadingSkeletonProps {
  width?: ViewStyle["width"];
  height: number;
  borderRadius?: number;
}

export default function LoadingSkeleton({
  width = "100%",
  height,
  borderRadius = radius.md,
}: LoadingSkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.wrapper, { width, height, borderRadius }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.skeleton,
          { borderRadius },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
  skeleton: {
    backgroundColor: colors.border.subtle,
  },
});