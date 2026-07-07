import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/betting.dart';
import '../../models/game.dart';
import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/tier_choice_row.dart';

class CasualScreen extends ConsumerWidget {
  const CasualScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bettingEnabled = ref.watch(serverFeaturesProvider).valueOrNull?.bettingEnabled ?? false;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(title: const Text('Casual Play')),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.md),
          itemCount: betAmountsUsd.length,
          itemBuilder: (context, i) {
            final entry = betAmountsUsd.entries.elementAt(i);
            final difficulty = entry.key;
            return TierChoiceRow(
              mode: GameMode.casual,
              difficulty: difficulty,
              betAmount: entry.value,
              bettingEnabled: bettingEnabled,
              showBetOption: difficulty != BotDifficulty.beginner,
              index: i,
            );
          },
        ),
      ),
    );
  }
}
