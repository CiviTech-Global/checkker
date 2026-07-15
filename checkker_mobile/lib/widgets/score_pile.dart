import 'package:flutter/material.dart';

import '../models/card.dart';
import '../models/poker.dart';
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
  /// Live poker points from the server's authoritative score evaluation.
  final int? points;
  /// Optional live poker result. When provided the widget shows the hand
  /// breakdown (pair, straight, flush, ...) in addition to the total.
  final PokerResult? result;

  const ScorePile({
    super.key,
    required this.cards,
    this.label = 'Captured',
    this.points,
    this.result,
  });

  int? get _effectivePoints => result?.total ?? points;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x14A855F7),
        border: Border.all(color: AppColors.border.gold),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      padding: const EdgeInsets.all(AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '$label (${cards.length})',
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.text.muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (_effectivePoints != null) ...[
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.accent.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    '$_effectivePoints pts',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.accent.gold,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.xxs),
          if (result != null && result!.hands.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xxs),
              child: Wrap(
                spacing: 4,
                runSpacing: 4,
                children: result!.hands.map((hand) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.accent.gold.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      '${pokerHandNames[hand.hand]} +${hand.points}',
                      style: TextStyle(
                        fontSize: 9,
                        color: AppColors.accent.gold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
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
              height: 32,
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
