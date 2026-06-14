import 'package:flutter/material.dart';

import '../services/cosmetics_theme.dart';
import '../theme/tokens.dart';
import 'chess_square.dart';
import 'piece_glyph.dart';

const _files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const _ranks = [8, 7, 6, 5, 4, 3, 2, 1];

List<List<String>> _parseFen(String fen) {
  final rows = fen.split(' ')[0].split('/');
  return rows.map((row) {
    final squares = <String>[];
    for (final ch in row.split('')) {
      final n = int.tryParse(ch);
      if (n != null) {
        squares.addAll(List.filled(n, ''));
      } else {
        squares.add(ch);
      }
    }
    return squares;
  }).toList();
}

bool _isLightSquare(int file, int rank) => (file + rank) % 2 == 0;

/// Board square coordinates as 0-7 indices from White's top-left perspective.
({int file, int rank}) _sqToBoard(String sq) =>
    (file: sq.codeUnitAt(0) - 97, rank: 8 - int.parse(sq[1]));

class ChessBoard extends StatefulWidget {
  final String fen;
  final String orientation;
  final List<String> highlightedSquares;
  final String? selectedSquare;
  final bool interactive;
  final ValueChanged<String> onSquarePress;

  /// Authoritative last move (UCI from/to) used to drive the slide animation.
  final ({String from, String to})? lastMove;

  const ChessBoard({
    super.key,
    this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    this.orientation = 'white',
    this.highlightedSquares = const [],
    this.selectedSquare,
    this.lastMove,
    this.interactive = true,
    required this.onSquarePress,
  });

  @override
  State<ChessBoard> createState() => _ChessBoardState();
}

class _ChessBoardState extends State<ChessBoard> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late String _prevFen;
  late List<List<String>> _prevPieces;

  // Active slide: which destination square is animating, the moving glyph, and
  // its start/end display indices (file, rank from the current orientation).
  String? _animTo;
  String? _animGlyph;
  Color? _animColor;
  ({int fi, int ri})? _animFromIdx;
  ({int fi, int ri})? _animToIdx;

  @override
  void initState() {
    super.initState();
    _prevFen = widget.fen;
    _prevPieces = _parseFen(widget.fen);
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed && mounted) {
          setState(() {
            _animTo = null;
            _animGlyph = null;
          });
        }
      });
  }

  @override
  void didUpdateWidget(ChessBoard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.fen != _prevFen) {
      final next = _parseFen(widget.fen);
      _startAnimation(_prevPieces, next);
      _prevFen = widget.fen;
      _prevPieces = next;
    }
  }

  /// Determine the moved piece (prefer the authoritative lastMove, else diff)
  /// and kick off the slide.
  void _startAnimation(List<List<String>> prev, List<List<String>> next) {
    ({String from, String to})? move = widget.lastMove;
    move ??= _diffMove(prev, next);
    if (move == null) return;

    final fromB = _sqToBoard(move.from);
    final toB = _sqToBoard(move.to);
    // The glyph that ends on `to` (handles promotion: promoted piece is there).
    final glyph = (toB.rank < next.length && toB.file < next[toB.rank].length)
        ? next[toB.rank][toB.file]
        : '';
    if (glyph.isEmpty) return;

    setState(() {
      _animTo = move!.to;
      _animGlyph = glyph;
      _animColor = glyph == glyph.toUpperCase() ? Colors.white : Colors.black;
      _animFromIdx = _displayIdx(fromB);
      _animToIdx = _displayIdx(toB);
    });
    _controller.forward(from: 0);
  }

  ({int fi, int ri}) _displayIdx(({int file, int rank}) b) {
    if (widget.orientation == 'white') return (fi: b.file, ri: b.rank);
    return (fi: 7 - b.file, ri: 7 - b.rank);
  }

  ({String from, String to})? _diffMove(List<List<String>> prev, List<List<String>> next) {
    String? from;
    String? movedPiece;
    final gained = <({String sq, String piece})>[];
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        final oldP = (r < prev.length && f < prev[r].length) ? prev[r][f] : '';
        final newP = (r < next.length && f < next[r].length) ? next[r][f] : '';
        if (oldP.isNotEmpty && oldP != newP && from == null) {
          from = '${_files[f]}${8 - r}';
          movedPiece = oldP;
        }
        if (newP.isNotEmpty && oldP != newP) {
          gained.add((sq: '${_files[f]}${8 - r}', piece: newP));
        }
      }
    }
    if (from == null) return null;
    final dest = gained.where((g) => g.piece == movedPiece).isNotEmpty
        ? gained.firstWhere((g) => g.piece == movedPiece)
        : (gained.where((g) => g.sq != from).isNotEmpty
            ? gained.firstWhere((g) => g.sq != from)
            : null);
    if (dest == null) return null;
    return (from: from, to: dest.sq);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pieces = _parseFen(widget.fen);
    final highlightSet = widget.highlightedSquares.toSet();

    final visibleRanks = widget.orientation == 'white' ? _ranks : _ranks.reversed.toList();
    final visibleFiles = widget.orientation == 'white' ? _files : _files.reversed.toList();
    final animating = _animTo != null && _controller.isAnimating;

    return ValueListenableBuilder<EquippedVisuals>(
      valueListenable: equippedVisuals,
      builder: (context, visuals, _) => LayoutBuilder(
        builder: (context, constraints) {
          final innerWidth = constraints.maxWidth - 8;
          final coordSize = (innerWidth * 0.05).clamp(14.0, 24.0);
          final squareSize = ((innerWidth - coordSize) / 8).floorToDouble();
          final boardPx = squareSize * 8;

          return Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border.ornate, width: 2),
              borderRadius: BorderRadius.circular(AppRadius.md),
              color: AppColors.bg.secondary,
              boxShadow: AppShadows.glow,
            ),
            padding: const EdgeInsets.all(2),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: coordSize,
                      child: Column(
                        children: [
                          for (final r in visibleRanks)
                            SizedBox(
                              height: squareSize,
                              child: Center(
                                child: Text('$r',
                                    style: TextStyle(fontSize: 12, color: AppColors.text.secondary)),
                              ),
                            ),
                        ],
                      ),
                    ),
                    SizedBox(
                      width: boardPx,
                      height: boardPx,
                      child: Stack(
                        children: [
                          Column(
                            children: [
                              for (var ri = 0; ri < visibleRanks.length; ri++)
                                Row(
                                  children: [
                                    for (var fi = 0; fi < visibleFiles.length; fi++)
                                      Builder(builder: (context) {
                                        final boardRi = widget.orientation == 'white' ? ri : _ranks.length - 1 - ri;
                                        final boardFi = widget.orientation == 'white' ? fi : _files.length - 1 - fi;
                                        final rawPiece = (boardRi < pieces.length && boardFi < pieces[boardRi].length)
                                            ? pieces[boardRi][boardFi]
                                            : '';
                                        final sq = '${visibleFiles[fi]}${visibleRanks[ri]}';
                                        // Hide the destination piece while it slides in.
                                        final hide = animating && sq == _animTo;
                                        final piece = (rawPiece.isEmpty || hide) ? null : rawPiece;

                                        return ChessSquare(
                                          square: sq,
                                          piece: piece,
                                          isLight: _isLightSquare(boardFi, boardRi),
                                          isHighlighted: highlightSet.contains(sq),
                                          isSelected: widget.selectedSquare == sq,
                                          isLastMove: widget.lastMove != null &&
                                              (sq == widget.lastMove!.from || sq == widget.lastMove!.to),
                                          onPress: widget.interactive ? widget.onSquarePress : (_) {},
                                          size: squareSize,
                                          boardColors: visuals.board,
                                          pieceColors: visuals.piece,
                                        );
                                      }),
                                  ],
                                ),
                            ],
                          ),

                          // Sliding piece overlay.
                          if (animating && _animFromIdx != null && _animToIdx != null && _animGlyph != null)
                            AnimatedBuilder(
                              animation: _controller,
                              builder: (context, _) {
                                final t = Curves.easeOutCubic.transform(_controller.value);
                                final left = (_animFromIdx!.fi + (_animToIdx!.fi - _animFromIdx!.fi) * t) * squareSize;
                                final top = (_animFromIdx!.ri + (_animToIdx!.ri - _animFromIdx!.ri) * t) * squareSize;
                                final glyphKey = _animGlyph!.toLowerCase();
                                final colorName = _animColor == Colors.white ? 'white' : 'black';
                                final unicode = pieceUnicode[glyphKey]?[colorName];
                                if (unicode == null) return const SizedBox.shrink();
                                final themed = visuals.piece;
                                return Positioned(
                                  left: left,
                                  top: top,
                                  width: squareSize,
                                  height: squareSize,
                                  child: Center(
                                    child: PieceGlyph(
                                      glyph: unicode,
                                      size: squareSize,
                                      fill: colorName == 'white'
                                          ? (themed?.white ?? kDefaultWhitePiece)
                                          : (themed?.black ?? kDefaultBlackPiece),
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: EdgeInsets.only(left: coordSize),
                  child: Row(
                    children: [
                      for (final f in visibleFiles)
                        SizedBox(
                          width: squareSize,
                          child: Center(
                            child: Text(f, style: TextStyle(fontSize: 12, color: AppColors.text.secondary)),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
