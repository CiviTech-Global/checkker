import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';

import '../models/game.dart';
import '../models/poker.dart';
import '../theme/tokens.dart';

class BetSettlementInfo {
  final String outcome; // 'win' | 'loss' | 'draw'
  final double betAmountUsd;
  final String txHash;

  const BetSettlementInfo({
    required this.outcome,
    required this.betAmountUsd,
    required this.txHash,
  });
}

class GameResultOverlay extends StatefulWidget {
  final bool visible;
  final GameResult? result;
  final String playerColor;
  final ScoredGame? scores;
  final VoidCallback? onRematch;
  final VoidCallback onHome;
  final bool rematchPending;
  final bool opponentWantsRematch;
  final BetSettlementInfo? betSettlement;

  const GameResultOverlay({
    super.key,
    required this.visible,
    this.result,
    required this.playerColor,
    this.scores,
    this.onRematch,
    required this.onHome,
    this.rematchPending = false,
    this.opponentWantsRematch = false,
    this.betSettlement,
  });

  @override
  State<GameResultOverlay> createState() => _GameResultOverlayState();
}

class _GameResultOverlayState extends State<GameResultOverlay> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 2));
  }

  @override
  void didUpdateWidget(GameResultOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible && !oldWidget.visible && _playerWon) {
      _confettiController.play();
    }
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  PlayerColor get _playerColorEnum => parseColor(widget.playerColor);

  bool get _playerWon {
    final result = widget.result;
    if (result == null) return false;
    return switch (result) {
      CheckmateResult(:final winner) => winner == _playerColorEnum,
      ResignationResult(:final winner) => winner == _playerColorEnum,
      TimeoutResult(:final winner) => winner == _playerColorEnum,
      _ => false,
    };
  }

  bool get _isDraw {
    final result = widget.result;
    if (result == null) return false;
    return result is DrawResult || result is DeckExhaustedResult;
  }

  String _resultLabel(GameResult r) => switch (r) {
    CheckmateResult() => 'Checkmate',
    DrawResult() => 'Draw',
    ResignationResult() => 'Resignation',
    TimeoutResult() => 'Time Out',
    DeckExhaustedResult() => 'Deck Exhausted',
  };

  String _resultReason(GameResult r) => switch (r) {
    CheckmateResult(:final winner) => '${colorToString(winner)} delivers checkmate',
    DrawResult(:final reason) => 'Draw by $reason',
    ResignationResult(:final winner) => '${winner == PlayerColor.white ? 'Black' : 'White'} resigned',
    TimeoutResult(:final winner) => '${winner == PlayerColor.white ? 'Black' : 'White'} ran out of time',
    DeckExhaustedResult() => 'Both decks exhausted',
  };

  String _pokerSummary(PokerResult poker) {
    if (poker.hands.isEmpty) return 'No poker hand';
    return poker.hands.map((h) => '${pokerHandNames[h.hand] ?? '?'} (+${h.points})').join(', ');
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible || widget.result == null) return const SizedBox.shrink();

    final result = widget.result!;
    final headerText = _isDraw ? 'Draw' : _playerWon ? 'You Win!' : 'You Lose';
    final headerColor = _isDraw
        ? AppColors.accent.blue
        : _playerWon
            ? AppColors.accent.gold
            : AppColors.text.muted;

    final playerTotal = widget.scores != null
        ? (widget.playerColor == 'white' ? widget.scores!.whiteTotal : widget.scores!.blackTotal)
        : null;
    final opponentTotal = widget.scores != null
        ? (widget.playerColor == 'white' ? widget.scores!.blackTotal : widget.scores!.whiteTotal)
        : null;
    final playerPoker = widget.scores != null
        ? (widget.playerColor == 'white' ? widget.scores!.whitePoker : widget.scores!.blackPoker)
        : null;
    final opponentPoker = widget.scores != null
        ? (widget.playerColor == 'white' ? widget.scores!.blackPoker : widget.scores!.whitePoker)
        : null;

    return Material(
      color: AppColors.overlay,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Confetti
          ConfettiWidget(
            confettiController: _confettiController,
            blastDirectionality: BlastDirectionality.explosive,
            colors: [
              AppColors.accent.gold,
              AppColors.accent.goldBright,
              AppColors.accent.burgundy,
              AppColors.accent.bronze,
            ],
          ),

          // Card
          LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = constraints.maxWidth * 0.88 < 400
                  ? constraints.maxWidth * 0.88
                  : 400.0;

              return Container(
                width: cardWidth,
                decoration: BoxDecoration(
                  color: AppColors.bg.primary,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(width: 2, color: AppColors.border.gold),
                  boxShadow: AppShadows.gold,
                ),
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Text(headerText, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: headerColor)),
                    const SizedBox(height: AppSpacing.md),

                    // Scores
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: _ScoreBox(label: 'You', total: playerTotal, poker: playerPoker != null ? _pokerSummary(playerPoker) : null),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                          child: Text('vs', style: TextStyle(fontSize: AppTypography.body, color: AppColors.text.muted)),
                        ),
                        Flexible(
                          child: _ScoreBox(label: 'Opponent', total: opponentTotal, poker: opponentPoker != null ? _pokerSummary(opponentPoker) : null),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // Result detail
                    Text(
                      _resultReason(result),
                      style: TextStyle(fontSize: AppTypography.sm, color: AppColors.text.secondary),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text('(${_resultLabel(result)})',
                        style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted)),

                    // Bet settlement
                    if (widget.betSettlement != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      _BetSettlement(bet: widget.betSettlement!),
                    ],

                    const SizedBox(height: AppSpacing.lg),

                    // Actions
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.xs,
                      children: [
                        if (widget.onRematch != null)
                          ElevatedButton(
                            onPressed: widget.onRematch,
                            child: Text(
                              widget.rematchPending
                                  ? 'Waiting...'
                                  : widget.opponentWantsRematch
                                      ? 'Accept Rematch'
                                      : 'Rematch',
                            ),
                          ),
                        OutlinedButton(
                          onPressed: widget.onHome,
                          child: const Text('Return Home'),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ScoreBox extends StatelessWidget {
  final String label;
  final int? total;
  final String? poker;

  const _ScoreBox({required this.label, this.total, this.poker});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(
          total != null ? '$total' : '-',
          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: AppColors.text.primary),
        ),
        if (poker != null)
          Text(poker!, style: TextStyle(fontSize: 10, color: AppColors.text.muted), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
      ],
    );
  }
}

class _BetSettlement extends StatelessWidget {
  final BetSettlementInfo bet;

  const _BetSettlement({required this.bet});

  @override
  Widget build(BuildContext context) {
    final color = bet.outcome == 'win'
        ? AppColors.accent.green
        : bet.outcome == 'loss'
            ? AppColors.accent.red
            : AppColors.accent.blue;

    final text = bet.outcome == 'win'
        ? '+\$${bet.betAmountUsd.toStringAsFixed(2)}'
        : bet.outcome == 'loss'
            ? '-\$${bet.betAmountUsd.toStringAsFixed(2)}'
            : '\$${bet.betAmountUsd.toStringAsFixed(2)} Refunded';

    final txDisplay = bet.txHash.length >= 10
        ? 'Tx: ${bet.txHash.substring(0, 6)}...${bet.txHash.substring(bet.txHash.length - 4)}'
        : 'Tx: ${bet.txHash}';

    return Column(
      children: [
        Text(text, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: color)),
        Text(
          txDisplay,
          style: TextStyle(fontSize: 10, color: AppColors.text.muted),
        ),
      ],
    );
  }
}
