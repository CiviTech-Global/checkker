/**
 * Production crash reporting + analytics for the Checkker React Native client.
 *
 * Sentry is loaded dynamically when @sentry/react-native is installed and
 * EXPO_PUBLIC_SENTRY_DSN is set. Without it, events are logged in dev and
 * silently dropped in production, so call sites never need to care whether
 * a backend is configured.
 *
 * Usage:
 *   import { initMonitoring, trackEvent, trackScreen, recordError } from "../utils/analytics";
 *   // initMonitoring() is called once in _layout.tsx
 *   trackScreen("Home");
 *   trackEvent("game_started", { difficulty: "advanced" });
 *   recordError(error, { context: "socket reconnect" });
 */

type EventProps = Record<string, string | number | boolean | null | undefined>;

let sentry: any = null;
let initialized = false;

export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    sentry = require("@sentry/react-native");
    sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV ?? (__DEV__ ? "development" : "production"),
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      attachStacktrace: true,
      enableNativeCrashHandling: true,
    });
  } catch {
    sentry = null;
  }

  // Catch fatal JS errors that escape React (outside render).
  const ErrorUtils = (global as any).ErrorUtils;
  if (ErrorUtils?.setGlobalHandler) {
    const prev = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      recordError(error, { fatal: String(isFatal ?? false) });
      prev?.(error, isFatal);
    });
  }
}

/** Set the Sentry user context (call after wallet auth). */
export function setSentryUser(userId: string, extra?: Record<string, string>): void {
  if (sentry?.setUser) {
    sentry.setUser({ id: userId, ...extra });
  }
}

/** Clear user context on logout. */
export function clearSentryUser(): void {
  if (sentry?.setUser) {
    sentry.setUser(null);
  }
}

/** Set a tag for game context (mode, difficulty, etc.). */
export function setSentryTag(key: string, value: string): void {
  if (sentry?.setTag) {
    sentry.setTag(key, value);
  }
}

export function trackEvent(name: string, props?: EventProps): void {
  if (__DEV__) {
    console.log(`[analytics] ${name}`, props ?? "");
  }
  sentry?.addBreadcrumb?.({
    category: "event",
    message: name,
    data: props,
    level: "info",
  });
}

export function trackScreen(name: string): void {
  trackEvent("screen_view", { screen: name });
}

export function recordError(error: unknown, context?: EventProps): void {
  console.error("[crash]", error, context ?? "");
  if (sentry?.captureException) {
    sentry.captureException(error, { extra: context });
  }
}

/** Flush Sentry events before app termination. */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (sentry?.flush) {
    await sentry.flush(timeoutMs);
  }
}
