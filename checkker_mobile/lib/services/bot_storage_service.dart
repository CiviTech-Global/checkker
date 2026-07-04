import 'package:shared_preferences/shared_preferences.dart';

import '../models/bot.dart';

const _kBotConfigKey = 'checkker_bot_config';
const _kBotMaturityKey = 'checkker_bot_maturity';

class BotStorageService {
  static final BotStorageService _instance = BotStorageService._internal();
  factory BotStorageService() => _instance;
  BotStorageService._internal();

  Future<BotConfiguration> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_kBotConfigKey);
    return deserializeBotConfig(json);
  }

  Future<void> saveConfig(BotConfiguration config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBotConfigKey, serializeBotConfig(config));
  }

  Future<BotMaturity> loadMaturity() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_kBotMaturityKey);
    return deserializeBotMaturity(json);
  }

  Future<void> saveMaturity(BotMaturity maturity) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBotMaturityKey, serializeBotMaturity(maturity));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kBotConfigKey);
    await prefs.remove(_kBotMaturityKey);
  }
}
