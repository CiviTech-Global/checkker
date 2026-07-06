import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GameServer } from "./GameServer";
import { initPlayerStoreDb } from "./PlayerStore";
import { initMonitoring } from "./monitoring";
import { parseArgs } from "./cli-args";
import { logger } from "./logger";

const cli = parseArgs();
const PORT = cli.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

initMonitoring();

const app = express();

// Trust the first proxy when running behind a load balancer / reverse proxy.
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false, // web export supplies its own CSP via meta tags
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Request timing + structured access log middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      "http request"
    );
  });
  next();
});

// Initialize database if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  initPlayerStoreDb().catch((err) => {
    logger.error({ err }, "[DB] Failed to initialize database");
  });

  // Daily puzzle rotation: elect today's puzzle at startup, then re-check
  // hourly so the puzzle rolls over at local midnight without a restart.
  const rotateDaily = async () => {
    try {
      const { PuzzleRepository } = await import("@checkker/database");
      const puzzle = await PuzzleRepository.ensureDaily();
      if (puzzle) logger.info({ puzzleId: puzzle.id, category: puzzle.category }, "[puzzles] Daily puzzle ready");
    } catch (err) {
      logger.error({ err }, "[puzzles] Daily rotation failed");
    }
  };
  rotateDaily();
  setInterval(rotateDaily, 60 * 60 * 1000).unref();

  // Seed the cosmetics catalog (idempotent — only inserts missing keys).
  (async () => {
    try {
      const { CosmeticRepository } = await import("@checkker/database");
      const { COSMETICS_CATALOG } = await import("@checkker/shared");
      const created = await CosmeticRepository.seedCatalog(
        COSMETICS_CATALOG.map((c) => ({
          type: c.type,
          name: c.name,
          description: c.description,
          price: c.price,
          rarity: c.rarity,
          assetUrl: c.key,
          isDefault: c.isDefault,
        }))
      );
      if (created > 0) logger.info({ created }, "[cosmetics] Seeded catalog items");
    } catch (err) {
      logger.error({ err }, "[cosmetics] Catalog seed failed");
    }
  })();
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

const gameServer = new GameServer(io);

io.on("connection", (socket) => {
  gameServer.handleConnection(socket);
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ status: "error", message: "Too many requests" });
  },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ status: "error", message: "Too many admin requests" });
  },
});

app.use(generalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "checkker", version: 1 });
});

app.use("/admin", adminLimiter, (req, res, next) => {
  if (!ADMIN_API_KEY) {
    // In development without an admin key, restrict admin routes to loopback.
    const ip = req.ip ?? "unknown";
    if (ip === "127.0.0.1" || ip === "::1" || ip === "unknown") {
      return next();
    }
    return res.status(403).json({ status: "error", message: "Admin API key not configured" });
  }
  const key = req.headers["x-admin-api-key"];
  if (key !== ADMIN_API_KEY) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  next();
});

app.post("/admin/seed-puzzles", async (_req, res) => {
  try {
    const { seedPuzzlesIntoDb } = await import("./seed-puzzles");
    const created = await seedPuzzlesIntoDb();
    res.json({ success: true, created });
  } catch (err) {
    logger.error({ err }, "[admin] seed-puzzles failed");
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Serve the exported web client when available, so the full game is playable
// from any machine on the network at http://<host-ip>:<port>. Looks for the
// Expo web export at WEB_DIST env, --web-dist CLI arg, or relative paths.
const webDist = resolveWebDist(cli.webDist);
if (webDist) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  app.use(express.static(webDist));
  // SPA fallback for client-side routes (skip API + socket paths).
  app.get(/^\/(?!socket\.io|health|admin).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
  logger.info({ webDist }, "[web] Serving web client");
}

function resolveWebDist(cliPath?: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  const candidates = [
    cliPath,
    process.env.WEB_DIST,
    path.join(require.main?.path ?? __dirname, "web"),
    path.join(__dirname, "web"),
    path.join(process.cwd(), "web"),
    path.join(__dirname, "../../mobile/dist"),
    path.join(process.cwd(), "../mobile/dist"),
  ].filter((p): p is string => !!p);
  return candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) ?? null;
}

// LAN discovery beacon: answer UDP broadcasts so mobile clients on the same
// network can find this server without typing an IP (poor man's mDNS).
const LAN_DISCOVERY_PORT = 47831;
const LAN_DISCOVERY_PROBE = "CHECKKER_DISCOVER";
(async () => {
  try {
    const dgram = await import("dgram");
    const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    udp.on("message", (msg, rinfo) => {
      if (msg.toString().trim() !== LAN_DISCOVERY_PROBE) return;
      const actualPort = (httpServer.address() as any)?.port ?? PORT;
      const reply = Buffer.from(JSON.stringify({ service: "checkker", port: actualPort }));
      udp.send(reply, rinfo.port, rinfo.address);
    });
    udp.on("error", (err) => {
      logger.warn({ err: err.message }, "[lan] Discovery beacon error");
      try { udp.close(); } catch { /* already closed */ }
    });
    udp.bind(LAN_DISCOVERY_PORT, () => {
      logger.info({ port: LAN_DISCOVERY_PORT }, "[lan] Discovery beacon listening");
    });
    udp.unref();
  } catch (err) {
    logger.warn({ err }, "[lan] Discovery beacon unavailable");
  }
})();

httpServer.listen(PORT, () => {
  const actualPort = (httpServer.address() as any)?.port ?? PORT;
  // eslint-disable-next-line no-console
  console.log(`__CHECKKER_PORT__=${actualPort}`);
  logger.info({ port: actualPort }, "Checkker server running");
  logger.info("[AIBrain] Set STOCKFISH_PATH to enable Stockfish engine");
  logger.info("[AIBrain] Set AI_COACH_PROVIDER + AI_COACH_API_KEY to enable LLM Coach");
  logger.info(`[AIBrain] Set AI_BRAIN_PERSISTENCE=true to persist player models (dir: ${process.env.AI_BRAIN_STORAGE ?? "./data/player-models"})`);
  logger.info("[AIBrain] Set SMART_MATCHMAKING=true to enable playstyle-based pairing");
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await gameServer.dispose();
  httpServer.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await gameServer.dispose();
  httpServer.close();
  process.exit(0);
});
