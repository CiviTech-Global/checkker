# Checkker Incident Response Playbook

This document provides quick response steps for common production issues.

## Severity Levels

- **SEV-1**: Service completely unavailable; ranked/cash play impacted.
- **SEV-2**: Major feature degraded; workarounds exist.
- **SEV-3**: Minor bug or isolated user impact.

## On-Call Checklist

1. Confirm the incident in monitoring / logs.
2. Notify the team in the `#incidents` channel.
3. Mitigate first, root-cause later.
4. Document timeline and actions in this file or an incident issue.
5. Schedule a post-mortem for SEV-1/SEV-2.

## Common Scenarios

### Server is Unhealthy

**Symptoms:** `/health` returns non-200, matches cannot start.

**Steps:**

```bash
# Check process and logs
kubectl get pods -l app=checkker-server
kubectl logs -l app=checkker-server --tail=200

# Restart gracefully
kubectl rollout restart deployment/checkker-server
```

**Escalation:** If restart does not help, check database connectivity and
recent deployments.

### Database Connection Errors

**Symptoms:** Errors mentioning `Prisma`, `ECONNREFUSED`, or query timeouts.

**Steps:**

1. Verify `DATABASE_URL` is correct and credentials are valid.
2. Check database CPU / connection limits.
3. Run Prisma generate again if schema changed:
   ```bash
   npm run typecheck -w packages/database
   ```
4. Scale connection pool if needed via `?connection_limit=`.

### WebSocket / Matchmaking Issues

**Symptoms:** Players stuck in queue, LAN discovery fails.

**Steps:**

1. Confirm load balancer has WebSocket support enabled.
2. Check `GameServer` active queues and games in logs.
3. Verify `CORS_ORIGIN` matches the web client origin.
4. Restart server nodes one at a time (state is in-memory; players will need
   to re-queue).

### Bot Performance Degradation

**Symptoms:** Bot games slow or illegal moves.

**Steps:**

1. Check `STOCKFISH_PATH` is set and binary is reachable.
2. Verify AI brain storage directory is writable.
3. Temporarily disable `SMART_MATCHMAKING` to reduce load.

### Mobile Build Failure

**Symptoms:** Flutter CI fails.

**Steps:**

1. Check Flutter version in `.github/workflows/build-flutter.yml` matches a
   published stable release.
2. Verify Android/iOS signing secrets are configured.
3. Run locally to capture full error:
   ```bash
   cd checkker_mobile
   flutter build apk --release
   ```

### Betting / Blockchain Outage

**Symptoms:** Deposits or withdrawals not recorded.

**Steps:**

1. Confirm `RPC_URL` and `CONTRACT_ADDRESS` are healthy.
2. Check transaction status on-chain.
3. If mainnet is impacted, remove/blank the blockchain env vars (`BSC_RPC_URL`, `CHECKKER_CONTRACT_ADDRESS`, `REFEREE_PRIVATE_KEY`) until resolved.

## Rollback Procedure

1. Identify the last known good container image / release tag.
2. Redeploy that tag:
   ```bash
   kubectl set image deployment/checkker-server server=checkker/server:<last-good-tag>
   ```
3. Monitor `/health` and error rates.

## Communication Templates

### Status Update

```
[SEV-X] Checkker — <short title>
Impact: <who is affected and how>
Status: <investigating/mitigated/resolved>
Workaround: <if any>
Next update: <+15 min>
```

### Resolution

```
[RESOLVED] Checkker — <short title>
Root cause: <one sentence>
Impact duration: <start - end>
Action items: <link to post-mortem issue>
```
