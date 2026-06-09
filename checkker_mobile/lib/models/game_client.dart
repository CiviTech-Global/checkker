import 'card.dart';
import 'game.dart';

class OpponentState {
  final int handCount;
  final List<PlayingCard> scorePile;
  final int timeRemainingMs;

  const OpponentState({
    required this.handCount, required this.scorePile, required this.timeRemainingMs,
  });

  factory OpponentState.fromJson(Map<String, dynamic> json) {
    final hand = json['hand'] as List? ?? [];
    return OpponentState(
      handCount: hand.length,
      scorePile: (json['scorePile'] as List? ?? [])
          .map((c) => PlayingCard.fromJson(c as Map<String, dynamic>))
          .toList(),
      timeRemainingMs: json['timeRemainingMs'] as int? ?? 0,
    );
  }
}

class GameClientState {
  final String id;
  final String fen;
  final PlayerColor turn;
  final PlayerColor color;
  final List<PlayingCard> hand;
  final List<PlayingCard> scorePile;
  final int timeRemainingMs;
  final OpponentState opponent;
  final int drawPileCount;
  final List<MoveRecord> moveHistory;
  final GameResult? result;
  final TimeControl timeControl;
  final Map<String, List<MoveEvaluation>>? bestMoves;
  final GameOdds? odds;
  final PlayerProfile? playerProfile;
  final PlayerProfile? opponentProfile;

  const GameClientState({
    required this.id, required this.fen, required this.turn, required this.color,
    required this.hand, required this.scorePile, required this.timeRemainingMs,
    required this.opponent, required this.drawPileCount, required this.moveHistory,
    this.result, required this.timeControl, this.bestMoves, this.odds,
    this.playerProfile, this.opponentProfile,
  });

  GameClientState copyWith({
    String? id,
    String? fen,
    PlayerColor? turn,
    PlayerColor? color,
    List<PlayingCard>? hand,
    List<PlayingCard>? scorePile,
    int? timeRemainingMs,
    OpponentState? opponent,
    int? drawPileCount,
    List<MoveRecord>? moveHistory,
    GameResult? result,
    TimeControl? timeControl,
    Map<String, List<MoveEvaluation>>? bestMoves,
    GameOdds? odds,
    PlayerProfile? playerProfile,
    PlayerProfile? opponentProfile,
  }) {
    return GameClientState(
      id: id ?? this.id,
      fen: fen ?? this.fen,
      turn: turn ?? this.turn,
      color: color ?? this.color,
      hand: hand ?? this.hand,
      scorePile: scorePile ?? this.scorePile,
      timeRemainingMs: timeRemainingMs ?? this.timeRemainingMs,
      opponent: opponent ?? this.opponent,
      drawPileCount: drawPileCount ?? this.drawPileCount,
      moveHistory: moveHistory ?? this.moveHistory,
      result: result ?? this.result,
      timeControl: timeControl ?? this.timeControl,
      bestMoves: bestMoves ?? this.bestMoves,
      odds: odds ?? this.odds,
      playerProfile: playerProfile ?? this.playerProfile,
      opponentProfile: opponentProfile ?? this.opponentProfile,
    );
  }

  factory GameClientState.fromJson(Map<String, dynamic> json) {
    Map<String, List<MoveEvaluation>>? bestMoves;
    if (json['bestMoves'] != null) {
      final bm = json['bestMoves'] as Map<String, dynamic>;
      bestMoves = {};
      for (final entry in bm.entries) {
        bestMoves[entry.key] = (entry.value as List)
            .map((m) => MoveEvaluation.fromJson(m as Map<String, dynamic>))
            .toList();
      }
    }

    return GameClientState(
      id: json['id'] as String? ?? json['gameId'] as String? ?? '',
      fen: json['fen'] as String? ?? '',
      turn: parseColor(json['turn'] as String? ?? 'white'),
      color: parseColor(json['color'] as String? ?? 'white'),
      hand: (json['hand'] as List? ?? [])
          .map((c) => PlayingCard.fromJson(c as Map<String, dynamic>))
          .toList(),
      scorePile: (json['scorePile'] as List? ?? [])
          .map((c) => PlayingCard.fromJson(c as Map<String, dynamic>))
          .toList(),
      timeRemainingMs: json['timeRemainingMs'] as int? ?? 0,
      opponent: OpponentState.fromJson(json['opponent'] as Map<String, dynamic>? ?? {}),
      drawPileCount: json['drawPileCount'] as int? ?? 0,
      moveHistory: (json['moveHistory'] as List? ?? [])
          .map((m) => MoveRecord.fromJson(m as Map<String, dynamic>))
          .toList(),
      result: json['result'] != null
          ? GameResult.fromJson(json['result'] as Map<String, dynamic>)
          : null,
      timeControl: parseTimeControl(json['timeControl'] as String? ?? 'blitz'),
      bestMoves: bestMoves,
      odds: json['odds'] != null
          ? GameOdds.fromJson(json['odds'] as Map<String, dynamic>)
          : null,
      playerProfile: json['playerProfile'] != null
          ? PlayerProfile.fromJson(json['playerProfile'] as Map<String, dynamic>)
          : null,
      opponentProfile: json['opponentProfile'] != null
          ? PlayerProfile.fromJson(json['opponentProfile'] as Map<String, dynamic>)
          : null,
    );
  }
}

class GameOverPayload {
  final GameResult result;
  final ScoredGame? scores;

  const GameOverPayload({required this.result, this.scores});

  factory GameOverPayload.fromJson(Map<String, dynamic> json) {
    return GameOverPayload(
      result: GameResult.fromJson(json['result'] as Map<String, dynamic>),
      scores: json['scores'] != null
          ? ScoredGame.fromJson(json['scores'] as Map<String, dynamic>)
          : null,
    );
  }
}
