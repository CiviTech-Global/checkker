import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class OpponentHand extends StatelessWidget {
  final int cardCount;

  const OpponentHand({super.key, required this.cardCount});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final miniW = AppSizes.miniCardWidth(constraints.maxWidth);
        final miniH = miniW * 1.375;

        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < cardCount; i++) ...[
                if (i > 0) const SizedBox(width: AppSpacing.xs),
                Container(
                  width: miniW,
                  height: miniH,
                  decoration: BoxDecoration(
                    color: AppColors.cardBack,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(width: 1.5, color: AppColors.border.gold),
                  ),
                  child: Center(
                    child: Text(
                      '\u2663',
                      style: TextStyle(
                        fontSize: miniW * 0.4,
                        color: AppColors.accent.gold.withValues(alpha: 0.4),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
