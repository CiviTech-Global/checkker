import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/feature_flags_provider.dart';
import '../../providers/profile_provider.dart';
import '../../services/local_database.dart';
import '../../theme/tokens.dart';

class DevScreen extends ConsumerWidget {
  const DevScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flags = ref.watch(featureFlagsProvider);
    final db = ref.watch(localDatabaseProvider);

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Dev Tools'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          // Data actions section
          Text(
            'Data Actions',
            style: TextStyle(
              fontSize: AppTypography.md,
              fontWeight: FontWeight.bold,
              color: AppColors.text.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _DevButton(
            icon: Icons.dataset,
            label: 'Load Demo Data',
            description: 'Insert sample game records into the local database.',
            onTap: () async {
              await db.loadDemoData();
              ref.invalidate(statsProvider);
              ref.invalidate(gameHistoryProvider);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Demo data loaded.'),
                    backgroundColor: AppColors.accent.green,
                  ),
                );
              }
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          _DevButton(
            icon: Icons.delete_forever,
            label: 'Clear All Data',
            description: 'Remove all game history and reset stats to zero.',
            isDestructive: true,
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.bg.secondary,
                  title: Text('Clear All Data?', style: TextStyle(color: AppColors.text.primary)),
                  content: Text(
                    'This will delete all game history and reset stats. This cannot be undone.',
                    style: TextStyle(color: AppColors.text.secondary),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: Text('Cancel', style: TextStyle(color: AppColors.text.muted)),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      child: Text('Clear', style: TextStyle(color: AppColors.accent.red)),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                await db.clearAll();
                ref.invalidate(statsProvider);
                ref.invalidate(gameHistoryProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('All data cleared.'),
                      backgroundColor: AppColors.accent.red,
                    ),
                  );
                }
              }
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          _DevButton(
            icon: Icons.restart_alt,
            label: 'Reset Stats',
            description: 'Reset player statistics without deleting game history.',
            isDestructive: true,
            onTap: () async {
              final localDb = await db.database;
              await localDb.update(
                'stats',
                const PlayerStats().toMap(),
                where: 'id = 1',
              );
              ref.invalidate(statsProvider);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Stats reset.'),
                    backgroundColor: AppColors.accent.gold,
                  ),
                );
              }
            },
          ),

          const SizedBox(height: AppSpacing.xl),

          // Feature flags section
          Text(
            'Feature Flags',
            style: TextStyle(
              fontSize: AppTypography.md,
              fontWeight: FontWeight.bold,
              color: AppColors.text.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border.subtle),
            ),
            child: Column(
              children: [
                _FlagRow(label: '3D Board', enabled: flags.use3DBoard),
                _divider(),
                _FlagRow(label: 'Smart Matchmaking', enabled: flags.smartMatchmaking),
                _divider(),
                _FlagRow(label: 'AI Coaching', enabled: flags.aiCoaching),
                _divider(),
                _FlagRow(label: 'AI Spectator', enabled: flags.aiSpectator),
                _divider(),
                _FlagRow(label: 'AI Dashboard', enabled: flags.aiDashboard),
                _divider(),
                _FlagRow(label: 'Puzzle Mode', enabled: flags.puzzleMode),
                _divider(),
                _FlagRow(label: 'Bot Personality', enabled: flags.botPersonality),
                _divider(),
                _FlagRow(label: 'Dev Mode', enabled: flags.devMode),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Widget _divider() => Divider(
        height: 1,
        thickness: 1,
        color: AppColors.border.subtle,
      );
}

class _DevButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final VoidCallback onTap;
  final bool isDestructive;

  const _DevButton({
    required this.icon,
    required this.label,
    required this.description,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.bg.secondary,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isDestructive
                ? AppColors.accent.red.withValues(alpha: 0.3)
                : AppColors.border.subtle,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDestructive
                    ? AppColors.accent.red.withValues(alpha: 0.15)
                    : AppColors.bg.tertiary,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                icon,
                color: isDestructive ? AppColors.accent.red : AppColors.accent.gold,
                size: 22,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: AppTypography.body,
                      fontWeight: FontWeight.w600,
                      color: isDestructive ? AppColors.accent.red : AppColors.text.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: AppTypography.xs,
                      color: AppColors.text.muted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppColors.text.muted,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

class _FlagRow extends StatelessWidget {
  final String label;
  final bool enabled;

  const _FlagRow({required this.label, required this.enabled});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.text.primary,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xxs),
            decoration: BoxDecoration(
              color: enabled
                  ? AppColors.accent.green.withValues(alpha: 0.15)
                  : AppColors.accent.red.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
            child: Text(
              enabled ? 'ON' : 'OFF',
              style: TextStyle(
                fontSize: AppTypography.xs,
                fontWeight: FontWeight.w700,
                color: enabled ? AppColors.accent.green : AppColors.accent.red,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
