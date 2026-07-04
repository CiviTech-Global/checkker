# Checkker — Full Setup Guide (Linux Mint)

> **Target:** Get the game running on your Linux Mint XFCE laptop — server, web
> client, and Flutter client — then test online play and crypto betting end-to-end.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & install](#2-clone--install)
3. [Start the server (free play)](#3-start-the-server-free-play)
4. [Play via web browser](#4-play-via-web-browser)
5. [Build & run the Flutter client](#5-build--run-the-flutter-client)
6. [Play from another device on your LAN](#6-play-from-another-device-on-your-lan)
7. [Set up crypto betting](#7-set-up-crypto-betting)
8. [Play a paid game end-to-end](#8-play-a-paid-game-end-to-end)
9. [Deploy the server to another machine](#9-deploy-the-server-to-another-machine)
10. [Quick reference — common commands](#quick-reference--common-commands)
11. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Install these system dependencies:

```bash
# Node.js 20+ and npm 11+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should be v22.x
npm --version    # should be 11.x

# Flutter 3.38.x (for the Flutter client)
# Download from https://docs.flutter.dev/get-started/install/linux
# or use the Flutter GitHub action's setup script:
cd ~
git clone https://github.com/flutter/flutter.git -b stable
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.bashrc
source ~/.bashrc
flutter --version   # should be 3.38.x

# Build dependencies for Flutter Linux desktop
sudo apt-get update
sudo apt-get install -y \
  ninja-build libgtk-3-dev clang cmake pkg-config \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libsecret-1-dev         # needed by flutter_secure_storage_linux

# For the server (no database required for basic play)
# Everything else is installed via npm
```

---

## 2. Clone & install

```bash
git clone https://github.com/civitechglobal/checkker.git
cd checkker
npm install
```

This installs all workspace packages (server, shared, chess, poker, ai-brain, contracts).

---

## 3. Start the server (free play)

No environment variables needed — the server runs in **free mode** by default.

```bash
npm run dev -w apps/server
```

You should see:

```
Checkker server running on port 3001
```

The server binds to `0.0.0.0:3001` (accessible from other machines on your LAN).

> **Stop the server:** Ctrl+C. The server handles SIGTERM/SIGINT gracefully.

### Verify it's running

```bash
# From the laptop itself
curl http://localhost:3001/health
# → {"status":"ok","service":"checkker","version":1}

# From another machine on the same LAN
curl http://192.168.1.X:3001/health   # replace with your laptop's LAN IP
```

To find your laptop's LAN IP:

```bash
ip addr show | grep 'inet ' | grep -v 127.0.0.1
# → e.g. inet 192.168.1.105/24 ...
```

---

## 4. Play via web browser

The server can serve the web client directly — no separate frontend dev server needed.

### Build the web client (one-time)

```bash
npm run export:web -w apps/mobile
```

This creates `apps/mobile/dist/` with the static web export.

### Restart the server

Stop the server (Ctrl+C) and start it again — it will auto-detect the `dist/` folder
and serve the web client:

```
[web] Serving web client from apps/mobile/dist
```

### Open in a browser

| Where | URL |
|-------|-----|
| On the laptop itself | `http://localhost:3001` |
| On another device on LAN | `http://192.168.1.X:3001` (your laptop's IP) |

The web client auto-detects the server URL from the page origin, so it connects
to the right address automatically.

**That's it — you can now play Checkker in any browser on any device connected
to your LAN, including bots, tutorials, puzzles, and casual matches.**

---

## 5. Build & run the Flutter client

The Flutter client is the primary/lead client with full feature parity.

```bash
cd checkker_mobile
flutter pub get

# Run on Linux desktop (on the laptop itself)
flutter run -d linux

# Or build a release binary
flutter build linux --release
# → checkker_mobile/build/linux/x64/release/bundle/
```

The Flutter client connects to `http://localhost:3001` by default when running
on the same machine. To override:

```bash
flutter run -d linux --dart-define=SERVER_URL=http://192.168.1.X:3001
```

Or change the address at runtime in **Settings → Network → Game Server**.

---

## 6. Play from another device on your LAN

### Scenario: two players on two machines

| Machine | Role |
|---------|------|
| Your Linux laptop | Game server + Player A (web or Flutter) |
| Phone / second laptop | Player B (web browser) |

1. Start the server on the laptop (step 3).
2. Build the web export (step 4) so the server serves the client.
3. Find the laptop's LAN IP: `ip addr show | grep 'inet '`
4. Player A opens `http://<laptop-ip>:3001` (or runs the Flutter client locally).
5. Player B opens `http://<laptop-ip>:3001` in a browser on their device.

Both players can now:
- Play **Casual** matches against each other
- Play **Ranked** against each other
- Play **vs Bot** independently
- Queue for matchmaking (bot fallback after 15–30 s if no real opponent)

---

## 7. Set up crypto betting

This enables ranked games with real (testnet) BNB stakes via the escrow contract
on BSC Testnet. All steps are free — no real money involved.

### 7.1 Get a WalletConnect Project ID

1. Go to https://cloud.reown.com and sign in.
2. Create a project → copy the **Project ID**.

### 7.2 Set up three testnet wallets

You need three wallets with tBNB (testnet BNB):

| Wallet | Purpose | tBNB needed |
|--------|---------|-------------|
| **Referee** | Server signs transactions | ~0.01 for gas |
| **Player A** | Stakes bets | ~0.5 for deposits + gas |
| **Player B** | Stakes bets | ~0.5 for deposits + gas |

**You can use a single wallet for all three during testing** (just know the
private key). MetaMask browser extension works fine on Linux.

Steps for each wallet:

1. Install MetaMask or use an existing wallet.
2. Add BSC Testnet:

   | Field | Value |
   |-------|-------|
   | Network name | BNB Smart Chain Testnet |
   | RPC URL | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
   | Chain ID | `97` |
   | Currency | `tBNB` |
   | Explorer | `https://testnet.bscscan.com` |

3. Get tBNB from the faucet:
   - Go to https://www.bnbchain.org/en/testnet-faucet
   - Paste each wallet address and request funds

### 7.3 Deploy the escrow contract

```bash
cd packages/contracts

# Set the deployer's private key (this wallet becomes the contract owner)
export DEPLOYER_PRIVATE_KEY=0x<your-wallet-private-key>

# Set the referee address (the server's signing wallet)
# For testing, use the same wallet as deployer
export REFEREE_ADDRESS=0x<referee-wallet-address>
export HOUSE_WALLET=0x<house-wallet-address>  # can be same as referee

# Compile, test, and deploy
npm run compile
npm test
npm run deploy:testnet
```

The script prints:

```
CheckkerEscrow deployed to: 0xABC...
Add to your .env:
CHECKKER_CONTRACT_ADDRESS=0xABC...
```

**Save this address** — you'll need it in the next step.

### 7.4 Configure the server for betting

Create `.env` in the repo root:

```bash
cat > .env << 'ENVEOF'
# Server
PORT=3001

# Blockchain — BSC Testnet
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
# WebSocket RPC (recommended for reliable deposit detection — optional but avoids
# the most common testnet gotcha). Get one from a free RPC provider.
# BSC_WS_URL=wss://bsc-testnet-rpc.publicnode.com
BSC_CHAIN_ID=97
CHECKKER_CONTRACT_ADDRESS=0xABC...    # ← from step 7.3
REFEREE_PRIVATE_KEY=0x...             # ← the referee wallet's private key
HOUSE_WALLET_ADDRESS=0x...            # ← same as in deploy step
ENVEOF
```

Blockchain features turn on **only** when `BSC_RPC_URL`,
`CHECKKER_CONTRACT_ADDRESS`, and `REFEREE_PRIVATE_KEY` are all present.
If any is missing, paid games silently fall back to free play.

Restart the server:

```bash
npm run dev -w apps/server
```

### 7.5 Build the Flutter client with WalletConnect

```bash
cd checkker_mobile

flutter run -d linux \
  --dart-define=SERVER_URL=http://<laptop-ip>:3001 \
  --dart-define=CHECKKER_WC_PROJECT_ID=<reown-project-id>
```

Or build a release binary:

```bash
flutter build linux --release \
  --dart-define=SERVER_URL=http://<laptop-ip>:3001 \
  --dart-define=CHECKKER_WC_PROJECT_ID=<reown-project-id>
```

---

## 8. Play a paid game end-to-end

With the server running (blockchain enabled) and both players on the Flutter client
(or one Flutter + one web — note that the web client uses injected wallet, not
WalletConnect, for deposits):

### 8.1 Both players sign in

1. Open the app → tap **Connect Wallet**.
2. MetaMask opens → approve the connection.
3. Select **BSC Testnet (chain 97)** in the network picker.
4. Sign the auth challenge (`personal_sign`) — the app profiles loads.

### 8.2 Queue a ranked match

1. Tap **Play Ranked**.
2. Select a tier: Beginner ($10), Intermediate ($25), Advanced ($100), Master ($500).
3. Both pick the **same tier** and queue.

### 8.3 Deposit

On match, both players see the **Confirm Bet** view:

- Amount shown in USD and BNB
- Countdown timer (2-minute deposit window)
- **Tap Deposit** → MetaMask prompts `eth_sendTransaction` → approve it

The server detects both `DepositMade` events and starts the game automatically.

### 8.4 Play

Standard Checkker rules:
- 3-card hand, play a card to move that piece type
- Captures send cards to your score pile (face-up)
- Game ends on checkmate, resignation, timeout, draw, or deck exhaustion

### 8.5 Settlement

When the game ends:

| Result | On-chain action | Payout |
|--------|----------------|--------|
| Checkmate / timeout / resignation | `reportWinner(gameId, winner)` | Winner: 90% of pot, House: 10% |
| Draw / deck exhausted | `reportDraw(gameId)` | Both players: 100% refund |

The client shows `bet_settled` with the transaction hash. Verify on
https://testnet.bscscan.com/address/<contract-address>.

---

## 9. Deploy the server to another machine

You can package the server into a **self-contained deployment** that runs on any
machine with Node.js 18+ — no monorepo, no build tools, no Flutter required.

The deployment includes:
- Bundled server (`server.bundle.js` ~3.3 MB — all JS deps inlined)
- Web client (`web/` — the compiled Flutter web export)
- Start scripts for Windows and Linux
- `.env.example` — configure port, blockchain, database, etc.

### 9.1 Build the deployment package

From the repo root:

```bash
# Windows (in repo root)
.\scripts\deploy-server.ps1
```

This runs `npm run export:web` and `npm run bundle`, then assembles everything
into the `deploy/` directory with this structure:

```
deploy/
├── server.bundle.js       # bundled server (3.3 MB)
├── start.ps1              # Windows launcher
├── start.sh               # Linux launcher
├── .env.example           # configuration template
└── web/
    ├── index.html         # web client build
    ├── assets/
    └── ...
```

### 9.2 Copy to the target server

Copy the `deploy/` directory to any machine with **Node.js 18+** installed:

```bash
# Linux / macOS
scp -r deploy/ user@server-ip:~/checkker/

# Or via rsync
rsync -avz deploy/ user@server-ip:~/checkker/
```

### 9.3 Configure and start

```bash
cd ~/checkker

# Create config from template (edit with your settings)
cp .env.example .env
nano .env

# Linux
chmod +x start.sh
./start.sh

# Or with explicit port
./start.sh --port 8080

# Or with a custom web client path
./start.sh --web-dist /path/to/web
```

Windows:

```powershell
cd \path\to\checkker-deploy
.\start.ps1
.\start.ps1 --port 8080
.\start.ps1 --web-dist D:\web
```

### 9.4 Run as a background service (Linux)

```bash
# Using nohup
nohup ./start.sh > server.log 2>&1 &

# Using systemd (create /etc/systemd/system/checkker.service):
cat > /tmp/checkker.service << 'EOF'
[Unit]
Description=Checkker Game Server
After=network.target

[Service]
Type=simple
User=checkker
WorkingDirectory=/home/checkker
ExecStart=/usr/bin/node /home/checkker/server.bundle.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
sudo mv /tmp/checkker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable checkker
sudo systemctl start checkker
sudo systemctl status checkker
```

### 9.5 Run with Docker

```bash
# Build the image (from repo root)
docker build -t checkker-server .

# Run in-memory mode (no database needed)
docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp checkker-server

# With crypto betting
docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp \
  -e BSC_RPC_URL=https://bsc-testnet-rpc.publicnode.com \
  -e CHECKKER_CONTRACT_ADDRESS=0xABC... \
  -e REFEREE_PRIVATE_KEY=0x... \
  -e HOUSE_WALLET_ADDRESS=0x... \
  checkker-server

# With Postgres database
docker run -d --name checkker -p 3001:3001 -p 47831:47831/udp \
  -e DATABASE_URL=postgresql://user:pass@host:5432/checkker \
  checkker-server
```

### 9.6 What requires Node.js vs. what is self-contained

| Component | Bundled? | Runtime dep |
|-----------|----------|-------------|
| Express, Socket.IO, ethers, etc. | ✅ Inlined in bundle | None |
| Web client (Flutter web export) | ✅ Copied to `web/` | None |
| @checkker/database (Prisma) | ❌ External | Optional — only needed for Postgres |
| Node.js runtime | ❌ | Required (v18+) |
| Stockfish engine | ❌ | Optional — set STOCKFISH_PATH |

> **Note:** The server works perfectly without a database — it stores everything
> in memory (games, profiles, puzzles). To persist data across restarts or enable
> player leaderboards, set up Postgres and configure `DATABASE_URL` in `.env`.
> If you need Postgres, the Prisma client is available in the Docker image.

---

## Quick reference — common commands

```bash
# Start the server
npm run dev -w apps/server

# Build the web client (one-time, needed for browser play)
npm run export:web -w apps/mobile

# Flutter — run on Linux desktop
cd checkker_mobile && flutter run -d linux

# Flutter — with custom server + WalletConnect
cd checkker_mobile && flutter run -d linux \
  --dart-define=SERVER_URL=http://192.168.1.X:3001 \
  --dart-define=CHECKKER_WC_PROJECT_ID=<id>

# Deploy the contract to BSC testnet
cd packages/contracts && npm run deploy:testnet

# Run all tests
cd packages/contracts && npm test        # contract tests (46)
cd apps/server && npm test                # server tests (57)
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `curl localhost:3001/health` fails | Server not running. Check for port conflicts: `sudo lsof -i :3001` |
| Web client shows blank page | Web export not built — run `npm run export:web -w apps/mobile`, then restart server |
| Flutter build fails with `libsecret-1` error | Missing system dep — install `libsecret-1-dev` (step 1) |
| "Blockchain not enabled" in server log | Missing env vars — check `.env` has all three: `BSC_RPC_URL`, `CHECKKER_CONTRACT_ADDRESS`, `REFEREE_PRIVATE_KEY` |
| "Connect Wallet" button disabled | `CHECKKER_WC_PROJECT_ID` not passed to Flutter (step 7.5) |
| Deposit confirms in wallet but game never starts | HTTP RPC polling too slow — add `BSC_WS_URL` to `.env` with a WebSocket endpoint, or retry with the public RPC (it usually works within 30 s) |
| "Not referee" revert on settlement | `REFEREE_PRIVATE_KEY` doesn't match `REFEREE_ADDRESS` used at deploy time |
| Two browser tabs can't find each other for PvP | Queues are per-connection. Open both tabs on the same machine, queue in both — they'll match within seconds |
| `flutter pub get` fails with network errors | Flutter may need a proxy. Try `FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn` for China, or use a VPN |
