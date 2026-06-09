import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/socket_service.dart';
import 'socket_provider.dart';

final spectateStateProvider = StreamProvider<SpectateGameState?>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.spectateStateStream;
});

final spectateMovesProvider = StreamProvider<List<SpectateMove>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.spectateMovesStream;
});
