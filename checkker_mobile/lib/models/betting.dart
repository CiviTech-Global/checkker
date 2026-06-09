import 'game.dart';

const Map<BotDifficulty, int> betAmountsUsd = {
  BotDifficulty.beginner: 10,
  BotDifficulty.intermediate: 25,
  BotDifficulty.advanced: 100,
  BotDifficulty.master: 500,
};

const int houseCutBps = 1000;
const bool casualBeginnerFree = true;
const int donationMinUsd = 1;
const int donationMaxUsd = 5;
const int depositTimeoutMs = 120000;

enum GameMode { ranked, casual }

GameMode parseGameMode(String m) => m == 'ranked' ? GameMode.ranked : GameMode.casual;

class BetInfo {
  final String amountWei;
  final double amountUsd;
  final BotDifficulty difficulty;
  final GameMode mode;
  final String contractAddress;
  final String gameId;

  const BetInfo({
    required this.amountWei, required this.amountUsd,
    required this.difficulty, required this.mode,
    required this.contractAddress, required this.gameId,
  });

  factory BetInfo.fromJson(Map<String, dynamic> json) {
    return BetInfo(
      amountWei: json['amountWei'] as String? ?? '0',
      amountUsd: (json['amountUsd'] as num?)?.toDouble() ?? 0.0,
      difficulty: parseBotDifficulty(json['difficulty'] as String? ?? 'beginner'),
      mode: parseGameMode(json['mode'] as String? ?? 'casual'),
      contractAddress: json['contractAddress'] as String? ?? '',
      gameId: json['gameId'] as String? ?? '',
    );
  }
}

class BetSettlement {
  final String? winnerAddress;
  final String payoutWei;
  final String houseCutWei;
  final String txHash;

  const BetSettlement({
    this.winnerAddress, required this.payoutWei,
    required this.houseCutWei, required this.txHash,
  });
}

bool isFreeGame(GameMode mode, BotDifficulty difficulty) {
  return mode == GameMode.casual && difficulty == BotDifficulty.beginner;
}
