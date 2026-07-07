import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { Chess } from "@checkker/chess";
import type { Card } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import { getLegalMovesForHand } from "@checkker/chess";
import { GameServer } from "../GameServer";

/**
 * In-process socket integration tests: a real Socket.IO server running the
 * GameServer, exercised by real socket.io-client connections.
 */

describe("GameServer socket integration", () => {
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

  function once<T = any>(client: ClientSocket, event: string): Promise<T> {
    return new Promise((resolve) => client.once(event, resolve));
  }

  it("hosts a LAN game and returns a 4-digit code", async () => {
    const host = await connect();
    const hosted = once<{ code: string; tc: string }>(host, "lan_game_hosted");
    host.emit("host_lan_game", { tc: "blitz" });
    const payload = await hosted;
    expect(payload.code).toMatch(/^\d{4}$/);
    expect(payload.tc).toBe("blitz");
    host.emit("cancel_lan_host");
  }, 10000);

  it("rejects joining with an unknown LAN code", async () => {
    const guest = await connect();
    const result = once<{ success: boolean; error?: string }>(guest, "lan_join_result");
    guest.emit("join_lan_game", { code: "0000" });
    const payload = await result;
    expect(payload.success).toBe(false);
    expect(payload.error).toBeTruthy();
  }, 10000);

  it("completes the LAN host/join handshake and starts a game for both players", async () => {
    const host = await connect();
    const guest = await connect();

    const hosted = once<{ code: string }>(host, "lan_game_hosted");
    host.emit("host_lan_game", { tc: "blitz" });
    const { code } = await hosted;

    const hostStart = once<any>(host, "game_start");
    const guestStart = once<any>(guest, "game_start");
    const joinResult = once<{ success: boolean }>(guest, "lan_join_result");
    guest.emit("join_lan_game", { code });

    expect((await joinResult).success).toBe(true);
    const [hostGame, guestGame] = await Promise.all([hostStart, guestStart]);

    expect(hostGame.gameId).toBeTruthy();
    expect(hostGame.gameId).toBe(guestGame.gameId);
    // One side plays white, the other black.
    expect([hostGame.color, guestGame.color].sort()).toEqual(["black", "white"]);

    // Probable-result odds are present and well-formed (sum to 100).
    expect(hostGame.odds.whiteWinPct + hostGame.odds.blackWinPct + hostGame.odds.drawPct).toBe(100);
    // Live poker scores ship with the initial state (both empty at the start).
    expect(hostGame.liveScores).toEqual({ whitePoker: 0, blackPoker: 0 });
  }, 20000);

  it("drops the host code when the host disconnects", async () => {
    const host = await connect();
    const guest = await connect();

    const hosted = once<{ code: string }>(host, "lan_game_hosted");
    host.emit("host_lan_game", {});
    const { code } = await hosted;

    host.close();
    // Give the server a moment to process the disconnect.
    await new Promise((r) => setTimeout(r, 300));

    const result = once<{ success: boolean }>(guest, "lan_join_result");
    guest.emit("join_lan_game", { code });
    expect((await result).success).toBe(false);
  }, 10000);

  it("matches two players in casual queue, plays a move, and emits game_over on resign", async () => {
    const p1 = await connect();
    const p2 = await connect();

    // Both join the free beginner casual queue.
    p1.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });
    p2.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });

    const p1Start = once<any>(p1, "game_start");
    const p2Start = once<any>(p2, "game_start");
    const [s1, s2] = await Promise.all([p1Start, p2Start]);

    expect(s1.gameId).toBeTruthy();
    expect(s1.gameId).toBe(s2.gameId);

    // Identify who is white / black.
    const whiteClient = s1.color === "white" ? p1 : p2;
    const blackClient = s1.color === "white" ? p2 : p1;
    const whiteState = s1.color === "white" ? s1 : s2;
    const gameId = s1.gameId;

    // White plays one legal move.
    const move = pickLegalMove(whiteState.hand, whiteState.fen);
    expect(move).toBeTruthy();

    const whiteUpdated = once<any>(whiteClient, "game_update");
    const blackUpdated = once<any>(blackClient, "game_update");
    whiteClient.emit("play_move", { gameId, card: move!.cardId, move: move!.move });
    await Promise.all([whiteUpdated, blackUpdated]);

    // Black resigns to end the game deterministically.
    const whiteOver = once<any>(whiteClient, "game_over");
    const blackOver = once<any>(blackClient, "game_over");
    blackClient.emit("resign", { gameId });
    const [wo, bo] = await Promise.all([whiteOver, blackOver]);

    expect(wo.gameId).toBe(gameId);
    expect(bo.gameId).toBe(gameId);
    expect(wo.result?.type).toBe("resignation");
    expect(bo.result?.type).toBe("resignation");
  }, 20000);

  it("emits server_features with bettingEnabled on connect", async () => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(client);

    const features = once<{ bettingEnabled: boolean }>(client, "server_features");
    const connected = new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });
    await connected;

    const payload = await features;
    expect(typeof payload.bettingEnabled).toBe("boolean");
  }, 10000);

  it("does not match players with different stakes in the same tier", async () => {
    const p1 = await connect();
    const p2 = await connect();

    p1.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "free" });
    p2.emit("join_casual_difficulty", { difficulty: "beginner", tc: "blitz", stake: "bet" });

    // Neither should receive game_start within a short window.
    const p1Start = once<any>(p1, "game_start").then(() => true).catch(() => false);
    const p2Start = once<any>(p2, "game_start").then(() => true).catch(() => false);

    const [s1, s2] = await Promise.all([
      Promise.race([p1Start, new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]),
      Promise.race([p2Start, new Promise<boolean>((r) => setTimeout(() => r(false), 1500))]),
    ]);

    expect(s1).toBe(false);
    expect(s2).toBe(false);
  }, 10000);

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
