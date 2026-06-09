import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/betting.dart';
import '../../theme/tokens.dart';

class RankedScreen extends ConsumerWidget {
  const RankedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(title: const Text('Ranked Play')),
      body: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: betAmountsUsd.length,
        itemBuilder: (context, i) {
          final entry = betAmountsUsd.entries.elementAt(i);
          final difficulty = entry.key;
          final amount = entry.value;
          final difficultyName = difficulty.name;
          final isFree = amount == 0;

          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: isFree ? AppColors.accent.green : AppColors.accent.gold),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  onTap: () => context.push('/game/queue?mode=ranked&difficulty=$difficultyName&tc=blitz'),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Row(
                      children: [
                        Container(
                          width: 48, height: 48,
                          decoration: BoxDecoration(
                            color: (isFree ? AppColors.accent.green : AppColors.accent.gold).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Center(
                            child: Text(
                              isFree ? 'FREE' : '\$$amount',
                              style: TextStyle(
                                color: isFree ? AppColors.accent.green : AppColors.accent.gold,
                                fontSize: isFree ? 11 : 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                difficultyName[0].toUpperCase() + difficultyName.substring(1),
                                style: TextStyle(color: AppColors.text.primary, fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isFree ? 'Free entry \u2014 no wallet needed' : 'Bet \$$amount per game',
                                style: TextStyle(color: AppColors.text.muted, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: isFree ? AppColors.accent.green : AppColors.accent.gold),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
