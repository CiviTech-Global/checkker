import 'package:flutter/material.dart';

import '../theme/tokens.dart';

const _promotionPieces = [
  (piece: 'q', label: 'Queen', symbol: '\u265B'),
  (piece: 'r', label: 'Rook', symbol: '\u265C'),
  (piece: 'b', label: 'Bishop', symbol: '\u265D'),
  (piece: 'n', label: 'Knight', symbol: '\u265E'),
];

class PromotionPicker extends StatelessWidget {
  final bool visible;
  final ValueChanged<String> onSelect;
  final VoidCallback onCancel;

  const PromotionPicker({
    super.key,
    required this.visible,
    required this.onSelect,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();

    return Material(
      color: AppColors.overlay,
      child: Center(
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.bg.primary,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(width: 2, color: AppColors.border.gold),
          ),
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Promote Pawn',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final p in _promotionPieces)
                    GestureDetector(
                      onTap: () => onSelect(p.piece),
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                        decoration: BoxDecoration(color: const Color(0x14F5F0E8), border: Border.all(color: AppColors.border.gold), borderRadius: BorderRadius.circular(AppRadius.md)),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Column(
                          children: [
                            Text(p.symbol, style: TextStyle(fontSize: 36, color: AppColors.text.primary)),
                            const SizedBox(height: AppSpacing.xxs),
                            Text(p.label, style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              TextButton(
                onPressed: onCancel,
                child: Text('Cancel', style: TextStyle(color: AppColors.text.muted)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
