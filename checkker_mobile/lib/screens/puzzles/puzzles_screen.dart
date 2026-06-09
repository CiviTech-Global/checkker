import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';

import '../../models/puzzle.dart';
import '../../theme/tokens.dart';

class PuzzlesScreen extends ConsumerStatefulWidget {
  const PuzzlesScreen({super.key});

  @override
  ConsumerState<PuzzlesScreen> createState() => _PuzzlesScreenState();
}

class _PuzzlesScreenState extends ConsumerState<PuzzlesScreen> {
  int _streak = 0;
  int _solved = 0;
  bool _loading = true;

  static const String _streakKey = 'puzzle_streak';
  static const String _solvedKey = 'puzzles_solved';
  static const String _lastPlayedKey = 'puzzle_last_played';

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final prefs = await SharedPreferences.getInstance();
    final lastPlayed = prefs.getString(_lastPlayedKey);
    final today = _dateKey(DateTime.now());

    int streak = prefs.getInt(_streakKey) ?? 0;

    // Reset streak if missed a day
    if (lastPlayed != null && lastPlayed != today) {
      final lastDate = DateTime.parse(lastPlayed);
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      if (_dateKey(lastDate) != _dateKey(yesterday)) {
        streak = 0;
        await prefs.setInt(_streakKey, 0);
      }
    }

    setState(() {
      _streak = streak;
      _solved = prefs.getInt(_solvedKey) ?? 0;
      _loading = false;
    });
  }

  String _dateKey(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  void _onCategoryTap(PuzzleCategoryData category) {
    context.push('/puzzles/play/${category.category.name}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : CustomScrollView(
                slivers: [
                  // Header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(
                        top: AppSpacing.xl,
                        left: AppSpacing.md,
                        right: AppSpacing.md,
                        bottom: AppSpacing.md,
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () => context.canPop() ? context.pop() : context.go('/'),
                            icon: const Icon(Icons.arrow_back, color: Colors.white),
                          ),
                          Expanded(
                            child: Text(
                              'Puzzles',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: AppTypography.lg,
                                fontWeight: FontWeight.bold,
                                color: AppColors.accent.gold,
                                letterSpacing: 2,
                              ),
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                    ),
                  ),

                  // Streak Banner
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: AppGradients.goldToBronze,
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          boxShadow: AppShadows.gold,
                        ),
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.md,
                          horizontal: AppSpacing.lg,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _StreakStat(value: _streak, label: 'Day Streak'),
                            Container(
                              width: 1,
                              height: 40,
                              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                              color: const Color(0xFF1A2E22).withValues(alpha: 0.2),
                            ),
                            _StreakStat(value: _solved, label: 'Solved'),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(duration: 400.ms, delay: 100.ms),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),

                  // Categories
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final cat = puzzleCategories[index];
                          return _CategoryCard(
                            category: cat,
                            onTap: () => _onCategoryTap(cat),
                          )
                              .animate()
                              .slideY(
                                begin: 0.3,
                                end: 0,
                                duration: 300.ms,
                                delay: Duration(milliseconds: 100 + index * 70),
                                curve: Curves.easeOut,
                              )
                              .fadeIn(
                                duration: 300.ms,
                                delay: Duration(milliseconds: 100 + index * 70),
                              );
                        },
                        childCount: puzzleCategories.length,
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
                ],
              ),
      ),
    );
  }
}

class _StreakStat extends StatelessWidget {
  final int value;
  final String label;

  const _StreakStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value.toString(),
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1A2E22),
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1A2E22),
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final PuzzleCategoryData category;
  final VoidCallback onTap;

  const _CategoryCard({required this.category, required this.onTap});

  Color get _accentColor {
    final hex = category.colorHex;
    return Color(int.parse(hex.replaceFirst('#', '0xFF')));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0x14F5F0E8),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.gold, width: 1),
          ),
          clipBehavior: Clip.antiAlias,
          child: Row(
            children: [
              // Accent bar
              Container(
                width: 4,
                height: 90,
                color: _accentColor,
              ),
              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            category.symbol,
                            style: TextStyle(
                              fontSize: 20,
                              color: _accentColor,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            category.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.text.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        category.description,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.text.secondary,
                        ),
                      ),
                      if (category.count > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            '${category.count} puzzle${category.count != 1 ? 's' : ''}',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.text.muted,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              // Arrow
              Padding(
                padding: const EdgeInsets.only(right: AppSpacing.md),
                child: Icon(
                  Icons.chevron_right,
                  color: AppColors.text.muted.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
