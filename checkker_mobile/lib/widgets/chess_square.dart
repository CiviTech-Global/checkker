import 'package:flutter/material.dart';

import '../models/cosmetic_catalog.dart';
import '../theme/tokens.dart';

class ChessSquare extends StatelessWidget {
  final String square;
  final String? piece;
  final bool isLight;
  final bool isHighlighted;
  final bool isSelected;
  final bool isLastMove;
  final bool isCheck;
  final ValueChanged<String> onPress;
  final double size;
  final BoardTheme? boardColors;
  final PieceTheme? pieceColors;

  const ChessSquare({
    super.key,
    required this.square,
    this.piece,
    required this.isLight,
    this.isHighlighted = false,
    this.isSelected = false,
    this.isLastMove = false,
    this.isCheck = false,
    required this.onPress,
    required this.size,
    this.boardColors,
    this.pieceColors,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isLight
        ? (boardColors?.light ?? AppColors.board.light)
        : (boardColors?.dark ?? AppColors.board.dark);

    final pieceColor = piece != null && piece == piece!.toUpperCase() ? 'white' : 'black';
    final pieceKey = piece?.toLowerCase();
    final unicode = pieceKey != null ? (pieceUnicode[pieceKey]?[pieceColor]) : null;

    Color? overlayColor;
    if (isSelected) {
      overlayColor = AppColors.highlight.selected;
    } else if (isLastMove) {
      overlayColor = AppColors.highlight.lastMove;
    }

    return GestureDetector(
      onTap: () => onPress(square),
      child: Container(
        width: size,
        height: size,
        color: bg,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Selection/last-move overlay
            if (overlayColor != null)
              Positioned.fill(
                child: Container(color: overlayColor),
              ),

            // Check indicator
            if (isCheck)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.accent.red, width: 2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

            // Piece
            if (unicode != null)
              Text(
                unicode,
                style: TextStyle(
                  fontSize: size * 0.65,
                  color: pieceColors != null
                      ? (pieceColor == 'white'
                          ? pieceColors!.white
                          : pieceColors!.black)
                      : null,
                  shadows: const [
                    Shadow(
                      color: Color(0x80000000),
                      offset: Offset(1, 1),
                      blurRadius: 2,
                    ),
                  ],
                ),
              ),

            // Legal move dot (empty square)
            if (isHighlighted && piece == null)
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: AppColors.highlight.legal,
                  shape: BoxShape.circle,
                ),
              ),

            // Capture indicator (highlighted + piece present)
            if (isHighlighted && piece != null)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: AppColors.highlight.legal,
                      width: 3,
                    ),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
