/**
 * Lightweight analytics + crash reporting hooks.
 *
 * Sentry is loaded dynamically when installed and EXPO_PUBLIC_SENTRY_DSN is
 * set (same optional-module pattern as utils/push.ts). Without it, events
 * are logged in dev and silently dropped in production, so call sites never
 * need to care whether a backend is configured.
 */

type EventProps = Record<string, string | number | boolean | null | undefined>;

let sentry: any = null;
let initialized = false;

export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;

  try {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require("@sentry/react-native");
    sentry.init({ dsn, tracesSampleRate: 0.1 });
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

export function trackEvent(name: string, props?: EventProps): void {
  if (__DEV__) {
    console.log(`[analytics] ${name}`, props ?? "");
  }
  sentry?.addBreadcrumb?.({ category: "event", message: name, data: props });
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
