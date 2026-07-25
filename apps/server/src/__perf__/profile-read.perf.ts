/**
 * Quick profile-read latency benchmark.
 * Runs 100 sequential reads of ProfileService.getMyProfile and reports
 * p50/p95/p99 latency. Assumes DATABASE_URL is set and the local PostgreSQL
 * instance is running.
 */
import {
  AccountRepository,
  ProfileRepository,
} from "@checkker/database";
import { ProfileService } from "../services/ProfileService";

const ITERATIONS = 100;

async function main() {
  // Create a throw-away account/profile/stats row.
  const username = `perf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const account = await AccountRepository.create({
    username,
    walletAddress: `0x${Math.random().toString(16).slice(2).padEnd(40, "0")}`,
    isGuest: false,
    roles: ["player"],
  });
  await ProfileRepository.update(account.id, {
    displayName: "Perf User",
    bio: "Benchmarking profile reads.",
    country: "US",
  });

  const refreshed = await AccountRepository.findById(account.id);
  if (!refreshed) throw new Error("Account disappeared");

  const latenciesMs: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    await ProfileService.getMyProfile(refreshed);
    const end = process.hrtime.bigint();
    latenciesMs.push(Number(end - start) / 1_000_000);
  }

  latenciesMs.sort((a, b) => a - b);
  const p50 = percentile(latenciesMs, 0.5);
  const p95 = percentile(latenciesMs, 0.95);
  const p99 = percentile(latenciesMs, 0.99);
  const avg = latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length;
  const min = latenciesMs[0];
  const max = latenciesMs[latenciesMs.length - 1];

  console.log(`Profile reads: ${ITERATIONS}`);
  console.log(`avg=${avg.toFixed(2)}ms p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms`);

  await AccountRepository.softDelete(account.id);
  process.exit(0);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
