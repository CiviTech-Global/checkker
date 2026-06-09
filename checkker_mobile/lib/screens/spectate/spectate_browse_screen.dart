import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';

const _difficulties = ['beginner', 'intermediate', 'advanced', 'master'];

const _difficultyLabels = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'master': 'Master',
};

class SpectateBrowseScreen extends ConsumerStatefulWidget {
  const SpectateBrowseScreen({super.key});

  @override
  ConsumerState<SpectateBrowseScreen> createState() => _SpectateBrowseScreenState();
}

class _SpectateBrowseScreenState extends ConsumerState<SpectateBrowseScreen> {
  String _whiteDifficulty = 'beginner';
  String _blackDifficulty = 'intermediate';
  bool _isLoading = false;
  StreamSubscription<dynamic>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _startMatch() {
    final socketService = ref.read(socketServiceProvider);
    setState(() => _isLoading = true);

    _sub?.cancel();
    _sub = socketService.spectateStateStream.listen((state) {
      if (state != null && mounted) {
        _sub?.cancel();
        setState(() => _isLoading = false);
        context.push('/spectate/${state.gameId}');
      }
    });

    socketService.startSpectateGame(_whiteDifficulty, _blackDifficulty);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Watch Bot vs Bot'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Select bot difficulties and watch an AI match unfold.',
              style: TextStyle(
                fontSize: AppTypography.body,
                color: AppColors.text.secondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // White bot picker
            _DifficultyPicker(
              label: 'White Bot',
              value: _whiteDifficulty,
              onChanged: (v) => setState(() => _whiteDifficulty = v),
            ),
            const SizedBox(height: AppSpacing.md),

            // Black bot picker
            _DifficultyPicker(
              label: 'Black Bot',
              value: _blackDifficulty,
              onChanged: (v) => setState(() => _blackDifficulty = v),
            ),

            const SizedBox(height: AppSpacing.xl),

            // Matchup preview
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.border.subtle),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _BotBadge(
                    label: _difficultyLabels[_whiteDifficulty] ?? _whiteDifficulty,
                    color: Colors.white,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    child: Text(
                      'vs',
                      style: TextStyle(
                        fontSize: AppTypography.md,
                        fontWeight: FontWeight.bold,
                        color: AppColors.accent.gold,
                      ),
                    ),
                  ),
                  _BotBadge(
                    label: _difficultyLabels[_blackDifficulty] ?? _blackDifficulty,
                    color: Colors.grey.shade800,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.xl),

            ElevatedButton(
              onPressed: _isLoading ? null : _startMatch,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent.primary,
                foregroundColor: AppColors.text.primary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
              ),
              child: _isLoading
                  ? SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.text.primary,
                      ),
                    )
                  : const Text(
                      'Start Match',
                      style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DifficultyPicker extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;

  const _DifficultyPicker({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: AppTypography.sm,
            fontWeight: FontWeight.w600,
            color: AppColors.text.secondary,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.bg.secondary,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border.subtle),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              dropdownColor: AppColors.bg.secondary,
              style: TextStyle(fontSize: AppTypography.body, color: AppColors.text.primary),
              items: _difficulties
                  .map((d) => DropdownMenuItem(
                        value: d,
                        child: Text(_difficultyLabels[d] ?? d),
                      ))
                  .toList(),
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _BotBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _BotBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.border.gold, width: 2),
          ),
          child: Icon(Icons.smart_toy, color: color == Colors.white ? Colors.black : Colors.white),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          style: TextStyle(
            fontSize: AppTypography.sm,
            color: AppColors.text.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
