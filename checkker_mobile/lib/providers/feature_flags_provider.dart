import 'package:flutter_riverpod/flutter_riverpod.dart';

class FeatureFlags {
  final bool use3DBoard;
  final bool smartMatchmaking;
  final bool aiCoaching;
  final bool aiSpectator;
  final bool aiDashboard;
  final bool puzzleMode;
  final bool botPersonality;
  final bool devMode;

  const FeatureFlags({
    this.use3DBoard = false,
    this.smartMatchmaking = true,
    this.aiCoaching = true,
    this.aiSpectator = true,
    this.aiDashboard = true,
    this.puzzleMode = true,
    this.botPersonality = true,
    this.devMode = false,
  });
}

final featureFlagsProvider = Provider<FeatureFlags>((ref) {
  const isDebug = bool.fromEnvironment('dart.vm.product') == false;
  return const FeatureFlags(devMode: isDebug);
});
