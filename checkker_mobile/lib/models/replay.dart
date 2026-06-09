class ReplayMove {
  final String id;
  final int moveNumber;
  final String fen;
  final String moveUci;
  final String? san;
  final String? cardRank;
  final String? cardSuit;
  final String color;
  final DateTime? timestamp;

  const ReplayMove({
    required this.id,
    required this.moveNumber,
    required this.fen,
    required this.moveUci,
    this.san,
    this.cardRank,
    this.cardSuit,
    required this.color,
    this.timestamp,
  });

  factory ReplayMove.fromJson(Map<String, dynamic> json) {
    return ReplayMove(
      id: json['id'] as String? ?? '',
      moveNumber: json['moveNumber'] as int? ?? 0,
      fen: json['fen'] as String? ?? '',
      moveUci: json['moveUci'] as String? ?? '',
      san: json['san'] as String?,
      cardRank: json['cardRank'] as String?,
      cardSuit: json['cardSuit'] as String?,
      color: json['color'] as String? ?? 'white',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String)
          : null,
    );
  }
}

class RecentGame {
  final String id;
  final String mode;
  final String difficulty;
  final String timeControl;
  final String opponentName;
  final String? opponentAvatar;
  final int? opponentRating;
  final String result; // 'win' | 'loss' | 'draw'
  final int? myRatingBefore;
  final int? myRatingAfter;
  final int moveCount;
  final DateTime? playedAt;

  const RecentGame({
    required this.id,
    required this.mode,
    required this.difficulty,
    required this.timeControl,
    required this.opponentName,
    this.opponentAvatar,
    this.opponentRating,
    required this.result,
    this.myRatingBefore,
    this.myRatingAfter,
    required this.moveCount,
    this.playedAt,
  });

  factory RecentGame.fromJson(Map<String, dynamic> json) {
    return RecentGame(
      id: json['id'] as String? ?? '',
      mode: json['mode'] as String? ?? 'casual',
      difficulty: json['difficulty'] as String? ?? 'beginner',
      timeControl: json['timeControl'] as String? ?? 'blitz',
      opponentName: json['opponentName'] as String? ?? 'Opponent',
      opponentAvatar: json['opponentAvatar'] as String?,
      opponentRating: json['opponentRating'] as int?,
      result: json['result'] as String? ?? 'draw',
      myRatingBefore: json['myRatingBefore'] as int?,
      myRatingAfter: json['myRatingAfter'] as int?,
      moveCount: json['moveCount'] as int? ?? 0,
      playedAt: json['playedAt'] != null
          ? DateTime.tryParse(json['playedAt'] as String)
          : null,
    );
  }
}
