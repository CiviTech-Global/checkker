import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight wallet state holder.
///
/// For WalletConnect integration, the UI layer (ConnectScreen) creates and
/// manages the ReownAppKitModal instance directly. This service handles
/// persistence and provides helpers for socket auth signing.
class WalletService extends ChangeNotifier {
  static final WalletService _instance = WalletService._internal();
  factory WalletService() => _instance;
  WalletService._internal();

  static const String _prefsKey = 'wallet_address';

  String? _address;
  bool _isConnected = false;

  String? get address => _address;
  bool get isConnected => _isConnected;

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

  /// Sign a message. Returns null if no wallet is connected.
  /// For WalletConnect connections, the UI layer handles actual signing.
  Future<String?> sign(String message) async {
    if (_address == null) return null;
    // TODO: Implement actual signing via WalletConnect or local key
    return null;
  }
}
