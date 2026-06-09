import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/avatar.dart';
import '../../models/rating.dart';
import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  StreamSubscription<LeaderboardData>? _leaderboardSub;
  LeaderboardData? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final socketService = ref.read(socketServiceProvider);

    _leaderboardSub = socketService.leaderboardStream.listen((data) {
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
        });
      }
    });

    socketService.getLeaderboard();
  }

  @override
  void dispose() {
    _leaderboardSub?.cancel();
    super.dispose();
  }

  void _refresh() {
    setState(() => _loading = true);
    ref.read(socketServiceProvider).getLeaderboard();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Leaderboard'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: AppColors.text.muted),
            onPressed: _refresh,
          ),
        ],
      ),
      body: _loading && _data == null
          ? const Center(child: CircularProgressIndicator())
          : _data == null || _data!.entries.isEmpty
              ? _buildEmptyState()
              : _buildLeaderboard(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.leaderboard, size: 64, color: AppColors.text.muted),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No rankings available',
            style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.body),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Play online games to appear on the leaderboard',
            style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboard() {
    final entries = _data!.entries;
    final myRank = _data!.myRank;

    return Column(
      children: [
        // My rank banner
        if (myRank != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppGradients.gold),
            ),
            child: Text(
              'Your Rank: #$myRank',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.text.dark,
                fontSize: AppTypography.body,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        // List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: entries.length,
            itemBuilder: (context, index) {
              final entry = entries[index];
              if (entry is! Map) return const SizedBox.shrink();
              final map = Map<String, dynamic>.from(entry);
              return _buildEntryTile(map, index + 1, myRank);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildEntryTile(Map<String, dynamic> entry, int rank, int? myRank) {
    final displayName = entry['displayName'] as String? ??
        entry['username'] as String? ??
        'Player';
    final rating = entry['rating'] as int? ?? 1000;
    final avatarId = entry['avatarId'] as String?;
    final avatar = getAvatar(avatarId);
    final tier = getTier(rating);
    final isMe = myRank != null && rank == myRank;

    // Top 3 medal colors
    Color? medalColor;
    if (rank == 1) medalColor = AppColors.accent.gold;
    if (rank == 2) medalColor = const Color(0xFFC0C0C0);
    if (rank == 3) medalColor = AppColors.accent.bronze;

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: isMe
            ? AppColors.accent.gold.withValues(alpha: 0.15)
            : AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isMe ? AppColors.accent.gold : AppColors.border.subtle,
          width: isMe ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          // Rank number
          SizedBox(
            width: 36,
            child: medalColor != null
                ? Icon(Icons.emoji_events, color: medalColor, size: 24)
                : Text(
                    '#$rank',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.text.muted,
                      fontSize: AppTypography.sm,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
          const SizedBox(width: AppSpacing.sm),

          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.bg.tertiary,
              border: Border.all(
                color: isMe ? AppColors.accent.gold : AppColors.border.subtle,
                width: 1.5,
              ),
            ),
            child: Center(
              child: Text(avatar.symbol, style: const TextStyle(fontSize: 22)),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),

          // Name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: TextStyle(
                    color: isMe ? AppColors.accent.goldBright : AppColors.text.primary,
                    fontSize: AppTypography.sm,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  tier.label,
                  style: TextStyle(
                    color: AppColors.text.muted,
                    fontSize: AppTypography.xs,
                  ),
                ),
              ],
            ),
          ),

          // Rating
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xxs,
            ),
            decoration: BoxDecoration(
              color: AppColors.bg.tertiary,
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(color: AppColors.border.subtle),
            ),
            child: Text(
              '$rating',
              style: TextStyle(
                color: AppColors.text.primary,
                fontSize: AppTypography.sm,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
