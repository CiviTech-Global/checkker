import 'card.dart';
import 'poker.dart';

enum TimeControl { bullet, blitz, rapid, classical }

const Map<TimeControl, int> timeControlSeconds = {
  TimeControl.bullet: 180,
  TimeControl.blitz: 420,
  TimeControl.rapid: 900,
  TimeControl.classical: 1500,
};

TimeControl parseTimeControl(String tc) {
  switch (tc) {
    case 'bullet': return TimeControl.bullet;
    case 'blitz': return TimeControl.blitz;
    case 'rapid': return TimeControl.rapid;
    case 'classical': return TimeControl.classical;
    default: return TimeControl.blitz;
  }
}

enum PlayerColor { white, black }

PlayerColor parseColor(String c) => c == 'white' ? PlayerColor.white : PlayerColor.black;
String colorToString(PlayerColor c) => c == PlayerColor.white ? 'white' : 'black';

enum BotDifficulty { beginner, intermediate, advanced, master }

BotDifficulty parseBotDifficulty(String d) {
  switch (d) {
    case 'beginner': return BotDifficulty.beginner;
    case 'intermediate': return BotDifficulty.intermediate;
    case 'advanced': return BotDifficulty.advanced;
    case 'master': return BotDifficulty.master;
    default: return BotDifficulty.beginner;
  }
}

enum BotPersonality { aggressive, defensive, tricky, classical }

const chessScores = {
  'checkmate': {'winner': 30, 'loser': 0},
  'draw': {'each': 10},
  'resignation': {'winner': 25, 'loser': 0},
  'timeout': {'winner': 25, 'loser': 0},
  'deckExhausted': {'each': 0},
};

sealed class GameResult {
  final String type;
  const GameResult(this.type);

  PlayerColor? get winner => null;
  bool get isDraw => type == 'draw' || type == 'deckExhausted';

  factory GameResult.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String;
    switch (type) {
      case 'checkmate':
        return CheckmateResult(parseColor(json['winner'] as String));
      case 'draw':
        return DrawResult(json['reason'] as String);
      case 'resignation':
        return ResignationResult(parseColor(json['winner'] as String));
      case 'timeout':
        return TimeoutResult(parseColor(json['winner'] as String));
      case 'deckExhausted':
        return const DeckExhaustedResult();
      default:
        throw ArgumentError('Unknown GameResult type: $type');
    }
  }

  Map<String, dynamic> toJson();
}

class CheckmateResult extends GameResult {
  @override
  final PlayerColor winner;
  const CheckmateResult(this.winner) : super('checkmate');
  @override
  Map<String, dynamic> toJson() => {'type': type, 'winner': colorToString(winner)};
}

class DrawResult extends GameResult {
  final String reason;
  const DrawResult(this.reason) : super('draw');
  @override
  Map<String, dynamic> toJson() => {'type': type, 'reason': reason};
}

class ResignationResult extends GameResult {
  @override
  final PlayerColor winner;
  const ResignationResult(this.winner) : super('resignation');
  @override
  Map<String, dynamic> toJson() => {'type': type, 'winner': colorToString(winner)};
}

class TimeoutResult extends GameResult {
  @override
  final PlayerColor winner;
  const TimeoutResult(this.winner) : super('timeout');
  @override
  Map<String, dynamic> toJson() => {'type': type, 'winner': colorToString(winner)};
}

class DeckExhaustedResult extends GameResult {
  const DeckExhaustedResult() : super('deckExhausted');
  @override
  Map<String, dynamic> toJson() => {'type': type};
}

class MoveRecord {
  final String move;
  final PlayingCard card;
  final PlayerColor color;
  final Map<String, dynamic>? captured;
  final int? bonusCards;
  final bool check;
  final bool mate;

  const MoveRecord({
    required this.move, required this.card, required this.color,
    this.captured, this.bonusCards, this.check = false, this.mate = false,
  });

  factory MoveRecord.fromJson(Map<String, dynamic> json) {
    return MoveRecord(
      move: json['move'] as String,
      card: PlayingCard.fromJson(json['card'] as Map<String, dynamic>),
      color: parseColor(json['color'] as String),
      captured: json['captured'] as Map<String, dynamic>?,
      bonusCards: json['bonusCards'] as int?,
      check: json['check'] as bool? ?? false,
      mate: json['mate'] as bool? ?? false,
    );
  }
}

class PlayerProfile {
  final String id;
  final String displayName;
  final int rating;
  final int gamesPlayed;
  final int wins;
  final int losses;
  final int draws;
  final int currentStreak;
  final int bestStreak;
  final String? walletAddress;
  final String? avatarId;
  final String? onlineName;

  const PlayerProfile({
    required this.id, required this.displayName, required this.rating,
    this.gamesPlayed = 0, this.wins = 0, this.losses = 0, this.draws = 0,
    this.currentStreak = 0, this.bestStreak = 0,
    this.walletAddress, this.avatarId, this.onlineName,
  });

  factory PlayerProfile.fromJson(Map<String, dynamic> json) {
    return PlayerProfile(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String? ?? 'Player',
      rating: json['rating'] as int? ?? 1200,
      gamesPlayed: json['gamesPlayed'] as int? ?? 0,
      wins: json['wins'] as int? ?? 0,
      losses: json['losses'] as int? ?? 0,
      draws: json['draws'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
      bestStreak: json['bestStreak'] as int? ?? 0,
      walletAddress: json['walletAddress'] as String?,
      avatarId: json['avatarId'] as String?,
      onlineName: json['onlineName'] as String?,
    );
  }
}

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final int timestamp;

  const ChatMessage({
    required this.id, required this.senderId, required this.senderName,
    required this.text, required this.timestamp,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      senderName: json['senderName'] as String? ?? '',
      text: json['text'] as String? ?? '',
      timestamp: json['timestamp'] as int? ?? 0,
    );
  }
}

class GameOdds {
  final double whiteWinPct;
  final double blackWinPct;
  final double drawPct;

  const GameOdds({required this.whiteWinPct, required this.blackWinPct, required this.drawPct});

  factory GameOdds.fromJson(Map<String, dynamic> json) {
    return GameOdds(
      whiteWinPct: (json['whiteWinPct'] as num).toDouble(),
      blackWinPct: (json['blackWinPct'] as num).toDouble(),
      drawPct: (json['drawPct'] as num).toDouble(),
    );
  }
}

class MoveEvaluation {
  final String cardId;
  final String move;
  final double score;

  const MoveEvaluation({required this.cardId, required this.move, required this.score});

  factory MoveEvaluation.fromJson(Map<String, dynamic> json) {
    return MoveEvaluation(
      cardId: json['cardId'] as String? ?? '',
      move: json['move'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ScoredGame {
  final PokerResult whitePoker;
  final PokerResult blackPoker;
  final int whiteTotal;
  final int blackTotal;
  final String winner;

  const ScoredGame({
    required this.whitePoker, required this.blackPoker,
    required this.whiteTotal, required this.blackTotal, required this.winner,
  });

  factory ScoredGame.fromJson(Map<String, dynamic> json) {
    return ScoredGame(
      whitePoker: PokerResult.fromJson(json['whitePoker'] as Map<String, dynamic>),
      blackPoker: PokerResult.fromJson(json['blackPoker'] as Map<String, dynamic>),
      whiteTotal: json['whiteTotal'] as int,
      blackTotal: json['blackTotal'] as int,
      winner: json['winner'] as String,
    );
  }
}
