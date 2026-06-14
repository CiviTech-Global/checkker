import 'package:flutter/material.dart';

import '../models/game.dart';
import '../theme/tokens.dart';

/// Win-probability bar driven by the server's poker-aware model
/// (chess expectation + locked score-pile points + poker potential).
/// White/Black keep fixed sides for spectator clarity; the viewer's side is
/// marked "YOU".
class OddsIndicator extends StatelessWidget {
  final GameOdds? odds;
  final String playerColor;

  const OddsIndicator({super.key, this.odds, required this.playerColor});

  @override
  Widget build(BuildContext context) {
    if (odds == null) return const SizedBox.shrink();

    final o = odds!;
    final leader = o.whiteWinPct > o.blackWinPct
        ? 'White favored'
        : o.blackWinPct > o.whiteWinPct
            ? 'Black favored'
            : 'Even';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0x14A855F7),
        border: Border.all(color: AppColors.border.gold),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      padding: const EdgeInsets.all(AppSpacing.sm),
      width: double.infinity,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('WIN PROBABILITY',
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                      color: AppColors.text.muted)),
              Text(leader,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent.primary)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.full),
            child: SizedBox(
              height: 22,
              child: Row(
                children: [
                  _seg(o.whiteWinPct.round(), AppColors.accent.green, AppColors.bg.primary),
                  _seg(o.drawPct.round(), AppColors.accent.gold, Colors.white),
                  _seg(o.blackWinPct.round(), AppColors.accent.red, Colors.white),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _legend('White${playerColor == 'white' ? ' · YOU' : ''}', AppColors.accent.green),
              _legend('Draw', AppColors.accent.gold),
              _legend('Black${playerColor == 'black' ? ' · YOU' : ''}', AppColors.accent.red),
            ],
          ),
        ],
      ),
    );
  }

  Expanded _seg(int pct, Color bg, Color textColor) {
    return Expanded(
      flex: pct.clamp(1, 100),
      child: Container(
        color: bg,
        alignment: Alignment.center,
        child: pct >= 10
            ? Text('$pct%',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: textColor))
            : null,
      ),
    );
  }

  Widget _legend(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.text.muted)),
      ],
    );
  }
}
