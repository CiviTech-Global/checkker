import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/socket_service.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  // Initialize the socket connection
  service.socket;
  ref.onDispose(() => service.dispose());
  return service;
});

final connectedProvider = StreamProvider<bool>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.connectedStream;
});
