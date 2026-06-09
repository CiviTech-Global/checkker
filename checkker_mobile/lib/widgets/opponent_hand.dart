import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class OpponentHand extends StatelessWidget {
  final int cardCount;

  const OpponentHand({super.key, required this.cardCount});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < cardCount; i++) ...[
          if (i > 0) const SizedBox(width: AppSpacing.xs),
          Container(
            width: 44,
            height: 60,
            decoration: BoxDecoration(
              color: AppColors.cardBack,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(width: 1.5, color: AppColors.border.gold),
            ),
            child: Center(
              child: Text(
                '\u2663',
                style: TextStyle(
                  fontSize: 18,
                  color: AppColors.accent.gold.withValues(alpha: 0.4),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
