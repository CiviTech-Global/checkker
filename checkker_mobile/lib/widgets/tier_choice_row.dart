import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/betting.dart';
import '../models/game.dart';
import '../theme/tokens.dart';

/// A dual-choice row for a game tier: [Play Free] and [Play for $X] / [Coming Soon].
class TierChoiceRow extends StatelessWidget {
  final GameMode mode;
  final BotDifficulty difficulty;
  final int betAmount;
  final bool bettingEnabled;
  final bool showBetOption;
  final int index;

  const TierChoiceRow({
    super.key,
    required this.mode,
    required this.difficulty,
    required this.betAmount,
    required this.bettingEnabled,
    this.showBetOption = true,
    required this.index,
  });

  String get _difficultyName => difficulty.name;
  String get _modeName => mode == GameMode.ranked ? 'ranked' : 'casual';

  void _navigate(BuildContext context, StakeLevel stake) {
    context.push(
      '/game/queue?mode=$_modeName&difficulty=$_difficultyName&tc=blitz&stake=${stake.name}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final label = difficulty.name[0].toUpperCase() + difficulty.name.substring(1);
    final isBeginner = difficulty == BotDifficulty.beginner;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: AppSpacing.xs, bottom: AppSpacing.xs),
            child: Text(
              label,
              style: TextStyle(
                color: AppColors.text.primary,
                fontSize: AppTypography.sm,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Row(
            children: showBetOption
                ? [
                    Expanded(
                      child: _ChoiceCard(
                        title: 'Play Free',
                        subtitle: isBeginner ? 'No wallet needed' : 'Practice for fun',
                        color: AppColors.accent.green,
                        icon: Icons.play_arrow_rounded,
                        onTap: () => _navigate(context, StakeLevel.free),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: bettingEnabled
                          ? _ChoiceCard(
                              title: 'Bet \$$betAmount',
                              subtitle: 'Win real stakes',
                              color: AppColors.accent.gold,
                              icon: Icons.paid_outlined,
                              onTap: () => _navigate(context, StakeLevel.bet),
                            )
                          : _ComingSoonCard(label: 'Bet \$$betAmount'),
                    ),
                  ]
                : [
                    Expanded(
                      child: _ChoiceCard(
                        title: 'Play Free',
                        subtitle: 'No wallet needed',
                        color: AppColors.accent.green,
                        icon: Icons.play_arrow_rounded,
                        onTap: () => _navigate(context, StakeLevel.free),
                      ),
                    ),
                  ],
          ),
        ],
      ),
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _ChoiceCard({
    required this.title,
    required this.subtitle,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md, horizontal: AppSpacing.sm),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: color,
                    fontSize: AppTypography.sm,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.xs),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ComingSoonCard extends StatelessWidget {
  final String label;

  const _ComingSoonCard({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.text.muted.withValues(alpha: 0.25)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md, horizontal: AppSpacing.sm),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.text.muted.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(Icons.lock_outline, color: AppColors.text.muted, size: 22),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Coming Soon',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.text.muted,
                fontSize: AppTypography.sm,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xxs),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.xs),
            ),
          ],
        ),
      ),
    );
  }
}
