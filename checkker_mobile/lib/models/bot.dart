import 'dart:convert';
import 'dart:math';

import 'card.dart';

enum BotDifficulty { beginner, intermediate, advanced, master }

enum BotStrategy { balanced, aggressive, defensive, gambler }

class BotConfiguration {
  final bool enabled;
  final BotDifficulty difficulty;
  final BotStrategy strategy;
  final int patience;
  final int deepThinking;
  final int riskTolerance;
  final int thinkingDelayMs;
  final bool autoRematch;
  final bool allowTakeover;

  const BotConfiguration({
    this.enabled = false,
    this.difficulty = BotDifficulty.intermediate,
    this.strategy = BotStrategy.balanced,
    this.patience = 50,
    this.deepThinking = 40,
    this.riskTolerance = 50,
    this.thinkingDelayMs = 1500,
    this.autoRematch = false,
    this.allowTakeover = true,
  });

  factory BotConfiguration.fromJson(Map<String, dynamic> json) {
    return BotConfiguration(
      enabled: json['enabled'] as bool? ?? false,
      difficulty: _parseDifficulty(json['difficulty']),
      strategy: _parseStrategy(json['strategy']),
      patience: (json['patience'] as num?)?.toInt() ?? 50,
      deepThinking: (json['deepThinking'] as num?)?.toInt() ?? 40,
      riskTolerance: (json['riskTolerance'] as num?)?.toInt() ?? 50,
      thinkingDelayMs: (json['thinkingDelayMs'] as num?)?.toInt() ?? 1500,
      autoRematch: json['autoRematch'] as bool? ?? false,
      allowTakeover: json['allowTakeover'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'difficulty': difficulty.name,
        'strategy': strategy.name,
        'patience': patience,
        'deepThinking': deepThinking,
        'riskTolerance': riskTolerance,
        'thinkingDelayMs': thinkingDelayMs,
        'autoRematch': autoRematch,
        'allowTakeover': allowTakeover,
      };

  BotConfiguration copyWith({
    bool? enabled,
    BotDifficulty? difficulty,
    BotStrategy? strategy,
    int? patience,
    int? deepThinking,
    int? riskTolerance,
    int? thinkingDelayMs,
    bool? autoRematch,
    bool? allowTakeover,
  }) {
    return BotConfiguration(
      enabled: enabled ?? this.enabled,
      difficulty: difficulty ?? this.difficulty,
      strategy: strategy ?? this.strategy,
      patience: patience ?? this.patience,
      deepThinking: deepThinking ?? this.deepThinking,
      riskTolerance: riskTolerance ?? this.riskTolerance,
      thinkingDelayMs: thinkingDelayMs ?? this.thinkingDelayMs,
      autoRematch: autoRematch ?? this.autoRematch,
      allowTakeover: allowTakeover ?? this.allowTakeover,
    );
  }

  static BotDifficulty _parseDifficulty(dynamic value) {
    return BotDifficulty.values.firstWhere(
      (e) => e.name == value,
      orElse: () => BotDifficulty.intermediate,
    );
  }

  static BotStrategy _parseStrategy(dynamic value) {
    return BotStrategy.values.firstWhere(
      (e) => e.name == value,
      orElse: () => BotStrategy.balanced,
    );
  }
}

class BotMaturity {
  final int gamesPlayed;
  final int wins;
  final int losses;
  final int draws;
  final int currentStreak;
  final int bestStreak;
  final int maturityScore;
  final List<String> unlockedTraits;

  const BotMaturity({
    this.gamesPlayed = 0,
    this.wins = 0,
    this.losses = 0,
    this.draws = 0,
    this.currentStreak = 0,
    this.bestStreak = 0,
    this.maturityScore = 0,
    this.unlockedTraits = const [],
  });

  factory BotMaturity.fromJson(Map<String, dynamic> json) {
    return BotMaturity(
      gamesPlayed: (json['gamesPlayed'] as num?)?.toInt() ?? 0,
      wins: (json['wins'] as num?)?.toInt() ?? 0,
      losses: (json['losses'] as num?)?.toInt() ?? 0,
      draws: (json['draws'] as num?)?.toInt() ?? 0,
      currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
      bestStreak: (json['bestStreak'] as num?)?.toInt() ?? 0,
      maturityScore: (json['maturityScore'] as num?)?.toInt() ?? 0,
      unlockedTraits: (json['unlockedTraits'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'gamesPlayed': gamesPlayed,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'currentStreak': currentStreak,
        'bestStreak': bestStreak,
        'maturityScore': maturityScore,
        'unlockedTraits': unlockedTraits,
      };

  BotMaturity copyWith({
    int? gamesPlayed,
    int? wins,
    int? losses,
    int? draws,
    int? currentStreak,
    int? bestStreak,
    int? maturityScore,
    List<String>? unlockedTraits,
  }) {
    return BotMaturity(
      gamesPlayed: gamesPlayed ?? this.gamesPlayed,
      wins: wins ?? this.wins,
      losses: losses ?? this.losses,
      draws: draws ?? this.draws,
      currentStreak: currentStreak ?? this.currentStreak,
      bestStreak: bestStreak ?? this.bestStreak,
      maturityScore: maturityScore ?? this.maturityScore,
      unlockedTraits: unlockedTraits ?? this.unlockedTraits,
    );
  }
}

class BotTrait {
  final String id;
  final String name;
  final String description;
  final bool Function(BotMaturity) condition;
  final double evaluationMultiplier;
  final int delayReductionMs;

  const BotTrait({
    required this.id,
    required this.name,
    required this.description,
    required this.condition,
    required this.evaluationMultiplier,
    required this.delayReductionMs,
  });
}

const List<BotTrait> botTraits = [
  BotTrait(
    id: 'battle_tested',
    name: 'Battle-Tested',
    description: 'Played 10 online bot games.',
    condition: _battleTestedCondition,
    evaluationMultiplier: 1.02,
    delayReductionMs: 100,
  ),
  BotTrait(
    id: 'streak_hunter',
    name: 'Streak Hunter',
    description: 'Reached a 5-win streak.',
    condition: _streakHunterCondition,
    evaluationMultiplier: 1.02,
    delayReductionMs: 100,
  ),
  BotTrait(
    id: 'endgame_specialist',
    name: 'Endgame Specialist',
    description: 'Won 5 rapid or classical bot games.',
    condition: _alwaysFalse,
    evaluationMultiplier: 1.03,
    delayReductionMs: 150,
  ),
  BotTrait(
    id: 'blitz_master',
    name: 'Blitz Master',
    description: 'Played 10 blitz or bullet bot games.',
    condition: _alwaysFalse,
    evaluationMultiplier: 1.03,
    delayReductionMs: 300,
  ),
  BotTrait(
    id: 'poker_face',
    name: 'Poker Face',
    description: 'Built 3 full-house poker hands in bot games.',
    condition: _alwaysFalse,
    evaluationMultiplier: 1.03,
    delayReductionMs: 150,
  ),
  BotTrait(
    id: 'grandmaster_bot',
    name: 'Grandmaster Bot',
    description: 'Reached 80+ maturity score.',
    condition: _grandmasterCondition,
    evaluationMultiplier: 1.05,
    delayReductionMs: 500,
  ),
];

bool _battleTestedCondition(BotMaturity m) => m.gamesPlayed >= 10;
bool _streakHunterCondition(BotMaturity m) => m.bestStreak >= 5;
bool _grandmasterCondition(BotMaturity m) => m.maturityScore >= 80;
bool _alwaysFalse(BotMaturity _) => false;

int _clamp(int value, int min, int max) => value < min ? min : (value > max ? max : value);

int calculateMaturityScore(BotMaturity maturity) {
  final gameBonus = min(maturity.gamesPlayed * 0.5, 35).floor();
  final winBonus = min(maturity.wins * 1.0, 25).floor();
  final streakBonus = min(maturity.bestStreak * 2, 20).floor();
  final consistencyBonus = maturity.currentStreak > 2
      ? min(maturity.currentStreak * 1.5, 20).floor()
      : 0;
  return _clamp(gameBonus + winBonus + streakBonus + consistencyBonus, 0, 100);
}

BotMaturity refreshMaturity(BotMaturity maturity) {
  final score = calculateMaturityScore(maturity);
  final withScore = maturity.copyWith(maturityScore: score);
  final unlocked = botTraits
      .where((trait) => trait.condition(withScore))
      .map((trait) => trait.id)
      .toList();
  return maturity.copyWith(
    unlockedTraits: unlocked,
    maturityScore: score,
  );
}

BotMaturity recordBotGameResult(BotMaturity maturity, String result) {
  int currentStreak = maturity.currentStreak;
  if (result == 'win') {
    currentStreak = currentStreak + 1;
  } else if (result == 'loss') {
    currentStreak = 0;
  }

  int bestStreak = maturity.bestStreak;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  final next = maturity.copyWith(
    gamesPlayed: maturity.gamesPlayed + 1,
    wins: result == 'win' ? maturity.wins + 1 : maturity.wins,
    losses: result == 'loss' ? maturity.losses + 1 : maturity.losses,
    draws: result == 'draw' ? maturity.draws + 1 : maturity.draws,
    currentStreak: currentStreak,
    bestStreak: bestStreak,
  );
  return refreshMaturity(next);
}

double getEvaluationMultiplier(BotMaturity maturity) {
  final unlocked = Set<String>.from(maturity.unlockedTraits);
  double multiplier = 1.0;
  for (final trait in botTraits) {
    if (unlocked.contains(trait.id)) {
      multiplier = max(multiplier, trait.evaluationMultiplier);
    }
  }
  return multiplier;
}

int getDelayReductionMs(BotMaturity maturity) {
  final unlocked = Set<String>.from(maturity.unlockedTraits);
  int reduction = 0;
  for (final trait in botTraits) {
    if (unlocked.contains(trait.id)) {
      reduction = max(reduction, trait.delayReductionMs);
    }
  }
  return reduction;
}

BotConfiguration applyMaturityToConfig(BotConfiguration config, BotMaturity maturity) {
  final delayReduction = getDelayReductionMs(maturity);
  return config.copyWith(
    thinkingDelayMs: max(500, config.thinkingDelayMs - delayReduction),
    deepThinking: _clamp(config.deepThinking + (maturity.maturityScore ~/ 10), 0, 100),
  );
}

class StrategyWeights {
  final double captureBonus;
  final double checkBonus;
  final double safetyPenalty;
  final double pokerWeight;

  const StrategyWeights({
    required this.captureBonus,
    required this.checkBonus,
    required this.safetyPenalty,
    required this.pokerWeight,
  });
}

StrategyWeights getStrategyWeights(BotStrategy strategy) {
  switch (strategy) {
    case BotStrategy.aggressive:
      return const StrategyWeights(
        captureBonus: 1.4,
        checkBonus: 1.3,
        safetyPenalty: 0.6,
        pokerWeight: 1.2,
      );
    case BotStrategy.defensive:
      return const StrategyWeights(
        captureBonus: 0.8,
        checkBonus: 0.9,
        safetyPenalty: 1.5,
        pokerWeight: 0.7,
      );
    case BotStrategy.gambler:
      return const StrategyWeights(
        captureBonus: 1.2,
        checkBonus: 1.1,
        safetyPenalty: 0.5,
        pokerWeight: 1.5,
      );
    case BotStrategy.balanced:
      return const StrategyWeights(
        captureBonus: 1.0,
        checkBonus: 1.0,
        safetyPenalty: 1.0,
        pokerWeight: 1.0,
      );
  }
}

String serializeBotConfig(BotConfiguration config) => jsonEncode(config.toJson());

BotConfiguration deserializeBotConfig(String? json) {
  if (json == null || json.isEmpty) return const BotConfiguration();
  try {
    final parsed = jsonDecode(json) as Map<String, dynamic>;
    return BotConfiguration.fromJson(parsed);
  } catch (_) {
    return const BotConfiguration();
  }
}

String serializeBotMaturity(BotMaturity maturity) => jsonEncode(maturity.toJson());

BotMaturity deserializeBotMaturity(String? json) {
  if (json == null || json.isEmpty) return const BotMaturity();
  try {
    final parsed = jsonDecode(json) as Map<String, dynamic>;
    return refreshMaturity(BotMaturity.fromJson(parsed));
  } catch (_) {
    return const BotMaturity();
  }
}

/// Scored candidate move used by the online bot engine.
class BotMoveCandidate {
  final PlayingCard card;
  final String move;
  final double score;

  const BotMoveCandidate({
    required this.card,
    required this.move,
    required this.score,
  });
}
