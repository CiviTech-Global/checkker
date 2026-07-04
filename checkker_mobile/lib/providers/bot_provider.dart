import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/bot.dart';
import '../services/bot_storage_service.dart';
import '../services/socket_service.dart';
import 'socket_provider.dart';

/// Holds the user's online bot configuration and maturity progress.
class BotState {
  final BotConfiguration config;
  final BotMaturity maturity;
  final bool isLoading;
  final String? error;
  final bool inBotMatch;

  const BotState({
    this.config = const BotConfiguration(),
    this.maturity = const BotMaturity(),
    this.isLoading = false,
    this.error,
    this.inBotMatch = false,
  });

  BotState copyWith({
    BotConfiguration? config,
    BotMaturity? maturity,
    bool? isLoading,
    String? error,
    bool? inBotMatch,
  }) {
    return BotState(
      config: config ?? this.config,
      maturity: maturity ?? this.maturity,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      inBotMatch: inBotMatch ?? this.inBotMatch,
    );
  }
}

class BotNotifier extends StateNotifier<BotState> {
  final BotStorageService _storage;
  final SocketService _socket;

  BotNotifier(this._storage, this._socket) : super(const BotState(isLoading: true));

  Future<void> load() async {
    final config = await _storage.loadConfig();
    final maturity = await _storage.loadMaturity();
    state = BotState(config: config, maturity: maturity, isLoading: false);
  }

  Future<void> setEnabled(bool enabled) async {
    final next = state.config.copyWith(enabled: enabled);
    await _persist(next, state.maturity);
  }

  void setInBotMatch(bool value) {
    state = state.copyWith(inBotMatch: value);
  }

  Future<void> updateConfig(BotConfiguration config) async {
    await _persist(config, state.maturity);
  }

  Future<void> recordGameResult(String result) async {
    final nextMaturity = recordBotGameResult(state.maturity, result);
    await _persist(state.config, nextMaturity);
  }

  Future<void> syncToServer() async {
    _socket.updateBotConfig(state.config, state.maturity);
  }

  Future<void> fetchFromServer() async {
    final completer = Completer<void>();
    late StreamSubscription sub;
    sub = _socket.botDataStream.listen((data) {
      final configJson = data['config'];
      final maturityJson = data['maturity'];
      if (configJson is Map<String, dynamic>) {
        state = state.copyWith(config: BotConfiguration.fromJson(configJson));
      }
      if (maturityJson is Map<String, dynamic>) {
        state = state.copyWith(maturity: refreshMaturity(BotMaturity.fromJson(maturityJson)));
      }
      sub.cancel();
      completer.complete();
    });
    _socket.getBotData();
    await completer.future;
    await _storage.saveConfig(state.config);
    await _storage.saveMaturity(state.maturity);
  }

  Future<void> _persist(BotConfiguration config, BotMaturity maturity) async {
    await _storage.saveConfig(config);
    await _storage.saveMaturity(maturity);
    state = BotState(config: config, maturity: maturity, isLoading: false);
  }
}

final botProvider = StateNotifierProvider<BotNotifier, BotState>((ref) {
  final socket = ref.watch(socketServiceProvider);
  final notifier = BotNotifier(BotStorageService(), socket);
  notifier.load();
  return notifier;
});
