import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/avatar.dart';
import '../../models/game_client.dart';
import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../theme/tokens.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  final _usernameController = TextEditingController();
  final List<StreamSubscription> _subs = [];

  FriendsData? _data;
  bool _loading = true;
  bool _sending = false;
  bool _awaitingGame = false;
  String? _lastGameId;

  @override
  void initState() {
    super.initState();
    final socket = ref.read(socketServiceProvider);
    _lastGameId = socket.gameId;

    _subs.add(socket.friendsDataStream.listen((data) {
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    }));

    _subs.add(socket.friendRequestResultStream.listen((data) {
      if (!mounted) return;
      setState(() => _sending = false);
      if (data['success'] == true) {
        _usernameController.clear();
        socket.getFriends();
        _showSnack('Friend request sent to ${data['username']}.');
      } else {
        _showSnack(data['error'] as String? ?? 'Could not send request', error: true);
      }
    }));

    _subs.add(socket.incomingFriendRequestStream.listen((data) {
      if (!mounted) return;
      socket.getFriends();
      _showSnack('${data['fromUsername']} wants to be your friend.');
    }));

    _subs.add(socket.friendAcceptedStream.listen((data) {
      if (!mounted) return;
      socket.getFriends();
      _showSnack('${data['username']} accepted your request!');
    }));

    _subs.add(socket.inviteSentStream.listen((data) {
      if (!mounted) return;
      if (data['success'] == true) {
        _awaitingGame = true;
        _showSnack(data['online'] == true
            ? 'Waiting for your friend to accept...'
            : 'Your friend is offline — they will see the invite later.');
      } else {
        _showSnack(data['error'] as String? ?? 'Could not send invite', error: true);
      }
    }));

    _subs.add(socket.privateInviteStream.listen((data) {
      if (!mounted) return;
      _showInviteDialog(data);
    }));

    _subs.add(socket.inviteDeclinedStream.listen((data) {
      if (!mounted) return;
      _awaitingGame = false;
      _showSnack('${data['byUsername'] ?? 'Your friend'} declined the invite.', error: true);
    }));

    _subs.add(socket.inviteResponseResultStream.listen((data) {
      if (!mounted) return;
      if (data['success'] != true) {
        _awaitingGame = false;
        _showSnack(data['error'] as String? ?? 'Invite is no longer valid.', error: true);
      }
    }));

    // Navigate into the game once the private match starts.
    _subs.add(socket.gameStateStream.listen((GameClientState? state) {
      if (!mounted) return;
      final gameId = socket.gameId;
      if (gameId != null && gameId != _lastGameId && _awaitingGame) {
        _awaitingGame = false;
        _lastGameId = gameId;
        context.push('/game/$gameId');
        return;
      }
      _lastGameId = gameId;
    }));

    socket.getFriends();
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    _usernameController.dispose();
    super.dispose();
  }

  void _showSnack(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? AppColors.accent.red : null,
    ));
  }

  void _showInviteDialog(Map<String, dynamic> data) {
    final socket = ref.read(socketServiceProvider);
    final inviteId = data['inviteId'] as String? ?? '';
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('Game Invite', style: TextStyle(color: AppColors.text.primary)),
        content: Text(
          '${data['fromUsername']} invited you to a ${data['tc'] ?? 'blitz'} game!',
          style: TextStyle(color: AppColors.text.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              socket.respondInvite(inviteId, false);
            },
            child: Text('Decline', style: TextStyle(color: AppColors.text.muted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _awaitingGame = true;
              socket.respondInvite(inviteId, true);
            },
            child: Text('Accept', style: TextStyle(color: AppColors.accent.goldBright)),
          ),
        ],
      ),
    );
  }

  void _sendRequest() {
    final username = _usernameController.text.trim();
    if (username.length < 3) {
      _showSnack('Usernames are at least 3 characters.', error: true);
      return;
    }
    setState(() => _sending = true);
    ref.read(socketServiceProvider).sendFriendRequest(username);
  }

  void _confirmRemove(FriendSummary friend) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('Remove Friend', style: TextStyle(color: AppColors.text.primary)),
        content: Text(
          'Remove ${friend.username} from your friends?',
          style: TextStyle(color: AppColors.text.secondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Cancel', style: TextStyle(color: AppColors.text.muted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              final socket = ref.read(socketServiceProvider);
              socket.removeFriend(friend.friendshipId);
              socket.getFriends();
            },
            child: Text('Remove', style: TextStyle(color: AppColors.accent.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final socket = ref.read(socketServiceProvider);
    final authenticated = socket.authState?.profile != null;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Friends'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: AppColors.text.muted),
            onPressed: () {
              setState(() => _loading = true);
              ref.read(socketServiceProvider).getFriends();
            },
          ),
        ],
      ),
      body: !authenticated ? _buildAuthGate() : _buildContent(),
    );
  }

  Widget _buildAuthGate() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: AppColors.text.muted),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Connect your wallet to add friends and play private games.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.body),
            ),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(
              onPressed: () => context.push('/auth/connect'),
              child: const Text('Connect Wallet'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final pending = _data?.pending ?? [];
    final friends = _data?.friends ?? [];

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        // Add friend
        Text('ADD FRIEND',
            style: TextStyle(
                color: AppColors.text.muted,
                fontSize: AppTypography.xs,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5)),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _usernameController,
                style: TextStyle(color: AppColors.text.primary),
                decoration: InputDecoration(
                  hintText: 'Friend\'s username',
                  hintStyle: TextStyle(color: AppColors.text.muted),
                  filled: true,
                  fillColor: AppColors.bg.secondary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: BorderSide(color: AppColors.border.subtle),
                  ),
                ),
                onSubmitted: (_) => _sendRequest(),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            ElevatedButton(
              onPressed: _sending ? null : _sendRequest,
              child: _sending
                  ? const SizedBox(
                      width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Add'),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),

        // Pending requests
        if (pending.isNotEmpty) ...[
          Text('PENDING REQUESTS',
              style: TextStyle(
                  color: AppColors.text.muted,
                  fontSize: AppTypography.xs,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5)),
          const SizedBox(height: AppSpacing.sm),
          ...pending.map(_buildPendingTile),
          const SizedBox(height: AppSpacing.lg),
        ],

        // Friends list
        Text('FRIENDS',
            style: TextStyle(
                color: AppColors.text.muted,
                fontSize: AppTypography.xs,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5)),
        const SizedBox(height: AppSpacing.sm),
        if (_loading && _data == null)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (friends.isEmpty)
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Text(
              'No friends yet — add someone by username above.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
            ),
          )
        else
          ...friends.map(_buildFriendTile),
      ],
    );
  }

  Widget _buildPendingTile(PendingFriendRequest request) {
    final socket = ref.read(socketServiceProvider);
    final avatar = getAvatar(request.fromAvatarId);
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.accent.gold.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Text(avatar.symbol, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              request.fromUsername,
              style: TextStyle(
                  color: AppColors.text.primary,
                  fontSize: AppTypography.sm,
                  fontWeight: FontWeight.w600),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            icon: Icon(Icons.check_circle, color: AppColors.accent.green),
            onPressed: () {
              socket.respondFriendRequest(request.friendshipId, true);
              socket.getFriends();
            },
          ),
          IconButton(
            icon: Icon(Icons.cancel, color: AppColors.accent.red),
            onPressed: () {
              socket.respondFriendRequest(request.friendshipId, false);
              socket.getFriends();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFriendTile(FriendSummary friend) {
    final avatar = getAvatar(friend.avatarId);
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.subtle),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.bg.tertiary,
                  border: Border.all(color: AppColors.border.subtle, width: 1.5),
                ),
                child: Center(
                  child: Text(avatar.symbol, style: const TextStyle(fontSize: 22)),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: friend.online ? AppColors.accent.green : AppColors.text.muted,
                    border: Border.all(color: AppColors.bg.secondary, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  friend.username,
                  style: TextStyle(
                      color: AppColors.text.primary,
                      fontSize: AppTypography.sm,
                      fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${friend.rating} ELO · ${friend.online ? 'Online' : 'Offline'}',
                  style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.xs),
                ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: () =>
                ref.read(socketServiceProvider).inviteFriend(friend.userId, tc: 'blitz'),
            icon: Icon(Icons.sports_esports, size: 18, color: AppColors.accent.goldBright),
            label: Text('Invite',
                style: TextStyle(color: AppColors.accent.goldBright, fontSize: AppTypography.sm)),
          ),
          IconButton(
            icon: Icon(Icons.person_remove, size: 20, color: AppColors.text.muted),
            onPressed: () => _confirmRemove(friend),
          ),
        ],
      ),
    );
  }
}
