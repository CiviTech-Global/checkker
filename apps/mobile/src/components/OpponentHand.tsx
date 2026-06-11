import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { useEquippedTheme } from '../utils/cosmetics';

interface OpponentHandProps {
  cardCount?: number;
}

export default function OpponentHand({ cardCount = 3 }: OpponentHandProps) {
  const equippedTheme = useEquippedTheme();
  const back = equippedTheme.cardBack?.isDefault ? undefined : equippedTheme.cardBack?.cardBack;

  return (
    <View style={styles.container} accessibilityLabel={`Opponent has ${cardCount} cards`}>
      {Array.from({ length: cardCount }, (_, i) => (
        <View key={i} style={[styles.cardBack, back && { backgroundColor: back.primary }]}>
          <View style={[styles.pattern, back && { borderColor: back.accent }]}>
            <Text style={[styles.symbol, back && { color: back.accent }]}>{'\u2660'}</Text>
          </View>
          <Text style={styles.label}>CHECKKER</Text>
        </View>
      ))}
    </View>
  );
}

const CARD_WIDTH = 64;
const CARD_HEIGHT = 88;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBack: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxs,
  },
  pattern: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  symbol: {
    fontSize: 16,
    color: colors.accent.gold,
    opacity: 0.8,
  },
  label: {
    fontSize: 9,
    color: colors.text.muted,
    marginTop: spacing.xxs,
    letterSpacing: 1.5,
    fontWeight: typography.weight.medium,
  },
});
