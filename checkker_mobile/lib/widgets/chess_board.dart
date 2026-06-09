import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'chess_square.dart';

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

class ChessBoard extends StatelessWidget {
  final String fen;
  final String orientation;
  final List<String> highlightedSquares;
  final String? selectedSquare;
  final bool interactive;
  final ValueChanged<String> onSquarePress;

  const ChessBoard({
    super.key,
    this.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    this.orientation = 'white',
    this.highlightedSquares = const [],
    this.selectedSquare,
    this.interactive = true,
    required this.onSquarePress,
  });

  @override
  Widget build(BuildContext context) {
    final pieces = _parseFen(fen);
    final highlightSet = highlightedSquares.toSet();

    final visibleRanks = orientation == 'white' ? _ranks : _ranks.reversed.toList();
    final visibleFiles = orientation == 'white' ? _files : _files.reversed.toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final coordSize = (constraints.maxWidth * 0.05).clamp(14.0, 24.0);
        final squareSize = ((constraints.maxWidth - coordSize) / 8).floorToDouble();

        return Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border.gold, width: 2),
            borderRadius: BorderRadius.circular(AppRadius.md),
            color: AppColors.bg.secondary,
          ),
          padding: const EdgeInsets.all(2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Rank labels
                  SizedBox(
                    width: coordSize,
                    child: Column(
                      children: [
                        for (final r in visibleRanks)
                          SizedBox(
                            height: squareSize,
                            child: Center(
                              child: Text(
                                '$r',
                                style: TextStyle(fontSize: 12, color: AppColors.text.secondary),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Board squares
                  Expanded(
                    child: Column(
                      children: [
                        for (var ri = 0; ri < visibleRanks.length; ri++)
                          Row(
                            children: [
                              for (var fi = 0; fi < visibleFiles.length; fi++)
                                Builder(builder: (context) {
                                  final boardRi = orientation == 'white' ? ri : _ranks.length - 1 - ri;
                                  final boardFi = orientation == 'white' ? fi : _files.length - 1 - fi;
                                  final piece = (boardRi < pieces.length && boardFi < (pieces[boardRi].length))
                                      ? pieces[boardRi][boardFi]
                                      : '';
                                  final sq = '${visibleFiles[fi]}${visibleRanks[ri]}';

                                  return ChessSquare(
                                    square: sq,
                                    piece: piece.isEmpty ? null : piece,
                                    isLight: _isLightSquare(boardFi, boardRi),
                                    isHighlighted: highlightSet.contains(sq),
                                    isSelected: selectedSquare == sq,
                                    onPress: interactive ? onSquarePress : (_) {},
                                    size: squareSize,
                                  );
                                }),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              // File labels
              Padding(
                padding: EdgeInsets.only(left: coordSize),
                child: Row(
                  children: [
                    for (final f in visibleFiles)
                      SizedBox(
                        width: squareSize,
                        child: Center(
                          child: Text(
                            f,
                            style: TextStyle(fontSize: 12, color: AppColors.text.secondary),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
