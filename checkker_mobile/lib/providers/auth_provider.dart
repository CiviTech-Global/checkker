import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/socket_service.dart';
import 'socket_provider.dart';

final authStateProvider = StreamProvider<AuthState?>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.authStateStream;
});

final depositStatusProvider = StreamProvider<DepositStatus?>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.depositStatusStream;
});

final authChallengeProvider = StreamProvider<Map<String, dynamic>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.authChallengeStream;
});

final authErrorProvider = StreamProvider<String>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.authErrorStream;
});

final usernameCheckProvider = StreamProvider<Map<String, dynamic>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.usernameCheckStream;
});

final queueJoinedProvider = StreamProvider<Map<String, dynamic>>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.queueJoinedStream;
});

final leaderboardProvider = StreamProvider<LeaderboardData>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.leaderboardStream;
});

final profileDataProvider = StreamProvider<ProfileData>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.profileDataStream;
});
