import 'dart:math';

import 'package:chess/chess.dart' as chess_lib;

import '../models/card.dart';
import '../models/poker.dart';
import 'chess_service.dart';
import 'poker_evaluator.dart';

/// Offline Checkker engine — Dart port of the server GameEngine
/// (apps/server/src/GameEngine.ts) for local bot games. Untimed.

enum LocalGameResultType { checkmate, draw, resignation, deckExhausted }

class LocalGameResult {
  final LocalGameResultType type;
  final String? winner; // 'white' | 'black' | null for draws
  const LocalGameResult(this.type, [this.winner]);
}

class LocalScoredGame {
  final PokerResult whitePoker;
  final PokerResult blackPoker;
  final int whiteTotal;
  final int blackTotal;
  final String winner; // 'white' | 'black' | 'draw'

  const LocalScoredGame({
    required this.whitePoker,
    required this.blackPoker,
    required this.whiteTotal,
    required this.blackTotal,
    required this.winner,
  });
}

class _LocalPlayer {
  final List<PlayingCard> hand = [];
  final List<PlayingCard> scorePile = [];
}

class LocalGameEngine {
  final chess_lib.Chess _chess = chess_lib.Chess();
  final _LocalPlayer _white = _LocalPlayer();
  final _LocalPlayer _black = _LocalPlayer();
  late List<PlayingCard> _drawPile;
  final List<PlayingCard> _deadPile = [];
  String _turn = 'white';
  LocalGameResult? _result;
  bool _deckReshuffled = false;
  String? _lastMove;
  final String playerColor;
  final _random = Random();

  LocalGameEngine({this.playerColor = 'white'}) {
    _drawPile = createDeck()..shuffle(_random);
    _drawToFull('white');
    _drawToFull('black');
    _ensurePlayableHand();
  }

  /// If the side to move has no legal moves with their hand (no matching
  /// cards and no wild Ace), discard the hand and redraw until they can
  /// move or the deck runs out.
  void _ensurePlayableHand() {
    final player = _currentPlayer;
    var guard = 0;
    while (_result == null &&
        guard++ < 20 &&
        !getLegalMovesForHand(_chess, player.hand).any((g) => g.moves.isNotEmpty)) {
      _deadPile.addAll(player.hand);
      player.hand.clear();
      _drawToFull(_turn);
      if (player.hand.isEmpty) {
        _result = const LocalGameResult(LocalGameResultType.deckExhausted);
      }
    }
  }

  _LocalPlayer get _currentPlayer => _turn == 'white' ? _white : _black;
  _LocalPlayer get _me => playerColor == 'white' ? _white : _black;
  _LocalPlayer get _opp => playerColor == 'white' ? _black : _white;

  String get fen => _chess.fen;
  String get turn => _turn;
  List<PlayingCard> get hand => List.unmodifiable(_me.hand);
  List<PlayingCard> get scorePile => List.unmodifiable(_me.scorePile);
  int get opponentHandCount => _opp.hand.length;
  List<PlayingCard> get opponentScorePile => List.unmodifiable(_opp.scorePile);
  int get drawPileCount => _drawPile.length;
  LocalGameResult? get result => _result;
  bool get isOver => _result != null;
  String? get lastMoveFrom => _lastMove?.substring(0, 2);
  String? get lastMoveTo => _lastMove?.substring(2, 4);
  chess_lib.Chess get chess => _chess;

  void _drawToFull(String color) {
    final player = color == 'white' ? _white : _black;
    while (player.hand.length < 3 && _drawPile.isNotEmpty) {
      player.hand.add(_drawPile.removeLast());
    }
    if (player.hand.length < 3 && _drawPile.isEmpty) {
      _reshuffleDead();
      while (player.hand.length < 3 && _drawPile.isNotEmpty) {
        player.hand.add(_drawPile.removeLast());
      }
    }
  }

  void _reshuffleDead() {
    if (_deckReshuffled) {
      _result = const LocalGameResult(LocalGameResultType.deckExhausted);
      return;
    }
    _drawPile = [..._deadPile]..shuffle(_random);
    _deadPile.clear();
    _deckReshuffled = true;
  }

  /// Legal moves for the side to move, grouped per card in hand.
  List<LegalMovesForCard> legalMovesForTurn() {
    return getLegalMovesForHand(_chess, _currentPlayer.hand);
  }

  ({bool success, String? error}) playCard(String cardId, String moveStr) {
    if (_result != null) return (success: false, error: 'Game already ended');

    final player = _currentPlayer;
    final cardIdx = player.hand.indexWhere((c) => c.id == cardId);
    if (cardIdx == -1) return (success: false, error: 'Card not in hand');

    final card = player.hand[cardIdx];
    final piece = cardToPiece(card);

    if (piece != PieceType.wild) {
      final legal = getLegalMovesForCard(_chess, card);
      if (!legal.contains(moveStr)) {
        return (success: false, error: 'Illegal move for this card');
      }
    }

    final from = moveStr.substring(0, 2);
    final to = moveStr.substring(2, 4);
    final promotion = moveStr.length >= 5 ? moveStr.substring(4, 5) : null;
    final capturedBefore = _chess.get(to);
    final ok = _chess.move({
      'from': from,
      'to': to,
      'promotion': ?promotion,
    });
    if (!ok) return (success: false, error: 'Invalid chess move');

    player.hand.removeAt(cardIdx);
    _lastMove = moveStr;

    final wasCapture = capturedBefore != null;
    final isCheckMove = _chess.in_check;

    if (wasCapture) {
      player.scorePile.add(card);
      if (piece != PieceType.wild) {
        final bonus = getCaptureBonus(capturedBefore.type.toLowerCase(), isCheckMove);
        for (var i = 0; i < bonus - 1; i++) {
          if (_drawPile.isEmpty) _reshuffleDead();
          if (_result != null) break;
          if (_drawPile.isNotEmpty) player.hand.add(_drawPile.removeLast());
        }
      }
    } else {
      _deadPile.add(card);
    }

    _checkGameEnd();

    if (_result == null) {
      _turn = _turn == 'white' ? 'black' : 'white';
      _drawToFull(_turn);
      _ensurePlayableHand();
    }

    return (success: true, error: null);
  }

  void _checkGameEnd() {
    if (_chess.in_checkmate) {
      _result = LocalGameResult(LocalGameResultType.checkmate, _turn);
      return;
    }
    if (_chess.in_stalemate ||
        _chess.in_threefold_repetition ||
        _chess.insufficient_material ||
        _chess.in_draw) {
      _result = const LocalGameResult(LocalGameResultType.draw);
    }
  }

  void resign(String color) {
    _result = LocalGameResult(
      LocalGameResultType.resignation,
      color == 'white' ? 'black' : 'white',
    );
  }

  LocalScoredGame? getScores() {
    final result = _result;
    if (result == null) return null;
    final whitePoker = evaluateScorePile(_white.scorePile);
    final blackPoker = evaluateScorePile(_black.scorePile);

    int whiteChess = 0;
    int blackChess = 0;
    switch (result.type) {
      case LocalGameResultType.checkmate:
        whiteChess = result.winner == 'white' ? 30 : 0;
        blackChess = result.winner == 'black' ? 30 : 0;
      case LocalGameResultType.resignation:
        whiteChess = result.winner == 'white' ? 25 : 0;
        blackChess = result.winner == 'black' ? 25 : 0;
      case LocalGameResultType.draw:
        whiteChess = 10;
        blackChess = 10;
      case LocalGameResultType.deckExhausted:
        break;
    }

    final whiteTotal = whiteChess + whitePoker.total;
    final blackTotal = blackChess + blackPoker.total;
    return LocalScoredGame(
      whitePoker: whitePoker,
      blackPoker: blackPoker,
      whiteTotal: whiteTotal,
      blackTotal: blackTotal,
      winner: whiteTotal > blackTotal
          ? 'white'
          : blackTotal > whiteTotal
              ? 'black'
              : 'draw',
    );
  }
}

/// Simple offline bot: scores each (card, move) by captured material with
/// check/checkmate bonuses, plus difficulty-scaled noise.
({String cardId, String move})? pickLocalBotMove(
  LocalGameEngine engine,
  String difficulty,
) {
  const pieceValue = {'p': 1.0, 'n': 3.0, 'b': 3.0, 'r': 5.0, 'q': 9.0, 'k': 0.0};
  final random = Random();
  final candidates = <({String cardId, String move, double score})>[];
  final fen = engine.fen;

  for (final group in engine.legalMovesForTurn()) {
    for (final move in group.moves) {
      final probe = chess_lib.Chess.fromFEN(fen);
      final to = move.substring(2, 4);
      final captured = probe.get(to);
      var score = 0.0;
      final ok = probe.move({
        'from': move.substring(0, 2),
        'to': to,
        if (move.length >= 5) 'promotion': move.substring(4, 5),
      });
      if (!ok) continue;
      if (captured != null) score += pieceValue[captured.type.toLowerCase()] ?? 0;
      if (probe.in_checkmate) {
        score += 100;
      } else if (probe.in_check) {
        score += 0.5;
      }
      candidates.add((cardId: group.card.id, move: move, score: score));
    }
  }

  if (candidates.isEmpty) return null;

  final noise = difficulty == 'beginner'
      ? 6.0
      : difficulty == 'intermediate'
          ? 2.0
          : 0.5;
  ({String cardId, String move})? best;
  var bestScore = double.negativeInfinity;
  for (final c in candidates) {
    final jittered = c.score + random.nextDouble() * noise;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = (cardId: c.cardId, move: c.move);
    }
  }
  return best;
}
