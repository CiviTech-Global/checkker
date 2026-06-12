import 'package:flutter/foundation.dart';

/// Lightweight analytics + crash reporting hooks.
///
/// Events and errors are logged in debug builds and kept in a small ring
/// buffer; wire [onEvent]/[onError] to a backend (Sentry, Firebase
/// Crashlytics, ...) when credentials are configured. Call sites never need
/// to care whether a backend is attached.
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._();
  factory AnalyticsService() => _instance;
  AnalyticsService._();

  static const _bufferLimit = 100;
  final List<String> _recentEvents = [];

  /// Optional backend hooks.
  void Function(String name, Map<String, Object?>? props)? onEvent;
  void Function(Object error, StackTrace? stack, {bool fatal})? onError;

  List<String> get recentEvents => List.unmodifiable(_recentEvents);

  void logEvent(String name, [Map<String, Object?>? props]) {
    if (kDebugMode) {
      debugPrint('[analytics] $name ${props ?? ''}');
    }
    _recentEvents.add(name);
    if (_recentEvents.length > _bufferLimit) _recentEvents.removeAt(0);
    onEvent?.call(name, props);
  }

  void logScreen(String name) => logEvent('screen_view', {'screen': name});

  void recordError(Object error, StackTrace? stack, {bool fatal = false}) {
    debugPrint('[crash]${fatal ? ' FATAL' : ''} $error');
    if (stack != null && kDebugMode) debugPrint('$stack');
    onError?.call(error, stack, fatal: fatal);
  }
}
