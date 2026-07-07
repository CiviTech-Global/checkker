# Local Test Environment Deployment Guide

This guide walks you through deploying the Checkker server and one or more
clients on a single laptop for closed testing. It covers both **Linux** and
**Windows 11**, with practical recommendations for which machine to choose.

> **Short version:** If you want a one-command guided setup, run the
> **Deployment Wizard**:
>
> ```bash
> # Linux, macOS, or WSL
> ./scripts/deploy-wizard.sh
>
> # Windows native PowerShell
> .\scripts\deploy-wizard.ps1
>
> # Or from npm
> npm run deploy:wizard
> ```
>
> The wizard asks for every required value, explains where to get it, generates
> secrets, sets up the database, builds the server and web client, and starts
> the server. The rest of this document explains what the wizard does and how
> to do it manually or debug it.

---

## Using the Deployment Wizard

### On Linux

1. Open a terminal.
2. Clone the repo and enter it:

   ```bash
   git clone <your-repo-url> checkker
   cd checkker
   ```

3. Make sure the script is executable (Git should preserve this):

   ```bash
   chmod +x scripts/deploy-wizard.sh
   ```

4. Run it:

   ```bash
   ./scripts/deploy-wizard.sh
   ```

   Or with npm:

   ```bash
   npm run deploy:wizard
   ```

5. The wizard will ask for PostgreSQL details, generate secrets, and optionally
   open firewall ports. If you choose to open the firewall, `sudo` will prompt
   for your password.

6. If you choose to build the Flutter APK, make sure Flutter and the Android
   SDK are installed.

### On Windows 11

#### Option A: Native PowerShell (simplest if Flutter is already on Windows)

1. Open **PowerShell** (or Windows Terminal).
2. Clone the repo and enter it:

   ```powershell
   git clone <your-repo-url> checkker
   cd checkker
   ```

3. If PowerShell refuses to run scripts, allow local scripts once:

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. Run the wizard:

   ```powershell
   .\scripts\deploy-wizard.ps1
   ```

   Or with npm:

   ```powershell
   npm run deploy:wizard
   ```

4. If the wizard asks to open the firewall, **run PowerShell as Administrator**
   when prompted, or run the wizard as Administrator from the start. Without
   admin rights, the firewall rule will fail and you'll need to open port
   `3001` (and UDP `47831` for LAN discovery) manually.

#### Option B: WSL2 (recommended for server parity with Linux)

1. Install WSL2 + Ubuntu if you haven't:

   ```powershell
   wsl --install -d Ubuntu
   ```

2. Open the WSL Ubuntu terminal and install dependencies:

   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-contrib git curl build-essential
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. Follow the **Linux instructions** above inside WSL2.

4. **Important WSL2 networking note:** from other devices, use the **Windows
   host IP**, not the WSL internal IP. The wizard will show you the correct IP.
   If LAN devices cannot connect, run PowerShell as Administrator and add a
   firewall rule for WSL:

   ```powershell
   New-NetFirewallRule -DisplayName "WSL2 Checkker" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```

### What the Wizard Asks For

| Prompt | What It Means | Where to Get the Value |
|---|---|---|
| `DATABASE_URL` or DB parts | PostgreSQL connection string | Your local PostgreSQL install or cloud provider dashboard. |
| `JWT_SECRET` | Signs player session tokens | Auto-generated; or use `openssl rand -hex 32`. |
| `ADMIN_API_KEY` | Protects admin endpoints | Auto-generated; or use `openssl rand -hex 32`. |
| `PORT` | TCP port for the server | Default `3001`. |
| `CORS_ORIGIN` | Allowed web client origin | `*` for LAN testing; your HTTPS domain for public. |
| `WEB_DIST` | Exported web client folder | Default `apps/mobile/dist`. |
| Testnet betting vars | Optional blockchain flow | A testnet RPC node and deployed contract address. |

### After the Wizard Finishes

- The server will be running on `http://localhost:3001`.
- The wizard prints the **LAN IP** you can use from phones and other computers.
- If you built the APK, it is at:
  `checkker_mobile/build/app/outputs/flutter-apk/app-release.apk`.

---

## 1. Which Laptop Should I Use?

| Requirement | Linux Laptop | Windows 11 Laptop |
|---|---|---|
| **Best for server** | ✅ Preferred. Native Node.js/PostgreSQL stack, simpler networking, lighter overhead. | ⚠️ Works fine with WSL2 or native PowerShell. |
| **Best for Android builds** | ✅ Yes — Flutter Android SDK works natively. | ✅ Yes — Flutter Android SDK works natively. |
| **Best for iOS builds** | ❌ No — Xcode only runs on macOS. | ❌ No — Xcode only runs on macOS. |
| **Best for Windows desktop builds** | ⚠️ Possible with cross-compile, but awkward. | ✅ Native. |
| **Easiest networking** | ✅ Yes — firewall/ports are straightforward. | ⚠️ Requires Windows Defender Firewall rules; WSL adds a NAT layer. |

### Recommendation

- Use the **Linux laptop as the deployment/development machine** if you mainly
  want to test Android + web + server quickly.
- Use the **Windows 11 laptop** if you also want to build/test the Electron
  desktop client or if your Android tooling is already set up there.
- Either way, you can deploy the server on one machine and connect phones,
  tablets, or the other laptop over the **same Wi-Fi / LAN**.

---

## 2. Shared Prerequisites

### 2.1 Required Accounts / Keys (for a real test)

| Item | Why You Need It | How to Get It |
|---|---|---|
| PostgreSQL database | Player profiles, ratings, game history | Install locally or use a free cloud DB (Railway, Supabase, Neon). |
| JWT secret | Sign session tokens | Generate a random 64-character string. |
| Admin API key | Protect `/admin/seed-puzzles` | Generate a random 64-character string. |
| Wallet/private key (testnet only) | Crypto escrow referee | Create a fresh BSC testnet wallet; do **not** reuse mainnet keys. |

### 2.2 Software to Install

Install on the machine that will run the server and/or builds:

- **Node.js 20+** and **npm 11+** — [nodejs.org](https://nodejs.org)
- **Git**
- **PostgreSQL 15+**
- (Optional) **Stockfish** UCI binary for stronger bots
- (For Flutter) **Flutter 3.27+**, **Android SDK**, **Android Studio**
- (For web build) **Chrome** or any browser to sanity-check `localhost:3001`

Verify versions:

```bash
node -v    # v20.x or higher
npm -v     # 11.x or higher
psql -V    # PostgreSQL 15+
```

---

## 3. Windows 11 Setup (Native or WSL2)

### Option A: WSL2 (Recommended for Server)

WSL2 gives you a Linux environment on Windows with better networking and
PostgreSQL support.

1. Install WSL2 + Ubuntu:

   ```powershell
   wsl --install -d Ubuntu
   ```

2. Open the Ubuntu terminal and install dependencies:

   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y postgresql postgresql-contrib redis-tools curl git build-essential
   ```

3. Install Node.js 20:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. From this point on, follow the **Linux instructions below** inside WSL2.

### Option B: Native Windows

1. Install Node.js via the official installer.
2. Install PostgreSQL via the [EnterpriseDB installer](https://www.postgresql.org/download/windows/).
3. Make sure `psql`, `createdb`, and `pg_ctl` are in your PATH.
4. All commands in this guide should be run in **PowerShell**.

### Windows Firewall

You must open the server port so phones/tablets can connect:

```powershell
New-NetFirewallRule -DisplayName "Checkker Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

If using WSL2, also allow WSL to accept connections:

```powershell
New-NetFirewallRule -DisplayName "WSL2 Inbound" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

## 4. Linux Setup

### 4.1 Install System Dependencies

Ubuntu/Debian:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential postgresql postgresql-contrib
```

Fedora:

```bash
sudo dnf update -y
sudo dnf install -y git curl gcc-c++ postgresql-server postgresql-contrib
```

Arch:

```bash
sudo pacman -Syu
sudo pacman -S git curl base-devel postgresql
```

### 4.2 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4.3 Start PostgreSQL

Ubuntu/Debian:

```bash
sudo systemctl enable --now postgresql
```

Fedora:

```bash
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

### 4.4 Firewall

Open TCP 3001 (and UDP 47831 if you want LAN discovery):

```bash
sudo ufw allow 3001/tcp
sudo ufw allow 47831/udp
sudo ufw reload
```

Or with `firewalld`:

```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=47831/udp
sudo firewall-cmd --reload
```

---

## 5. Project Setup

### 5.1 Clone the Repository

```bash
git clone <your-repo-url> checkker
cd checkker
```

### 5.2 Install Dependencies

```bash
npm install
```

### 5.3 Set Up the Database

Create a PostgreSQL user and database:

```bash
sudo -u postgres psql -c "CREATE USER checkker WITH PASSWORD 'choose_a_password';"
sudo -u postgres psql -c "CREATE DATABASE checkker OWNER checkker;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE checkker TO checkker;"
```

### 5.4 Create `.env`

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://checkker:choose_a_password@localhost:5432/checkker
JWT_SECRET=<paste_64_random_chars>
ADMIN_API_KEY=<paste_64_random_chars>
CORS_ORIGIN=*
WEB_DIST=apps/mobile/dist
```

> For a LAN test, `CORS_ORIGIN=*` is fine. For a public test, set it to your
> domain.

Generate random secrets quickly:

```bash
openssl rand -hex 32
```

Run twice and paste the outputs into `JWT_SECRET` and `ADMIN_API_KEY`.

### 5.5 Apply Database Schema

Checkker uses Prisma. Push the schema to the database:

```bash
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

If no migrations exist yet, use:

```bash
npx prisma db push --schema=packages/database/prisma/schema.prisma
```

Then generate the Prisma client:

```bash
npm run typecheck -w packages/database
```

---

## 6. Build the Server

```bash
npm run build -w apps/server
```

This compiles TypeScript to `apps/server/dist/`.

---

## 7. Build and Serve the Web Client

The web client is the React Native/Expo web export in `apps/mobile`.

```bash
npm run export:web -w apps/mobile
```

This creates `apps/mobile/dist/`. The server will automatically serve it because
`WEB_DIST=apps/mobile/dist` is set.

---

## 8. Start the Server

### 8.1 Production Mode

```bash
npm run start -w apps/server
```

Or directly:

```bash
node apps/server/dist/index.js
```

You should see output similar to:

```
__CHECKKER_PORT__=3001
Checkker server running
[web] Serving web client
```

### 8.2 Verify Health

Open a browser or use curl:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","service":"checkker","version":1}
```

Open the web client:

```bash
http://localhost:3001
```

---

## 9. Seed Puzzles (Optional)

If you want daily puzzles to work, seed them once:

```bash
curl -X POST http://localhost:3001/admin/seed-puzzles \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: $ADMIN_API_KEY"
```

> Replace `$ADMIN_API_KEY` with the value from your `.env` file, or run it from
> the same shell where the env var is loaded.

---

## 10. Connect from Other Devices on Your LAN

### 10.1 Find Your Laptop's Local IP

Linux/WSL:

```bash
ip addr show | grep "inet " | head -5
```

Windows native PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias
```

Look for an address like `192.168.1.42` or `10.0.0.15`.

### 10.2 Test from a Phone or Another Computer

Open a browser on another device connected to the same Wi-Fi and visit:

```
http://192.168.1.42:3001
```

If the page loads, everything is working.

### 10.3 Connect the Mobile App

When the mobile app asks for a server URL, enter:

```
http://192.168.1.42:3001
```

For LAN discovery, the server broadcasts on UDP port `47831`. If your router
blocks multicast, enter the IP manually.

---

## 11. Build a Mobile Test APK (Android)

### 11.1 Install Flutter Prerequisites

Make sure `flutter` is installed and `flutter doctor` is green for Android.

```bash
flutter doctor
```

### 11.2 Build the Flutter APK

```bash
cd checkker_mobile
flutter pub get
flutter build apk --release
```

The APK will be at:

```
checkker_mobile/build/app/outputs/flutter-apk/app-release.apk
```

### 11.3 Install on an Android Phone

Connect your phone via USB with USB debugging enabled:

```bash
flutter install
```

Or copy the APK manually and install it.

### 11.4 Configure the App to Talk to Your Server

In the Flutter app settings, enter your laptop's local IP:

```
http://192.168.1.42:3001
```

---

## 12. Windows Desktop Test Build

If you are using the Windows 11 machine, build the Electron desktop client:

```bash
cd apps/desktop
npm install
npm run dist
```

The installer will be in `apps/desktop/dist/`.

---

## 13. Testnet Play-Money Betting (Optional)

You can play Checkker completely for free without this section. Ranked and casual
free games work as soon as the server is running.

If you want to test the blockchain escrow flow with fake tBNB tokens, first read
`docs/WALLET_SETUP_GUIDE.md` to create wallets and fund them from a faucet.

Then deploy the `CheckkerEscrow` contract on BSC testnet:

   ```bash
   cd packages/contracts
   export DEPLOYER_PRIVATE_KEY=0x<deployer-private-key>
   npm run compile
   npm run deploy:testnet
   ```

   Copy the printed contract address.

2. Fund the referee wallet with tBNB from a faucet.
3. Set the following in `.env`:

   ```bash
   BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
   BSC_CHAIN_ID=97
   CHECKKER_CONTRACT_ADDRESS=0x<contract-address-from-step-1>
   REFEREE_PRIVATE_KEY=0x<referee-private-key>
   HOUSE_WALLET_ADDRESS=0x<house-wallet-address>
   ```

4. Restart the server.

> **Never use a mainnet private key for testing.** All of this uses BSC testnet
> play-value tokens only.

---

## 14. Making It Available from the Internet (Advanced)

If you want friends outside your LAN to test:

1. **Port forwarding** on your router: forward external TCP `3001` to your
   laptop's local IP and port `3001`.
2. **Dynamic DNS** if your public IP changes (e.g., Duck DNS, Cloudflare).
3. **HTTPS** is strongly recommended. Use a reverse proxy like Caddy or Nginx:

   ```bash
   sudo apt install caddy
   ```

   `Caddyfile`:

   ```
   checkker.yourdomain.com {
     reverse_proxy localhost:3001
   }
   ```

   ```bash
   sudo caddy run
   ```

4. Update `CORS_ORIGIN` in `.env` to your HTTPS domain and restart the server.

> ⚠️ Exposing a server to the internet carries security risks. Make sure
> `ADMIN_API_KEY` and `JWT_SECRET` are strong, PostgreSQL is not exposed, and
> the server OS/firewall is up to date.

---

## 15. Updating After Code Changes

When you pull new code:

```bash
git pull
npm install
npm run build -w apps/server
npm run export:web -w apps/mobile
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
npm run start -w apps/server
```

---

## 16. Common Issues

### Port 3001 already in use

```bash
# Linux
sudo lsof -i :3001
kill <PID>

# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

### Cannot connect from another device

1. Check the Windows/Linux firewall.
2. Make sure both devices are on the same network.
3. Try disabling the firewall temporarily to confirm it is the cause.
4. If using WSL2, use the WSL IP, not `localhost`.

### Prisma migration fails

1. Ensure PostgreSQL is running.
2. Verify `DATABASE_URL` is correct.
3. Try `npx prisma db push` for a fresh local database.

### Flutter build fails on Windows

1. Run `flutter doctor` and fix any missing Android SDK/NDK issues.
2. Disable icon tree-shaking if it causes problems:

   ```bash
   flutter build apk --release --no-tree-shake-icons
   ```

### EADDRINUSE when running tests

Kill leftover Node processes:

```bash
# Linux
pkill -f node

# Windows PowerShell
Get-Process node | Stop-Process -Force
```

---

## 17. Quick Reference: One-Command Startup

After the initial setup, the daily workflow is:

```bash
# 1. Start PostgreSQL if not running
sudo systemctl start postgresql

# 2. Start the server
cd checkker
npm run start -w apps/server

# 3. Open http://<your-laptop-ip>:3001 on any device
```

---

## 18. Next Steps After Local Deploy

1. **Invite testers** by sharing `http://<your-laptop-ip>:3001` or installing
   the APK.
2. **Collect logs** from `apps/server/dist/` or the terminal output.
3. **File issues** for any crashes, desyncs, or UX problems.
4. **When ready for public beta**, move the server to a cloud VPS (AWS, Hetzner,
   DigitalOcean, etc.) and point a domain at it.
