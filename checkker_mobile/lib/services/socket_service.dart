import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../models/card.dart';
import '../models/game.dart';
import '../models/game_client.dart';
import '../models/puzzle.dart';
import '../models/replay.dart';
import '../models/cosmetic.dart';

const String _defaultServerUrl = String.fromEnvironment(
  'SERVER_URL',
  defaultValue: 'http://192.168.1.105:3001',
);

// Auth types
class AuthState {
  final PlayerProfile? profile;
  final bool isNewUser;
  final String? walletAddress;

  const AuthState({this.profile, this.isNewUser = false, this.walletAddress});

  factory AuthState.fromJson(Map<String, dynamic> json) {
    return AuthState(
      profile: json['profile'] != null
          ? PlayerProfile.fromJson(json['profile'] as Map<String, dynamic>)
          : null,
      isNewUser: json['isNewUser'] as bool? ?? false,
      walletAddress: json['walletAddress'] as String?,
    );
  }
}

class DepositStatus {
  final String gameId;
  final String betAmountWei;
  final double betAmountUsd;
  final String contractAddress;
  final bool myDeposit;
  final bool opponentDeposit;

  const DepositStatus({
    required this.gameId,
    required this.betAmountWei,
    required this.betAmountUsd,
    required this.contractAddress,
    this.myDeposit = false,
    this.opponentDeposit = false,
  });

  DepositStatus copyWith({bool? myDeposit, bool? opponentDeposit}) {
    return DepositStatus(
      gameId: gameId,
      betAmountWei: betAmountWei,
      betAmountUsd: betAmountUsd,
      contractAddress: contractAddress,
      myDeposit: myDeposit ?? this.myDeposit,
      opponentDeposit: opponentDeposit ?? this.opponentDeposit,
    );
  }
}

class BetSettledPayload {
  final String escrowGameId;
  final String txHash;
  final double betAmountUsd;
  final String result;
  final String outcome; // 'win' | 'loss' | 'draw'

  const BetSettledPayload({
    required this.escrowGameId,
    required this.txHash,
    required this.betAmountUsd,
    required this.result,
    required this.outcome,
  });

  factory BetSettledPayload.fromJson(Map<String, dynamic> json) {
    return BetSettledPayload(
      escrowGameId: json['escrowGameId'] as String? ?? '',
      txHash: json['txHash'] as String? ?? '',
      betAmountUsd: (json['betAmountUsd'] as num?)?.toDouble() ?? 0,
      result: json['result'] as String? ?? '',
      outcome: json['outcome'] as String? ?? 'draw',
    );
  }
}

class CosmeticsData {
  final List<Cosmetic> cosmetics;
  final List<UserCosmetic> userCosmetics;

  const CosmeticsData({
    required this.cosmetics,
    required this.userCosmetics,
  });

  factory CosmeticsData.fromJson(Map<String, dynamic> json) {
    return CosmeticsData(
      cosmetics: (json['cosmetics'] as List? ?? [])
          .map((c) => Cosmetic.fromJson(c as Map<String, dynamic>))
          .toList(),
      userCosmetics: (json['userCosmetics'] as List? ?? [])
          .map((u) => UserCosmetic.fromJson(u as Map<String, dynamic>))
          .toList(),
    );
  }
}

class LeaderboardData {
  final List<dynamic> entries;
  final int? myRank;

  const LeaderboardData({required this.entries, this.myRank});

  factory LeaderboardData.fromJson(Map<String, dynamic> json) {
    return LeaderboardData(
      entries: json['entries'] as List? ?? [],
      myRank: json['myRank'] as int?,
    );
  }
}

class ProfileData {
  final PlayerProfile? profile;
  final List<RecentGame> recentGames;
  final int? rank;
  final Map<String, dynamic>? user;
  final PuzzleStats? puzzleStats;

  const ProfileData({
    this.profile,
    this.recentGames = const [],
    this.rank,
    this.user,
    this.puzzleStats,
  });

  factory ProfileData.fromJson(Map<String, dynamic> json) {
    return ProfileData(
      profile: json['profile'] != null
          ? PlayerProfile.fromJson(json['profile'] as Map<String, dynamic>)
          : null,
      recentGames: (json['recentGames'] as List? ?? [])
          .map((g) => RecentGame.fromJson(g as Map<String, dynamic>))
          .toList(),
      rank: json['rank'] as int?,
      user: json['user'] as Map<String, dynamic>?,
      puzzleStats: json['puzzleStats'] != null
          ? PuzzleStats.fromJson(json['puzzleStats'] as Map<String, dynamic>)
          : null,
    );
  }
}

class PuzzleStats {
  final int streak;
  final int solved;
  final int attempted;

  const PuzzleStats({this.streak = 0, this.solved = 0, this.attempted = 0});

  factory PuzzleStats.fromJson(Map<String, dynamic> json) {
    return PuzzleStats(
      streak: json['streak'] as int? ?? 0,
      solved: json['solved'] as int? ?? 0,
      attempted: json['attempted'] as int? ?? 0,
    );
  }
}

class PuzzleData {
  final Puzzle? puzzle;

  const PuzzleData({this.puzzle});

  factory PuzzleData.fromJson(Map<String, dynamic> json) {
    return PuzzleData(
      puzzle: json['puzzle'] != null
          ? Puzzle.fromJson(json['puzzle'] as Map<String, dynamic>)
          : null,
    );
  }
}

class PuzzlesListData {
  final String category;
  final List<Puzzle> puzzles;
  final int count;

  const PuzzlesListData({required this.category, required this.puzzles, required this.count});

  factory PuzzlesListData.fromJson(Map<String, dynamic> json) {
    return PuzzlesListData(
      category: json['category'] as String? ?? 'tactics',
      puzzles: (json['puzzles'] as List? ?? [])
          .map((p) => Puzzle.fromJson(p as Map<String, dynamic>))
          .toList(),
      count: json['count'] as int? ?? 0,
    );
  }
}

class ReplayData {
  final String gameId;
  final List<ReplayMove> moves;

  const ReplayData({required this.gameId, required this.moves});

  factory ReplayData.fromJson(Map<String, dynamic> json) {
    return ReplayData(
      gameId: json['gameId'] as String? ?? '',
      moves: (json['moves'] as List? ?? [])
          .map((m) => ReplayMove.fromJson(m as Map<String, dynamic>))
          .toList(),
    );
  }
}

// Spectate types
class SpectateMove {
  final String fen;
  final String move;
  final String card;
  final String color;
  final List<PlayingCard> whiteHand;
  final List<PlayingCard> blackHand;
  final List<PlayingCard> whiteScorePile;
  final List<PlayingCard> blackScorePile;
  final String turn;
  final int moveIndex;
  final GameOdds? odds;
  final int? drawPileCount;

  const SpectateMove({
    required this.fen,
    required this.move,
    required this.card,
    required this.color,
    required this.whiteHand,
    required this.blackHand,
    required this.whiteScorePile,
    required this.blackScorePile,
    required this.turn,
    required this.moveIndex,
    this.odds,
    this.drawPileCount,
  });

  factory SpectateMove.fromJson(Map<String, dynamic> json) {
    return SpectateMove(
      fen: json['fen'] as String? ?? '',
      move: json['move'] as String? ?? '',
      card: json['card'] as String? ?? '',
      color: json['color'] as String? ?? '',
      whiteHand: _parseCardList(json['whiteHand']),
      blackHand: _parseCardList(json['blackHand']),
      whiteScorePile: _parseCardList(json['whiteScorePile']),
      blackScorePile: _parseCardList(json['blackScorePile']),
      turn: json['turn'] as String? ?? '',
      moveIndex: json['moveIndex'] as int? ?? 0,
      odds: json['odds'] != null
          ? GameOdds.fromJson(json['odds'] as Map<String, dynamic>)
          : null,
      drawPileCount: json['drawPileCount'] as int?,
    );
  }
}

class SpectateGameState {
  final String gameId;
  final String fen;
  final String turn;
  final List<PlayingCard> whiteHand;
  final List<PlayingCard> blackHand;
  final List<PlayingCard> whiteScorePile;
  final List<PlayingCard> blackScorePile;
  final PlayerProfile whiteProfile;
  final PlayerProfile blackProfile;
  final GameOdds odds;
  final String whiteDifficulty;
  final String blackDifficulty;
  final GameResult? result;
  final ScoredGame? scores;

  const SpectateGameState({
    required this.gameId,
    required this.fen,
    required this.turn,
    required this.whiteHand,
    required this.blackHand,
    required this.whiteScorePile,
    required this.blackScorePile,
    required this.whiteProfile,
    required this.blackProfile,
    required this.odds,
    required this.whiteDifficulty,
    required this.blackDifficulty,
    this.result,
    this.scores,
  });

  SpectateGameState copyWith({
    String? fen,
    String? turn,
    List<PlayingCard>? whiteHand,
    List<PlayingCard>? blackHand,
    List<PlayingCard>? whiteScorePile,
    List<PlayingCard>? blackScorePile,
    PlayerProfile? whiteProfile,
    PlayerProfile? blackProfile,
    GameOdds? odds,
    GameResult? result,
    ScoredGame? scores,
  }) {
    return SpectateGameState(
      gameId: gameId,
      fen: fen ?? this.fen,
      turn: turn ?? this.turn,
      whiteHand: whiteHand ?? this.whiteHand,
      blackHand: blackHand ?? this.blackHand,
      whiteScorePile: whiteScorePile ?? this.whiteScorePile,
      blackScorePile: blackScorePile ?? this.blackScorePile,
      whiteProfile: whiteProfile ?? this.whiteProfile,
      blackProfile: blackProfile ?? this.blackProfile,
      odds: odds ?? this.odds,
      whiteDifficulty: whiteDifficulty,
      blackDifficulty: blackDifficulty,
      result: result ?? this.result,
      scores: scores ?? this.scores,
    );
  }
}

List<PlayingCard> _parseCardList(dynamic data) {
  if (data == null) return [];
  return (data as List)
      .where((c) => c != null && c is Map<String, dynamic>)
      .map((c) => PlayingCard.fromJson(c as Map<String, dynamic>))
      .toList();
}

/// Singleton Socket.IO service — mirrors the RN useSocket.ts pattern.
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _listenersAttached = false;
  String _serverUrl = _defaultServerUrl;

  // Internal state
  String? _gameId;
  GameClientState? _gameState;
  ScoredGame? _scores;
  List<ChatMessage> _chatMessages = [];
  AuthState? _authState;
  DepositStatus? _depositStatus;
  SpectateGameState? _spectateState;
  List<SpectateMove> _spectateMoves = [];
  CosmeticsData? _cosmeticsData;

  // Broadcast streams
  final _connectedController = StreamController<bool>.broadcast();
  final _gameStateController = StreamController<GameClientState?>.broadcast();
  final _scoresController = StreamController<ScoredGame?>.broadcast();
  final _chatController = StreamController<List<ChatMessage>>.broadcast();
  final _authStateController = StreamController<AuthState?>.broadcast();
  final _depositStatusController = StreamController<DepositStatus?>.broadcast();
  final _spectateStateController = StreamController<SpectateGameState?>.broadcast();
  final _spectateMovesController = StreamController<List<SpectateMove>>.broadcast();
  final _cosmeticsController = StreamController<CosmeticsData>.broadcast();

  // Callback streams for one-off events
  final _moveErrorController = StreamController<String>.broadcast();
  final _botFallbackController = StreamController<Map<String, dynamic>>.broadcast();
  final _coachingTipController = StreamController<String>.broadcast();
  final _spectatorCommentController = StreamController<String>.broadcast();
  final _rematchRequestedController = StreamController<void>.broadcast();
  final _gameOverController = StreamController<GameOverPayload>.broadcast();
  final _authChallengeController = StreamController<Map<String, dynamic>>.broadcast();
  final _authErrorController = StreamController<String>.broadcast();
  final _usernameCheckController = StreamController<Map<String, dynamic>>.broadcast();
  final _betSettledController = StreamController<BetSettledPayload>.broadcast();
  final _betCancelledController = StreamController<Map<String, dynamic>>.broadcast();
  final _queueJoinedController = StreamController<Map<String, dynamic>>.broadcast();
  final _leaderboardController = StreamController<LeaderboardData>.broadcast();
  final _profileDataController = StreamController<ProfileData>.broadcast();
  final _dailyPuzzleController = StreamController<PuzzleData>.broadcast();
  final _puzzlesListController = StreamController<PuzzlesListData>.broadcast();
  final _puzzleResultController = StreamController<PuzzleResult>.broadcast();
  final _replayMovesController = StreamController<ReplayData>.broadcast();

  // Public getters
  bool get isConnected => _socket?.connected ?? false;
  String? get gameId => _gameId;
  GameClientState? get gameState => _gameState;
  ScoredGame? get scores => _scores;
  List<ChatMessage> get chatMessages => _chatMessages;
  AuthState? get authState => _authState;
  DepositStatus? get depositStatus => _depositStatus;
  SpectateGameState? get spectateState => _spectateState;
  List<SpectateMove> get spectateMoves => _spectateMoves;
  CosmeticsData? get cosmeticsData => _cosmeticsData;

  // Public streams
  Stream<bool> get connectedStream => _connectedController.stream;
  Stream<GameClientState?> get gameStateStream => _gameStateController.stream;
  Stream<ScoredGame?> get scoresStream => _scoresController.stream;
  Stream<List<ChatMessage>> get chatStream => _chatController.stream;
  Stream<AuthState?> get authStateStream => _authStateController.stream;
  Stream<DepositStatus?> get depositStatusStream => _depositStatusController.stream;
  Stream<SpectateGameState?> get spectateStateStream => _spectateStateController.stream;
  Stream<List<SpectateMove>> get spectateMovesStream => _spectateMovesController.stream;
  Stream<CosmeticsData> get cosmeticsStream => _cosmeticsController.stream;
  Stream<String> get moveErrorStream => _moveErrorController.stream;
  Stream<Map<String, dynamic>> get botFallbackStream => _botFallbackController.stream;
  Stream<String> get coachingTipStream => _coachingTipController.stream;
  Stream<String> get spectatorCommentStream => _spectatorCommentController.stream;
  Stream<void> get rematchRequestedStream => _rematchRequestedController.stream;
  Stream<GameOverPayload> get gameOverStream => _gameOverController.stream;
  Stream<Map<String, dynamic>> get authChallengeStream => _authChallengeController.stream;
  Stream<String> get authErrorStream => _authErrorController.stream;
  Stream<Map<String, dynamic>> get usernameCheckStream => _usernameCheckController.stream;
  Stream<BetSettledPayload> get betSettledStream => _betSettledController.stream;
  Stream<Map<String, dynamic>> get betCancelledStream => _betCancelledController.stream;
  Stream<Map<String, dynamic>> get queueJoinedStream => _queueJoinedController.stream;
  Stream<LeaderboardData> get leaderboardStream => _leaderboardController.stream;
  Stream<ProfileData> get profileDataStream => _profileDataController.stream;
  Stream<PuzzleData> get dailyPuzzleStream => _dailyPuzzleController.stream;
  Stream<PuzzlesListData> get puzzlesListStream => _puzzlesListController.stream;
  Stream<PuzzleResult> get puzzleResultStream => _puzzleResultController.stream;
  Stream<ReplayData> get replayMovesStream => _replayMovesController.stream;

  io.Socket get socket {
    _socket ??= _createSocket();
    return _socket!;
  }

  io.Socket _createSocket() {
    final s = io.io(_serverUrl, <String, dynamic>{
      'autoConnect': true,
      'transports': ['websocket'],
    });
    _attachListeners(s);
    return s;
  }

  void setServerUrl(String url) {
    if (_serverUrl == url) return;
    _serverUrl = url;
  }

  void reconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _listenersAttached = false;
    // Trigger lazy re-creation on next socket access.
    socket.connect();
  }

  void _attachListeners(io.Socket s) {
    if (_listenersAttached) return;
    _listenersAttached = true;

    s.on('connect', (_) {
      _connectedController.add(true);
    });

    s.on('disconnect', (_) {
      _connectedController.add(false);
    });

    // Game events
    s.on('game_start', (data) {
      final json = _toMap(data);
      _gameId = json['gameId'] as String?;
      _gameState = GameClientState.fromJson(json);
      _chatMessages = [];
      _gameStateController.add(_gameState);
      _chatController.add(_chatMessages);
    });

    s.on('game_update', (data) {
      _gameState = GameClientState.fromJson(_toMap(data));
      _gameStateController.add(_gameState);
    });

    s.on('game_over', (data) {
      final json = _toMap(data);
      final payload = GameOverPayload.fromJson(json);
      if (_gameState != null) {
        _gameState = _gameState!.copyWith(result: payload.result);
        _gameStateController.add(_gameState);
      }
      _scores = payload.scores;
      _scoresController.add(_scores);
      _gameOverController.add(payload);
    });

    s.on('move_error', (data) {
      final json = _toMap(data);
      _moveErrorController.add(json['error'] as String? ?? 'Unknown error');
    });

    s.on('bot_fallback_offer', (data) {
      _botFallbackController.add(_toMap(data));
    });

    s.on('rematch_requested', (_) {
      _rematchRequestedController.add(null);
    });

    s.on('chat_message', (data) {
      final msg = ChatMessage.fromJson(_toMap(data));
      _chatMessages = [..._chatMessages, msg];
      _chatController.add(_chatMessages);
    });

    s.on('coaching_tip', (data) {
      String text;
      if (data is String) {
        text = data;
      } else {
        final json = _toMap(data);
        text = json['text'] as String? ?? '';
      }
      if (text.isNotEmpty) _coachingTipController.add(text);
    });

    s.on('spectator_comment', (data) {
      final json = _toMap(data);
      final text = json['text'] as String? ?? '';
      if (text.isNotEmpty) _spectatorCommentController.add(text);
    });

    // Auth & Betting
    s.on('auth_challenge', (data) {
      _authChallengeController.add(_toMap(data));
    });

    s.on('auth_success', (data) {
      _authState = AuthState.fromJson(_toMap(data));
      _authStateController.add(_authState);
    });

    s.on('auth_error', (data) {
      final json = _toMap(data);
      _authErrorController.add(json['error'] as String? ?? 'Auth error');
    });

    s.on('username_check', (data) {
      _usernameCheckController.add(_toMap(data));
    });

    s.on('awaiting_deposits', (data) {
      final json = _toMap(data);
      _depositStatus = DepositStatus(
        gameId: json['gameId'] as String? ?? '',
        betAmountWei: json['betAmountWei'] as String? ?? '0',
        betAmountUsd: (json['betAmountUsd'] as num?)?.toDouble() ?? 0,
        contractAddress: json['contractAddress'] as String? ?? '',
      );
      _depositStatusController.add(_depositStatus);
    });

    s.on('deposit_confirmed', (data) {
      final json = _toMap(data);
      if (_depositStatus != null) {
        final player = json['player'] as String?;
        if (player == 'self') {
          _depositStatus = _depositStatus!.copyWith(myDeposit: true);
        } else {
          _depositStatus = _depositStatus!.copyWith(opponentDeposit: true);
        }
        _depositStatusController.add(_depositStatus);
      }
    });

    s.on('bet_settled', (data) {
      _betSettledController.add(BetSettledPayload.fromJson(_toMap(data)));
    });

    s.on('bet_cancelled', (data) {
      _depositStatus = null;
      _depositStatusController.add(null);
      _betCancelledController.add(_toMap(data));
    });

    s.on('queue_joined', (data) {
      _queueJoinedController.add(_toMap(data));
    });

    s.on('leaderboard', (data) {
      _leaderboardController.add(LeaderboardData.fromJson(_toMap(data)));
    });

    s.on('profile_data', (data) {
      _profileDataController.add(ProfileData.fromJson(_toMap(data)));
    });

    // Puzzle events
    s.on('daily_puzzle', (data) {
      _dailyPuzzleController.add(PuzzleData.fromJson(_toMap(data)));
    });

    s.on('puzzles', (data) {
      _puzzlesListController.add(PuzzlesListData.fromJson(_toMap(data)));
    });

    s.on('puzzle_result', (data) {
      _puzzleResultController.add(PuzzleResult.fromJson(_toMap(data)));
    });

    // Replay events
    s.on('game_moves', (data) {
      _replayMovesController.add(ReplayData.fromJson(_toMap(data)));
    });

    // Cosmetics events
    s.on('cosmetics', (data) {
      _cosmeticsData = CosmeticsData.fromJson(_toMap(data));
      _cosmeticsController.add(_cosmeticsData!);
    });

    s.on('cosmetic_equipped', (data) {
      final json = _toMap(data);
      final equipped = (json['equipped'] as List? ?? []).cast<String>();
      if (_cosmeticsData != null) {
        final updatedUserCosmetics = _cosmeticsData!.userCosmetics.map((uc) {
          return UserCosmetic(
            userId: uc.userId,
            cosmeticId: uc.cosmeticId,
            equipped: equipped.contains(uc.cosmeticId),
            cosmetic: uc.cosmetic,
          );
        }).toList();
        _cosmeticsData = CosmeticsData(
          cosmetics: _cosmeticsData!.cosmetics,
          userCosmetics: updatedUserCosmetics,
        );
        _cosmeticsController.add(_cosmeticsData!);
      }
    });

    // Spectate
    s.on('spectate_game_start', (data) {
      final json = _toMap(data);
      _spectateState = SpectateGameState(
        gameId: json['gameId'] as String? ?? '',
        fen: json['fen'] as String? ?? '',
        turn: json['turn'] as String? ?? 'white',
        whiteHand: _parseCardList(json['whiteHand']),
        blackHand: _parseCardList(json['blackHand']),
        whiteScorePile: _parseCardList(json['whiteScorePile']),
        blackScorePile: _parseCardList(json['blackScorePile']),
        whiteProfile: PlayerProfile.fromJson(
            json['whiteProfile'] as Map<String, dynamic>? ?? {}),
        blackProfile: PlayerProfile.fromJson(
            json['blackProfile'] as Map<String, dynamic>? ?? {}),
        odds: json['odds'] != null
            ? GameOdds.fromJson(json['odds'] as Map<String, dynamic>)
            : const GameOdds(whiteWinPct: 50, blackWinPct: 50, drawPct: 0),
        whiteDifficulty: json['whiteDifficulty'] as String? ?? 'beginner',
        blackDifficulty: json['blackDifficulty'] as String? ?? 'beginner',
      );
      _spectateMoves = [];
      _spectateStateController.add(_spectateState);
      _spectateMovesController.add(_spectateMoves);
    });

    s.on('spectate_move', (data) {
      final move = SpectateMove.fromJson(_toMap(data));
      _spectateMoves = [..._spectateMoves, move];
      if (_spectateState != null) {
        _spectateState = _spectateState!.copyWith(
          fen: move.fen,
          turn: move.turn,
          whiteHand: move.whiteHand,
          blackHand: move.blackHand,
          whiteScorePile: move.whiteScorePile,
          blackScorePile: move.blackScorePile,
          odds: move.odds,
        );
        _spectateStateController.add(_spectateState);
      }
      _spectateMovesController.add(_spectateMoves);
    });

    s.on('spectate_game_over', (data) {
      final json = _toMap(data);
      if (_spectateState != null) {
        _spectateState = _spectateState!.copyWith(
          result: json['result'] != null
              ? GameResult.fromJson(json['result'] as Map<String, dynamic>)
              : null,
          scores: json['scores'] != null
              ? ScoredGame.fromJson(json['scores'] as Map<String, dynamic>)
              : null,
        );
        _spectateStateController.add(_spectateState);
      }
    });

    s.on('spectate_position', (data) {
      final json = _toMap(data);
      if (_spectateState != null) {
        _spectateState = _spectateState!.copyWith(
          fen: json['fen'] as String?,
          turn: json['turn'] as String?,
          whiteHand: json['whiteHand'] != null ? _parseCardList(json['whiteHand']) : null,
          blackHand: json['blackHand'] != null ? _parseCardList(json['blackHand']) : null,
          whiteScorePile: json['whiteScorePile'] != null ? _parseCardList(json['whiteScorePile']) : null,
          blackScorePile: json['blackScorePile'] != null ? _parseCardList(json['blackScorePile']) : null,
        );
        _spectateStateController.add(_spectateState);
      }
    });
  }

  // Emit methods
  void joinQueue(int rating, String tc) {
    socket.emit('join_queue', {'rating': rating, 'tc': tc});
  }

  void joinCasual(String tc) {
    socket.emit('join_casual', {'tc': tc});
  }

  void playMove(String card, String move) {
    if (_gameId == null) return;
    socket.emit('play_move', {'gameId': _gameId, 'card': card, 'move': move});
  }

  void resign() {
    if (_gameId == null) return;
    socket.emit('resign', {'gameId': _gameId});
  }

  void startBotGame(String difficulty, String tc) {
    socket.emit('start_bot_game', {'difficulty': difficulty, 'tc': tc});
  }

  void requestBot(String difficulty, String tc) {
    socket.emit('request_bot', {'difficulty': difficulty, 'tc': tc});
  }

  void requestRematch() {
    if (_gameId == null) return;
    socket.emit('rematch_request', {'gameId': _gameId});
  }

  void sendChat(String text) {
    if (_gameId == null) return;
    socket.emit('chat_message', {'gameId': _gameId, 'text': text});
  }

  void undoMove() {
    if (_gameId == null) return;
    socket.emit('undo_move', {'gameId': _gameId});
  }

  // Auth methods
  void authRequest(String walletAddress) {
    socket.emit('auth_request', {'walletAddress': walletAddress});
  }

  void authVerify(String walletAddress, String signature) {
    socket.emit('auth_verify', {'walletAddress': walletAddress, 'signature': signature});
  }

  void setUsername(String walletAddress, String username, [String? avatarId]) {
    final data = <String, dynamic>{
      'walletAddress': walletAddress,
      'username': username,
    };
    if (avatarId != null) data['avatarId'] = avatarId;
    socket.emit('set_username', data);
  }

  void checkUsername(String username) {
    socket.emit('check_username', {'username': username});
  }

  void updateAvatar(String avatarId) {
    socket.emit('update_avatar', {'avatarId': avatarId});
  }

  void joinRanked(String difficulty, String tc) {
    socket.emit('join_ranked', {'difficulty': difficulty, 'tc': tc});
  }

  void joinCasualDifficulty(String difficulty, String tc) {
    socket.emit('join_casual_difficulty', {'difficulty': difficulty, 'tc': tc});
  }

  void getLeaderboard() {
    socket.emit('get_leaderboard');
  }

  void getProfile() {
    socket.emit('get_profile');
  }

  // Puzzle methods
  void getDailyPuzzle() {
    socket.emit('get_daily_puzzle');
  }

  void getPuzzles(String category, {int limit = 20}) {
    socket.emit('get_puzzles', {'category': category, 'limit': limit});
  }

  void submitPuzzle(String puzzleId, String moveUci, {int timeSpentMs = 0, bool usedHint = false}) {
    socket.emit('submit_puzzle', {
      'puzzleId': puzzleId,
      'moveUci': moveUci,
      'timeSpentMs': timeSpentMs,
      'usedHint': usedHint,
    });
  }

  // Replay methods
  void getGameMoves(String gameId) {
    socket.emit('get_game_moves', {'gameId': gameId});
  }

  // Cosmetics methods
  void getCosmetics() {
    socket.emit('get_cosmetics');
  }

  void equipCosmetic(String cosmeticId) {
    socket.emit('equip_cosmetic', {'cosmeticId': cosmeticId});
  }

  // FCM token
  void registerFcmToken(String token) {
    socket.emit('register_fcm_token', {'token': token});
  }

  // Spectate methods
  void startSpectateGame(String whiteDifficulty, String blackDifficulty) {
    socket.emit('start_spectate_bot_game', {
      'whiteDifficulty': whiteDifficulty,
      'blackDifficulty': blackDifficulty,
    });
  }

  void spectatePause(String gameId) {
    socket.emit('spectate_pause', {'gameId': gameId});
  }

  void spectateResume(String gameId) {
    socket.emit('spectate_resume', {'gameId': gameId});
  }

  void spectateStepForward(String gameId) {
    socket.emit('spectate_step_forward', {'gameId': gameId});
  }

  void spectateStepBackward(String gameId, int currentIndex) {
    socket.emit('spectate_step_backward', {'gameId': gameId, 'currentIndex': currentIndex});
  }

  void spectateLeave(String gameId) {
    socket.emit('spectate_leave', {'gameId': gameId});
    _spectateState = null;
    _spectateMoves = [];
    _spectateStateController.add(null);
    _spectateMovesController.add([]);
  }

  // Helpers
  Map<String, dynamic> _toMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }

  void dispose() {
    _socket?.dispose();
    _connectedController.close();
    _gameStateController.close();
    _scoresController.close();
    _chatController.close();
    _authStateController.close();
    _depositStatusController.close();
    _spectateStateController.close();
    _spectateMovesController.close();
    _moveErrorController.close();
    _botFallbackController.close();
    _coachingTipController.close();
    _spectatorCommentController.close();
    _rematchRequestedController.close();
    _gameOverController.close();
    _authChallengeController.close();
    _authErrorController.close();
    _usernameCheckController.close();
    _betSettledController.close();
    _betCancelledController.close();
    _queueJoinedController.close();
    _leaderboardController.close();
    _profileDataController.close();
    _dailyPuzzleController.close();
    _puzzlesListController.close();
    _puzzleResultController.close();
    _replayMovesController.close();
    _cosmeticsController.close();
  }
}
