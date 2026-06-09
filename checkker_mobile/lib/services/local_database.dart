import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../models/game.dart';

class GameRecord {
  final int? id;
  final String gameId;
  final String result; // 'win' | 'loss' | 'draw'
  final String resultType; // 'checkmate' | 'resignation' | 'timeout' | 'draw' | 'deckExhausted'
  final String playerColor;
  final String mode; // 'bot' | 'casual' | 'ranked'
  final String difficulty;
  final int playerScore;
  final int opponentScore;
  final int moveCount;
  final int durationMs;
  final int timestamp;

  const GameRecord({
    this.id,
    required this.gameId,
    required this.result,
    required this.resultType,
    required this.playerColor,
    required this.mode,
    required this.difficulty,
    required this.playerScore,
    required this.opponentScore,
    required this.moveCount,
    required this.durationMs,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() => {
        'gameId': gameId,
        'result': result,
        'resultType': resultType,
        'playerColor': playerColor,
        'mode': mode,
        'difficulty': difficulty,
        'playerScore': playerScore,
        'opponentScore': opponentScore,
        'moveCount': moveCount,
        'durationMs': durationMs,
        'timestamp': timestamp,
      };

  factory GameRecord.fromMap(Map<String, dynamic> map) {
    return GameRecord(
      id: map['id'] as int?,
      gameId: map['gameId'] as String? ?? '',
      result: map['result'] as String? ?? '',
      resultType: map['resultType'] as String? ?? '',
      playerColor: map['playerColor'] as String? ?? '',
      mode: map['mode'] as String? ?? 'bot',
      difficulty: map['difficulty'] as String? ?? '',
      playerScore: map['playerScore'] as int? ?? 0,
      opponentScore: map['opponentScore'] as int? ?? 0,
      moveCount: map['moveCount'] as int? ?? 0,
      durationMs: map['durationMs'] as int? ?? 0,
      timestamp: map['timestamp'] as int? ?? 0,
    );
  }
}

class PlayerStats {
  final int gamesPlayed;
  final int wins;
  final int losses;
  final int draws;
  final int currentStreak;
  final int bestStreak;
  final int totalScore;
  final int highScore;

  const PlayerStats({
    this.gamesPlayed = 0,
    this.wins = 0,
    this.losses = 0,
    this.draws = 0,
    this.currentStreak = 0,
    this.bestStreak = 0,
    this.totalScore = 0,
    this.highScore = 0,
  });

  Map<String, dynamic> toMap() => {
        'gamesPlayed': gamesPlayed,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'currentStreak': currentStreak,
        'bestStreak': bestStreak,
        'totalScore': totalScore,
        'highScore': highScore,
      };

  factory PlayerStats.fromMap(Map<String, dynamic> map) {
    return PlayerStats(
      gamesPlayed: map['gamesPlayed'] as int? ?? 0,
      wins: map['wins'] as int? ?? 0,
      losses: map['losses'] as int? ?? 0,
      draws: map['draws'] as int? ?? 0,
      currentStreak: map['currentStreak'] as int? ?? 0,
      bestStreak: map['bestStreak'] as int? ?? 0,
      totalScore: map['totalScore'] as int? ?? 0,
      highScore: map['highScore'] as int? ?? 0,
    );
  }
}

class LocalDatabase {
  static final LocalDatabase _instance = LocalDatabase._();
  factory LocalDatabase() => _instance;
  LocalDatabase._();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    final dir = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/checkker.db';
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS local_profile (
            id INTEGER PRIMARY KEY DEFAULT 1,
            displayName TEXT NOT NULL DEFAULT 'Player',
            avatarId TEXT,
            rating INTEGER NOT NULL DEFAULT 1000,
            walletAddress TEXT,
            onlineName TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY DEFAULT 1,
            gamesPlayed INTEGER NOT NULL DEFAULT 0,
            wins INTEGER NOT NULL DEFAULT 0,
            losses INTEGER NOT NULL DEFAULT 0,
            draws INTEGER NOT NULL DEFAULT 0,
            currentStreak INTEGER NOT NULL DEFAULT 0,
            bestStreak INTEGER NOT NULL DEFAULT 0,
            totalScore INTEGER NOT NULL DEFAULT 0,
            highScore INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gameId TEXT NOT NULL,
            result TEXT NOT NULL,
            resultType TEXT NOT NULL,
            playerColor TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'bot',
            difficulty TEXT NOT NULL DEFAULT '',
            playerScore INTEGER NOT NULL DEFAULT 0,
            opponentScore INTEGER NOT NULL DEFAULT 0,
            moveCount INTEGER NOT NULL DEFAULT 0,
            durationMs INTEGER NOT NULL DEFAULT 0,
            timestamp INTEGER NOT NULL
          )
        ''');
        // Insert defaults
        await db.insert('local_profile', {'id': 1, 'displayName': 'Player', 'rating': 1000});
        await db.insert('stats', {
          'id': 1,
          'gamesPlayed': 0,
          'wins': 0,
          'losses': 0,
          'draws': 0,
          'currentStreak': 0,
          'bestStreak': 0,
          'totalScore': 0,
          'highScore': 0,
        });
      },
    );
  }

  // --- Profile ---

  Future<PlayerProfile> getProfile() async {
    final db = await database;
    final rows = await db.query('local_profile', where: 'id = 1');
    if (rows.isEmpty) {
      return const PlayerProfile(id: '1', displayName: 'Player', rating: 1000);
    }
    final row = rows.first;
    return PlayerProfile(
      id: '1',
      displayName: row['displayName'] as String? ?? 'Player',
      rating: row['rating'] as int? ?? 1000,
      avatarId: row['avatarId'] as String?,
      walletAddress: row['walletAddress'] as String?,
      onlineName: row['onlineName'] as String?,
    );
  }

  Future<void> updateProfile({
    String? displayName,
    String? avatarId,
    int? rating,
    String? walletAddress,
    String? onlineName,
  }) async {
    final db = await database;
    final values = <String, dynamic>{};
    if (displayName != null) values['displayName'] = displayName;
    if (avatarId != null) values['avatarId'] = avatarId;
    if (rating != null) values['rating'] = rating;
    if (walletAddress != null) values['walletAddress'] = walletAddress;
    if (onlineName != null) values['onlineName'] = onlineName;
    if (values.isNotEmpty) {
      await db.update('local_profile', values, where: 'id = 1');
    }
  }

  // --- Stats ---

  Future<PlayerStats> getStats() async {
    final db = await database;
    final rows = await db.query('stats', where: 'id = 1');
    if (rows.isEmpty) return const PlayerStats();
    return PlayerStats.fromMap(rows.first);
  }

  Future<void> recordGame(GameRecord record) async {
    final db = await database;
    await db.insert('game_history', record.toMap());

    // Update stats
    final stats = await getStats();
    int newStreak = stats.currentStreak;
    if (record.result == 'win') {
      newStreak = newStreak > 0 ? newStreak + 1 : 1;
    } else if (record.result == 'loss') {
      newStreak = newStreak < 0 ? newStreak - 1 : -1;
    } else {
      newStreak = 0;
    }

    await db.update(
      'stats',
      {
        'gamesPlayed': stats.gamesPlayed + 1,
        'wins': stats.wins + (record.result == 'win' ? 1 : 0),
        'losses': stats.losses + (record.result == 'loss' ? 1 : 0),
        'draws': stats.draws + (record.result == 'draw' ? 1 : 0),
        'currentStreak': newStreak,
        'bestStreak': newStreak > stats.bestStreak ? newStreak : stats.bestStreak,
        'totalScore': stats.totalScore + record.playerScore,
        'highScore': record.playerScore > stats.highScore ? record.playerScore : stats.highScore,
      },
      where: 'id = 1',
    );
  }

  // --- Game History ---

  Future<List<GameRecord>> getGameHistory({int limit = 50}) async {
    final db = await database;
    final rows = await db.query('game_history', orderBy: 'timestamp DESC', limit: limit);
    return rows.map((r) => GameRecord.fromMap(r)).toList();
  }

  // --- Reset ---

  Future<void> clearAll() async {
    final db = await database;
    await db.delete('game_history');
    await db.update('stats', const PlayerStats().toMap(), where: 'id = 1');
  }

  Future<void> loadDemoData() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final records = [
      GameRecord(gameId: 'demo-1', result: 'win', resultType: 'checkmate', playerColor: 'white', mode: 'bot', difficulty: 'beginner', playerScore: 42, opponentScore: 18, moveCount: 32, durationMs: 300000, timestamp: now - 86400000),
      GameRecord(gameId: 'demo-2', result: 'loss', resultType: 'timeout', playerColor: 'black', mode: 'bot', difficulty: 'intermediate', playerScore: 24, opponentScore: 38, moveCount: 45, durationMs: 420000, timestamp: now - 172800000),
      GameRecord(gameId: 'demo-3', result: 'win', resultType: 'resignation', playerColor: 'white', mode: 'bot', difficulty: 'beginner', playerScore: 56, opponentScore: 12, moveCount: 22, durationMs: 180000, timestamp: now - 259200000),
    ];
    for (final r in records) {
      await recordGame(r);
    }
  }
}
