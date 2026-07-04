import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/bot.dart';
import '../../providers/bot_provider.dart';
import '../../theme/tokens.dart';

class BotModeScreen extends ConsumerWidget {
  const BotModeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(botProvider);
    final maturity = state.maturity;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Delegate Mode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/bot/config'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _MaturityCard(maturity: maturity),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Choose Arena',
                style: TextStyle(
                  color: AppColors.text.primary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              _ArenaButton(
                label: 'Ranked Matches',
                subtitle: 'Bot plays for rating and rewards.',
                icon: Icons.emoji_events,
                color: AppColors.accent.gold,
                onTap: () => _startQueue(context, ref, 'ranked'),
              ),
              const SizedBox(height: AppSpacing.sm),
              _ArenaButton(
                label: 'Casual Matches',
                subtitle: 'Bot plays unrated practice games.',
                icon: Icons.people,
                color: AppColors.accent.green,
                onTap: () => _startQueue(context, ref, 'casual'),
              ),
              const Spacer(),
              if (!state.config.enabled)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.accent.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Text(
                    'Delegate mode is currently disabled. Enable it in Bot Configuration.',
                    style: TextStyle(color: AppColors.accent.red),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _startQueue(BuildContext context, WidgetRef ref, String mode) {
    final config = ref.read(botProvider).config;
    if (!config.enabled) {
      context.push('/bot/config');
      return;
    }
    final difficulty = config.difficulty.name;
    context.push('/game/queue?mode=$mode&difficulty=$difficulty&tc=blitz&bot=true');
  }
}

class _MaturityCard extends StatelessWidget {
  final BotMaturity maturity;

  const _MaturityCard({required this.maturity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border.gold),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bot Maturity',
            style: TextStyle(color: AppColors.text.primary, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                flex: maturity.maturityScore,
                child: Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppColors.accent.gold,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                ),
              ),
              Expanded(
                flex: 100 - maturity.maturityScore,
                child: Container(height: 8),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${maturity.maturityScore}/100 • ${maturity.wins}W ${maturity.losses}L ${maturity.draws}D',
            style: TextStyle(color: AppColors.text.muted, fontSize: 13),
          ),
          if (maturity.unlockedTraits.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: Wrap(
                spacing: AppSpacing.xs,
                children: maturity.unlockedTraits
                    .map((id) => Chip(
                          label: Text(id, style: TextStyle(fontSize: 11, color: AppColors.text.primary)),
                          backgroundColor: AppColors.accent.gold.withValues(alpha: 0.15),
                        ))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _ArenaButton extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ArenaButton({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.color,
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
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label,
                          style: TextStyle(color: AppColors.text.primary, fontSize: 16, fontWeight: FontWeight.w700)),
                      Text(subtitle, style: TextStyle(color: AppColors.text.muted, fontSize: 13)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: color),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
