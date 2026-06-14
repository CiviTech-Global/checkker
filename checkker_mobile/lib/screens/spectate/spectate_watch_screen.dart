import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/socket_provider.dart';
import '../../services/socket_service.dart';
import '../../services/sound_service.dart';
import '../../theme/tokens.dart';
import '../../widgets/chess_board.dart';
import '../../widgets/odds_indicator.dart';

class SpectateWatchScreen extends ConsumerStatefulWidget {
  final String? id;
  const SpectateWatchScreen({super.key, this.id});

  @override
  ConsumerState<SpectateWatchScreen> createState() => _SpectateWatchScreenState();
}

class _SpectateWatchScreenState extends ConsumerState<SpectateWatchScreen> {
  SpectateGameState? _state;
  List<SpectateMove> _moves = [];
  bool _isPaused = false;
  bool _showResult = false;

  final _sound = SoundService();
  int _prevMoveCount = 0;
  int _prevCaptured = 0;
  bool _gameOverPlayed = false;

  StreamSubscription<SpectateGameState?>? _stateSub;
  StreamSubscription<List<SpectateMove>>? _movesSub;

  /// The authoritative game id — prefer the live spectate state, fall back to
  /// the route param. Controls were silently no-ops when this was null.
  String? get _gameId => _state?.gameId ?? widget.id;

  @override
  void initState() {
    super.initState();
    final socketService = ref.read(socketServiceProvider);

    // Initialize with current state if available
    _state = socketService.spectateState;
    _moves = socketService.spectateMoves;
    _prevMoveCount = _moves.length;
    _prevCaptured = _capturedCount(_state);

    _stateSub = socketService.spectateStateStream.listen((state) {
      if (!mounted) return;
      setState(() {
        _state = state;
        if (state?.result != null && !_gameOverPlayed) {
          _gameOverPlayed = true;
          _showResult = true;
          _sound.playGameOver();
        }
      });
    });

    _movesSub = socketService.spectateMovesStream.listen((moves) {
      if (!mounted) return;
      // A new bot move arrived — play the right sound. Captures are detected
      // by a score-pile growing, which is notation-independent.
      if (moves.length > _prevMoveCount) {
        final captured = _capturedCount(_state);
        if (captured > _prevCaptured) {
          _sound.playCapture();
        } else {
          _sound.playMove();
        }
        _prevCaptured = captured;
      }
      _prevMoveCount = moves.length;
      setState(() => _moves = moves);
    });

    // The server starts the bot-vs-bot loop PAUSED, waiting for the spectator
    // to begin. Kick it off so moves (and sounds) actually start.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = _gameId;
      if (id != null) {
        _sound.playGameStart();
        socketService.spectateResume(id);
      }
    });
  }

  int _capturedCount(SpectateGameState? s) {
    if (s == null) return 0;
    return s.whiteScorePile.length + s.blackScorePile.length;
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _movesSub?.cancel();
    super.dispose();
  }

  void _pause() {
    final socketService = ref.read(socketServiceProvider);
    final id = _gameId;
    if (id != null) socketService.spectatePause(id);
    setState(() => _isPaused = true);
  }

  void _resume() {
    final socketService = ref.read(socketServiceProvider);
    final id = _gameId;
    if (id != null) socketService.spectateResume(id);
    setState(() => _isPaused = false);
  }

  void _stepForward() {
    final socketService = ref.read(socketServiceProvider);
    final id = _gameId;
    if (id != null) socketService.spectateStepForward(id);
  }

  void _stepBackward() {
    final socketService = ref.read(socketServiceProvider);
    final id = _gameId;
    if (id != null) socketService.spectateStepBackward(id, _moves.length - 1);
  }

  void _leave() {
    final socketService = ref.read(socketServiceProvider);
    final id = _gameId;
    if (id != null) socketService.spectateLeave(id);
    if (mounted) context.pop();
  }

  String _resultText() {
    final result = _state?.result;
    if (result == null) return '';
    final type = result.type;
    final winner = result.winner;
    if (result.isDraw) return 'Draw ($type)';
    final winnerName = winner == null
        ? ''
        : winner.name == 'white'
            ? _state?.whiteProfile.displayName ?? 'White'
            : _state?.blackProfile.displayName ?? 'Black';
    return '$winnerName wins by $type';
  }

  @override
  Widget build(BuildContext context) {
    final fen = _state?.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    final whiteName = _state?.whiteProfile.displayName ?? 'White Bot';
    final blackName = _state?.blackProfile.displayName ?? 'Black Bot';
    final whiteRating = _state?.whiteProfile.rating ?? 0;
    final blackRating = _state?.blackProfile.rating ?? 0;
    final turn = _state?.turn ?? 'white';

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Spectating'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _leave,
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                // Black player info (top)
                _PlayerBar(
                  name: blackName,
                  rating: blackRating,
                  isActive: turn == 'black',
                  color: 'black',
                  difficulty: _state?.blackDifficulty ?? '',
                ),
                const SizedBox(height: AppSpacing.xs),

                // Chess board
                ChessBoard(
                  fen: fen,
                  orientation: 'white',
                  interactive: false,
                  onSquarePress: (_) {},
                ),
                const SizedBox(height: AppSpacing.xs),

                // White player info (bottom)
                _PlayerBar(
                  name: whiteName,
                  rating: whiteRating,
                  isActive: turn == 'white',
                  color: 'white',
                  difficulty: _state?.whiteDifficulty ?? '',
                ),
                const SizedBox(height: AppSpacing.sm),

                // Odds indicator
                OddsIndicator(odds: _state?.odds, playerColor: 'white'),
                const SizedBox(height: AppSpacing.sm),

                // Move count
                Text(
                  'Move ${_moves.length}',
                  style: TextStyle(
                    fontSize: AppTypography.sm,
                    color: AppColors.text.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),

                // Control buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ControlButton(
                      icon: Icons.skip_previous,
                      label: 'Back',
                      onTap: _isPaused ? _stepBackward : null,
                    ),
                    _isPaused
                        ? _ControlButton(
                            icon: Icons.play_arrow,
                            label: 'Resume',
                            onTap: _resume,
                          )
                        : _ControlButton(
                            icon: Icons.pause,
                            label: 'Pause',
                            onTap: _pause,
                          ),
                    _ControlButton(
                      icon: Icons.skip_next,
                      label: 'Forward',
                      onTap: _isPaused ? _stepForward : null,
                    ),
                    _ControlButton(
                      icon: Icons.exit_to_app,
                      label: 'Leave',
                      onTap: _leave,
                      isDestructive: true,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Result overlay
          if (_showResult)
            Container(
              color: AppColors.overlay,
              child: Center(
                child: Container(
                  margin: const EdgeInsets.all(AppSpacing.xl),
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: AppColors.bg.secondary,
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                    border: Border.all(color: AppColors.border.gold, width: 2),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Game Over',
                        style: TextStyle(
                          fontSize: AppTypography.lg,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accent.gold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        _resultText(),
                        style: TextStyle(
                          fontSize: AppTypography.md,
                          color: AppColors.text.primary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      ElevatedButton(
                        onPressed: _leave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent.primary,
                          foregroundColor: AppColors.text.primary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xl,
                            vertical: AppSpacing.sm,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                          ),
                        ),
                        child: const Text('Leave'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PlayerBar extends StatelessWidget {
  final String name;
  final int rating;
  final bool isActive;
  final String color;
  final String difficulty;

  const _PlayerBar({
    required this.name,
    required this.rating,
    required this.isActive,
    required this.color,
    required this.difficulty,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.accent.primary.withValues(alpha: 0.15)
            : AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isActive ? AppColors.accent.green.withValues(alpha: 0.5) : AppColors.border.subtle,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color == 'white' ? Colors.white : Colors.grey.shade800,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border.gold, width: 1),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: AppTypography.sm,
                fontWeight: FontWeight.w600,
                color: AppColors.text.primary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (difficulty.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.bg.tertiary,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Text(
                difficulty[0].toUpperCase() + difficulty.substring(1),
                style: TextStyle(fontSize: AppTypography.xs, color: AppColors.text.muted),
              ),
            ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            '$rating',
            style: TextStyle(
              fontSize: AppTypography.sm,
              color: AppColors.accent.gold,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool isDestructive;

  const _ControlButton({
    required this.icon,
    required this.label,
    this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onTap == null;
    final color = isDestructive
        ? AppColors.accent.red
        : isDisabled
            ? AppColors.text.muted.withValues(alpha: 0.4)
            : AppColors.text.primary;

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              shape: BoxShape.circle,
              border: Border.all(
                color: isDestructive
                    ? AppColors.accent.red.withValues(alpha: 0.5)
                    : AppColors.border.subtle,
              ),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: AppTypography.xs, color: color),
          ),
        ],
      ),
    );
  }
}
