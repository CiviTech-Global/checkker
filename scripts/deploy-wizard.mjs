#!/usr/bin/env node

/**
 * Checkker Local Deployment Wizard
 *
 * A cross-platform Node.js CLI that walks you through deploying the Checkker
 * server and web client for local / LAN testing. It asks for every required
 * value, explains where to get it, generates sensible defaults, runs the
 * database setup, builds the project, and optionally starts the server.
 *
 * Usage:
 *   node scripts/deploy-wizard.mjs
 *   npm run deploy:wizard
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline/promises";
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const OS = os.platform();
const IS_WINDOWS = OS === "win32";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function banner() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              Checkker Local Deployment Wizard                  ║
║                                                                ║
║  This script will set up the server + web client for testing   ║
║  on your laptop or home network.                               ║
╚════════════════════════════════════════════════════════════════╝
`);
}

async function prompt(question, defaultValue = "", help = "") {
  if (help) {
    console.log(`\n${help}`);
  }
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || defaultValue;
}

async function promptYesNo(question, defaultValue = true, help = "") {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";
  if (help) console.log(`\n${help}`);
  const answer = await rl.question(`${question}${suffix}: `);
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return normalized.startsWith("y");
}

function generateSecret() {
  return randomBytes(32).toString("hex");
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || ROOT;
    const env = { ...process.env, ...options.env };
    console.log(`\n▶ Running: ${cmd} ${args.join(" ")} (in ${cwd})`);
    // By default ignore stdin so child processes don't steal interactive input
    // that is intended for the wizard's prompts. Use stdio: "inherit" only when
    // the command truly needs stdin (e.g., sudo password entry).
    const stdio = options.inheritStdin ? "inherit" : ["ignore", "inherit", "inherit"];
    const child = spawn(cmd, args, { cwd, env, shell: IS_WINDOWS, stdio });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !options.ignoreError) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve(code);
      }
    });
  });
}

function checkCommand(cmd, args = ["--version"]) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: IS_WINDOWS, stdio: "pipe" });
    let out = "";
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.stderr?.on("data", (d) => (out += d.toString()));
    child.on("close", (code) => resolve(code === 0 ? out.trim() : null));
    child.on("error", () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseEnvFile(content) {
  const env = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function buildEnvContent(env) {
  const lines = [];
  for (const [key, value] of Object.entries(env)) {
    lines.push(`${key}=${value}`);
  }
  return lines.join("\n") + "\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// Prerequisite checks
// ─────────────────────────────────────────────────────────────────────────────

async function checkPrerequisites() {
  console.log("\n📋 Checking prerequisites...\n");

  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  if (major < 20) {
    console.error(`❌ Node.js 20+ is required. You have ${nodeVersion}.`);
    console.log("   Get it from: https://nodejs.org");
    process.exit(1);
  }
  console.log(`✅ Node.js ${nodeVersion}`);

  const npmVersion = await checkCommand("npm", ["--version"]);
  if (!npmVersion) {
    console.error("❌ npm is missing. Reinstall Node.js from https://nodejs.org");
    process.exit(1);
  }
  console.log(`✅ npm ${npmVersion}`);

  const gitVersion = await checkCommand("git", ["--version"]);
  if (!gitVersion) {
    console.log("⚠️  Git not found. You will need Git to pull updates.");
    console.log("   Get it from: https://git-scm.com/downloads");
  } else {
    console.log(`✅ ${gitVersion}`);
  }

  const psqlVersion = await checkCommand("psql", ["--version"]);
  if (!psqlVersion) {
    console.log("⚠️  psql (PostgreSQL client) not found in PATH.");
    console.log("   Install PostgreSQL: https://www.postgresql.org/download/");
    console.log("   On Linux/WSL: sudo apt install postgresql postgresql-contrib");
  } else {
    console.log(`✅ ${psqlVersion}`);
  }

  const flutterVersion = await checkCommand("flutter", ["--version"]);
  if (!flutterVersion) {
    console.log("⚠️  Flutter not found. Mobile APK builds will not be possible.");
    console.log("   Install Flutter: https://docs.flutter.dev/get-started/install");
  } else {
    console.log(`✅ Flutter installed (mobile builds available)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment wizard
// ─────────────────────────────────────────────────────────────────────────────

async function collectEnvironment() {
  console.log("\n🔐 Let's configure your environment variables.\n");

  const envPath = path.join(ROOT, ".env");
  let existing = {};
  if (existsSync(envPath)) {
    const reuse = await promptYesNo(
      "A .env file already exists. Do you want to keep existing values as defaults?",
      true,
      "If you choose Yes, the wizard will pre-fill prompts with your current values."
    );
    if (reuse) {
      existing = parseEnvFile(readFileSync(envPath, "utf8"));
    }
  }

  const env = { ...existing };

  // ── Database ──────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Database setup");
  console.log("─────────────────────────────────────────────────────────────");

  const hasDbUrl = await promptYesNo(
    "Do you already have a full PostgreSQL connection URL (DATABASE_URL)?",
    false,
    "Examples:\n" +
      "  - Local: postgresql://user:pass@localhost:5432/checkker\n" +
      "  - Cloud: postgresql://user:pass@db.provider.com:5432/checkker\n" +
      "If you don't have one, we'll build it from parts next."
  );

  if (hasDbUrl) {
    env.DATABASE_URL = await prompt(
      "DATABASE_URL",
      env.DATABASE_URL,
      "Paste your PostgreSQL connection URL. Ask your database admin or copy it from your cloud provider dashboard."
    );
  } else {
    const dbHost = await prompt("Database host", env.DB_HOST || "localhost", "Usually 'localhost' if PostgreSQL is on this machine.");
    const dbPort = await prompt("Database port", env.DB_PORT || "5432", "PostgreSQL default port is 5432.");
    const dbUser = await prompt("Database user", env.DB_USER || "checkker", "The PostgreSQL username you created (or 'postgres').");
    const dbPass = await prompt("Database password", env.DB_PASSWORD || "", "The password for that PostgreSQL user.");
    const dbName = await prompt("Database name", env.DB_NAME || "checkker", "The database name you created.");
    env.DATABASE_URL = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
  }

  env.NODE_ENV = "production";

  // ── Secrets ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Secrets");
  console.log("─────────────────────────────────────────────────────────────");

  const generateSecrets = await promptYesNo(
    "Generate secure random values for JWT_SECRET and ADMIN_API_KEY?",
    true,
    "These are used to sign session tokens and protect admin endpoints. Generating them is recommended."
  );

  if (generateSecrets) {
    env.JWT_SECRET = generateSecret();
    env.ADMIN_API_KEY = generateSecret();
    console.log("✅ Generated JWT_SECRET and ADMIN_API_KEY.");
  } else {
    env.JWT_SECRET = await prompt(
      "JWT_SECRET",
      env.JWT_SECRET,
      "A long random string used to sign player session tokens. Generate one with: openssl rand -hex 32"
    );
    env.ADMIN_API_KEY = await prompt(
      "ADMIN_API_KEY",
      env.ADMIN_API_KEY,
      "A long random string required to call /admin endpoints. Generate one with: openssl rand -hex 32"
    );
  }

  // ── Server ────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Server settings");
  console.log("─────────────────────────────────────────────────────────────");

  env.PORT = await prompt(
    "Server port",
    env.PORT || "3001",
    "The TCP port the server will listen on. Make sure your firewall allows this port."
  );

  const corsDefault = env.CORS_ORIGIN || "*";
  env.CORS_ORIGIN = await prompt(
    "CORS_ORIGIN",
    corsDefault,
    "Allowed web client origin.\n" +
      "  Use '*' for LAN/mobile testing.\n" +
      "  Set to your HTTPS domain for a public deployment."
  );

  env.WEB_DIST = await prompt(
    "Web client dist folder",
    env.WEB_DIST || "apps/mobile/dist",
    "Folder containing the exported web client. The default matches 'npm run export:web -w apps/mobile'."
  );

  // ── Optional blockchain / testnet play-money betting ──────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Blockchain / testnet play-money betting (optional)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(
    "You can play Checkker completely for free without this section.\n" +
      "If you enable it, ranked games will use the BSC testnet with fake tBNB tokens."
  );

  const enableBetting = await promptYesNo(
    "Enable testnet play-money betting?",
    false,
    "Requires deploying the CheckkerEscrow contract to BSC testnet. See docs/TESTNET_BETTING.md."
  );

  if (enableBetting) {
    env.BSC_RPC_URL = await prompt(
      "BSC_RPC_URL",
      env.BSC_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      "A BSC testnet JSON-RPC endpoint. Public seed nodes are free but can be slow; a WebSocket or dedicated provider (QuickNode/Ankr) is more reliable."
    );
    env.BSC_WS_URL = await prompt(
      "BSC_WS_URL (optional, leave blank to use HTTP polling)",
      env.BSC_WS_URL || "",
      "Optional WebSocket RPC for faster deposit event detection. Example: wss://bsc-testnet-rpc.publicnode.com"
    );
    env.BSC_CHAIN_ID = await prompt(
      "BSC_CHAIN_ID",
      env.BSC_CHAIN_ID || "97",
      "97 for BSC testnet. 56 for BSC mainnet (NOT recommended for testing)."
    );
    env.CHECKKER_CONTRACT_ADDRESS = await prompt(
      "CHECKKER_CONTRACT_ADDRESS",
      env.CHECKKER_CONTRACT_ADDRESS,
      "The deployed CheckkerEscrow contract address. Run 'npm run deploy:testnet' in packages/contracts to get one."
    );
    env.REFEREE_PRIVATE_KEY = await prompt(
      "REFEREE_PRIVATE_KEY",
      env.REFEREE_PRIVATE_KEY,
      "The private key of the testnet wallet that acts as the referee.\n" +
        "⚠️  NEVER use a mainnet private key here. Use a testnet-only wallet with play funds."
    );
    env.HOUSE_WALLET_ADDRESS = await prompt(
      "HOUSE_WALLET_ADDRESS",
      env.HOUSE_WALLET_ADDRESS || "",
      "Address that receives the house cut. For testing you can leave this blank or use the referee address."
    );
  } else {
    // Make sure no stale blockchain keys accidentally turn on betting.
    delete env.BSC_RPC_URL;
    delete env.BSC_WS_URL;
    delete env.BSC_CHAIN_ID;
    delete env.CHECKKER_CONTRACT_ADDRESS;
    delete env.REFEREE_PRIVATE_KEY;
    delete env.HOUSE_WALLET_ADDRESS;
  }

  // ── Optional AI / extras ──────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("Optional AI / bot features");
  console.log("─────────────────────────────────────────────────────────────");

  env.STOCKFISH_PATH = await prompt(
    "STOCKFISH_PATH (leave blank to skip)",
    env.STOCKFISH_PATH || "",
    "Path to the Stockfish UCI binary. Stronger bots use it. Download: https://stockfishchess.org/download/"
  );

  const enableCoach = await promptYesNo(
    "Enable AI coaching / move explanations with an LLM?",
    false,
    "Requires an OpenAI or Anthropic API key."
  );

  if (enableCoach) {
    env.AI_COACH_PROVIDER = await prompt(
      "AI_COACH_PROVIDER",
      env.AI_COACH_PROVIDER || "openai",
      "'openai' or 'anthropic'"
    );
    env.AI_COACH_API_KEY = await prompt(
      "AI_COACH_API_KEY",
      env.AI_COACH_API_KEY,
      "Your API key from OpenAI/Anthropic dashboard."
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  console.log("\n💾 Writing .env file...");
  writeFileSync(envPath, buildEnvContent(env));
  console.log(`✅ Saved to ${envPath}`);
  return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database setup
// ─────────────────────────────────────────────────────────────────────────────

async function setupDatabase(env) {
  console.log("\n🐘 Setting up database...");

  const pushIfNoMigrations = await promptYesNo(
    "If 'prisma migrate deploy' fails, try 'prisma db push' (safe for fresh local DBs)?",
    true
  );

  try {
    await run("npx", ["prisma", "migrate", "deploy", "--schema=packages/database/prisma/schema.prisma"]);
  } catch (err) {
    if (pushIfNoMigrations) {
      console.log("⚠️  migrate deploy failed, trying db push...");
      await run("npx", ["prisma", "db", "push", "--schema=packages/database/prisma/schema.prisma"]);
    } else {
      throw err;
    }
  }

  console.log("✅ Database schema ready.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Build phase
// ─────────────────────────────────────────────────────────────────────────────

async function installDependencies() {
  if (existsSync(path.join(ROOT, "node_modules"))) {
    const reinstall = await promptYesNo(
      "node_modules already exists. Run 'npm install' anyway to ensure dependencies are up to date?",
      false
    );
    if (!reinstall) return;
  }
  await run("npm", ["install"]);
}

async function buildProject() {
  console.log("\n🔨 Building server...");
  await run("npm", ["run", "build", "-w", "apps/server"]);

  console.log("\n🌐 Exporting web client...");
  await run("npm", ["run", "export:web", "-w", "apps/mobile"]);
}

async function seedPuzzles(env) {
  const seed = await promptYesNo(
    "Seed puzzles into the database now?",
    false,
    "Required if you want the Daily Puzzle feature to work."
  );
  if (!seed) return;

  const http = await import("http");
  const url = `http://localhost:${env.PORT}/admin/seed-puzzles`;
  const body = JSON.stringify({});

  const req = http.request(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Admin-Api-Key": env.ADMIN_API_KEY,
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log("✅ Puzzles seeded:", data);
        } else {
          console.error(`⚠️  Seeding returned ${res.statusCode}: ${data}`);
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("⚠️  Failed to seed puzzles:", err.message);
  });

  req.write(body);
  req.end();

  // Give the request a moment before moving on.
  await sleep(1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────

async function startServer(env) {
  const start = await promptYesNo(
    "Start the server now?",
    true
  );
  if (!start) {
    printSummary(env, false);
    return;
  }

  printSummary(env, true);
  console.log("\n🚀 Starting server... (Press Ctrl+C to stop)\n");
  await run("npm", ["run", "start", "-w", "apps/server"]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Networking helpers
// ─────────────────────────────────────────────────────────────────────────────

function getLocalIpCandidates() {
  const skip = /^(lo|docker|veth|br-|vmnet|virbr|tun|tap|ppp|usb|wlan0mon)/i;
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (skip.test(name)) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }
  return candidates;
}

async function selectLocalIp() {
  const candidates = getLocalIpCandidates();
  if (candidates.length === 0) {
    console.log("⚠️  Could not auto-detect a LAN IP. Using localhost.");
    return "localhost";
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    const use = await promptYesNo(
      `Detected LAN IP: ${only.address} (${only.name}). Use this for mobile/LAN access?`,
      true
    );
    return use ? only.address : "localhost";
  }

  console.log("\nMultiple network interfaces detected:");
  candidates.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.address} (${c.name})`);
  });
  const choice = await prompt(
    "Pick the IP to advertise (number, or 0 for localhost)",
    "1"
  );
  const idx = parseInt(choice, 10) - 1;
  if (idx >= 0 && idx < candidates.length) {
    return candidates[idx].address;
  }
  return "localhost";
}

async function checkTool(name) {
  const found = await checkCommand(name, ["--version"]);
  return !!found;
}

async function openFirewall(port, udpPort) {
  const open = await promptYesNo(
    `Open TCP port ${port}${udpPort ? ` and UDP port ${udpPort}` : ""} in the firewall so other devices can connect?`,
    true,
    "This usually requires administrator / sudo privileges."
  );
  if (!open) return;

  if (IS_WINDOWS) {
    try {
      await run("powershell.exe", [
        "-Command",
        `New-NetFirewallRule -DisplayName 'Checkker Server TCP ${port}' -Direction Inbound -LocalPort ${port} -Protocol TCP -Action Allow -ErrorAction Stop`,
      ]);
      if (udpPort) {
        await run("powershell.exe", [
          "-Command",
          `New-NetFirewallRule -DisplayName 'Checkker Server UDP ${udpPort}' -Direction Inbound -LocalPort ${udpPort} -Protocol UDP -Action Allow -ErrorAction Stop`,
        ]);
      }
      console.log("✅ Windows firewall rules added.");
    } catch (err) {
      console.log("⚠️  Could not open Windows firewall. Run PowerShell as Administrator and run:");
      console.log(`   New-NetFirewallRule -DisplayName 'Checkker Server' -Direction Inbound -LocalPort ${port} -Protocol TCP -Action Allow`);
    }
    return;
  }

  // Linux / macOS
  const hasUfw = await checkTool("ufw");
  const hasFirewallCmd = await checkTool("firewall-cmd");

  if (hasUfw) {
    try {
      await run("sudo", ["ufw", "allow", `${port}/tcp`], { inheritStdin: true });
      if (udpPort) await run("sudo", ["ufw", "allow", `${udpPort}/udp`], { inheritStdin: true });
      await run("sudo", ["ufw", "reload"], { inheritStdin: true });
      console.log("✅ ufw rules added.");
      return;
    } catch (err) {
      console.log("⚠️  ufw command failed. You may need to run it manually.");
    }
  }

  if (hasFirewallCmd) {
    try {
      await run("sudo", ["firewall-cmd", "--permanent", "--add-port", `${port}/tcp`], { inheritStdin: true });
      if (udpPort) await run("sudo", ["firewall-cmd", "--permanent", "--add-port", `${udpPort}/udp`], { inheritStdin: true });
      await run("sudo", ["firewall-cmd", "--reload"], { inheritStdin: true });
      console.log("✅ firewall-cmd rules added.");
      return;
    } catch (err) {
      console.log("⚠️  firewall-cmd command failed. You may need to run it manually.");
    }
  }

  console.log("⚠️  No supported firewall tool (ufw / firewall-cmd) found.");
  console.log(`   Manually open TCP ${port}${udpPort ? ` and UDP ${udpPort}` : ""}.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile build helpers
// ─────────────────────────────────────────────────────────────────────────────

async function buildFlutterApk() {
  const flutterInstalled = await checkCommand("flutter", ["--version"]);
  if (!flutterInstalled) {
    console.log("\n⚠️  Flutter is not installed; skipping Android APK build.");
    return false;
  }

  const build = await promptYesNo(
    "Build a Flutter Android APK for testing?",
    false,
    "This produces a release APK you can install on an Android phone."
  );
  if (!build) return false;

  const mobileDir = path.join(ROOT, "checkker_mobile");
  await run("flutter", ["pub", "get"], { cwd: mobileDir });
  try {
    await run("flutter", ["build", "apk", "--release"], { cwd: mobileDir });
    console.log("✅ APK built:");
    console.log(`   ${path.join(mobileDir, "build", "app", "outputs", "flutter-apk", "app-release.apk")}`);
    return true;
  } catch (err) {
    console.log("⚠️  APK build failed. Common fix: run 'flutter doctor' and resolve Android SDK issues.");
    return false;
  }
}

async function installFlutterApk() {
  const install = await promptYesNo(
    "Install the APK on a connected Android device?",
    false,
    "Requires USB debugging enabled on the phone and a connected cable."
  );
  if (!install) return;

  const mobileDir = path.join(ROOT, "checkker_mobile");
  try {
    await run("flutter", ["install"], { cwd: mobileDir });
    console.log("✅ APK installed.");
  } catch (err) {
    console.log("⚠️  flutter install failed. Make sure a device is connected and USB debugging is enabled.");
    console.log("   You can also copy the APK manually from checkker_mobile/build/app/outputs/flutter-apk/app-release.apk");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary & main
// ─────────────────────────────────────────────────────────────────────────────

function printSummary(env, selectedIp, apkBuilt) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      Deployment Summary                        ║
╠════════════════════════════════════════════════════════════════╣
  Mode:        ${env.NODE_ENV}
  Port:        ${env.PORT}
  Database:    ${env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}
  CORS:        ${env.CORS_ORIGIN}
  Web dist:    ${env.WEB_DIST}
  Betting:     ${env.CHECKKER_CONTRACT_ADDRESS ? "enabled (testnet)" : "disabled (free play)"}
  LAN IP:      ${selectedIp === "localhost" ? "not advertised" : selectedIp}
  APK built:   ${apkBuilt ? "yes" : "no"}
╚════════════════════════════════════════════════════════════════╝
`);

  console.log("Access the web client on this machine:");
  console.log(`  http://localhost:${env.PORT}`);

  if (selectedIp && selectedIp !== "localhost") {
    console.log("\nAccess from other devices on the same network:");
    console.log(`  http://${selectedIp}:${env.PORT}`);
    console.log("\nIn the mobile app, set the server URL to:");
    console.log(`  http://${selectedIp}:${env.PORT}`);
  }

  if (apkBuilt) {
    console.log("\nAndroid APK:");
    console.log(`  checkker_mobile/build/app/outputs/flutter-apk/app-release.apk`);
  }

  console.log("\nTo seed puzzles later, run (with the server running):");
  console.log(`  curl -X POST http://localhost:${env.PORT}/admin/seed-puzzles \\\n    -H "Content-Type: application/json" \\\n    -H "X-Admin-Api-Key: ${env.ADMIN_API_KEY}"`);
}

async function main() {
  banner();
  await checkPrerequisites();
  await installDependencies();
  const env = await collectEnvironment();
  await setupDatabase(env);
  await buildProject();

  const selectedIp = await selectLocalIp();
  await openFirewall(env.PORT, "47831");
  const apkBuilt = await buildFlutterApk();
  if (apkBuilt) await installFlutterApk();

  const start = await promptYesNo("Start the server now?", true);
  if (!start) {
    printSummary(env, selectedIp, apkBuilt);
    return;
  }

  printSummary(env, selectedIp, apkBuilt);
  console.log("\n🚀 Starting server... (Press Ctrl+C to stop)\n");
  await run("npm", ["run", "start", "-w", "apps/server"]);
}

main()
  .then(() => {
    rl.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Deployment wizard failed:\n", err.message || err);
    rl.close();
    process.exit(1);
  });
