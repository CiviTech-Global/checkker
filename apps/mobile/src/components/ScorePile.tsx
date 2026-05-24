import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, cardToPiece } from '@gambit/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

const SUIT_SYMBOL: Record<string, string> = {
  clubs: '\u2663',
  diamonds: '\u2666',
  hearts: '\u2665',
  spades: '\u2660',
};

const SUIT_COLOR: Record<string, string> = {
  clubs: colors.text.dark,
  diamonds: colors.accent.red,
  hearts: colors.accent.red,
  spades: colors.text.dark,
};

const PIECE_LABEL: Record<string, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
  wild: 'W',
};

interface ScorePileProps {
  cards: Card[];
  label: string;
  maxVisible?: number;
}

function MiniCard({ card }: { card: Card }) {
  const color = SUIT_COLOR[card.suit];

  return (
    <View style={[styles.miniCard, { borderColor: color }]}>
      <Text style={[styles.miniRank, { color }]}>{card.rank}</Text>
      <Text style={[styles.miniSuit, { color }]}>{SUIT_SYMBOL[card.suit]}</Text>
      <Text style={[styles.miniPiece, { color }]}>{PIECE_LABEL[cardToPiece(card)]}</Text>
    </View>
  );
}

export default function ScorePile({ cards, label, maxVisible = 3 }: ScorePileProps) {
  const visible = cards.slice(0, maxVisible);
  const overflow = cards.length - maxVisible;

  return (
    <View style={styles.container} accessibilityLabel={`${label}, ${cards.length} cards`}>
      <Text style={styles.label}>{label}</Text>
      {cards.length === 0 ? (
        <Text style={styles.empty}>No captures yet</Text>
      ) : (
        <View style={styles.row}>
          {visible.map((card, i) => (
            <View key={i} style={[styles.wrapper, i > 0 && styles.overlap]}>
              <MiniCard card={card} />
            </View>
          ))}
          {overflow > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+{overflow}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  empty: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    opacity: 0.4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapper: {
    zIndex: 1,
  },
  overlap: {
    marginLeft: -8,
  },
  miniCard: {
    width: 40,
    height: 56,
    backgroundColor: colors.cardFace,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  miniRank: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    fontWeight: typography.weight.bold,
    lineHeight: 12,
  },
  miniSuit: {
    fontSize: 12,
    lineHeight: 14,
  },
  miniPiece: {
    fontSize: 8,
    fontWeight: typography.weight.medium,
    lineHeight: 10,
  },
  badge: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
});
