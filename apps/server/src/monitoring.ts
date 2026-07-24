/**
 * Production crash reporting + error tracking for the Checkker game server.
 *
 * Sentry is loaded when @sentry/node is installed and SENTRY_DSN is set.
 * Provides: request handler middleware, game-event breadcrumbs, user context,
 * process crash capture, and a captureError helper for manual instrumentation.
 */

import type { Request, Response, NextFunction } from "express";

let sentry: typeof import("@sentry/node") | null = null;

export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sentry = require("@sentry/node") as typeof import("@sentry/node");
      sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0.1,
      });
      console.log("[monitoring] Sentry enabled");
    } catch {
      sentry = null;
      console.warn("[monitoring] SENTRY_DSN set but @sentry/node not installed — falling back to console");
    }
  }

  process.on("uncaughtException", (error) => {
    captureError(error, { source: "uncaughtException" });
  });

  process.on("unhandledRejection", (reason) => {
    captureError(reason, { source: "unhandledRejection" });
  });
}

/** Express middleware — attaches Sentry request context for error grouping. */
export function sentryRequestHandler() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Sentry v8 uses scope-based request isolation automatically.
    next();
  };
}

/** Express error handler — captures unhandled route errors into Sentry. */
export function sentryErrorHandler() {
  return (err: Error, _req: Request, res: Response, next: NextFunction): void => {
    captureError(err, { source: "express-error-handler" });
    if (res.headersSent) return next(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  };
}

/**
 * Record a game event as a Sentry breadcrumb for context in crash reports.
 * Call this at key game lifecycle points so crashes include the trail.
 */
export function addGameBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  if (sentry?.addBreadcrumb) {
    sentry.addBreadcrumb({
      category: `game.${category}`,
      message,
      data,
      level: "info",
    });
  }
}

/** Set the Sentry user context for the current request / connection. */
export function setSentryUser(userId: string, extra?: Record<string, string>): void {
  if (sentry?.setUser) {
    sentry.setUser({ id: userId, ...extra });
  }
}

/** Clear user context on disconnect / logout. */
export function clearSentryUser(): void {
  if (sentry?.setUser) {
    sentry.setUser(null);
  }
}

/** Set additional tags for game context (mode, difficulty, etc.). */
export function setSentryTag(key: string, value: string): void {
  if (sentry?.setTag) {
    sentry.setTag(key, value);
  }
}

/** Capture an error with optional context metadata. */
export function captureError(error: unknown, context?: Record<string, string>): void {
  console.error("[error]", context?.source ?? "", error);
  if (sentry?.captureException) {
    sentry.captureException(error, { extra: context });
  }
}

/** Flush Sentry events before process exit (ensures crash reports are delivered). */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (sentry?.flush) {
    await sentry.flush(timeoutMs);
  }
}
