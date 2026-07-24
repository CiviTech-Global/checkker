import type { Socket } from "socket.io";
import type { GameServer } from "../GameServer";
import type { TimeControl } from "@checkker/shared";
import { playerStore } from "../PlayerStore";
import { authenticatedSockets } from "./auth";
import { INVITE_TTL_MS } from "./types";

export function registerLanHandlers(
  socket: Socket,
  server: GameServer,
  lanHosts: Map<string, { hostSocketId: string; tc: TimeControl; createdAt: number }>,
  userSockets: Map<string, Socket>,
) {
  socket.on("host_lan_game", ({ tc }: { tc?: TimeControl } = {}) => {
    for (const [code, entry] of lanHosts) {
      if (entry.hostSocketId === socket.id) lanHosts.delete(code);
    }
    let code: string;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (lanHosts.has(code));
    lanHosts.set(code, { hostSocketId: socket.id, tc: tc ?? "blitz", createdAt: Date.now() });
    setTimeout(() => {
      if (lanHosts.get(code)?.hostSocketId === socket.id) lanHosts.delete(code);
    }, INVITE_TTL_MS).unref?.();
    socket.emit("lan_game_hosted", { code, tc: tc ?? "blitz" });
  });

  socket.on("cancel_lan_host", () => {
    for (const [code, entry] of lanHosts) {
      if (entry.hostSocketId === socket.id) lanHosts.delete(code);
    }
  });

  socket.on("join_lan_game", ({ code }: { code: string }) => {
    const entry = lanHosts.get(String(code ?? "").trim());
    if (!entry) {
      socket.emit("lan_join_result", { success: false, error: "Game code not found. Check the code and try again." });
      return;
    }
    const hostSocket = server.getIo().sockets.sockets.get(entry.hostSocketId);
    if (!hostSocket || entry.hostSocketId === socket.id) {
      lanHosts.delete(String(code).trim());
      socket.emit("lan_join_result", { success: false, error: "The host is no longer available." });
      return;
    }
    lanHosts.delete(String(code).trim());

    const hostProfile = playerStore.getOrCreate(hostSocket.id);
    const myProfile = playerStore.getOrCreate(socket.id);
    const hostAuth = authenticatedSockets.get(hostSocket.id);
    const myAuth = authenticatedSockets.get(socket.id);
    const host = {
      id: hostSocket.id,
      socket: hostSocket,
      rating: hostProfile.rating ?? 1000,
      casual: true,
      walletAddress: hostAuth?.walletAddress,
      userId: hostAuth?.userId,
    };
    const guest = {
      id: socket.id,
      socket,
      rating: myProfile.rating ?? 1000,
      casual: true,
      walletAddress: myAuth?.walletAddress,
      userId: myAuth?.userId,
    };
    socket.emit("lan_join_result", { success: true });
    server.startGamePublic(host, guest, entry.tc, "casual", "beginner", "free");
  });
}
