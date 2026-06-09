import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/avatar.dart';
import '../../models/game.dart';
import '../../models/rating.dart';
import '../../providers/profile_provider.dart';
import '../../services/local_database.dart';
import '../../theme/tokens.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  bool _isEditingName = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _saveName() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    final db = ref.read(localDatabaseProvider);
    await db.updateProfile(displayName: name);
    ref.invalidate(profileProvider);
    setState(() => _isEditingName = false);
  }

  Future<void> _selectAvatar(String avatarId) async {
    final db = ref.read(localDatabaseProvider);
    await db.updateProfile(avatarId: avatarId);
    ref.invalidate(profileProvider);
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);
    final statsAsync = ref.watch(statsProvider);
    final historyAsync = ref.watch(gameHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text('Error: $e', style: TextStyle(color: AppColors.accent.red)),
        ),
        data: (profile) => ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            _buildProfileHeader(profile),
            const SizedBox(height: AppSpacing.lg),
            _buildAvatarSelector(profile),
            const SizedBox(height: AppSpacing.lg),
            _buildStatsSection(statsAsync),
            const SizedBox(height: AppSpacing.lg),
            _buildGameHistory(historyAsync),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(PlayerProfile profile) {
    final avatar = getAvatar(profile.avatarId);
    final tier = getTier(profile.rating);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border.gold, width: 1),
        boxShadow: AppShadows.md,
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.bg.tertiary,
              border: Border.all(color: AppColors.accent.gold, width: 2),
              boxShadow: AppShadows.gold,
            ),
            child: Center(
              child: Text(
                avatar.symbol,
                style: const TextStyle(fontSize: 40),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Display name (editable)
          if (_isEditingName)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 180,
                  child: TextField(
                    controller: _nameController,
                    autofocus: true,
                    style: TextStyle(
                      color: AppColors.text.primary,
                      fontSize: AppTypography.md,
                    ),
                    decoration: InputDecoration(
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        borderSide: BorderSide(color: AppColors.border.gold),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        borderSide: BorderSide(color: AppColors.border.gold),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        borderSide: BorderSide(color: AppColors.accent.gold, width: 2),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                IconButton(
                  icon: Icon(Icons.check, color: AppColors.accent.green),
                  onPressed: _saveName,
                ),
                IconButton(
                  icon: Icon(Icons.close, color: AppColors.accent.red),
                  onPressed: () => setState(() => _isEditingName = false),
                ),
              ],
            )
          else
            GestureDetector(
              onTap: () {
                _nameController.text = profile.displayName;
                setState(() => _isEditingName = true);
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    profile.displayName,
                    style: TextStyle(
                      color: AppColors.text.primary,
                      fontSize: AppTypography.lg,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(Icons.edit, size: 16, color: AppColors.text.muted),
                ],
              ),
            ),
          const SizedBox(height: AppSpacing.sm),

          // Rating with tier badge
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xxs,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppGradients.gold),
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
            child: Text(
              '${tier.label}  ${profile.rating}',
              style: TextStyle(
                color: AppColors.text.dark,
                fontSize: AppTypography.sm,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarSelector(PlayerProfile profile) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border.subtle, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Choose Avatar',
            style: TextStyle(
              color: AppColors.text.secondary,
              fontSize: AppTypography.body,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 8,
              mainAxisSpacing: AppSpacing.xs,
              crossAxisSpacing: AppSpacing.xs,
            ),
            itemCount: avatars.length,
            itemBuilder: (context, index) {
              final av = avatars[index];
              final isSelected = av.id == (profile.avatarId ?? avatars[0].id);
              return GestureDetector(
                onTap: () => _selectAvatar(av.id),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.accent.gold.withValues(alpha: 0.2)
                        : AppColors.bg.tertiary,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.accent.gold
                          : AppColors.border.subtle,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      av.symbol,
                      style: const TextStyle(fontSize: 22),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSection(AsyncValue<PlayerStats> statsAsync) {
    return statsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (e, _) => const SizedBox.shrink(),
      data: (stats) {
        final winRate = stats.gamesPlayed > 0
            ? (stats.wins / stats.gamesPlayed * 100).toStringAsFixed(1)
            : '0.0';
        return Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.bg.secondary,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.subtle, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Statistics',
                style: TextStyle(
                  color: AppColors.text.secondary,
                  fontSize: AppTypography.body,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 4,
                childAspectRatio: 1.2,
                mainAxisSpacing: AppSpacing.xs,
                crossAxisSpacing: AppSpacing.xs,
                children: [
                  _statTile('Played', '${stats.gamesPlayed}'),
                  _statTile('Wins', '${stats.wins}', color: AppColors.accent.green),
                  _statTile('Losses', '${stats.losses}', color: AppColors.accent.red),
                  _statTile('Draws', '${stats.draws}', color: AppColors.accent.blue),
                  _statTile('Win %', '$winRate%', color: AppColors.accent.gold),
                  _statTile('Streak', '${stats.currentStreak}'),
                  _statTile('Best', '${stats.bestStreak}', color: AppColors.accent.goldBright),
                  _statTile('High', '${stats.highScore}', color: AppColors.accent.terraCotta),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Center(
                child: Text(
                  'Total Score: ${stats.totalScore}',
                  style: TextStyle(
                    color: AppColors.text.muted,
                    fontSize: AppTypography.sm,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _statTile(String label, String value, {Color? color}) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xxs),
      decoration: BoxDecoration(
        color: AppColors.bg.tertiary,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            style: TextStyle(
              color: color ?? AppColors.text.primary,
              fontSize: AppTypography.md,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: AppColors.text.muted,
              fontSize: AppTypography.xs,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildGameHistory(AsyncValue<List<GameRecord>> historyAsync) {
    return historyAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (e, _) => const SizedBox.shrink(),
      data: (games) {
        final recent = games.take(20).toList();
        if (recent.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border.subtle, width: 1),
            ),
            child: Center(
              child: Text(
                'No games played yet',
                style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
              ),
            ),
          );
        }
        return Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.bg.secondary,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border.subtle, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Recent Games',
                style: TextStyle(
                  color: AppColors.text.secondary,
                  fontSize: AppTypography.body,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              ...recent.map((game) => _gameHistoryTile(game)),
            ],
          ),
        );
      },
    );
  }

  Widget _gameHistoryTile(GameRecord game) {
    final date = DateTime.fromMillisecondsSinceEpoch(game.timestamp);
    final dateStr = '${date.month}/${date.day}/${date.year}';

    IconData icon;
    Color iconColor;
    switch (game.result) {
      case 'win':
        icon = Icons.emoji_events;
        iconColor = AppColors.accent.gold;
        break;
      case 'loss':
        icon = Icons.close;
        iconColor = AppColors.accent.red;
        break;
      default:
        icon = Icons.horizontal_rule;
        iconColor = AppColors.accent.blue;
    }

    final modeLabel = game.mode == 'bot'
        ? game.difficulty.isNotEmpty
            ? game.difficulty[0].toUpperCase() + game.difficulty.substring(1)
            : 'Bot'
        : game.mode[0].toUpperCase() + game.mode.substring(1);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: AppColors.bg.tertiary,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${game.result.toUpperCase()} - $modeLabel',
                    style: TextStyle(
                      color: AppColors.text.primary,
                      fontSize: AppTypography.sm,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${game.resultType} | ${game.playerColor}',
                    style: TextStyle(
                      color: AppColors.text.muted,
                      fontSize: AppTypography.xs,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${game.playerScore} - ${game.opponentScore}',
                  style: TextStyle(
                    color: AppColors.text.primary,
                    fontSize: AppTypography.sm,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  dateStr,
                  style: TextStyle(
                    color: AppColors.text.muted,
                    fontSize: AppTypography.xs,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
