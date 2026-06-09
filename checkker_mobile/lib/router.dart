import 'package:go_router/go_router.dart';
import 'screens/home_screen.dart';
import 'screens/game/game_screen.dart';
import 'screens/game/casual_screen.dart';
import 'screens/game/ranked_screen.dart';
import 'screens/game/queue_screen.dart';
import 'screens/bot/difficulty_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/leaderboard/leaderboard_screen.dart';
import 'screens/tutorial/tutorial_hub_screen.dart';
import 'screens/tutorial/tutorial_lesson_screen.dart';
import 'screens/tutorial/tutorial_book_screen.dart';
import 'screens/puzzles/puzzles_screen.dart';
import 'screens/puzzles/puzzle_play_screen.dart';
import 'screens/replay/replay_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/spectate/spectate_browse_screen.dart';
import 'screens/spectate/spectate_watch_screen.dart';
import 'screens/lan/lan_screen.dart';
import 'screens/auth/connect_screen.dart';
import 'screens/auth/setup_screen.dart';
import 'screens/donate/donate_screen.dart';
import 'screens/dev/dev_screen.dart';

final goRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/game/casual', builder: (_, __) => const CasualScreen()),
    GoRoute(path: '/game/ranked', builder: (_, __) => const RankedScreen()),
    GoRoute(
      path: '/game/queue',
      builder: (_, state) => QueueScreen(
        mode: state.uri.queryParameters['mode'] ?? 'casual',
        difficulty: state.uri.queryParameters['difficulty'] ?? 'beginner',
        tc: state.uri.queryParameters['tc'] ?? 'blitz',
      ),
    ),
    GoRoute(path: '/game/:id', builder: (_, state) => GameScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/bot/difficulty', builder: (_, __) => const DifficultyScreen()),
    GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    GoRoute(path: '/leaderboard', builder: (_, __) => const LeaderboardScreen()),
    GoRoute(path: '/tutorial', builder: (_, __) => const TutorialHubScreen()),
    GoRoute(path: '/tutorial/book', builder: (_, __) => const TutorialBookScreen()),
    GoRoute(path: '/tutorial/lesson/:id', builder: (_, state) => TutorialLessonScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/puzzles', builder: (_, __) => const PuzzlesScreen()),
    GoRoute(path: '/puzzles/play/:category', builder: (_, state) => PuzzlePlayScreen(category: state.pathParameters['category']!)),
    GoRoute(path: '/replay/:gameId', builder: (_, state) => ReplayScreen(gameId: state.pathParameters['gameId']!)),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    GoRoute(path: '/spectate', builder: (_, __) => const SpectateBrowseScreen()),
    GoRoute(path: '/spectate/watch', builder: (_, __) => const SpectateWatchScreen()),
    GoRoute(path: '/spectate/:id', builder: (_, state) => SpectateWatchScreen(id: state.pathParameters['id'])),
    GoRoute(path: '/lan', builder: (_, __) => const LanScreen()),
    GoRoute(path: '/auth/connect', builder: (_, __) => const ConnectScreen()),
    GoRoute(path: '/auth/setup', builder: (_, __) => const SetupScreen()),
    GoRoute(path: '/donate', builder: (_, __) => const DonateScreen()),
    GoRoute(path: '/dev', builder: (_, __) => const DevScreen()),
  ],
);
