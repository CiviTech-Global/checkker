import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";

export function registerNotificationHandlers(socket: Socket) {
  socket.on("get_notifications", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("notifications", { notifications: [], unread: 0 });
      return;
    }
    try {
      const { NotificationRepository } = await import("@checkker/database");
      const [notifications, unread] = await Promise.all([
        NotificationRepository.listForUser(auth.userId),
        NotificationRepository.unreadCount(auth.userId),
      ]);
      socket.emit("notifications", { notifications, unread });
    } catch {
      socket.emit("notifications", { notifications: [], unread: 0 });
    }
  });

  socket.on("mark_notifications_read", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) return;
    try {
      const { NotificationRepository } = await import("@checkker/database");
      await NotificationRepository.markAllRead(auth.userId);
      socket.emit("notifications_read", { success: true });
    } catch {
      socket.emit("notifications_read", { success: false });
    }
  });
}
