import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/game.dart';
import '../services/local_database.dart';

final localDatabaseProvider = Provider<LocalDatabase>((ref) => LocalDatabase());

final profileProvider = FutureProvider<PlayerProfile>((ref) async {
  final db = ref.watch(localDatabaseProvider);
  return db.getProfile();
});

final statsProvider = FutureProvider<PlayerStats>((ref) async {
  final db = ref.watch(localDatabaseProvider);
  return db.getStats();
});

final gameHistoryProvider = FutureProvider<List<GameRecord>>((ref) async {
  final db = ref.watch(localDatabaseProvider);
  return db.getGameHistory();
});
