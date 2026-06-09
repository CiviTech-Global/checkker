import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/wallet_service.dart';

final walletServiceProvider = Provider<WalletService>((ref) {
  return WalletService();
});

final walletAddressProvider = StateProvider<String?>((ref) {
  return ref.watch(walletServiceProvider).address;
});

final walletConnectedProvider = Provider<bool>((ref) {
  return ref.watch(walletServiceProvider).isConnected;
});
