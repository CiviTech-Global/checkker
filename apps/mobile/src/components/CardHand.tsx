import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, cardToPiece } from '@checkker/shared';
import { colors, spacing, typography, radius, shadows, springConfig, gradients } from '../theme/tokens';
import { staggerDelay } from '../utils/animations';
import { haptics } from '../services/HapticsService';

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
  index,
}: {
  card: Card;
  isSelected: boolean;
  onTap: () => void;
  disabled: boolean;
  index: number;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isSelected) {
      translateY.value = withSpring(-12, springConfig.bouncy);
      scale.value = withSpring(1.05, springConfig.bouncy);
      glowOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(0, springConfig.gentle);
      scale.value = withSpring(1, springConfig.gentle);
      glowOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isSelected, translateY, scale, glowOpacity]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const suitColor = SUIT_COLOR[card.suit];
  const borderColor = isSelected ? colors.accent.gold : suitColor;
  const pieceLabel = PIECE_LABEL[cardToPiece(card)];

  return (
    <Animated.View
      entering={SlideInDown.duration(250).delay(staggerDelay(index, 20)).springify().damping(14)}
    >
      <TouchableOpacity
        onPress={() => {
          haptics.cardTap();
          onTap();
        }}
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
            },
            isSelected && shadows.md,
            disabled && styles.cardDisabled,
            cardAnimStyle,
          ]}
        >
          {/* Glass sheen overlay */}
          <LinearGradient
            colors={gradients.glass }
            style={styles.glassOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Gold glow border when selected */}
          <Animated.View style={[styles.goldGlow, glowAnimStyle]} />

          <Text style={[styles.rank, { color: suitColor }]}>{card.rank}</Text>
          <Text style={[styles.suit, { color: suitColor }]}>{SUIT_SYMBOL[card.suit]}</Text>
          <Text style={[styles.piece, { color: suitColor }]}>{pieceLabel}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptySlot({ index }: { index: number }) {
  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.15, { duration: 1500 }),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(staggerDelay(index, 20))}
      style={[styles.emptySlot, pulseStyle]}
    />
  );
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
              index={i}
            />
          );
        }
        return <EmptySlot key={`empty-${i}`} index={i} />;
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
    overflow: 'hidden',
    ...shadows.gold,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md - 2,
  },
  goldGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.md + 1,
    borderWidth: 3,
    borderColor: colors.accent.gold,
  },
  rank: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.mono,
    fontWeight: typography.weight.bold,
    alignSelf: 'flex-start',
    zIndex: 1,
  },
  suit: {
    fontSize: typography.size.lg,
    zIndex: 1,
  },
  piece: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    zIndex: 1,
  },
  emptySlot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.gold,
    borderStyle: 'dashed',
    backgroundColor: colors.cardBack,
  },
});
