import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'chess_clock.dart';

class GameInfoBar extends StatelessWidget {
  final String label;
  final String side;
  final int timeMs;
  final bool active;
  final int? rating;

  const GameInfoBar({
    super.key,
    required this.label,
    required this.side,
    required this.timeMs,
    this.active = false,
    this.rating,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x14F5F0E8),
        border: Border.all(color: AppColors.border.gold),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: side == 'white' ? Colors.white : Colors.black,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border.gold, width: 1),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? AppColors.text.primary : AppColors.text.muted,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (rating != null)
                  Text(
                    'Rating: $rating',
                    style: TextStyle(fontSize: 10, color: AppColors.text.muted),
                  ),
              ],
            ),
          ),
          ChessClock(timeMs: timeMs, active: active),
        ],
      ),
    );
  }
}
