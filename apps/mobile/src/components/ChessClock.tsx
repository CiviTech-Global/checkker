import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, radius, motion } from '../theme/tokens';
import { useCountdown } from '../hooks/useCountdown';

interface ChessClockProps {
  label: string;
  timeMs: number;
  active: boolean;
  side: 'white' | 'black';
  lowTime?: boolean;
  critical?: boolean;
  rating?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ChessClock({
  label,
  timeMs,
  active,
  side,
  lowTime = false,
  critical = false,
  rating,
}: ChessClockProps) {
  const liveMs = useCountdown(timeMs, active);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const looping = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: motion.pulse,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: motion.pulse,
            useNativeDriver: true,
          }),
        ])
      );
      looping.start();
      return () => looping.stop();
    }
    pulseAnim.setValue(1);
  }, [active, pulseAnim]);

  const isWarning = critical || lowTime;
  const timeColor = isWarning ? colors.accent.red : colors.text.primary;
  const timeWeight = critical ? typography.weight.bold : typography.weight.regular;

  return (
    <Animated.View
      style={[styles.bar, { opacity: active ? pulseAnim : 0.6 }]}
      accessibilityLabel={`${label}, ${formatTime(liveMs)} remaining`}
      accessibilityRole="timer"
    >
      <View style={styles.left}>
        <View
          style={[
            styles.sideDot,
            { backgroundColor: side === 'white' ? '#ffffff' : colors.bg.primary },
          ]}
        />
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.time, { color: timeColor, fontWeight: timeWeight }]}>
          {formatTime(liveMs)}
        </Text>
        <Text
          style={[
            styles.dot,
            { color: active ? colors.accent.green : colors.text.muted },
            !active && styles.dotInactive,
          ]}
        >
          {active ? '\u25C9' : '\u25CC'}
        </Text>
        {rating != null && (
          <Text style={styles.rating}>{rating} ELO</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.text.muted,
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.mono,
    minWidth: 40,
    textAlign: 'right',
  },
  dot: {
    fontSize: 14,
    lineHeight: 16,
  },
  dotInactive: {
    opacity: 0.3,
  },
  rating: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginLeft: spacing.xxs,
  },
});
