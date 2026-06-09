import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/replay.dart';
import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/chess_board.dart';

class ReplayScreen extends ConsumerStatefulWidget {
  final String gameId;
  const ReplayScreen({super.key, required this.gameId});

  @override
  ConsumerState<ReplayScreen> createState() => _ReplayScreenState();
}

class _ReplayScreenState extends ConsumerState<ReplayScreen> {
  List<ReplayMove> _moves = [];
  int _currentIndex = -1; // -1 = initial position
  bool _loading = true;
  String? _error;
  String _fen = chess_lib.Chess.DEFAULT_POSITION;
  final _subs = <StreamSubscription>[];

  @override
  void initState() {
    super.initState();
    _fetchMoves();
  }

  void _fetchMoves() {
    final socket = ref.read(socketServiceProvider);
    _subs.add(
      socket.replayMovesStream.listen((data) {
        if (data.gameId != widget.gameId) return;
        setState(() {
          _moves = data.moves;
          _loading = false;
        });
      }),
    );
    socket.getGameMoves(widget.gameId);
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    super.dispose();
  }

  void _applyIndex(int index) {
    final game = chess_lib.Chess();
    for (int i = 0; i <= index && i < _moves.length; i++) {
      final m = _moves[i];
      final san = m.san;
      if (san != null && san.isNotEmpty) {
        game.move(san);
      } else {
        game.move(m.moveUci);
      }
    }
    setState(() {
      _currentIndex = index;
      _fen = game.fen;
    });
  }

  void _stepForward() {
    if (_currentIndex < _moves.length - 1) {
      _applyIndex(_currentIndex + 1);
    }
  }

  void _stepBack() {
    if (_currentIndex >= 0) {
      _applyIndex(_currentIndex - 1);
    }
  }

  void _jumpToStart() => _applyIndex(-1);
  void _jumpToEnd() => _applyIndex(_moves.length - 1);

  String _cardLabel(ReplayMove m) {
    if (m.cardRank != null && m.cardSuit != null) {
      return '${m.cardRank}${m.cardSuit}';
    }
    return 'No card';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Replay'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Text(_error!, style: TextStyle(color: AppColors.accent.red)),
      );
    }
    if (_moves.isEmpty) {
      return Center(
        child: Text(
          'No moves recorded for this game.',
          style: TextStyle(color: AppColors.text.muted),
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.bg.secondary,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                  child: ChessBoard(
                    fen: _fen,
                    orientation: 'white',
                    interactive: false,
                    onSquarePress: (_) {},
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Move ${_currentIndex + 1} of ${_moves.length}',
                  style: TextStyle(
                    color: AppColors.text.secondary,
                    fontSize: AppTypography.md,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                if (_currentIndex >= 0 && _currentIndex < _moves.length)
                  Text(
                    '${_moves[_currentIndex].san ?? _moves[_currentIndex].moveUci}  •  ${_cardLabel(_moves[_currentIndex])}',
                    style: TextStyle(color: AppColors.text.muted),
                  ),
                const SizedBox(height: AppSpacing.md),
                _buildScrubber(),
                const SizedBox(height: AppSpacing.md),
                _buildMoveList(),
              ],
            ),
          ),
        ),
        _buildControls(),
      ],
    );
  }

  Widget _buildScrubber() {
    return SliderTheme(
      data: SliderTheme.of(context).copyWith(
        activeTrackColor: AppColors.accent.gold,
        inactiveTrackColor: AppColors.border.gold.withValues(alpha: 0.3),
        thumbColor: AppColors.accent.goldBright,
        overlayColor: AppColors.accent.gold.withValues(alpha: 0.2),
      ),
      child: Slider(
        min: -1,
        max: (_moves.length - 1).toDouble(),
        divisions: _moves.length,
        value: _currentIndex.toDouble(),
        onChanged: (v) => _applyIndex(v.round()),
      ),
    );
  }

  Widget _buildMoveList() {
    final rows = <Widget>[];
    for (int i = 0; i < _moves.length; i += 2) {
      final white = _moves[i];
      final black = i + 1 < _moves.length ? _moves[i + 1] : null;
      final moveNum = (i ~/ 2) + 1;
      rows.add(
        GestureDetector(
          onTap: () => _applyIndex(i),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            decoration: BoxDecoration(
              color: i == _currentIndex || i + 1 == _currentIndex
                  ? AppColors.accent.gold.withValues(alpha: 0.15)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 36,
                  child: Text(
                    '$moveNum.',
                    style: TextStyle(color: AppColors.text.muted, fontSize: 12),
                  ),
                ),
                Expanded(
                  child: Text(
                    white.san ?? white.moveUci,
                    style: TextStyle(
                      color: i == _currentIndex ? AppColors.accent.gold : AppColors.text.primary,
                      fontWeight: i == _currentIndex ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
                if (black != null)
                  Expanded(
                    child: Text(
                      black.san ?? black.moveUci,
                      style: TextStyle(
                        color: i + 1 == _currentIndex ? AppColors.accent.gold : AppColors.text.primary,
                        fontWeight: i + 1 == _currentIndex ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Moves',
            style: TextStyle(
              color: AppColors.text.secondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          ...rows,
        ],
      ),
    );
  }

  Widget _buildControls() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md, horizontal: AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.bg.secondary,
        border: Border(
          top: BorderSide(color: AppColors.border.gold.withValues(alpha: 0.3)),
        ),
      ),
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _ControlButton(icon: Icons.first_page, onPressed: _jumpToStart),
            _ControlButton(icon: Icons.chevron_left, onPressed: _stepBack),
            _ControlButton(icon: Icons.chevron_right, onPressed: _stepForward),
            _ControlButton(icon: Icons.last_page, onPressed: _jumpToEnd),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _ControlButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      iconSize: 32,
      color: AppColors.accent.gold,
      onPressed: onPressed,
      icon: Icon(icon),
    );
  }
}
