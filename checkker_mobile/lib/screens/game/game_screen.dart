import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/card.dart';
import '../../models/game.dart';
import '../../models/game_client.dart';
import '../../providers/game_provider.dart';
import '../../providers/socket_provider.dart';
import '../../services/chess_service.dart';
import '../../services/socket_service.dart';
import '../../services/sound_service.dart';
import '../../theme/tokens.dart';
import '../../widgets/best_moves_panel.dart';
import '../../widgets/card_hand.dart';
import '../../widgets/chat_panel.dart';
import '../../widgets/chess_board.dart';
import '../../widgets/coaching_tip_banner.dart';
import '../../widgets/game_info_bar.dart';
import '../../widgets/game_menu_button.dart';
import '../../widgets/game_result_overlay.dart' show GameResultOverlay, BetSettlementInfo;
import '../../widgets/move_error_toast.dart';
import '../../widgets/odds_indicator.dart';
import '../../widgets/opponent_hand.dart';
import '../../widgets/player_move_history.dart';
import '../../widgets/promotion_picker.dart';
import '../../widgets/resign_button.dart';
import '../../widgets/score_pile.dart';
import '../../widgets/spectator_banner.dart';

class GameScreen extends ConsumerStatefulWidget {
  final String id;
  const GameScreen({super.key, required this.id});

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  int? _selectedCardIdx;
  String? _selectedSourceSquare;
  String? _moveError;
  List<String>? _promotionMoves;
  bool _chatExpanded = false;
  String? _coachingTip;
  String? _spectatorComment;
  bool _rematchPending = false;
  bool _opponentWantsRematch = false;
  BetSettledPayload? _betSettlement;

  int _prevMoveCount = 0;
  bool _gameStarted = false;
  bool _gameOverSoundPlayed = false;
  String? _currentGameId;

  final _sound = SoundService();
  final _subs = <StreamSubscription>[];

  @override
  void initState() {
    super.initState();
    _currentGameId = widget.id;

    final socket = ref.read(socketServiceProvider);
    _subs.addAll([
      socket.moveErrorStream.listen((msg) {
        if (mounted) setState(() => _moveError = msg);
      }),
      socket.coachingTipStream.listen((tip) {
        if (mounted) setState(() => _coachingTip = tip);
      }),
      socket.spectatorCommentStream.listen((comment) {
        if (mounted) setState(() => _spectatorComment = comment);
      }),
      socket.rematchRequestedStream.listen((_) {
        if (mounted) setState(() => _opponentWantsRematch = true);
      }),
      socket.betSettledStream.listen((data) {
        if (mounted) setState(() => _betSettlement = data);
      }),
    ]);
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    super.dispose();
  }

  bool get _isBotGame => widget.id.startsWith('bot-');

  void _handleCardTap(int idx) {
    final gs = ref.read(socketServiceProvider).gameState;
    if (gs == null) return;
    final myTurn = gs.turn == gs.color;
    if (!myTurn) return;
    setState(() {
      _selectedCardIdx = (_selectedCardIdx == idx) ? null : idx;
      _selectedSourceSquare = null;
    });
  }

  void _handleSquarePress(String square) {
    final gs = ref.read(socketServiceProvider).gameState;
    if (gs == null) return;
    final myTurn = gs.turn == gs.color;
    if (!myTurn || _selectedCardIdx == null) return;

    final card = gs.hand[_selectedCardIdx!];
    final cid = card.id;
    final legalMoves = _getLegalMovesForCard(gs.fen, card);

    if (_selectedSourceSquare == null) {
      // Check if square is a source square (piece location)
      final hasMovesFromHere = legalMoves.any((m) => m.startsWith(square));
      if (hasMovesFromHere) {
        setState(() => _selectedSourceSquare = square);
        return;
      }
      // Check if square is a destination
      final matching = legalMoves.where((m) => m.substring(2, 4) == square).toList();
      if (matching.isEmpty) return;
      if (matching.length > 1 && matching[0].length > 4) {
        setState(() => _promotionMoves = matching);
        return;
      }
      _executeMove(cid, matching[0]);
    } else {
      final matching = legalMoves
          .where((m) => m.startsWith(_selectedSourceSquare!) && m.substring(2, 4) == square)
          .toList();
      if (matching.isEmpty) return;
      if (matching.length > 1 && matching[0].length > 4) {
        setState(() => _promotionMoves = matching);
        return;
      }
      _executeMove(cid, matching[0]);
    }
  }

  void _executeMove(String cardId, String move) {
    ref.read(socketServiceProvider).playMove(cardId, move);
    setState(() {
      _selectedCardIdx = null;
      _selectedSourceSquare = null;
    });
  }

  void _handlePromotionSelect(String piece) {
    if (_promotionMoves == null || _selectedCardIdx == null) return;
    final gs = ref.read(socketServiceProvider).gameState;
    if (gs == null) return;
    final card = gs.hand[_selectedCardIdx!];
    final move = _promotionMoves!.firstWhere((m) => m.endsWith(piece), orElse: () => '');
    if (move.isNotEmpty) {
      ref.read(socketServiceProvider).playMove(card.id, move);
    }
    setState(() {
      _promotionMoves = null;
      _selectedCardIdx = null;
      _selectedSourceSquare = null;
    });
  }

  void _handleRematch() {
    setState(() => _rematchPending = true);
    ref.read(socketServiceProvider).requestRematch();
  }

  void _handleGoHome() {
    ref.read(socketServiceProvider).resign();
    context.go('/');
  }

  List<String> _getLegalMovesForCard(String fen, PlayingCard card) {
    try {
      final game = chess_lib.Chess.fromFEN(fen);
      return getLegalMovesForCard(game, card);
    } catch (_) {
      return [];
    }
  }

  List<String> _getHighlightedSquares(GameClientState gs) {
    if (_selectedCardIdx == null || _selectedCardIdx! >= gs.hand.length) return [];
    final card = gs.hand[_selectedCardIdx!];
    final allMoves = _getLegalMovesForCard(gs.fen, card);

    if (_selectedSourceSquare != null) {
      return allMoves
          .where((m) => m.startsWith(_selectedSourceSquare!))
          .map((m) => m.substring(2, 4))
          .toSet()
          .toList();
    }
    return allMoves.map((m) => m.substring(2, 4)).toSet().toList();
  }

  void _playSoundForMove(List<MoveRecord> moveHistory) {
    if (moveHistory.length <= _prevMoveCount) {
      _prevMoveCount = moveHistory.length;
      return;
    }
    _prevMoveCount = moveHistory.length;
    final latest = moveHistory.last;
    final san = latest.move;

    if (san.contains('#')) {
      _sound.playCheckmate();
    } else if (san.contains('+')) {
      _sound.playCheck();
    } else if (san.startsWith('O-O')) {
      _sound.playCastle();
    } else if (san.contains('=')) {
      _sound.playPromotion();
    } else if (san.contains('x')) {
      _sound.playCapture();
    } else {
      _sound.playMove();
    }
  }

  @override
  Widget build(BuildContext context) {
    final gsAsync = ref.watch(gameStateProvider);
    final scoresAsync = ref.watch(scoresProvider);
    final chatAsync = ref.watch(chatMessagesProvider);

    return gsAsync.when(
      loading: () => Scaffold(
        backgroundColor: AppColors.bg.primary,
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) => Scaffold(
        backgroundColor: AppColors.bg.primary,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Connection error', style: TextStyle(color: AppColors.text.primary)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => context.go('/'), child: const Text('Go Home')),
            ],
          ),
        ),
      ),
      data: (gs) {
        // Use the latest state from socket service if stream hasn't emitted yet
        final gameState = gs ?? ref.read(socketServiceProvider).gameState;
        if (gameState == null) {
          return Scaffold(
            backgroundColor: AppColors.bg.primary,
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Waiting for game...', style: TextStyle(color: AppColors.text.primary, fontSize: 16)),
                  const SizedBox(height: 16),
                  const CircularProgressIndicator(),
                  const SizedBox(height: 24),
                  TextButton(onPressed: () => context.go('/'), child: Text('Cancel', style: TextStyle(color: AppColors.text.muted))),
                ],
              ),
            ),
          );
        }

        // Detect rematch (new gameId)
        final newGameId = gameState.id;
        if (newGameId != _currentGameId && _currentGameId != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _currentGameId = newGameId;
            setState(() {
              _rematchPending = false;
              _opponentWantsRematch = false;
              _betSettlement = null;
              _gameStarted = false;
              _gameOverSoundPlayed = false;
            });
            context.go('/game/$newGameId');
          });
        }

        // Sound effects
        if (!_gameStarted && gameState.fen.isNotEmpty) {
          _gameStarted = true;
          _sound.playGameStart();
        }
        _playSoundForMove(gameState.moveHistory);
        if (gameState.result != null && _prevMoveCount > 0 && !_gameOverSoundPlayed) {
          _gameOverSoundPlayed = true;
          _sound.playGameOver();
        }

        final color = gameState.color;
        final opponentColor = color == PlayerColor.white ? PlayerColor.black : PlayerColor.white;
        final colorStr = color == PlayerColor.white ? 'white' : 'black';
        final opponentColorStr = opponentColor == PlayerColor.white ? 'white' : 'black';
        final myTurn = gameState.turn == color;
        final result = gameState.result;

        final highlightedSquares = _getHighlightedSquares(gameState);

        final scores = scoresAsync.valueOrNull;
        final chatMessages = chatAsync.valueOrNull ?? [];

        final myBestMoves = gameState.bestMoves?[colorStr] ?? [];

        final screenWidth = MediaQuery.of(context).size.width;
        final isLandscape = screenWidth >= 600;

        if (isLandscape) {
          return _buildLandscapeLayout(gameState, scores, chatMessages, highlightedSquares, myBestMoves, colorStr, opponentColorStr, myTurn, result);
        }
        return _buildPortraitLayout(gameState, scores, chatMessages, highlightedSquares, myBestMoves, colorStr, opponentColorStr, myTurn, result);
      },
    );
  }

  Widget _buildPortraitLayout(
    GameClientState gs,
    ScoredGame? scores,
    List<ChatMessage> chatMessages,
    List<String> highlightedSquares,
    List<MoveEvaluation> myBestMoves,
    String colorStr,
    String opponentColorStr,
    bool myTurn,
    GameResult? result,
  ) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    children: [
                      // Opponent info bar
                      GameInfoBar(
                        label: _isBotGame ? 'Bot' : (gs.opponentProfile?.displayName ?? 'Opponent'),
                        side: opponentColorStr,
                        timeMs: gs.opponent.timeRemainingMs,
                        active: gs.turn != gs.color,
                        rating: gs.opponentProfile?.rating,
                      ),
                      const SizedBox(height: AppSpacing.xs),

                      // Opponent hand
                      OpponentHand(cardCount: gs.opponent.handCount),
                      const SizedBox(height: AppSpacing.xs),

                      // Opponent score pile
                      ScorePile(cards: gs.opponent.scorePile, label: 'Captured'),
                      const SizedBox(height: AppSpacing.sm),

                      // Chess board
                      ChessBoard(
                        fen: gs.fen,
                        orientation: colorStr,
                        highlightedSquares: highlightedSquares,
                        interactive: myTurn,
                        onSquarePress: _handleSquarePress,
                      ),
                      const SizedBox(height: 4),
                      Text('Deck: ${gs.drawPileCount}', style: TextStyle(fontSize: 12, color: AppColors.text.muted)),
                      const SizedBox(height: AppSpacing.xs),

                      // Bot thinking
                      if (_isBotGame && !myTurn && result == null)
                        _BotThinkingIndicator(),
                      const SizedBox(height: AppSpacing.xs),

                      // Odds
                      if (gs.odds != null)
                        OddsIndicator(odds: gs.odds!, playerColor: colorStr),
                      const SizedBox(height: AppSpacing.xs),

                      // Coaching tip
                      CoachingTipBanner(tip: _coachingTip, onDismiss: () => setState(() => _coachingTip = null)),

                      // Spectator commentary
                      SpectatorBanner(comment: _spectatorComment, onDismiss: () => setState(() => _spectatorComment = null)),

                      const SizedBox(height: AppSpacing.sm),

                      // Player hand
                      CardHand(
                        cards: gs.hand,
                        selectedIndex: _selectedCardIdx,
                        onCardTap: _handleCardTap,
                        disabled: !myTurn,
                      ),

                      // Selected card info
                      if (_selectedCardIdx != null && _selectedCardIdx! < gs.hand.length)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Selected: ${gs.hand[_selectedCardIdx!].id} \u2192 ${gs.hand[_selectedCardIdx!].pieceType.name}',
                            style: TextStyle(fontSize: 12, color: AppColors.text.secondary),
                          ),
                        ),
                      const SizedBox(height: AppSpacing.xs),

                      // Player info bar
                      GameInfoBar(
                        label: gs.playerProfile?.displayName ?? 'You',
                        side: colorStr,
                        timeMs: gs.timeRemainingMs,
                        active: gs.turn == gs.color,
                        rating: gs.playerProfile?.rating,
                      ),
                      const SizedBox(height: AppSpacing.xs),

                      // Player score pile
                      ScorePile(cards: gs.scorePile, label: 'Your Captures'),
                      const SizedBox(height: AppSpacing.sm),

                      // Best moves
                      BestMovesPanel(moves: myBestMoves, visible: myBestMoves.isNotEmpty),
                      const SizedBox(height: AppSpacing.sm),

                      // Move history
                      PlayerMoveHistory(
                        label: 'Recent Moves',
                        color: colorStr,
                        moves: gs.moveHistory,
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      // Chat
                      ChatPanel(
                        messages: chatMessages,
                        onSend: (text) => ref.read(socketServiceProvider).sendChat(text),
                        expanded: _chatExpanded,
                        onToggle: () => setState(() => _chatExpanded = !_chatExpanded),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      // Actions
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          GameMenuButton(
                            onGoHome: _handleGoHome,
                            onUndo: _isBotGame ? () => ref.read(socketServiceProvider).undoMove() : null,
                            isBotGame: _isBotGame,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          ResignButton(onResign: () => ref.read(socketServiceProvider).resign()),
                        ],
                      ),
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
            ),

            // Overlays
            if (result != null)
              GameResultOverlay(
                visible: true,
                result: result,
                playerColor: colorStr,
                scores: scores,
                onRematch: _handleRematch,
                onHome: () => context.go('/'),
                rematchPending: _rematchPending,
                opponentWantsRematch: _opponentWantsRematch,
                betSettlement: _betSettlement != null
                    ? BetSettlementInfo(
                        outcome: _betSettlement!.outcome,
                        betAmountUsd: _betSettlement!.betAmountUsd,
                        txHash: _betSettlement!.txHash,
                      )
                    : null,
              ),
            if (_promotionMoves != null)
              PromotionPicker(
                visible: true,
                onSelect: _handlePromotionSelect,
                onCancel: () => setState(() => _promotionMoves = null),
              ),
            if (_moveError != null)
              MoveErrorToast(
                message: _moveError!,
                onDismiss: () => setState(() => _moveError = null),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLandscapeLayout(
    GameClientState gs,
    ScoredGame? scores,
    List<ChatMessage> chatMessages,
    List<String> highlightedSquares,
    List<MoveEvaluation> myBestMoves,
    String colorStr,
    String opponentColorStr,
    bool myTurn,
    GameResult? result,
  ) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      body: SafeArea(
        child: Stack(
          children: [
            Row(
              children: [
                // Left panel - Player
                Expanded(
                  flex: 1,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: AppSpacing.xxs),
                    child: Column(
                      children: [
                        GameInfoBar(
                          label: gs.playerProfile?.displayName ?? 'You',
                          side: colorStr,
                          timeMs: gs.timeRemainingMs,
                          active: gs.turn == gs.color,
                          rating: gs.playerProfile?.rating,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        CardHand(
                          cards: gs.hand,
                          selectedIndex: _selectedCardIdx,
                          onCardTap: _handleCardTap,
                          disabled: !myTurn,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        ScorePile(cards: gs.scorePile, label: 'Your Captures'),
                        const SizedBox(height: AppSpacing.sm),
                        BestMovesPanel(moves: myBestMoves, visible: myBestMoves.isNotEmpty),
                        const SizedBox(height: AppSpacing.sm),
                        PlayerMoveHistory(label: 'Your Moves', color: colorStr, moves: gs.moveHistory),
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            GameMenuButton(
                              onGoHome: _handleGoHome,
                              onUndo: _isBotGame ? () => ref.read(socketServiceProvider).undoMove() : null,
                              isBotGame: _isBotGame,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            ResignButton(onResign: () => ref.read(socketServiceProvider).resign()),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Center - Board + Odds + Chat
                Expanded(
                  flex: 2,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    child: Center(
                      child: Column(
                        children: [
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 480),
                            child: ChessBoard(
                              fen: gs.fen,
                              orientation: colorStr,
                              highlightedSquares: highlightedSquares,
                              interactive: myTurn,
                              onSquarePress: _handleSquarePress,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text('Deck: ${gs.drawPileCount}', style: TextStyle(fontSize: 12, color: AppColors.text.muted)),
                          if (_isBotGame && !myTurn && result == null) _BotThinkingIndicator(),
                          const SizedBox(height: AppSpacing.xs),
                          if (gs.odds != null) OddsIndicator(odds: gs.odds!, playerColor: colorStr),
                          const SizedBox(height: AppSpacing.sm),
                          ChatPanel(
                            messages: chatMessages,
                            onSend: (text) => ref.read(socketServiceProvider).sendChat(text),
                            expanded: _chatExpanded,
                            onToggle: () => setState(() => _chatExpanded = !_chatExpanded),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Right panel - Opponent
                Expanded(
                  flex: 1,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: AppSpacing.xxs),
                    child: Column(
                      children: [
                        GameInfoBar(
                          label: _isBotGame ? 'Bot' : (gs.opponentProfile?.displayName ?? 'Opponent'),
                          side: opponentColorStr,
                          timeMs: gs.opponent.timeRemainingMs,
                          active: gs.turn != gs.color,
                          rating: gs.opponentProfile?.rating,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        OpponentHand(cardCount: gs.opponent.handCount),
                        const SizedBox(height: AppSpacing.xs),
                        ScorePile(cards: gs.opponent.scorePile, label: 'Captured'),
                        const SizedBox(height: AppSpacing.sm),
                        PlayerMoveHistory(label: 'Opponent Moves', color: opponentColorStr, moves: gs.moveHistory),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Overlays
            if (result != null)
              GameResultOverlay(
                visible: true,
                result: result,
                playerColor: colorStr,
                scores: scores,
                onRematch: _handleRematch,
                onHome: () => context.go('/'),
                rematchPending: _rematchPending,
                opponentWantsRematch: _opponentWantsRematch,
                betSettlement: _betSettlement != null
                    ? BetSettlementInfo(
                        outcome: _betSettlement!.outcome,
                        betAmountUsd: _betSettlement!.betAmountUsd,
                        txHash: _betSettlement!.txHash,
                      )
                    : null,
              ),
            if (_promotionMoves != null)
              PromotionPicker(
                visible: true,
                onSelect: _handlePromotionSelect,
                onCancel: () => setState(() => _promotionMoves = null),
              ),
            if (_moveError != null)
              MoveErrorToast(
                message: _moveError!,
                onDismiss: () => setState(() => _moveError = null),
              ),
          ],
        ),
      ),
    );
  }
}

/// Animated bot thinking indicator with pulsing dots.
class _BotThinkingIndicator extends StatefulWidget {
  @override
  State<_BotThinkingIndicator> createState() => _BotThinkingIndicatorState();
}

class _BotThinkingIndicatorState extends State<_BotThinkingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0x14F5F0E8),
            border: Border.all(color: AppColors.border.gold),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('\uD83E\uDD16 Bot is thinking',
                  style: TextStyle(fontSize: 12, color: AppColors.text.muted, fontStyle: FontStyle.italic)),
              for (var i = 0; i < 3; i++)
                Opacity(
                  opacity: _dotOpacity(i),
                  child: Text('.', style: TextStyle(fontSize: 16, color: AppColors.text.muted, fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        );
      },
    );
  }

  double _dotOpacity(int index) {
    final phase = (_controller.value + index * 0.2) % 1.0;
    return (phase < 0.5) ? 0.3 + 0.7 * (phase * 2) : 0.3 + 0.7 * (2 - phase * 2);
  }
}
