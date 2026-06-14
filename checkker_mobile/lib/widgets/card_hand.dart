import 'package:flutter/material.dart';

import '../models/card.dart';
import '../theme/tokens.dart';

const _suitSymbol = {
  Suit.clubs: '\u2663',
  Suit.diamonds: '\u2666',
  Suit.hearts: '\u2665',
  Suit.spades: '\u2660',
};

const _suitColor = {
  Suit.clubs: Color(0xFF241C3A),    // deep violet-ink (reads on white card)
  Suit.diamonds: Color(0xFFD22D4E), // rose
  Suit.hearts: Color(0xFFD22D4E),
  Suit.spades: Color(0xFF241C3A),
};

String _pieceTypeLabel(PieceType piece) {
  switch (piece) {
    case PieceType.king: return 'King';
    case PieceType.queen: return 'Queen';
    case PieceType.rook: return 'Rook';
    case PieceType.bishop: return 'Bishop';
    case PieceType.knight: return 'Knight';
    case PieceType.pawn: return 'Pawn';
    case PieceType.wild: return 'Wild';
  }
}

class CardHand extends StatelessWidget {
  final List<PlayingCard> cards;
  final int? selectedIndex;
  final ValueChanged<int> onCardTap;
  final bool disabled;

  const CardHand({
    super.key,
    required this.cards,
    this.selectedIndex,
    required this.onCardTap,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final totalSlots = cards.length < 3 ? 3 : cards.length;

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = constraints.maxWidth;
        final cardW = AppSizes.cardWidth(screenWidth);
        final cardH = AppSizes.cardHeight(cardW);

        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < totalSlots; i++) ...[
                if (i > 0) const SizedBox(width: AppSpacing.xs),
                if (i < cards.length)
                  _CardItem(
                    card: cards[i],
                    isSelected: selectedIndex == i,
                    onTap: () => onCardTap(i),
                    disabled: disabled,
                    cardWidth: cardW,
                    cardHeight: cardH,
                  )
                else
                  _EmptySlot(cardWidth: cardW, cardHeight: cardH),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _CardItem extends StatelessWidget {
  final PlayingCard card;
  final bool isSelected;
  final VoidCallback onTap;
  final bool disabled;
  final double cardWidth;
  final double cardHeight;

  const _CardItem({
    required this.card,
    required this.isSelected,
    required this.onTap,
    required this.disabled,
    required this.cardWidth,
    required this.cardHeight,
  });

  @override
  Widget build(BuildContext context) {
    final suitColor = _suitColor[card.suit] ?? AppColors.text.dark;
    final borderColor = isSelected ? AppColors.accent.gold : suitColor;
    final label = _pieceTypeLabel(cardToPiece(card));
    final fontScale = cardWidth / 64;

    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        transform: Matrix4.translationValues(0, isSelected ? -12 : 0, 0),
        width: cardWidth,
        height: cardHeight,
        decoration: BoxDecoration(
          color: AppColors.cardFace,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(width: 2, color: borderColor),
          boxShadow: isSelected ? AppShadows.md : AppShadows.gold,
        ),
        child: Opacity(
          opacity: disabled ? 0.5 : 1.0,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xxs),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    card.rankLabel,
                    style: TextStyle(
                      fontSize: AppTypography.sm * fontScale,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      color: suitColor,
                    ),
                  ),
                ),
                Text(
                  _suitSymbol[card.suit] ?? '',
                  style: TextStyle(fontSize: AppTypography.lg * fontScale, color: suitColor),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: AppTypography.xs * fontScale,
                    fontWeight: FontWeight.w500,
                    color: suitColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptySlot extends StatelessWidget {
  final double cardWidth;
  final double cardHeight;

  const _EmptySlot({required this.cardWidth, required this.cardHeight});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: cardWidth,
      height: cardHeight,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(width: 2, color: AppColors.border.gold),
        color: AppColors.cardBack,
      ),
    );
  }
}
