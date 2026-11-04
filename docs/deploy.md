# Checkker Deployment Guide

This document covers how to build, configure, and run the Checkker server and
web/mobile clients in production.

## Quick Start with the Deployment Wizard

For a guided local setup, run the deployment wizard. It asks for every required
value, explains where to get it, generates secrets, sets up the database,
builds the server and web client, and starts the server.

```bash
# Linux / macOS / WSL
./scripts/deploy-wizard.sh

# Windows native PowerShell
.\scripts\deploy-wizard.ps1

# Or from npm
npm run deploy:wizard
```

See `docs/LOCAL_DEPLOYMENT_GUIDE.md` for the full manual walkthrough and
troubleshooting.

## Server

### Requirements

- Node.js 20+ and npm 11+
- PostgreSQL 15+ (when `DATABASE_URL` is provided)
- (Optional) Redis for session scaling
- (Optional) Stockfish binary for advanced bot analysis (`STOCKFISH_PATH`)

### Environment Variables

Create a `.env` file from `.env.example` and set at least:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/checkker
JWT_SECRET=<random-256-bit-secret>
ADMIN_API_KEY=<long-random-key>
CORS_ORIGIN=https://play.checkker.example
```

Optional variables:

| Variable                    | Purpose                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `WEB_DIST`                  | Path to the exported web client (defaults to `apps/mobile/dist`). |
| `STOCKFISH_PATH`            | Path to Stockfish UCI executable.                                 |
| `AI_COACH_PROVIDER`         | LLM provider for coaching (`openai` / `anthropic`).               |
| `AI_COACH_API_KEY`          | API key for the coaching LLM.                                     |
| `AI_BRAIN_PERSISTENCE`      | Persist player models to disk (`true`/`false`).                   |
| `SMART_MATCHMAKING`         | Enable playstyle-based matchmaking.                               |
| `BSC_RPC_URL`               | BSC testnet/mainnet HTTP RPC endpoint.                            |
| `BSC_WS_URL`                | Optional WebSocket RPC for faster event detection.                |
| `BSC_CHAIN_ID`              | `97` for testnet, `56` for mainnet.                               |
| `CHECKKER_CONTRACT_ADDRESS` | Deployed `CheckkerEscrow` contract address.                       |
| `REFEREE_PRIVATE_KEY`       | Server referee wallet private key.                                |
| `HOUSE_WALLET_ADDRESS`      | Address receiving the house cut.                                  |

### Build

```bash
npm ci
npm run build -w apps/server
```

### Run

```bash
npm run start -w apps/server
# or directly
node apps/server/dist/index.js
```

The server serves the web export from `WEB_DIST` if available.

### Docker

A `Dockerfile` is provided at the repository root:

```bash
docker build -t checkker-server .
docker run -p 3001:3001 --env-file .env checkker-server
```

### Reverse Proxy

Recommended nginx / cloud load balancer settings:

- Forward `Host` and `X-Forwarded-For` headers.
- Enable WebSocket support for `/socket.io/`.
- Terminate TLS at the proxy; the server expects plain HTTP behind it.

The server sets `trust proxy` to `1`, so rate limiting and admin loopback checks
use the client IP supplied by the proxy.

## Blockchain / Testnet Betting (Optional)

Free games work without any blockchain configuration. To test the escrow flow,
set the BSC testnet env vars and fund your wallets. See:

- `docs/WALLET_SETUP_GUIDE.md` — creating wallets and getting free tBNB.
- `docs/TESTNET_BETTING.md` — full end-to-end testnet betting walkthrough.

## Web Client

```bash
npm run export:web -w apps/mobile
```

Outputs to `apps/mobile/dist`. Set `WEB_DIST` on the server to point there, or
copy the folder to a static CDN.

## Mobile Clients

### Flutter

```bash
cd checkker_mobile
flutter pub get
flutter build apk --release
flutter build appbundle --release
flutter build ios --release --no-codesign
```

Android release builds require a keystore; configure it in
`android/key.properties`.

### Expo (apps/mobile)

```bash
cd apps/mobile
npx expo prebuild
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

## CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- `ci-tests.yml` — lint, typecheck, Prettier, and unit tests on Linux, macOS, and
  Windows.
- `ci-mobile.yml` — mobile typecheck and web export.
- `build-flutter.yml` — Flutter builds for Android, iOS, Linux, macOS, Windows.
- `build-desktop.yml` — Electron desktop build.
- `deploy-server.yml` — server image build, vulnerability scan, and deploys.

### Server image pipeline (`deploy-server.yml`)

Every pull request that touches the server, shared packages, or the Dockerfile:

1. Builds a single-architecture (`linux/amd64`) image locally with Buildx.
2. Scans it with Trivy. The job fails on **fixable** `HIGH` or `CRITICAL`
   vulnerabilities in OS packages and bundled libraries (`ignore-unfixed: true`,
   so CVEs with no upstream fix do not block the build).
3. Does **not** push or deploy anything.

On pushes to `main`, the workflow builds and pushes a multi-architecture image
(`linux/amd64` and `linux/arm64`) to `ghcr.io/<owner>/<repo>/server` with these
tags:

| Tag             | Use                                                |
| --------------- | -------------------------------------------------- |
| `latest`        | production rollout                                 |
| `sha-<commit>`  | traceability                                       |
| `scan-<commit>` | exact image that passed the scan (used by staging) |

**To make the scan block merges**, add the `Build, scan, and publish server image`
check to the `main` branch protection rules as a required status check. Without
that branch-protection setting the workflow still fails, but GitHub will not stop
the merge.

If a finding is a confirmed false positive, add its ID to `.trivyignore` at the
repository root with a comment explaining why, rather than lowering the severity
threshold.

### Production deploy (optional)

The rollout step is disabled by default. Enable it with:

- Repository secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
- Repository variable: `DEPLOY_ENABLED=true`.

The host must have Docker and `/etc/checkker/server.env` containing the server
environment variables. The step pulls `:latest`, replaces the `checkker-server`
container, and publishes `3001/tcp` and `47831/udp`.

### Staging deploy (optional)

`deploy-staging` runs after a successful scan on `main`, deploys the immutable
`scan-<commit>` image, and smoke-tests it before reporting success.

1. Create a GitHub Environment named `staging` (Settings → Environments) and
   restrict it to the `main` branch if desired.
2. Add environment or repository secrets: `STAGING_HOST`, `STAGING_USER`,
   `STAGING_SSH_KEY`.
3. Add repository variables:
   - `STAGING_DEPLOY_ENABLED=true`
   - `STAGING_URL=https://staging.example.com` — the public HTTPS origin in
     front of the staging container. It is shown as the environment URL and is
     used by the smoke tests.
4. On the staging host, provide `/etc/checkker/staging.env` with staging values
   (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, …). The container is published
   on host ports `3002/tcp` and `47832/udp`; point the reverse proxy for
   `STAGING_URL` at `127.0.0.1:3002`.
5. The job polls `GET /health` and `GET /ready` for up to 60 seconds. A failed
   smoke test fails the job; keep the previous `scan-<commit>` tag handy for a
   manual rollback.

Staging uses the commit-pinned `scan-<commit>` tag rather than `latest`, so a
newer production rollout cannot change what staging is running. To roll back,
re-run the deploy job for an earlier commit or start that `scan-<commit>` image
manually.

> **Note:** the staging job is a no-op until `STAGING_DEPLOY_ENABLED=true` and
> the three secrets/variables above exist. A green workflow with no staging step
> means the environment is not configured yet.

## Post-Deploy Checks

1. `GET /health` returns `200 OK`.
2. WebSocket connection at `/socket.io/` succeeds.
3. A bot game can be started and completed.
4. Database migrations / Prisma generate ran successfully.
