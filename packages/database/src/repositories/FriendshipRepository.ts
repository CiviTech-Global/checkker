import { getDb } from "../client";
import type { Friendship, User } from "@prisma/client";

export interface FriendSummary {
  friendshipId: string;
  userId: string;
  username: string;
  avatarId: string;
  rating: number;
}

export interface PendingRequest {
  friendshipId: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatarId: string;
  createdAt: Date;
}

function toSummary(friendshipId: string, user: User): FriendSummary {
  return {
    friendshipId,
    userId: user.id,
    username: user.username,
    avatarId: user.avatarId,
    rating: user.rating,
  };
}

export const FriendshipRepository = {
  /** Send a friend request. Returns null if one already exists in either direction. */
  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    if (requesterId === addresseeId) return null;
    const existing = await getDb().friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing) {
      // Re-sending after a decline re-opens the request.
      if (existing.status === "declined") {
        return getDb().friendship.update({
          where: { id: existing.id },
          data: { requesterId, addresseeId, status: "pending", respondedAt: null },
        });
      }
      return null;
    }
    return getDb().friendship.create({ data: { requesterId, addresseeId } });
  },

  async respond(friendshipId: string, userId: string, accept: boolean): Promise<Friendship | null> {
    const friendship = await getDb().friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId || friendship.status !== "pending") {
      return null;
    }
    return getDb().friendship.update({
      where: { id: friendshipId },
      data: { status: accept ? "accepted" : "declined", respondedAt: new Date() },
    });
  },

  async remove(friendshipId: string, userId: string): Promise<boolean> {
    const friendship = await getDb().friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
      return false;
    }
    await getDb().friendship.delete({ where: { id: friendshipId } });
    return true;
  },

  async listFriends(userId: string): Promise<FriendSummary[]> {
    const friendships = await getDb().friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: true, addressee: true },
      orderBy: { respondedAt: "desc" },
    });
    return friendships.map((f) =>
      toSummary(f.id, f.requesterId === userId ? f.addressee : f.requester)
    );
  },

  async listPendingFor(userId: string): Promise<PendingRequest[]> {
    const pending = await getDb().friendship.findMany({
      where: { addresseeId: userId, status: "pending" },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    });
    return pending.map((f) => ({
      friendshipId: f.id,
      fromUserId: f.requesterId,
      fromUsername: f.requester.username,
      fromAvatarId: f.requester.avatarId,
      createdAt: f.createdAt,
    }));
  },

  async areFriends(userA: string, userB: string): Promise<boolean> {
    const friendship = await getDb().friendship.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userA, addresseeId: userB },
          { requesterId: userB, addresseeId: userA },
        ],
      },
    });
    return friendship !== null;
  },

  async getById(friendshipId: string): Promise<Friendship | null> {
    return getDb().friendship.findUnique({ where: { id: friendshipId } });
  },
};
