import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';

class QueueScreen extends ConsumerStatefulWidget {
  final String mode;
  final String difficulty;
  final String tc;

  const QueueScreen({
    super.key,
    required this.mode,
    required this.difficulty,
    required this.tc,
  });

  @override
  ConsumerState<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends ConsumerState<QueueScreen> {
  final _subs = <StreamSubscription>[];
  bool _botFallbackShown = false;

  @override
  void initState() {
    super.initState();
    _joinQueue();
    _listenForGameStart();
    _listenForBotFallback();
  }

  void _joinQueue() {
    final socket = ref.read(socketServiceProvider);
    if (widget.mode == 'ranked') {
      socket.joinRanked(widget.difficulty, widget.tc);
    } else {
      socket.joinCasualDifficulty(widget.difficulty, widget.tc);
    }
  }

  void _listenForGameStart() {
    final socket = ref.read(socketServiceProvider);
    _subs.add(
      socket.gameStateStream.listen((gs) {
        if (gs != null && mounted) {
          context.go('/game/${gs.id}');
        }
      }),
    );
  }

  void _listenForBotFallback() {
    final socket = ref.read(socketServiceProvider);
    _subs.add(
      socket.botFallbackStream.listen((data) {
        if (mounted && !_botFallbackShown) {
          _botFallbackShown = true;
          _showBotFallbackDialog(data);
        }
      }),
    );
  }

  void _showBotFallbackDialog(Map<String, dynamic> data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg.secondary,
        title: Text('No opponents found', style: TextStyle(color: AppColors.text.primary)),
        content: Text('Would you like to play against a bot instead?',
          style: TextStyle(color: AppColors.text.secondary)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go('/');
            },
            child: Text('Cancel', style: TextStyle(color: AppColors.text.muted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(socketServiceProvider).requestBot(widget.difficulty, widget.tc);
            },
            child: const Text('Play Bot'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: MediaQuery.of(context).size.width * 0.15,
                height: MediaQuery.of(context).size.width * 0.15,
                child: const CircularProgressIndicator(strokeWidth: 3),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Searching for opponent...',
                style: TextStyle(color: AppColors.text.primary, fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${widget.mode[0].toUpperCase()}${widget.mode.substring(1)} \u2022 ${widget.difficulty[0].toUpperCase()}${widget.difficulty.substring(1)}',
                style: TextStyle(color: AppColors.text.muted, fontSize: 14),
              ),
              const SizedBox(height: AppSpacing.xl),
              TextButton(
                onPressed: () => context.go('/'),
                child: Text('Cancel', style: TextStyle(color: AppColors.accent.red, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
