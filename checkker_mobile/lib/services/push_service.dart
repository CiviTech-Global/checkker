import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'socket_service.dart';

class PushService {
  static final PushService _instance = PushService._internal();
  factory PushService() => _instance;
  PushService._internal();

  bool _registering = false;

  StreamSubscription<String>? _tokenRefreshSubscription;

  void listenForTokenRefresh() {
    if (Firebase.apps.isEmpty || _tokenRefreshSubscription != null) {
      return;
    }

    _tokenRefreshSubscription = FirebaseMessaging.instance.onTokenRefresh
        .listen((token) async {
          if (token.isEmpty) return;

          final registered = await SocketService().registerFcmToken(token);

          if (registered) {
            debugPrint('[push] Refreshed token registered successfully');
          } else {
            debugPrint('[push] Failed to register refreshed token');
          }
        });
  }

  Future<String?> getDeviceToken() async {
    // Firebase configuration may not be available yet.
    if (Firebase.apps.isEmpty) {
      debugPrint('[push] Firebase is not initialized');
      return null;
    }

    try {
      final messaging = FirebaseMessaging.instance;

      // Check or request notification permission.
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        debugPrint('[push] Notification permission not granted');
        return null;
      }

      // Get the Firebase Cloud Messaging token.
      final token = await messaging.getToken();

      if (token == null || token.isEmpty) {
        debugPrint('[push] No FCM token available');
        return null;
      }

      return token;
    } catch (error) {
      debugPrint('[push] Failed to get token: $error');
      return null;
    }
  }

  Future<bool> registerWithServer() async {
    if (_registering) return false;

    _registering = true;

    try {
      final token = await getDeviceToken();

      if (token == null) return false;

      final registered = await SocketService().registerFcmToken(token);

      if (!registered) {
        debugPrint('[push] Token could not be registered');
        return false;
      }

      listenForTokenRefresh();
      return true;
    } catch (error) {
      debugPrint('[push] Registration failed: $error');
      return false;
    } finally {
      _registering = false;
    }
  }
}
