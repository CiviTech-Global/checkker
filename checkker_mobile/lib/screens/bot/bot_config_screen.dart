import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/bot.dart';
import '../../providers/bot_provider.dart';
import '../../theme/tokens.dart';

class BotConfigScreen extends ConsumerWidget {
  const BotConfigScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(botProvider);
    final notifier = ref.read(botProvider.notifier);
    final config = state.config;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(title: const Text('Bot Configuration')),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  Text(
                    'Personality & Style',
                    style: TextStyle(
                      color: AppColors.text.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _StrategySelector(
                    value: config.strategy,
                    onChanged: (s) => notifier.updateConfig(config.copyWith(strategy: s)),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _DifficultySelector(
                    value: config.difficulty,
                    onChanged: (d) => notifier.updateConfig(config.copyWith(difficulty: d)),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SliderTile(
                    label: 'Patience',
                    value: config.patience.toDouble(),
                    onChanged: (v) => notifier.updateConfig(config.copyWith(patience: v.toInt())),
                  ),
                  _SliderTile(
                    label: 'Deep Thinking',
                    value: config.deepThinking.toDouble(),
                    onChanged: (v) => notifier.updateConfig(config.copyWith(deepThinking: v.toInt())),
                  ),
                  _SliderTile(
                    label: 'Risk Tolerance',
                    value: config.riskTolerance.toDouble(),
                    onChanged: (v) => notifier.updateConfig(config.copyWith(riskTolerance: v.toInt())),
                  ),
                  _SliderTile(
                    label: 'Thinking Delay (ms)',
                    value: config.thinkingDelayMs.toDouble(),
                    min: 500,
                    max: 5000,
                    divisions: 9,
                    display: '${config.thinkingDelayMs}ms',
                    onChanged: (v) => notifier.updateConfig(config.copyWith(thinkingDelayMs: v.toInt())),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SwitchListTile(
                    title: Text('Auto-rematch', style: TextStyle(color: AppColors.text.primary)),
                    subtitle: Text(
                      'Queue another game automatically after this one.',
                      style: TextStyle(color: AppColors.text.muted, fontSize: 12),
                    ),
                    value: config.autoRematch,
                    onChanged: (v) => notifier.updateConfig(config.copyWith(autoRematch: v)),
                  ),
                  SwitchListTile(
                    title: Text('Allow Takeover', style: TextStyle(color: AppColors.text.primary)),
                    subtitle: Text(
                      'Tap the banner during a game to play manually.',
                      style: TextStyle(color: AppColors.text.muted, fontSize: 12),
                    ),
                    value: config.allowTakeover,
                    onChanged: (v) => notifier.updateConfig(config.copyWith(allowTakeover: v)),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        notifier.syncToServer();
                        context.pop();
                      },
                      child: const Text('Save & Sync'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _StrategySelector extends StatelessWidget {
  final BotStrategy value;
  final ValueChanged<BotStrategy> onChanged;

  const _StrategySelector({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      children: BotStrategy.values.map((strategy) {
        final selected = strategy == value;
        return ChoiceChip(
          label: Text(strategy.name[0].toUpperCase() + strategy.name.substring(1)),
          selected: selected,
          onSelected: (_) => onChanged(strategy),
          selectedColor: AppColors.accent.gold,
          labelStyle: TextStyle(
            color: selected ? AppColors.bg.primary : AppColors.text.primary,
            fontWeight: FontWeight.w600,
          ),
        );
      }).toList(),
    );
  }
}

class _DifficultySelector extends StatelessWidget {
  final BotDifficulty value;
  final ValueChanged<BotDifficulty> onChanged;

  const _DifficultySelector({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      children: BotDifficulty.values.map((difficulty) {
        final selected = difficulty == value;
        return ChoiceChip(
          label: Text(difficulty.name[0].toUpperCase() + difficulty.name.substring(1)),
          selected: selected,
          onSelected: (_) => onChanged(difficulty),
          selectedColor: AppColors.accent.gold,
          labelStyle: TextStyle(
            color: selected ? AppColors.bg.primary : AppColors.text.primary,
            fontWeight: FontWeight.w600,
          ),
        );
      }).toList(),
    );
  }
}

class _SliderTile extends StatelessWidget {
  final String label;
  final double value;
  final double min;
  final double max;
  final int? divisions;
  final String? display;
  final ValueChanged<double> onChanged;

  const _SliderTile({
    required this.label,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 100,
    this.divisions,
    this.display,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: AppColors.text.primary, fontWeight: FontWeight.w600)),
            Text(display ?? value.toInt().toString(),
                style: TextStyle(color: AppColors.accent.gold, fontWeight: FontWeight.w700)),
          ],
        ),
        Slider(
          value: value,
          min: min,
          max: max,
          divisions: divisions,
          onChanged: onChanged,
          activeColor: AppColors.accent.gold,
        ),
      ],
    );
  }
}
