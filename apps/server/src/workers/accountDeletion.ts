import { AccountRepository, SessionRepository, AuditLogRepository } from "@checkker/database";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function runDeletionWorker(): Promise<void> {
  const { UsernameHistoryRepository } = await import("@checkker/database");
  await UsernameHistoryRepository.releaseOldUsernames();

  const pending = await AccountRepository.listForAdmin({ status: "pending_deletion", limit: 1000 });
  const now = new Date();

  for (const account of pending) {
    if (!account.deletedAt) continue;
    const graceEnd = new Date(account.deletedAt);
    graceEnd.setDate(graceEnd.getDate() + 7);

    if (now >= graceEnd) {
      await AccountRepository.hardDelete(account.id);
      await AuditLogRepository.create({
        targetId: account.id,
        action: "account_deletion_completed",
        metadata: { completedAt: now.toISOString() },
      });
    }
  }

  await SessionRepository.cleanupExpired();
}

export function startAccountDeletionWorker(): void {
  // Run immediately at startup, then on interval.
  runDeletionWorker().catch((err) => {
    console.error("[deletion-worker] initial run failed", err);
  });

  const interval = setInterval(() => {
    runDeletionWorker().catch((err) => {
      console.error("[deletion-worker] scheduled run failed", err);
    });
  }, CHECK_INTERVAL_MS);

  interval.unref();
}
