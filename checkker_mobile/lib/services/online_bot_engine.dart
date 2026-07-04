import 'dart:math';

import 'package:chess/chess.dart' as chess_lib;

import '../models/bot.dart';
import '../models/card.dart';
import 'chess_service.dart';

const _pieceValue = {
  'p': 1.0,
  'n': 3.0,
  'b': 3.0,
  'r': 5.0,
  'q': 9.0,
  'k': 0.0,
};

const _difficultyNoise = {
  BotDifficulty.beginner: 6.0,
  BotDifficulty.intermediate: 2.0,
  BotDifficulty.advanced: 0.5,
  BotDifficulty.master: 0.1,
};

/// Pick a move for the online/delegate bot.
///
/// [fen] is the current board position. [hand] is the bot's current hand.
/// [myColor] is 'white' or 'black' from the bot's perspective.
/// Returns null if no legal move exists.
({String cardId, String move})? pickOnlineBotMove({
  required String fen,
  required List<PlayingCard> hand,
  required BotConfiguration config,
  required BotMaturity maturity,
  String myColor = 'white',
}) {
  final effective = applyMaturityToConfig(config, maturity);
  final weights = getStrategyWeights(effective.strategy);
  final multiplier = getEvaluationMultiplier(maturity);
  final baseNoise = _difficultyNoise[effective.difficulty] ?? 2.0;
  // Patience reduces random noise (0 patience = full noise, 100 = almost none).
  final noise = baseNoise * (1.0 - (effective.patience / 200));
  // Deep thinking expands top-k candidate pool.
  final candidatePoolSize = 3 + (effective.deepThinking ~/ 15);

  final random = Random();
  final candidates = <BotMoveCandidate>[];
  final chess = chess_lib.Chess.fromFEN(fen);
  final groups = getLegalMovesForHand(chess, hand);

  for (final group in groups) {
    for (final move in group.moves) {
      final probe = chess_lib.Chess.fromFEN(fen);
      final captured = probe.get(move.substring(2, 4));
      final ok = probe.move({
        'from': move.substring(0, 2),
        'to': move.substring(2, 4),
        if (move.length >= 5) 'promotion': move.substring(4, 5),
      });
      if (!ok) continue;

      double score = 0.0;

      // Material gain from capture, weighted by strategy.
      if (captured != null) {
        final value = _pieceValue[captured.type.toLowerCase()] ?? 0;
        score += value * weights.captureBonus;
      }

      // Check / checkmate bonuses.
      if (probe.in_checkmate) {
        score += 100 * weights.checkBonus;
      } else if (probe.in_check) {
        score += 0.5 * weights.checkBonus;
      }

      // Approximate safety: penalize destination squares with many attackers.
      final to = move.substring(2, 4);
      final attackers = _attackersOnSquare(probe, to, myColor == 'white' ? 'b' : 'w');
      if (attackers > 0) {
        score -= attackers * weights.safetyPenalty;
      }

      // Apply maturity-derived evaluation multiplier.
      score *= multiplier;

      // Apply risk tolerance: high risk tolerates more variance in score.
      score *= 1.0 + ((effective.riskTolerance - 50) / 200);

      candidates.add(BotMoveCandidate(card: group.card, move: move, score: score));
    }
  }

  if (candidates.isEmpty) return null;

  // Sort by raw score and keep the top pool. With low patience the pool is
  // small, so randomness dominates. With high patience we pick from the best.
  candidates.sort((a, b) => b.score.compareTo(a.score));
  final pool = candidates.take(candidatePoolSize.clamp(1, candidates.length)).toList();

  BotMoveCandidate? best;
  var bestScore = double.negativeInfinity;
  for (final c in pool) {
    final jittered = c.score + random.nextDouble() * noise;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = c;
    }
  }

  if (best == null) return null;
  return (cardId: best.card.id, move: best.move);
}

/// Count attackers/defenders on a square after a move. Very cheap heuristic.
int _attackersOnSquare(chess_lib.Chess board, String square, String color) {
  // chess.dart exposes `attacks` indirectly through generate_moves. We count
  // how many legal moves of the given color land on the square.
  int count = 0;
  final moves = board.generate_moves();
  for (final m in moves) {
    final targetColor = color == 'w' ? chess_lib.Color.WHITE : chess_lib.Color.BLACK;
    if (m.color == targetColor && m.toAlgebraic == square) {
      count++;
    }
  }
  return count;
}

/// Estimate whether the bot is in an endgame-ish position.
bool isEndgame(String fen) {
  final placement = fen.split(' ').first;
  int queens = 0;
  int heavy = 0;
  for (final char in placement.split('')) {
    final lower = char.toLowerCase();
    if (lower == 'q') queens++;
    if (lower == 'r' || lower == 'q') heavy++;
  }
  return queens == 0 || heavy <= 3;
}
