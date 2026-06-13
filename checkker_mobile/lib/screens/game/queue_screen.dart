import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../services/wallet_service.dart';
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

  DepositStatus? _deposit;
  bool _depositPending = false;
  bool _depositSent = false;
  String? _depositError;
  String? _cancelReason;

  @override
  void initState() {
    super.initState();
    _joinQueue();
    _listenForGameStart();
    _listenForBotFallback();
    _listenForDeposits();
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

  void _listenForDeposits() {
    final socket = ref.read(socketServiceProvider);
    _subs.add(
      socket.depositStatusStream.listen((status) {
        if (!mounted) return;
        setState(() {
          _deposit = status;
          if (status != null && status.myDeposit) {
            // Our deposit confirmed on-chain — clear the pending spinner.
            _depositSent = true;
            _depositPending = false;
          }
        });
      }),
    );
    _subs.add(
      socket.betCancelledStream.listen((data) {
        if (!mounted) return;
        setState(() {
          _cancelReason = data['reason'] as String? ?? 'Bet cancelled';
          _deposit = null;
          _depositSent = false;
          _depositPending = false;
        });
      }),
    );
  }

  Future<void> _submitDeposit() async {
    final status = _deposit;
    if (status == null || _depositPending || _depositSent) return;
    setState(() {
      _depositPending = true;
      _depositError = null;
    });
    final txHash = await WalletService().deposit(
      status.contractAddress,
      status.gameId,
      status.betAmountWei,
    );
    if (!mounted) return;
    setState(() {
      _depositPending = false;
      if (txHash != null) {
        _depositSent = true;
      } else {
        _depositError = 'Deposit was rejected or failed. Please try again.';
      }
    });
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
          child: _deposit != null ? _buildDepositView() : _buildSearchingView(),
        ),
      ),
    );
  }

  Widget _buildSearchingView() {
    return Column(
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
          '${widget.mode[0].toUpperCase()}${widget.mode.substring(1)} • ${widget.difficulty[0].toUpperCase()}${widget.difficulty.substring(1)}',
          style: TextStyle(color: AppColors.text.muted, fontSize: 14),
        ),
        if (_cancelReason != null) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.accent.red.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              _cancelReason!,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.accent.red, fontSize: 14),
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.xl),
        TextButton(
          onPressed: () => context.go('/'),
          child: Text('Cancel', style: TextStyle(color: AppColors.accent.red, fontSize: 16)),
        ),
      ],
    );
  }

  Widget _buildDepositView() {
    final status = _deposit!;
    final displayBnb = _formatBnb(status.betAmountWei);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Confirm Bet',
            style: TextStyle(color: AppColors.accent.gold, fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.md),
          Text('\$${status.betAmountUsd.toStringAsFixed(0)}',
            style: TextStyle(color: AppColors.accent.gold, fontSize: 48, fontWeight: FontWeight.w800)),
          Text('$displayBnb BNB',
            style: TextStyle(color: AppColors.text.muted, fontSize: 14)),
          const SizedBox(height: AppSpacing.lg),
          _depositRow('Your deposit', status.myDeposit),
          const SizedBox(height: AppSpacing.xs),
          _depositRow('Opponent deposit', status.opponentDeposit),
          const SizedBox(height: AppSpacing.lg),
          if (!status.myDeposit && !_depositSent)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _depositPending ? null : _submitDeposit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent.gold,
                  foregroundColor: AppColors.bg.primary,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: _depositPending
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('Deposit $displayBnb BNB',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ),
          if (_depositSent && !status.myDeposit) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent.gold),
                ),
                const SizedBox(width: AppSpacing.sm),
                Text('Confirming on-chain...',
                  style: TextStyle(color: AppColors.accent.gold, fontSize: 14)),
              ],
            ),
          ],
          if (status.myDeposit && !status.opponentDeposit) ...[
            const SizedBox(height: AppSpacing.sm),
            Text('Waiting for opponent to deposit...',
              style: TextStyle(color: AppColors.text.muted, fontSize: 14)),
          ],
          if (_depositError != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(_depositError!,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.accent.red, fontSize: 13)),
          ],
          const SizedBox(height: AppSpacing.xl),
          TextButton(
            onPressed: () => context.go('/'),
            child: Text('Cancel', style: TextStyle(color: AppColors.accent.red, fontSize: 16)),
          ),
        ],
      ),
    );
  }

  Widget _depositRow(String label, bool done) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(done ? '✅' : '⏳', style: const TextStyle(fontSize: 20)),
        const SizedBox(width: AppSpacing.sm),
        Text(label, style: TextStyle(color: AppColors.text.primary, fontSize: 16)),
      ],
    );
  }

  /// Format a wei decimal string as a short BNB amount (18 decimals).
  String _formatBnb(String wei) {
    try {
      final value = BigInt.parse(wei);
      final whole = value ~/ BigInt.from(10).pow(18);
      final frac = value % BigInt.from(10).pow(18);
      final fracStr = frac.toString().padLeft(18, '0').substring(0, 4);
      return '$whole.$fracStr';
    } catch (_) {
      return wei;
    }
  }
}
