import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, cardToPiece, PokerResult, PokerHand } from '@checkker/shared';
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

const POKER_HAND_NAME: Record<PokerHand, string> = {
  [PokerHand.HIGH_CARD]: 'High Card',
  [PokerHand.ONE_PAIR]: 'Pair',
  [PokerHand.TWO_PAIR]: 'Two Pair',
  [PokerHand.THREE_OF_A_KIND]: 'Three of a Kind',
  [PokerHand.STRAIGHT]: 'Straight',
  [PokerHand.FLUSH]: 'Flush',
  [PokerHand.FULL_HOUSE]: 'Full House',
  [PokerHand.FOUR_OF_A_KIND]: 'Four of a Kind',
  [PokerHand.STRAIGHT_FLUSH]: 'Straight Flush',
  [PokerHand.ROYAL_FLUSH]: 'Royal Flush',
};

interface ScorePileProps {
  cards: Card[];
  label: string;
  maxVisible?: number;
  /** Live poker points from the server's authoritative score evaluation. */
  points?: number;
  /** Optional live poker result. When provided the widget shows the hand
   *  breakdown (pair, straight, flush, ...) in addition to the total. */
  result?: PokerResult;
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

export default function ScorePile({ cards, label, maxVisible = 3, points, result }: ScorePileProps) {
  const visible = cards.slice(0, maxVisible);
  const overflow = cards.length - maxVisible;
  const effectivePoints = result?.total ?? points;

  return (
    <View style={styles.container} accessibilityLabel={`${label}, ${cards.length} cards, ${effectivePoints ?? 0} points`}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {effectivePoints != null && (
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{effectivePoints} pts</Text>
          </View>
        )}
      </View>

      {result && result.hands.length > 0 && (
        <View style={styles.handsRow}>
          {result.hands.map((hand, i) => (
            <View key={i} style={styles.handBadge}>
              <Text style={styles.handText}>{POKER_HAND_NAME[hand.hand]} +{hand.points}</Text>
            </View>
          ))}
        </View>
      )}

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
    gap: spacing.xxs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  pointsBadge: {
    backgroundColor: colors.accent.primary + "33",
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pointsText: {
    fontSize: typography.size.xs,
    color: colors.accent.gold,
    fontWeight: typography.weight.bold,
  },
  handsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  handBadge: {
    backgroundColor: colors.accent.gold + "20",
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  handText: {
    fontSize: typography.size.xs,
    color: colors.accent.gold,
    fontWeight: typography.weight.semiBold,
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
    color: colors.text.dark,
  },
  miniPiece: {
    fontSize: 8,
    fontWeight: typography.weight.medium,
    lineHeight: 10,
    color: colors.text.dark,
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
