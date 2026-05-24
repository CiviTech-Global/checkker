import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Card, cardToPiece } from '@gambit/shared';
import { colors, spacing, typography, radius, motion, shadows } from '../theme/tokens';

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
  king: 'King',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  pawn: 'Pawn',
  wild: 'Wild',
};

interface CardHandProps {
  cards: Card[];
  selectedIndex: number | null;
  onCardTap: (index: number) => void;
  disabled?: boolean;
}

function CardItem({
  card,
  isSelected,
  onTap,
  disabled,
}: {
  card: Card;
  isSelected: boolean;
  onTap: () => void;
  disabled: boolean;
}) {
  const liftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(liftAnim, {
      toValue: isSelected ? 1 : 0,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [isSelected, liftAnim]);

  const suitColor = SUIT_COLOR[card.suit];
  const borderColor = isSelected ? colors.accent.gold : suitColor;
  const pieceLabel = PIECE_LABEL[cardToPiece(card)];

  return (
    <TouchableOpacity
      onPress={onTap}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={`${card.rank} of ${card.suit}, moves ${pieceLabel}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            borderColor,
            transform: [
              {
                translateY: liftAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              },
            ],
          },
          isSelected && styles.cardSelected,
          disabled && styles.cardDisabled,
        ]}
      >
        <Text style={[styles.rank, { color: suitColor }]}>{card.rank}</Text>
        <Text style={[styles.suit, { color: suitColor }]}>{SUIT_SYMBOL[card.suit]}</Text>
        <Text style={[styles.piece, { color: suitColor }]}>{pieceLabel}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function EmptySlot() {
  return <View style={styles.emptySlot} />;
}

export default function CardHand({ cards, selectedIndex, onCardTap, disabled = false }: CardHandProps) {
  const totalSlots = Math.max(cards.length, 3);

  return (
    <View style={styles.container} accessibilityLabel="Your hand of cards">
      {Array.from({ length: totalSlots }, (_, i) => {
        if (i < cards.length) {
          return (
            <CardItem
              key={i}
              card={cards[i]}
              isSelected={selectedIndex === i}
              onTap={() => onCardTap(i)}
              disabled={disabled}
            />
          );
        }
        return <EmptySlot key={`empty-${i}`} />;
      })}
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
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.cardFace,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: {
    ...shadows.md,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  rank: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.mono,
    fontWeight: typography.weight.bold,
    alignSelf: 'flex-start',
  },
  suit: {
    fontSize: typography.size.lg,
  },
  piece: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  emptySlot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.text.muted,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
});
