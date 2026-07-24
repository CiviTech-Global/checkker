import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";

export function registerPushHandlers(socket: Socket) {
  socket.on("register_fcm_token", async ({ token }: { token: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("fcm_token_error", { error: "Not authenticated" });
      return;
    }
    try {
      const { UserRepository } = await import("@checkker/database");
      await UserRepository.updateFcmToken(auth.userId, token);
      socket.emit("fcm_token_registered", { token });
    } catch {
      socket.emit("fcm_token_error", { error: "Failed to register token" });
    }
  });
}
