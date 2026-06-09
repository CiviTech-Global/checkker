import 'package:flutter/material.dart';

import '../models/game.dart';
import '../theme/tokens.dart';

class BestMovesPanel extends StatelessWidget {
  final List<MoveEvaluation>? moves;
  final bool visible;

  const BestMovesPanel({super.key, this.moves, this.visible = false});

  @override
  Widget build(BuildContext context) {
    if (!visible || moves == null || moves!.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 480),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.gold),
      ),
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.auto_awesome, size: 14, color: AppColors.accent.gold),
              const SizedBox(width: 4),
              Text(
                'SUGGESTED MOVES',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accent.gold,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          ...moves!.take(3).map((m) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: AppColors.accent.gold.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        m.cardId,
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.accent.gold),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        m.move,
                        style: TextStyle(fontSize: 12, color: AppColors.text.primary),
                      ),
                    ),
                    Text(
                      m.score.toStringAsFixed(1),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: m.score > 0 ? AppColors.accent.green : AppColors.accent.red,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
