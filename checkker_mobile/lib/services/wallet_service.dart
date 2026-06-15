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

  /// Human-readable reason the last [deposit] failed (rejection, wrong network,
  /// insufficient funds…), or null on success. Read by the deposit UI.
  String? lastDepositError;

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

  /// Deposit BNB into the escrow contract for a game via the connected wallet
  /// (eth_sendTransaction). Encodes the `deposit(bytes32)` call.
  ///
  /// [gameId] is the escrow game UUID; [amountWei] is the bet amount as a
  /// decimal wei string (as sent by the server). Returns the transaction hash,
  /// or null if there's no signing-capable session or the user rejects.
  Future<String?> deposit(
    String contractAddress,
    String gameId,
    String amountWei,
  ) async {
    lastDepositError = null;
    final address = _address;
    final modal = _modal;
    final session = modal?.session;
    if (address == null || modal == null || session == null || !modal.isConnected) {
      lastDepositError =
          'No signing wallet connected. Connect a wallet via WalletConnect to deposit.';
      return null;
    }

    final chainId = modal.selectedChain?.chainId ?? 'eip155:97';
    // The escrow lives on BNB Smart Chain (testnet 97 / mainnet 56). Depositing
    // from any other chain would either revert or send funds to the wrong
    // place, so block it up front with a clear message.
    if (chainId != 'eip155:97' && chainId != 'eip155:56') {
      lastDepositError =
          'Switch your wallet to BNB Smart Chain (testnet) before depositing.';
      return null;
    }

    try {
      // deposit(bytes32) selector + 32-byte gameId (UUID hyphens stripped,
      // right-padded to 64 hex chars).
      const selector = 'b214faa5';
      final gameIdHex = gameId.replaceAll('-', '').padRight(64, '0');
      final data = '0x$selector$gameIdHex';

      // Wei decimal string → 0x-prefixed hex for the value field.
      final valueHex = '0x${BigInt.parse(amountWei).toRadixString(16)}';

      final result = await modal.request(
        topic: session.topic ?? '',
        chainId: chainId,
        request: SessionRequestParams(
          method: 'eth_sendTransaction',
          params: [
            {
              'from': address,
              'to': contractAddress,
              'value': valueHex,
              'data': data,
            },
          ],
        ),
      );
      if (result is String && result.isNotEmpty) return result;
      lastDepositError = 'The wallet did not return a transaction hash.';
      return null;
    } catch (e) {
      debugPrint('Wallet deposit error: $e');
      lastDepositError = _depositErrorMessage(e);
      return null;
    }
  }

  /// Map a raw wallet/RPC error into a short, user-facing deposit message.
  String _depositErrorMessage(Object e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('reject') || msg.contains('denied') || msg.contains('cancel')) {
      return 'You rejected the transaction in your wallet.';
    }
    if (msg.contains('insufficient')) {
      return 'Insufficient balance for the stake plus gas. Top up tBNB and retry.';
    }
    if (msg.contains('chain') || msg.contains('network')) {
      return 'Wrong network. Switch your wallet to BNB Smart Chain (testnet).';
    }
    return 'Deposit failed. Please try again.';
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
