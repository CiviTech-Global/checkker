import 'package:flutter/material.dart';

import '../models/card.dart';
import '../theme/tokens.dart';

const _suitSymbol = {
  Suit.clubs: '\u2663',
  Suit.diamonds: '\u2666',
  Suit.hearts: '\u2665',
  Suit.spades: '\u2660',
};

class ScorePile extends StatelessWidget {
  final List<PlayingCard> cards;
  final String label;

  const ScorePile({super.key, required this.cards, this.label = 'Captured'});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0x14F5F0E8), border: Border.all(color: AppColors.border.gold), borderRadius: BorderRadius.circular(AppRadius.md)),
      padding: const EdgeInsets.all(AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label (${cards.length})',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.text.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          if (cards.isEmpty)
            Text(
              'None',
              style: TextStyle(
                fontSize: 10,
                color: AppColors.text.muted,
                fontStyle: FontStyle.italic,
              ),
            )
          else
            SizedBox(
              height: 28,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: cards.length,
                separatorBuilder: (_, _) => const SizedBox(width: 2),
                itemBuilder: (context, index) {
                  final card = cards[index];
                  final isRed = card.suit == Suit.hearts || card.suit == Suit.diamonds;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          card.rankLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isRed ? AppColors.accent.red : AppColors.text.primary,
                          ),
                        ),
                        Text(
                          _suitSymbol[card.suit] ?? '',
                          style: TextStyle(
                            fontSize: 10,
                            color: isRed ? AppColors.accent.red : AppColors.text.primary,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
