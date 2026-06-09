import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';

const _difficulties = [
  (id: 'beginner', label: 'Beginner', desc: 'Easy opponent for learning'),
  (id: 'intermediate', label: 'Intermediate', desc: 'Moderate challenge'),
  (id: 'advanced', label: 'Advanced', desc: 'Strong opponent'),
  (id: 'master', label: 'Master', desc: 'Maximum difficulty'),
];

const _timeControls = [
  (id: 'bullet', label: 'Bullet', time: '3 min'),
  (id: 'blitz', label: 'Blitz', time: '7 min'),
  (id: 'rapid', label: 'Rapid', time: '15 min'),
  (id: 'classical', label: 'Classical', time: '25 min'),
];

class DifficultyScreen extends ConsumerStatefulWidget {
  const DifficultyScreen({super.key});

  @override
  ConsumerState<DifficultyScreen> createState() => _DifficultyScreenState();
}

class _DifficultyScreenState extends ConsumerState<DifficultyScreen> {
  String _selectedDifficulty = 'beginner';
  String _selectedTc = 'blitz';
  bool _starting = false;
  StreamSubscription? _sub;

  void _startGame() {
    if (_starting) return;
    setState(() => _starting = true);

    final socket = ref.read(socketServiceProvider);
    _sub = socket.gameStateStream.listen((gs) {
      if (gs != null && mounted) {
        context.go('/game/${gs.id}');
      }
    });
    socket.startBotGame(_selectedDifficulty, _selectedTc);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(title: const Text('Play vs Bot')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Difficulty', style: TextStyle(color: AppColors.accent.gold, fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 1)),
            const SizedBox(height: AppSpacing.sm),
            ...List.generate(_difficulties.length, (i) {
              final d = _difficulties[i];
              final selected = _selectedDifficulty == d.id;
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: Container(
                  decoration: BoxDecoration(
                    color: selected ? AppColors.accent.gold.withValues(alpha: 0.15) : AppColors.bg.secondary,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: selected ? AppColors.accent.gold : AppColors.border.subtle),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      onTap: () => setState(() => _selectedDifficulty = d.id),
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.sm),
                        child: Row(
                          children: [
                            Radio<String>(
                              value: d.id,
                              groupValue: _selectedDifficulty,
                              onChanged: (v) => setState(() => _selectedDifficulty = v!),
                              activeColor: AppColors.accent.gold,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(d.label, style: TextStyle(color: AppColors.text.primary, fontSize: 15, fontWeight: FontWeight.w600)),
                                  Text(d.desc, style: TextStyle(color: AppColors.text.muted, fontSize: 12)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: AppSpacing.lg),
            Text('Time Control', style: TextStyle(color: AppColors.accent.gold, fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 1)),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: _timeControls.map((tc) {
                final selected = _selectedTc == tc.id;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedTc = tc.id),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                        decoration: BoxDecoration(
                          color: selected ? AppColors.accent.gold.withValues(alpha: 0.2) : AppColors.bg.secondary,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: selected ? AppColors.accent.gold : AppColors.border.subtle),
                        ),
                        child: Column(
                          children: [
                            Text(tc.label, style: TextStyle(color: selected ? AppColors.accent.gold : AppColors.text.primary, fontSize: 12, fontWeight: FontWeight.w700)),
                            Text(tc.time, style: TextStyle(color: AppColors.text.muted, fontSize: 10)),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _starting ? null : _startGame,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent.primary,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
                ),
                child: _starting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Start Game', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
