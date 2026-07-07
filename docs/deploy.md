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

| Variable | Purpose |
|----------|---------|
| `WEB_DIST` | Path to the exported web client (defaults to `apps/mobile/dist`). |
| `STOCKFISH_PATH` | Path to Stockfish UCI executable. |
| `AI_COACH_PROVIDER` | LLM provider for coaching (`openai` / `anthropic`). |
| `AI_COACH_API_KEY` | API key for the coaching LLM. |
| `AI_BRAIN_PERSISTENCE` | Persist player models to disk (`true`/`false`). |
| `SMART_MATCHMAKING` | Enable playstyle-based matchmaking. |
| `BSC_RPC_URL` | BSC testnet/mainnet HTTP RPC endpoint. |
| `BSC_WS_URL` | Optional WebSocket RPC for faster event detection. |
| `BSC_CHAIN_ID` | `97` for testnet, `56` for mainnet. |
| `CHECKKER_CONTRACT_ADDRESS` | Deployed `CheckkerEscrow` contract address. |
| `REFEREE_PRIVATE_KEY` | Server referee wallet private key. |
| `HOUSE_WALLET_ADDRESS` | Address receiving the house cut. |

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

- `ci-tests.yml` — lint, typecheck, unit tests.
- `build-flutter.yml` — Flutter builds for Android, iOS, Linux, macOS, Windows.
- `deploy-server.yml` — server deployment (configure for your host).

## Post-Deploy Checks

1. `GET /health` returns `200 OK`.
2. WebSocket connection at `/socket.io/` succeeds.
3. A bot game can be started and completed.
4. Database migrations / Prisma generate ran successfully.
