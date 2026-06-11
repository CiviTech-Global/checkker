import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/cosmetics_theme.dart';
import '../services/push_service.dart';
import '../services/socket_service.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  // Initialize the socket connection
  service.socket;
  // Keep equipped cosmetic visuals in sync for game widgets.
  final cosmeticsSub = service.cosmeticsStream.listen(updateEquippedVisuals);
  // Register the device push token once signed in (no-op until a push
  // provider is configured — see PushService).
  final authSub = service.authStateStream.listen((auth) {
    if (auth?.profile != null) {
      PushService().registerWithServer();
    }
  });
  ref.onDispose(() {
    cosmeticsSub.cancel();
    authSub.cancel();
    service.dispose();
  });
  return service;
});

final connectedProvider = StreamProvider<bool>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.connectedStream;
});

final notificationsProvider = StreamProvider<NotificationsData>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.notificationsStream;
});
