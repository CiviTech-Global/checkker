import 'package:checkker_mobile/models/bot.dart';
import 'package:checkker_mobile/models/card.dart';
import 'package:checkker_mobile/services/online_bot_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('BotConfiguration', () {
    test('defaults are sane', () {
      const config = BotConfiguration();
      expect(config.enabled, false);
      expect(config.difficulty, BotDifficulty.intermediate);
      expect(config.strategy, BotStrategy.balanced);
      expect(config.patience, 50);
    });

    test('serializes and deserializes', () {
      const config = BotConfiguration(
        enabled: true,
        difficulty: BotDifficulty.advanced,
        strategy: BotStrategy.aggressive,
        patience: 80,
        deepThinking: 70,
        riskTolerance: 60,
        thinkingDelayMs: 2000,
        autoRematch: true,
        allowTakeover: false,
      );
      final json = serializeBotConfig(config);
      final parsed = deserializeBotConfig(json);
      expect(parsed.toJson(), config.toJson());
    });

    test('returns defaults for invalid json', () {
      final parsed = deserializeBotConfig('not-json');
      expect(parsed.enabled, false);
      expect(parsed.difficulty, BotDifficulty.intermediate);
    });
  });

  group('BotMaturity', () {
    test('starts at zero', () {
      const m = BotMaturity();
      expect(m.maturityScore, 0);
      expect(m.unlockedTraits, isEmpty);
    });

    test('records wins and streaks', () {
      var m = recordBotGameResult(const BotMaturity(), 'win');
      expect(m.wins, 1);
      expect(m.currentStreak, 1);
      expect(m.bestStreak, 1);

      m = recordBotGameResult(m, 'win');
      expect(m.bestStreak, 2);

      m = recordBotGameResult(m, 'loss');
      expect(m.currentStreak, 0);
      expect(m.bestStreak, 2);
      expect(m.losses, 1);
    });

    test('unlocks battle tested after 10 games', () {
      var m = const BotMaturity();
      for (var i = 0; i < 10; i++) {
        m = recordBotGameResult(m, 'win');
      }
      expect(m.unlockedTraits, contains('battle_tested'));
    });

    test('maturity score caps at 100', () {
      final m = refreshMaturity(const BotMaturity(
        gamesPlayed: 200,
        wins: 200,
        bestStreak: 100,
        currentStreak: 100,
      ));
      expect(m.maturityScore, 100);
    });
  });

  group('StrategyWeights', () {
    test('aggressive favors captures', () {
      final w = getStrategyWeights(BotStrategy.aggressive);
      expect(w.captureBonus, greaterThan(1.0));
      expect(w.safetyPenalty, lessThan(1.0));
    });

    test('defensive favors safety', () {
      final w = getStrategyWeights(BotStrategy.defensive);
      expect(w.safetyPenalty, greaterThan(1.0));
      expect(w.captureBonus, lessThan(1.0));
    });
  });

  group('pickOnlineBotMove', () {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    final hand = [
      const PlayingCard(rank: Rank.nine, suit: Suit.hearts),
      const PlayingCard(rank: Rank.jack, suit: Suit.clubs),
      const PlayingCard(rank: Rank.ace, suit: Suit.spades),
    ];

    test('picks a legal move', () {
      const config = BotConfiguration(difficulty: BotDifficulty.intermediate);
      const maturity = BotMaturity();
      final pick = pickOnlineBotMove(
        fen: fen,
        hand: hand,
        config: config,
        maturity: maturity,
        myColor: 'white',
      );
      expect(pick, isNotNull);
      expect(pick!.move.length, greaterThanOrEqualTo(4));
      expect(hand.any((c) => c.id == pick.cardId), true);
    });

    test('returns null with empty hand', () {
      final pick = pickOnlineBotMove(
        fen: fen,
        hand: const [],
        config: const BotConfiguration(),
        maturity: const BotMaturity(),
      );
      expect(pick, isNull);
    });
  });

  group('isEndgame', () {
    test('starting position is not endgame', () {
      expect(isEndgame('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), false);
    });

    test('no queens is endgame', () {
      expect(isEndgame('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1'), true);
    });
  });
}
