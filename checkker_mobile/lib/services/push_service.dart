import 'package:flutter/foundation.dart';

import 'socket_service.dart';

/// Push notification scaffolding.
///
/// Real push delivery needs external credentials (a Firebase project +
/// google-services.json / GoogleService-Info.plist), so for v1 this service
/// only wires the plumbing:
///
/// 1. [getDeviceToken] returns null until a push provider is integrated.
/// 2. [registerWithServer] sends the token to the game server via the
///    `register_fcm_token` socket event (stored as User.fcmToken).
///
/// To enable real pushes later:
///   flutter pub add firebase_core firebase_messaging
/// then implement [getDeviceToken] with FirebaseMessaging.instance.getToken()
/// and call [registerWithServer] after sign-in. No server changes needed.
class PushService {
  static final PushService _instance = PushService._internal();
  factory PushService() => _instance;
  PushService._internal();

  bool _registered = false;

  /// Fetch the device push token. Returns null until a push provider
  /// (e.g. firebase_messaging) is integrated.
  Future<String?> getDeviceToken() async {
    return null;
  }

  /// Fetch the device token and register it with the game server.
  /// Safe to call after every sign-in; no-ops when push is unavailable.
  Future<bool> registerWithServer() async {
    if (_registered) return true;
    final token = await getDeviceToken();
    if (token == null || token.isEmpty) {
      debugPrint('[push] No push provider configured — skipping registration');
      return false;
    }
    SocketService().registerFcmToken(token);
    _registered = true;
    return true;
  }
}
