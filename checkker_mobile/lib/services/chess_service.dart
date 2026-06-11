import 'package:chess/chess.dart' as chess_lib;

import '../models/card.dart';

class LegalMovesForCard {
  final PlayingCard card;
  final PieceType piece;
  final List<String> moves;

  const LegalMovesForCard({
    required this.card,
    required this.piece,
    required this.moves,
  });
}

/// Get legal moves for a specific card based on the piece type it maps to.
List<String> getLegalMovesForCard(chess_lib.Chess game, PlayingCard card) {
  final piece = cardToPiece(card);
  final allMoves = game.generate_moves();

  if (piece == PieceType.wild) {
    return allMoves.map((m) => _moveToString(m)).toList();
  }

  final targetType = _pieceTypeToChessType(piece);
  if (targetType == null) return [];

  return allMoves
      .where((move) => move.piece.toLowerCase() == targetType)
      .map((m) => _moveToString(m))
      .toList();
}

/// Get legal moves for an entire hand of cards.
List<LegalMovesForCard> getLegalMovesForHand(
    chess_lib.Chess game, List<PlayingCard> hand) {
  return hand.map((card) {
    return LegalMovesForCard(
      card: card,
      piece: cardToPiece(card),
      moves: getLegalMovesForCard(game, card),
    );
  }).toList();
}

/// Calculate bonus cards for a capture.
int getCaptureBonus(String capturedPiece, bool isCheck) {
  int bonus = 1;
  switch (capturedPiece.toLowerCase()) {
    case 'q':
      bonus += 2;
    case 'r':
      bonus += 1;
    case 'n':
    case 'b':
      bonus += 1;
  }
  if (isCheck) bonus += 1;
  return bonus;
}

String? _pieceTypeToChessType(PieceType piece) {
  switch (piece) {
    case PieceType.pawn:
      return 'p';
    case PieceType.king:
      return 'k';
    case PieceType.queen:
      return 'q';
    case PieceType.rook:
      return 'r';
    case PieceType.bishop:
      return 'b';
    case PieceType.knight:
      return 'n';
    case PieceType.wild:
      return null;
  }
}

String _moveToString(chess_lib.Move m) {
  final promotion = m.promotion != null ? m.promotion!.toLowerCase() : '';
  return '${m.fromAlgebraic}${m.toAlgebraic}$promotion';
}
