import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../services/local_game_engine.dart';
import '../../theme/tokens.dart';
import '../../widgets/card_hand.dart';
import '../../widgets/chess_board.dart';
import '../../widgets/opponent_hand.dart';

const _botDelay = Duration(milliseconds: 700);

class OfflineGameScreen extends StatefulWidget {
  final String difficulty;
  const OfflineGameScreen({super.key, this.difficulty = 'beginner'});

  @override
  State<OfflineGameScreen> createState() => _OfflineGameScreenState();
}

class _OfflineGameScreenState extends State<OfflineGameScreen> {
  late LocalGameEngine _engine;
  int? _selectedCard;
  String? _selectedSquare;
  List<String> _legalForCard = [];
  String? _error;
  Timer? _botTimer;

  @override
  void initState() {
    super.initState();
    _engine = LocalGameEngine(playerColor: 'white');
  }

  @override
  void dispose() {
    _botTimer?.cancel();
    super.dispose();
  }

  bool get _myTurn => !_engine.isOver && _engine.turn == _engine.playerColor;

  void _scheduleBotIfNeeded() {
    if (_engine.isOver || _engine.turn == _engine.playerColor) return;
    _botTimer?.cancel();
    _botTimer = Timer(_botDelay, () {
      if (!mounted || _engine.isOver) return;
      final botMove = pickLocalBotMove(_engine, widget.difficulty);
      if (botMove != null) {
        _engine.playCard(botMove.cardId, botMove.move);
      }
      setState(() {});
      _scheduleBotIfNeeded();
    });
  }

  void _handleCardTap(int index) {
    if (!_myTurn) return;
    setState(() {
      _error = null;
      _selectedSquare = null;
      if (_selectedCard == index) {
        _selectedCard = null;
        _legalForCard = [];
        return;
      }
      _selectedCard = index;
      final card = _engine.hand[index];
      final legal = _engine
          .legalMovesForTurn()
          .where((g) => g.card.id == card.id)
          .toList();
      _legalForCard = legal.isNotEmpty ? legal.first.moves : [];
    });
  }

  void _handleSquarePress(String square) {
    if (!_myTurn) return;
    if (_selectedCard == null) {
      setState(() => _error = 'Select a card first.');
      return;
    }
    setState(() => _error = null);

    if (_selectedSquare != null) {
      final prefix = '$_selectedSquare$square';
      final matching = _legalForCard.where((m) => m.startsWith(prefix)).toList();
      if (matching.isNotEmpty) {
        // Auto-queen promotions for simplicity.
        final uci = matching.firstWhere((m) => m.length == 4,
            orElse: () => matching.firstWhere((m) => m.endsWith('q'),
                orElse: () => matching.first));
        final card = _engine.hand[_selectedCard!];
        final result = _engine.playCard(card.id, uci);
        setState(() {
          if (!result.success) {
            _error = result.error ?? 'Move failed.';
          } else {
            _selectedCard = null;
            _selectedSquare = null;
            _legalForCard = [];
          }
        });
        _scheduleBotIfNeeded();
        return;
      }
    }

    final origins = _legalForCard.map((m) => m.substring(0, 2)).toSet();
    setState(() {
      _selectedSquare = origins.contains(square) ? square : null;
    });
  }

  void _newGame() {
    _botTimer?.cancel();
    setState(() {
      _engine = LocalGameEngine(playerColor: 'white');
      _selectedCard = null;
      _selectedSquare = null;
      _legalForCard = [];
      _error = null;
    });
  }

  void _resign() {
    if (_engine.isOver) return;
    setState(() => _engine.resign(_engine.playerColor));
  }

  String _describeResult() {
    final result = _engine.result;
    if (result == null) return '';
    final won = result.winner == _engine.playerColor;
    switch (result.type) {
      case LocalGameResultType.checkmate:
        return won ? 'Checkmate — you win!' : 'Checkmate — the bot wins.';
      case LocalGameResultType.resignation:
        return won ? 'The bot resigned — you win!' : 'You resigned.';
      case LocalGameResultType.draw:
        return 'Draw.';
      case LocalGameResultType.deckExhausted:
        return 'Deck exhausted — poker hands decide!';
    }
  }

  @override
  Widget build(BuildContext context) {
    final highlighted = _selectedSquare != null
        ? _legalForCard
            .where((m) => m.startsWith(_selectedSquare!))
            .map((m) => m.substring(2, 4))
            .toList()
        : <String>[];
    final scores = _engine.isOver ? _engine.getScores() : null;

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Offline vs Bot'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              Text(
                '${widget.difficulty[0].toUpperCase()}${widget.difficulty.substring(1)} bot — no connection needed',
                style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _engine.isOver
                    ? _describeResult()
                    : _myTurn
                        ? 'Your turn — pick a card, then a move'
                        : 'Bot is thinking...',
                style: TextStyle(
                  fontSize: AppTypography.sm,
                  fontWeight: FontWeight.w600,
                  color: _myTurn ? AppColors.accent.gold : AppColors.text.secondary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              OpponentHand(cardCount: _engine.opponentHandCount),
              const SizedBox(height: AppSpacing.sm),
              ChessBoard(
                fen: _engine.fen,
                orientation: _engine.playerColor,
                highlightedSquares: highlighted,
                selectedSquare: _selectedSquare,
                interactive: _myTurn,
                onSquarePress: _handleSquarePress,
              ),
              const SizedBox(height: AppSpacing.sm),
              CardHand(
                cards: _engine.hand,
                selectedIndex: _selectedCard,
                onCardTap: _handleCardTap,
                disabled: !_myTurn,
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(_error!,
                    style: TextStyle(fontSize: AppTypography.sm, color: AppColors.accent.red)),
              ],
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Draw pile: ${_engine.drawPileCount}   Your score pile: ${_engine.scorePile.length}',
                style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted),
              ),
              const SizedBox(height: AppSpacing.md),
              if (_engine.isOver && scores != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: AppColors.bg.secondary,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.border.gold),
                  ),
                  child: Column(
                    children: [
                      Text(
                        _describeResult(),
                        style: TextStyle(
                          fontSize: AppTypography.md,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text.primary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'You: ${_engine.playerColor == 'white' ? scores.whiteTotal : scores.blackTotal} pts'
                        '   Bot: ${_engine.playerColor == 'white' ? scores.blackTotal : scores.whiteTotal} pts',
                        style: TextStyle(
                          fontSize: AppTypography.sm,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent.gold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton(
                            onPressed: _newGame,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.accent.primary,
                              foregroundColor: AppColors.text.primary,
                            ),
                            child: const Text('Play Again'),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          TextButton(
                            onPressed: () =>
                                context.canPop() ? context.pop() : context.go('/'),
                            child: Text('Exit',
                                style: TextStyle(color: AppColors.text.secondary)),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                TextButton(
                  onPressed: _resign,
                  child: Text('Resign',
                      style: TextStyle(color: AppColors.accent.red, fontSize: AppTypography.sm)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
