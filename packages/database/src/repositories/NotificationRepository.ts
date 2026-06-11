import { getDb } from "../client";
import type { Notification } from "@prisma/client";

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "game_invite"
  | "daily_puzzle"
  | "system";

export const NotificationRepository = {
  async create(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown> = {}
  ): Promise<Notification> {
    return getDb().notification.create({
      data: { userId, type, payload: JSON.stringify(payload) },
    });
  },

  async listForUser(userId: string, limit = 50): Promise<Notification[]> {
    return getDb().notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async unreadCount(userId: string): Promise<number> {
    return getDb().notification.count({ where: { userId, read: false } });
  },

  async markRead(notificationId: string, userId: string): Promise<void> {
    await getDb().notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  },

  async markAllRead(userId: string): Promise<void> {
    await getDb().notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },
};
