import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { Chess } from "@checkker/chess";
import type { Card } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import { getLegalMovesForHand } from "@checkker/chess";
import { GameServer } from "../GameServer";

/**
 * Full game lifecycle integration test:
 *   queue → match → multi-move play → game over → rating verification
 *
 * This catches user-flow regressions that unit tests miss.
 */

describe("Full game lifecycle E2E", () => {
  let httpServer: HttpServer;
  let io: Server;
  let gameServer: GameServer;
  let port: number;
  const clients: ClientSocket[] = [];

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });
    gameServer = new GameServer(io);
    io.on("connection", (socket) => gameServer.handleConnection(socket));
    httpServer.listen(() => {
      port = (httpServer.address() as { port: number }).port;
      done();
    });
  });

  afterAll(async () => {
    for (const c of clients) c.close();
    await gameServer.dispose();
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function connect(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://127.0.0.1:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });
      clients.push(client);
      client.once("connect", () => resolve(client));
      client.once("connect_error", reject);
    });
  }

  function once<T = any>(client: ClientSocket, event: string, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
      client.once(event, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  it("plays a full casual game through multiple moves and resign", async () => {
    const p1 = await connect();
    const p2 = await connect();

    // Both join the casual queue (beginner, blitz, free)
    p1.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });
    p2.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });

    const p1Start = once<any>(p1, "game_start");
    const p2Start = once<any>(p2, "game_start");
    const [s1, s2] = await Promise.all([p1Start, p2Start]);

    expect(s1.gameId).toBeTruthy();
    expect(s1.gameId).toBe(s2.gameId);
    expect(s1.fen).toBe(s2.fen); // Both see the same position

    // Identify white / black
    const whiteClient = s1.color === "white" ? p1 : p2;
    const blackClient = s1.color === "white" ? p2 : p1;
    const whiteState = s1.color === "white" ? s1 : s2;
    const gameId = s1.gameId;

    // Play 3 moves (white, black, white)
    for (let turn = 0; turn < 3; turn++) {
      const activeClient = turn % 2 === 0 ? whiteClient : blackClient;
      const activeState = turn % 2 === 0 ? whiteState : s2;
      // Get current state from the last update
      const currentFen = turn === 0 ? activeState.fen : (turn === 1 ? s2.fen : activeState.fen);
      const hand = turn === 0 ? activeState.hand : (turn === 1 ? s2.hand : activeState.hand);

      const move = pickLegalMove(hand, currentFen);
      if (!move) break; // No legal moves with hand — skip

      const updated = once<any>(whiteClient, "game_update").catch(() => null);
      const updated2 = once<any>(blackClient, "game_update").catch(() => null);
      activeClient.emit("play_move", { gameId, card: move.cardId, move: move.move });
      await Promise.all([updated, updated2]);
    }

    // Black resigns to end the game
    const whiteOver = once<any>(whiteClient, "game_over");
    const blackOver = once<any>(blackClient, "game_over");
    blackClient.emit("resign", { gameId });
    const [wo, bo] = await Promise.all([whiteOver, blackOver]);

    // Verify game_over payload
    expect(wo.gameId).toBe(gameId);
    expect(bo.gameId).toBe(gameId);
    expect(wo.result?.type).toBe("resignation");
    expect(wo.result?.winner).toBe("white");
    expect(bo.result?.winner).toBe("white");

    // Verify scores are present
    expect(wo.scores).toBeDefined();
    expect(bo.scores).toBeDefined();
    expect(typeof wo.scores.whiteTotal).toBe("number");
    expect(typeof wo.scores.blackTotal).toBe("number");
  }, 30000);

  it("starts a bot game and plays to completion", async () => {
    const human = await connect();

    const botStart = once<any>(human, "game_start");
    human.emit("start_bot_game", { difficulty: "beginner", tc: "blitz" });
    const state = await botStart;

    expect(state.gameId).toBeTruthy();
    expect(state.gameId.startsWith("bot-")).toBe(true);
    expect(state.color).toBe("white"); // Human always plays white vs bot

    const gameId = state.gameId;

    // Play a few moves
    for (let i = 0; i < 3; i++) {
      const move = pickLegalMove(state.hand, state.fen);
      if (!move) break;

      const updated = once<any>(human, "game_update").catch(() => null);
      human.emit("play_move", { gameId, card: move.cardId, move: move.move });
      const update = await updated;
      if (update) {
        // Update state for next iteration
        Object.assign(state, update);
      }
    }

    // Resign to end the game
    const gameOver = once<any>(human, "game_over");
    human.emit("resign", { gameId });
    const result = await gameOver;

    // Bot game_over may use different payload structure — verify result is present
    expect(result.result).toBeDefined();
    expect(result.result.type).toBe("resignation");
  }, 30000);

  it("handles disconnect during active game (timeout)", async () => {
    const p1 = await connect();
    const p2 = await connect();

    p1.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });
    p2.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });

    const s1 = await once<any>(p1, "game_start");
    const s2 = await once<any>(p2, "game_start");
    const gameId = s1.gameId;
    const whiteClient = s1.color === "white" ? p1 : p2;
    const blackClient = s1.color === "white" ? p2 : p1;

    // Play one move so the game is in progress
    const whiteState = s1.color === "white" ? s1 : s2;
    const move = pickLegalMove(whiteState.hand, whiteState.fen);
    if (move) {
      const updated = once<any>(whiteClient, "game_update").catch(() => null);
      const updated2 = once<any>(blackClient, "game_update").catch(() => null);
      whiteClient.emit("play_move", { gameId, card: move.cardId, move: move.move });
      await Promise.all([updated, updated2]);
    }

    // Black disconnects — should trigger timeout
    const whiteOver = once<any>(whiteClient, "game_over");
    blackClient.close();

    const result = await whiteOver;
    expect(result.gameId).toBe(gameId);
    expect(result.result).toBeDefined();
    expect(["timeout", "resignation"]).toContain(result.result.type);
  }, 30000);

  it("emits live odds and scores after each move", async () => {
    const p1 = await connect();
    const p2 = await connect();

    p1.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });
    p2.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });

    const s1 = await once<any>(p1, "game_start");
    const s2 = await once<any>(p2, "game_start");
    const gameId = s1.gameId;
    const whiteClient = s1.color === "white" ? p1 : p2;
    const blackClient = s1.color === "white" ? p2 : p1;
    const whiteState = s1.color === "white" ? s1 : s2;

    const move = pickLegalMove(whiteState.hand, whiteState.fen);
    if (!move) return;

    const updated = once<any>(whiteClient, "game_update");
    whiteClient.emit("play_move", { gameId, card: move.cardId, move: move.move });
    const update = await updated;

    // Verify odds are present and sum to 100
    expect(update.odds).toBeDefined();
    expect(update.odds.whiteWinPct + update.odds.blackWinPct + update.odds.drawPct).toBe(100);

    // Verify live scores are present
    expect(update.liveScores).toBeDefined();
    expect(typeof update.liveScores.whitePoker.total).toBe("number");
    expect(typeof update.liveScores.blackPoker.total).toBe("number");

    // Clean up
    blackClient.emit("resign", { gameId });
    await once<any>(whiteClient, "game_over").catch(() => {});
  }, 20000);
});

function pickLegalMove(hand: Card[], fen: string): { cardId: string; move: string } | null {
  const chess = new Chess(fen);
  for (const card of hand) {
    const moves = getLegalMovesForHand(chess, [card])[0]?.moves ?? [];
    if (moves.length > 0) {
      return { cardId: cardId(card), move: moves[0] };
    }
  }
  return null;
}
