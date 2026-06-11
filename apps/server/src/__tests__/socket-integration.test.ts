import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
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
});
