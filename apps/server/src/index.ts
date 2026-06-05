import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameServer } from "./GameServer";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const gameServer = new GameServer(io);

io.on("connection", (socket) => {
  gameServer.handleConnection(socket);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
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
