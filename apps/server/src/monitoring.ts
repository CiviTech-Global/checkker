/**
 * Crash reporting + error tracking hooks for the game server.
 *
 * Sentry is loaded dynamically when @sentry/node is installed and
 * SENTRY_DSN is set; otherwise errors are logged to the console. Process
 * crashes are always captured so a misbehaving handler can't take the
 * server down silently.
 */

let sentry: any = null;

export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sentry = require("@sentry/node");
      sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0.1,
      });
      console.log("[monitoring] Sentry enabled");
    } catch {
      sentry = null;
      console.warn("[monitoring] SENTRY_DSN set but @sentry/node not installed");
    }
  }

  process.on("uncaughtException", (error) => {
    captureError(error, { source: "uncaughtException" });
  });

  process.on("unhandledRejection", (reason) => {
    captureError(reason, { source: "unhandledRejection" });
  });
}

export function captureError(error: unknown, context?: Record<string, string>): void {
  console.error("[error]", context?.source ?? "", error);
  if (sentry?.captureException) {
    sentry.captureException(error, { extra: context });
  }
}
