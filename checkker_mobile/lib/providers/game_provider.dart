import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/game.dart';
import '../models/game_client.dart';
import '../services/socket_service.dart';
import 'socket_provider.dart';

final gameStateProvider = StreamProvider<GameClientState?>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.gameStateStream;
});

final scoresProvider = StreamProvider<ScoredGame?>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.scoresStream;
});

final chatMessagesProvider = StreamProvider<List<ChatMessage>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.chatStream;
});

final moveErrorProvider = StreamProvider<String>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.moveErrorStream;
});

final coachingTipProvider = StreamProvider<String>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.coachingTipStream;
});

final spectatorCommentProvider = StreamProvider<String>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.spectatorCommentStream;
});

final gameOverProvider = StreamProvider<GameOverPayload>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.gameOverStream;
});

final botFallbackProvider = StreamProvider<Map<String, dynamic>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.botFallbackStream;
});

final rematchRequestedProvider = StreamProvider<void>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.rematchRequestedStream;
});

final betSettledProvider = StreamProvider<BetSettledPayload>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.betSettledStream;
});
