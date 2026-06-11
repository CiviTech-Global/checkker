import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameServer } from "./GameServer";
import { initPlayerStoreDb } from "./PlayerStore";

const app = express();
app.use(cors());

// Initialize database if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  initPlayerStoreDb().catch((err) => {
    console.error("[DB] Failed to initialize database:", err);
  });

  // Daily puzzle rotation: elect today's puzzle at startup, then re-check
  // hourly so the puzzle rolls over at local midnight without a restart.
  const rotateDaily = async () => {
    try {
      const { PuzzleRepository } = await import("@checkker/database");
      const puzzle = await PuzzleRepository.ensureDaily();
      if (puzzle) console.log(`[puzzles] Daily puzzle ready: ${puzzle.id} (${puzzle.category})`);
    } catch (err) {
      console.error("[puzzles] Daily rotation failed:", err);
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
      if (created > 0) console.log(`[cosmetics] Seeded ${created} catalog items`);
    } catch (err) {
      console.error("[cosmetics] Catalog seed failed:", err);
    }
  })();
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const gameServer = new GameServer(io);

io.on("connection", (socket) => {
  gameServer.handleConnection(socket);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "checkker", version: 1 });
});

app.post("/admin/seed-puzzles", async (_req, res) => {
  try {
    const { seedPuzzlesIntoDb } = await import("./seed-puzzles");
    const created = await seedPuzzlesIntoDb();
    res.json({ success: true, created });
  } catch (err) {
    console.error("[admin] seed-puzzles failed:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

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
      console.warn(`[lan] Discovery beacon error: ${err.message}`);
      try { udp.close(); } catch { /* already closed */ }
    });
    udp.bind(LAN_DISCOVERY_PORT, () => {
      console.log(`[lan] Discovery beacon listening on udp/${LAN_DISCOVERY_PORT}`);
    });
    udp.unref();
  } catch (err) {
    console.warn("[lan] Discovery beacon unavailable:", err);
  }
})();

httpServer.listen(PORT, () => {
  const actualPort = (httpServer.address() as any)?.port ?? PORT;
  console.log(`__CHECKKER_PORT__=${actualPort}`);
  console.log(`Checkker server running on port ${actualPort}`);
  console.log(`[AIBrain] Set STOCKFISH_PATH to enable Stockfish engine`);
  console.log(`[AIBrain] Set AI_COACH_PROVIDER + AI_COACH_API_KEY to enable LLM Coach`);
  console.log(`[AIBrain] Set AI_BRAIN_PERSISTENCE=true to persist player models (dir: ${process.env.AI_BRAIN_STORAGE ?? "./data/player-models"})`);
  console.log(`[AIBrain] Set SMART_MATCHMAKING=true to enable playstyle-based pairing`);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await gameServer.dispose();
  httpServer.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await gameServer.dispose();
  httpServer.close();
  process.exit(0);
});
