import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// Production crash reporting + analytics for Checkker Flutter client.
///
/// Sentry is initialized when SENTRY_DSN is provided (via --dart-define).
/// Without it, events are logged in debug and kept in a ring buffer; call
/// sites never need to care whether a backend is attached.
///
/// Usage:
///   AnalyticsService().logEvent('game_started', {'difficulty': 'advanced'});
///   AnalyticsService().recordError(error, stack, fatal: true);
///   AnalyticsService().setUser(id: userId, extra: {'wallet': address});
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._();
  factory AnalyticsService() => _instance;
  AnalyticsService._();

  static const _bufferLimit = 100;
  final List<String> _recentEvents = [];
  bool _initialized = false;

  /// Optional backend hooks (fallback when Sentry is not configured).
  void Function(String name, Map<String, Object?>? props)? onEvent;
  void Function(Object error, StackTrace? stack, {bool fatal})? onError;

  List<String> get recentEvents => List.unmodifiable(_recentEvents);

  /// Initialize Sentry with the DSN passed via --dart-define=SENTRY_DSN=...
  Future<void> init({String? dsn}) async {
    if (_initialized) return;
    _initialized = true;

    final sentryDsn = dsn ?? const String.fromEnvironment('SENTRY_DSN');
    if (sentryDsn.isEmpty) return;

    await SentryFlutter.init(
      (options) {
        options.dsn = sentryDsn;
        options.environment = kDebugMode ? 'development' : 'production';
        options.tracesSampleRate = 0.1;
        options.enableAutoSessionTracking = true;
        options.attachStacktrace = true;
        options.enableNativeCrashHandling = true;
      },
    );
  }

  /// Set the Sentry user context (call after wallet auth).
  void setUser({required String id, Map<String, String>? extra}) {
    Sentry.configureScope((scope) {
      scope.setUser(SentryUser(id: id, data: extra));
    });
  }

  /// Clear user context on logout.
  void clearUser() {
    Sentry.configureScope((scope) {
      scope.setUser(null);
    });
  }

  /// Set a tag for game context (mode, difficulty, etc.).
  void setTag(String key, String value) {
    Sentry.configureScope((scope) {
      scope.setTag(key, value);
    });
  }

  void logEvent(String name, [Map<String, Object?>? props]) {
    if (kDebugMode) {
      debugPrint('[analytics] $name ${props ?? ''}');
    }
    _recentEvents.add(name);
    if (_recentEvents.length > _bufferLimit) _recentEvents.removeAt(0);

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb(Breadcrumb(
      category: 'event',
      message: name,
      data: props?.map((k, v) => MapEntry(k, v?.toString() ?? '')),
    ));

    onEvent?.call(name, props);
  }

  void logScreen(String name) => logEvent('screen_view', {'screen': name});

  void recordError(Object error, StackTrace? stack, {bool fatal = false}) {
    debugPrint('[crash]${fatal ? ' FATAL' : ''} $error');
    if (stack != null && kDebugMode) debugPrint('$stack');

    // Capture to Sentry
    Sentry.captureException(
      error,
      stackTrace: stack,
      hint: Hint.withMap({'fatal': fatal}),
    );

    onError?.call(error, stack, fatal: fatal);
  }

  /// Flush Sentry events before app termination.
  Future<void> flush([Duration timeout = const Duration(seconds: 2)]) async {
    await Sentry.close();
  }
}
