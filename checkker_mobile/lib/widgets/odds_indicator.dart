import 'package:flutter/material.dart';

import '../models/game.dart';
import '../theme/tokens.dart';

class OddsIndicator extends StatelessWidget {
  final GameOdds? odds;
  final String playerColor;

  const OddsIndicator({super.key, this.odds, required this.playerColor});

  @override
  Widget build(BuildContext context) {
    if (odds == null) return const SizedBox.shrink();

    final o = odds!;
    return Container(
      decoration: BoxDecoration(color: const Color(0x14F5F0E8), border: Border.all(color: AppColors.border.gold), borderRadius: BorderRadius.circular(AppRadius.md)),
      padding: const EdgeInsets.all(AppSpacing.xs),
      width: double.infinity,
      child: Column(
        children: [
          Text('Probable Result',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.text.secondary)),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 28,
              child: Row(
                children: [
                  Expanded(
                    flex: (o.whiteWinPct.clamp(1, 100)).round(),
                    child: Container(
                      color: AppColors.accent.green,
                      alignment: Alignment.center,
                      child: o.whiteWinPct >= 8
                          ? Text('${o.whiteWinPct.round()}%',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.bg.primary))
                          : null,
                    ),
                  ),
                  Expanded(
                    flex: (o.drawPct.clamp(1, 100)).round(),
                    child: Container(
                      color: AppColors.accent.gold,
                      alignment: Alignment.center,
                      child: o.drawPct >= 8
                          ? Text('${o.drawPct.round()}%',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white))
                          : null,
                    ),
                  ),
                  Expanded(
                    flex: (o.blackWinPct.clamp(1, 100)).round(),
                    child: Container(
                      color: AppColors.accent.red,
                      alignment: Alignment.center,
                      child: o.blackWinPct >= 8
                          ? Text('${o.blackWinPct.round()}%',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white))
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('White', style: TextStyle(fontSize: 10, color: AppColors.text.muted)),
              Text('Draw', style: TextStyle(fontSize: 10, color: AppColors.text.muted)),
              Text('Black', style: TextStyle(fontSize: 10, color: AppColors.text.muted)),
            ],
          ),
        ],
      ),
    );
  }
}
