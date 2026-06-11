import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:reown_appkit/reown_appkit.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight wallet state holder.
///
/// For WalletConnect integration, the UI layer (ConnectScreen) creates and
/// manages the ReownAppKitModal instance and attaches it here so the rest of
/// the app can request signatures. This service handles persistence and
/// provides helpers for socket auth signing.
class WalletService extends ChangeNotifier {
  static final WalletService _instance = WalletService._internal();
  factory WalletService() => _instance;
  WalletService._internal();

  static const String _prefsKey = 'wallet_address';

  String? _address;
  bool _isConnected = false;
  ReownAppKitModal? _modal;

  String? get address => _address;
  bool get isConnected => _isConnected;

  /// Whether a live WalletConnect session is available for signing.
  bool get canSign =>
      _modal != null && (_modal!.isConnected) && _modal!.session != null;

  /// Attach the active WalletConnect modal so [sign] can route requests
  /// through the connected wallet. Pass null on disconnect.
  void attachModal(ReownAppKitModal? modal) {
    _modal = modal;
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _address = prefs.getString(_prefsKey);
    _isConnected = _address != null;
    notifyListeners();
  }

  Future<void> setAddress(String? address) async {
    _address = address;
    _isConnected = address != null && address.isNotEmpty;
    final prefs = await SharedPreferences.getInstance();
    if (address != null && address.isNotEmpty) {
      await prefs.setString(_prefsKey, address);
    } else {
      await prefs.remove(_prefsKey);
    }
    notifyListeners();
  }

  Future<void> disconnect() async {
    _address = null;
    _isConnected = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
    notifyListeners();
  }

  /// Sign a message with the connected wallet via WalletConnect
  /// (personal_sign). Returns null if no signing-capable session exists or
  /// the user rejects the request.
  Future<String?> sign(String message) async {
    final address = _address;
    final modal = _modal;
    final session = modal?.session;
    if (address == null || modal == null || session == null || !modal.isConnected) {
      return null;
    }
    try {
      final chainId = modal.selectedChain?.chainId ?? 'eip155:97';
      final hexMessage =
          '0x${utf8.encode(message).map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';
      final result = await modal.request(
        topic: session.topic ?? '',
        chainId: chainId,
        request: SessionRequestParams(
          method: 'personal_sign',
          params: [hexMessage, address],
        ),
      );
      if (result is String && result.isNotEmpty) return result;
      return null;
    } catch (e) {
      debugPrint('Wallet sign error: $e');
      return null;
    }
  }
}
