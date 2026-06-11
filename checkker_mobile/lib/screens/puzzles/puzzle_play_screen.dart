import 'dart:async';

import 'package:chess/chess.dart' as chess_lib;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/puzzle.dart';
import '../../providers/socket_provider.dart';
import '../../theme/tokens.dart';
import '../../widgets/chess_board.dart';

final _puzzleStreakProvider = StateProvider<int>((ref) => 0);
final _puzzleSolvedProvider = StateProvider<int>((ref) => 0);

class PuzzlePlayScreen extends ConsumerStatefulWidget {
  final String category;
  const PuzzlePlayScreen({super.key, required this.category});

  @override
  ConsumerState<PuzzlePlayScreen> createState() => _PuzzlePlayScreenState();
}

class _PuzzlePlayScreenState extends ConsumerState<PuzzlePlayScreen> {
  List<Puzzle> _puzzles = [];
  int _currentIndex = 0;
  bool _loading = true;
  String? _error;

  String? _selectedSource;
  List<String> _highlighted = [];
  bool _submitted = false;
  bool _showResult = false;
  bool _lastCorrect = false;
  String _solution = '';

  final _stopwatch = Stopwatch();
  final _subs = <StreamSubscription>[];

  @override
  void initState() {
    super.initState();
    _loadLocalStats();
    _fetchPuzzles();
  }

  Future<void> _loadLocalStats() async {
    final prefs = await SharedPreferences.getInstance();
    ref.read(_puzzleStreakProvider.notifier).state = prefs.getInt('puzzle_streak') ?? 0;
    ref.read(_puzzleSolvedProvider.notifier).state = prefs.getInt('puzzles_solved') ?? 0;
  }

  Future<void> _saveLocalStats() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('puzzle_streak', ref.read(_puzzleStreakProvider));
    await prefs.setInt('puzzles_solved', ref.read(_puzzleSolvedProvider));
  }

  void _fetchPuzzles() {
    final socket = ref.read(socketServiceProvider);
    _subs.addAll([
      socket.puzzlesListStream.listen((data) {
        setState(() {
          _puzzles = data.puzzles;
          _loading = false;
        });
        if (_puzzles.isNotEmpty) {
          _stopwatch.start();
        }
      }),
      socket.puzzleResultStream.listen((result) {
        setState(() {
          _submitted = true;
          _showResult = true;
          _lastCorrect = result.correct;
          _solution = result.solution;
        });
        if (result.correct) {
          ref.read(_puzzleStreakProvider.notifier).state++;
          ref.read(_puzzleSolvedProvider.notifier).state++;
          _saveLocalStats();
        } else {
          ref.read(_puzzleStreakProvider.notifier).state = 0;
          _saveLocalStats();
        }
      }),
    ]);
    socket.getPuzzles(widget.category, limit: 20);
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    _stopwatch.stop();
    super.dispose();
  }

  Puzzle? get _currentPuzzle => _puzzles.isNotEmpty && _currentIndex < _puzzles.length
      ? _puzzles[_currentIndex]
      : null;

  void _handleSquarePress(String square) {
    if (_submitted || _currentPuzzle == null) return;

    final game = chess_lib.Chess.fromFEN(_currentPuzzle!.fen);
    final legalMoves = game.generate_moves();

    if (_selectedSource == null) {
      // Check if there's a piece on this square
      final hasMoves = legalMoves.any((m) => _squareName(m.from) == square);
      if (hasMoves) {
        setState(() {
          _selectedSource = square;
          _highlighted = legalMoves
              .where((m) => _squareName(m.from) == square)
              .map((m) => _squareName(m.to))
              .toSet()
              .toList();
        });
      }
    } else {
      // Try to make the move
      final matching = legalMoves.where((m) {
        return _squareName(m.from) == _selectedSource &&
            _squareName(m.to) == square;
      }).toList();

      if (matching.isEmpty) {
        setState(() {
          _selectedSource = null;
          _highlighted = [];
        });
        return;
      }

      // Prefer promotion to queen if ambiguous
      final move = matching.length > 1
          ? matching.firstWhere(
              (m) => m.promotion == chess_lib.PieceType.QUEEN,
              orElse: () => matching.first)
          : matching.first;

      final uci = _moveToUci(move);
      _submitMove(uci);

      setState(() {
        _selectedSource = null;
        _highlighted = [];
      });
    }
  }

  void _submitMove(String uci) {
    final puzzle = _currentPuzzle;
    if (puzzle == null) return;
    ref.read(socketServiceProvider).submitPuzzle(
          puzzle.id,
          uci,
          timeSpentMs: _stopwatch.elapsedMilliseconds,
          usedHint: false,
        );
  }

  void _nextPuzzle() {
    if (_currentIndex < _puzzles.length - 1) {
      setState(() {
        _currentIndex++;
        _submitted = false;
        _showResult = false;
        _lastCorrect = false;
        _solution = '';
        _selectedSource = null;
        _highlighted = [];
        _stopwatch.reset();
        _stopwatch.start();
      });
    } else {
      context.pop();
    }
  }

  void _showHint() {
    final puzzle = _currentPuzzle;
    if (puzzle == null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(puzzle.hint, style: TextStyle(color: AppColors.text.dark)),
        backgroundColor: AppColors.accent.goldBright,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final streak = ref.watch(_puzzleStreakProvider);
    final solved = ref.watch(_puzzleSolvedProvider);

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: Text(_categoryLabel(widget.category)),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.local_fire_department, color: AppColors.accent.gold, size: 18),
                  const SizedBox(width: 2),
                  Text('$streak', style: TextStyle(color: AppColors.accent.gold)),
                  const SizedBox(width: 12),
                  Icon(Icons.check_circle, color: AppColors.accent.green, size: 18),
                  const SizedBox(width: 2),
                  Text('$solved', style: TextStyle(color: AppColors.accent.green)),
                ],
              ),
            ),
          ),
        ],
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
    if (_puzzles.isEmpty) {
      return Center(
        child: Text(
          'No puzzles available in this category yet.',
          style: TextStyle(color: AppColors.text.muted),
        ),
      );
    }

    final puzzle = _currentPuzzle!;
    final turnColor = puzzle.fen.split(' ')[1] == 'w' ? 'white' : 'black';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(
            'Puzzle ${_currentIndex + 1} of ${_puzzles.length}',
            style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.bg.secondary,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: ChessBoard(
              fen: puzzle.fen,
              orientation: turnColor,
              highlightedSquares: _highlighted,
              selectedSquare: _selectedSource,
              interactive: !_submitted,
              onSquarePress: _handleSquarePress,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            turnColor == 'white' ? 'White to move' : 'Black to move',
            style: TextStyle(
              color: AppColors.text.secondary,
              fontSize: AppTypography.md,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (puzzle.cards.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Your hand: ',
                  style: TextStyle(color: AppColors.text.muted, fontSize: AppTypography.sm),
                ),
                for (final card in puzzle.cards)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.bg.tertiary,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Text(
                      '${card.rank}${card.suitSymbol}',
                      style: TextStyle(
                        color: card.isRed ? AppColors.accent.red : AppColors.text.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (!_submitted)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _showHint,
                icon: Icon(Icons.lightbulb, color: AppColors.text.dark),
                label: Text('Show Hint', style: TextStyle(color: AppColors.text.dark)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent.goldBright,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
            ),
          if (_showResult) ...[
            const SizedBox(height: AppSpacing.md),
            _buildResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _buildResultCard() {
    final puzzle = _currentPuzzle;
    if (puzzle == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: _lastCorrect ? AppColors.accent.green.withValues(alpha: 0.15) : AppColors.accent.red.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: _lastCorrect ? AppColors.accent.green : AppColors.accent.red,
          width: 1.5,
        ),
      ),
      child: Column(
        children: [
          Icon(
            _lastCorrect ? Icons.check_circle : Icons.cancel,
            color: _lastCorrect ? AppColors.accent.green : AppColors.accent.red,
            size: 48,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _lastCorrect ? 'Correct!' : 'Not quite',
            style: TextStyle(
              color: _lastCorrect ? AppColors.accent.green : AppColors.accent.red,
              fontSize: AppTypography.lg,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Best move: ${_formatUci(_solution)}',
            style: TextStyle(color: AppColors.text.secondary),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _nextPuzzle,
              style: ElevatedButton.styleFrom(
                backgroundColor: _lastCorrect ? AppColors.accent.green : AppColors.accent.red,
                foregroundColor: AppColors.text.primary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
              ),
              child: Text(_currentIndex < _puzzles.length - 1 ? 'Next Puzzle' : 'Done'),
            ),
          ),
        ],
      ),
    );
  }

  String _categoryLabel(String category) {
    switch (category) {
      case 'daily':
        return 'Daily Puzzle';
      case 'tactics':
        return 'Tactical Puzzles';
      case 'card_management':
        return 'Card Management';
      case 'endgame':
        return 'Endgame Training';
      case 'weakness':
        return 'Weakness Training';
      default:
        return 'Puzzles';
    }
  }

  String _formatUci(String uci) {
    if (uci.length < 4) return uci.toUpperCase();
    final from = uci.substring(0, 2).toUpperCase();
    final to = uci.substring(2, 4).toUpperCase();
    final promotion = uci.length > 4 ? '=${uci[4].toUpperCase()}' : '';
    return '$from-$to$promotion';
  }

  String _squareName(int sq) {
    final file = String.fromCharCode('a'.codeUnitAt(0) + (sq % 16));
    final rank = '${(sq ~/ 16) + 1}';
    return '$file$rank';
  }

  String _moveToUci(chess_lib.Move m) {
    final from = _squareName(m.from);
    final to = _squareName(m.to);
    final promotion = m.promotion != null ? m.promotion!.toLowerCase() : '';
    return '$from$to$promotion';
  }
}
