import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/tokens.dart';

const _lessonTitles = <int, String>{
  1: 'Chess Basics',
  2: 'Card Types',
  3: 'Pawn Moves',
  4: 'Knight Moves',
  5: 'Bishop Moves',
  6: 'Rook Moves',
  7: 'Queen Moves',
  8: 'King & Castling',
  9: 'Card-Piece Mapping',
  10: 'Making Moves',
  11: 'Captures & Bonus Cards',
  12: 'Poker Scoring',
  13: 'Time Control',
  14: 'Strategy Basics',
  15: 'Advanced Tactics',
  16: 'Putting It Together',
};

const _prefsKey = 'tutorial_completed_lessons';

class TutorialHubScreen extends ConsumerStatefulWidget {
  const TutorialHubScreen({super.key});

  @override
  ConsumerState<TutorialHubScreen> createState() => _TutorialHubScreenState();
}

class _TutorialHubScreenState extends ConsumerState<TutorialHubScreen> {
  Set<int> _completed = {};

  @override
  void initState() {
    super.initState();
    _loadCompleted();
  }

  Future<void> _loadCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_prefsKey) ?? [];
    setState(() {
      _completed = list.map((e) => int.tryParse(e) ?? 0).toSet();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Tutorials'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Progress: ${_completed.length} / 16',
                  style: TextStyle(
                    fontSize: AppTypography.body,
                    color: AppColors.text.secondary,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => context.push('/tutorial/book'),
                  icon: Icon(Icons.menu_book, color: AppColors.accent.gold, size: 18),
                  label: Text(
                    'Reference Book',
                    style: TextStyle(color: AppColors.accent.gold, fontSize: AppTypography.sm),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: LinearProgressIndicator(
                value: _completed.length / 16,
                backgroundColor: AppColors.bg.tertiary,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent.green),
                minHeight: 6,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: AppSpacing.sm,
                  mainAxisSpacing: AppSpacing.sm,
                  childAspectRatio: 1.6,
                ),
                itemCount: 16,
                itemBuilder: (context, index) {
                  final lessonNum = index + 1;
                  final title = _lessonTitles[lessonNum] ?? 'Lesson $lessonNum';
                  final isComplete = _completed.contains(lessonNum);

                  return GestureDetector(
                    onTap: () async {
                      await context.push('/tutorial/lesson/$lessonNum');
                      _loadCompleted();
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isComplete
                            ? AppColors.accent.primary.withValues(alpha: 0.15)
                            : AppColors.bg.secondary,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(
                          color: isComplete
                              ? AppColors.accent.green.withValues(alpha: 0.5)
                              : AppColors.border.subtle,
                          width: 1,
                        ),
                      ),
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: isComplete
                                      ? AppColors.accent.green
                                      : AppColors.bg.tertiary,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: isComplete
                                    ? Icon(Icons.check, size: 16, color: AppColors.bg.primary)
                                    : Text(
                                        '$lessonNum',
                                        style: TextStyle(
                                          fontSize: AppTypography.sm,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.text.secondary,
                                        ),
                                      ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              if (isComplete)
                                Text(
                                  'Complete',
                                  style: TextStyle(
                                    fontSize: AppTypography.xs,
                                    color: AppColors.accent.green,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            title,
                            style: TextStyle(
                              fontSize: AppTypography.sm,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text.primary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
