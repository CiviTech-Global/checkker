import { useCallback } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInRight,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  SlideOutUp,
  ZoomIn,
} from "react-native-reanimated";
import { springConfig, motion } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Spring-based press feedback. Returns pressIn/pressOut handlers + animated style.
 */
export function useSpringPress(scale = 0.96) {
  const pressed = useSharedValue(1);
  const reduced = useReducedMotion();

  const onPressIn = useCallback(() => {
    pressed.value = reduced
      ? scale
      : withSpring(scale, springConfig.snappy);
  }, [pressed, reduced, scale]);

  const onPressOut = useCallback(() => {
    pressed.value = reduced
      ? 1
      : withSpring(1, springConfig.bouncy);
  }, [pressed, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

/**
 * Cycling opacity pulse (for breathing/glow effects).
 */
export function usePulse(duration = motion.pulse, min = 0.4, max = 1) {
  const opacity = useSharedValue(max);
  const reduced = useReducedMotion();

  const start = useCallback(() => {
    if (reduced) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(min, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(max, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity, reduced, duration, min, max]);

  const stop = useCallback(() => {
    opacity.value = withTiming(max, { duration: 200 });
  }, [opacity, max]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { start, stop, animatedStyle };
}

/**
 * Animated count-up for score displays.
 */
export function useCountUp(target: number, duration = 800) {
  const value = useSharedValue(0);
  const reduced = useReducedMotion();

  const animate = useCallback(() => {
    value.value = 0;
    value.value = reduced
      ? target
      : withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, target, duration, reduced]);

  return { value, animate };
}

/**
 * Staggered delay helper for list entrance animations.
 */
export function staggerDelay(index: number, base = 50) {
  return index * base;
}

// Preset entering/exiting animations (configured with sensible defaults)
export const entering = {
  fadeIn: FadeIn.duration(250),
  fadeInDown: (delay = 0) => FadeInDown.duration(300).delay(delay),
  fadeInRight: (delay = 0) => FadeInRight.duration(300).delay(delay),
  slideInDown: (delay = 0) => SlideInDown.duration(250).delay(delay),
  slideInUp: (delay = 0) => SlideInUp.duration(300).delay(delay).springify().damping(15),
  zoomIn: (delay = 0) => ZoomIn.duration(250).delay(delay).springify().damping(12),
};

export const exiting = {
  fadeOut: FadeOut.duration(200),
  slideOutDown: SlideOutDown.duration(250),
  slideOutUp: SlideOutUp.duration(200),
};

/**
 * Shake animation for error feedback (oscillating translateX).
 */
export function useShake() {
  const translateX = useSharedValue(0);
  const reduced = useReducedMotion();

  const shake = useCallback(() => {
    if (reduced) return;
    translateX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [translateX, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { shake, animatedStyle };
}
