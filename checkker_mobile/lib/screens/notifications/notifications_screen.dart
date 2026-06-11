import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  StreamSubscription<NotificationsData>? _sub;
  NotificationsData? _data;
  bool _markedRead = false;

  @override
  void initState() {
    super.initState();
    final socket = ref.read(socketServiceProvider);
    _sub = socket.notificationsStream.listen((data) {
      if (!mounted) return;
      setState(() => _data = data);
      // Entering this screen clears the unread badge.
      if (!_markedRead && data.unread > 0) {
        _markedRead = true;
        socket.markNotificationsRead();
      }
    });
    if (socket.authState?.profile != null) {
      socket.getNotifications();
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  ({IconData icon, String title, String detail}) _describe(AppNotification n) {
    switch (n.type) {
      case 'friend_request':
        final from = n.payload['fromUsername'] as String?;
        return (
          icon: Icons.person_add,
          title: 'Friend request',
          detail: from != null
              ? '$from wants to be your friend.'
              : 'Someone sent you a friend request.',
        );
      case 'friend_accepted':
        final username = n.payload['username'] as String?;
        return (
          icon: Icons.people,
          title: 'Friend request accepted',
          detail: username != null
              ? '$username accepted your friend request.'
              : 'Your friend request was accepted.',
        );
      case 'game_invite':
        final from = n.payload['fromUsername'] as String?;
        final tc = n.payload['tc'] as String? ?? 'blitz';
        return (
          icon: Icons.sports_esports,
          title: 'Game invite',
          detail: from != null
              ? '$from invited you to a $tc game.'
              : 'You were invited to a game.',
        );
      case 'daily_puzzle':
        return (
          icon: Icons.extension,
          title: 'Daily puzzle',
          detail: 'A new daily puzzle is ready for you.',
        );
      default:
        return (
          icon: Icons.info_outline,
          title: 'Notification',
          detail: n.payload['message'] as String? ?? 'You have a new notification.',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final socket = ref.read(socketServiceProvider);
    final authenticated = socket.authState?.profile != null;
    final items = _data?.notifications ?? const <AppNotification>[];

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: !authenticated
          ? _buildCenter(
              icon: Icons.lock_outline,
              message: 'Connect your wallet to see notifications.',
              action: TextButton(
                onPressed: () => context.push('/auth/connect'),
                child: Text(
                  'Connect Wallet',
                  style: TextStyle(color: AppColors.accent.gold),
                ),
              ),
            )
          : items.isEmpty
              ? _buildCenter(
                  icon: Icons.notifications_none,
                  message: 'No notifications yet.',
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    final n = items[index];
                    final desc = _describe(n);
                    return Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.bg.secondary,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(
                          color: n.read
                              ? AppColors.border.subtle
                              : AppColors.accent.gold,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.accent.gold.withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(desc.icon,
                                size: 22, color: AppColors.accent.gold),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  desc.title,
                                  style: TextStyle(
                                    fontSize: AppTypography.body,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.text.primary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  desc.detail,
                                  style: TextStyle(
                                    fontSize: AppTypography.sm,
                                    color: AppColors.text.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!n.read)
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: AppColors.accent.gold,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildCenter({
    required IconData icon,
    required String message,
    Widget? action,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: AppColors.text.muted),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            style: TextStyle(
              color: AppColors.text.muted,
              fontSize: AppTypography.body,
            ),
            textAlign: TextAlign.center,
          ),
          if (action != null) ...[
            const SizedBox(height: AppSpacing.sm),
            action,
          ],
        ],
      ),
    );
  }
}
