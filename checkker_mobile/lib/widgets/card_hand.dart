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
  Suit.clubs: Color(0xFF1A2E22),
  Suit.diamonds: Color(0xFFE04040),
  Suit.hearts: Color(0xFFE04040),
  Suit.spades: Color(0xFF1A2E22),
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

const double _cardWidth = 64;
const double _cardHeight = 88;

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

    return Row(
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
            )
          else
            _EmptySlot(),
        ],
      ],
    );
  }
}

class _CardItem extends StatelessWidget {
  final PlayingCard card;
  final bool isSelected;
  final VoidCallback onTap;
  final bool disabled;

  const _CardItem({
    required this.card,
    required this.isSelected,
    required this.onTap,
    required this.disabled,
  });

  @override
  Widget build(BuildContext context) {
    final suitColor = _suitColor[card.suit] ?? AppColors.text.dark;
    final borderColor = isSelected ? AppColors.accent.gold : suitColor;
    final label = _pieceTypeLabel(cardToPiece(card));

    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        transform: Matrix4.translationValues(0, isSelected ? -12 : 0, 0),
        width: _cardWidth,
        height: _cardHeight,
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
                      fontSize: AppTypography.sm,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      color: suitColor,
                    ),
                  ),
                ),
                Text(
                  _suitSymbol[card.suit] ?? '',
                  style: TextStyle(fontSize: AppTypography.lg, color: suitColor),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: AppTypography.xs,
                    fontWeight: FontWeight.w500,
                    color: suitColor,
                  ),
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
  @override
  Widget build(BuildContext context) {
    return Container(
      width: _cardWidth,
      height: _cardHeight,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(width: 2, color: AppColors.border.gold),
        color: AppColors.cardBack,
      ),
    );
  }
}
