import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/tokens.dart';

const _tiers = [
  (difficulty: 'beginner', label: 'Beginner', desc: 'Free tier \u2014 no stakes, perfect for learning', icon: Icons.school),
  (difficulty: 'intermediate', label: 'Intermediate', desc: 'Challenge yourself against stronger opponents', icon: Icons.trending_up),
  (difficulty: 'advanced', label: 'Advanced', desc: 'For experienced players seeking a real challenge', icon: Icons.local_fire_department),
  (difficulty: 'master', label: 'Master', desc: 'Top-level competition \u2014 prove your skill', icon: Icons.diamond),
];

class CasualScreen extends ConsumerWidget {
  const CasualScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(title: const Text('Casual Play')),
      body: SafeArea(
        child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: _tiers.length,
        itemBuilder: (context, i) {
          final tier = _tiers[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.border.gold),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  onTap: () => context.push('/game/queue?mode=casual&difficulty=${tier.difficulty}&tc=blitz'),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Row(
                      children: [
                        Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(
                            color: AppColors.accent.gold.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Icon(tier.icon, color: AppColors.accent.gold),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(tier.label, style: TextStyle(color: AppColors.text.primary, fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text(tier.desc, style: TextStyle(color: AppColors.text.muted, fontSize: 13)),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: AppColors.accent.gold),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
      ),
    );
  }
}
