import type { Socket } from "socket.io";
import type { Player } from "./types";
import type { GameServer } from "../GameServer";
import type { TimeControl } from "@checkker/shared";
import { v4 as uuid } from "uuid";
import { playerStore } from "../PlayerStore";
import { authenticatedSockets } from "./auth";
import { INVITE_TTL_MS } from "./types";

export function registerFriendHandlers(
  socket: Socket,
  server: GameServer,
  privateInvites: Map<string, any>,
  userSockets: Map<string, Socket>,
) {
  const emitFriendsData = async (targetSocket: Socket, userId: string) => {
    const { FriendshipRepository } = await import("@checkker/database");
    const [friends, pending] = await Promise.all([
      FriendshipRepository.listFriends(userId),
      FriendshipRepository.listPendingFor(userId),
    ]);
    const withPresence = friends.map((f) => ({
      ...f,
      online: userSockets.has(f.userId),
    }));
    targetSocket.emit("friends_data", { friends: withPresence, pending });
  };

  socket.on("get_friends", async () => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("friends_data", { friends: [], pending: [], error: "Not authenticated" });
      return;
    }
    try {
      await emitFriendsData(socket, auth.userId);
    } catch {
      socket.emit("friends_data", { friends: [], pending: [], error: "Failed to load friends" });
    }
  });

  socket.on("send_friend_request", async ({ username }: { username: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("friend_request_result", { success: false, error: "Not authenticated" });
      return;
    }
    try {
      const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
      const target = await UserRepository.findByUsername(username?.trim() ?? "");
      if (!target) {
        socket.emit("friend_request_result", { success: false, error: "User not found" });
        return;
      }
      if (target.id === auth.userId) {
        socket.emit("friend_request_result", { success: false, error: "You can't add yourself" });
        return;
      }
      const me = await UserRepository.findById(auth.userId);
      const friendship = await FriendshipRepository.sendRequest(auth.userId, target.id);
      if (!friendship) {
        socket.emit("friend_request_result", { success: false, error: "Request already exists or you're already friends" });
        return;
      }
      await NotificationRepository.create(target.id, "friend_request", {
        friendshipId: friendship.id,
        fromUsername: me?.username ?? "A player",
      });
      const targetSocket = userSockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit("friend_request", {
          friendshipId: friendship.id,
          fromUsername: me?.username ?? "A player",
        });
        await emitFriendsData(targetSocket, target.id);
      }
      socket.emit("friend_request_result", { success: true, username: target.username });
    } catch {
      socket.emit("friend_request_result", { success: false, error: "Failed to send request" });
    }
  });

  socket.on("respond_friend_request", async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) return;
    try {
      const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
      const friendship = await FriendshipRepository.respond(friendshipId, auth.userId, accept);
      if (friendship && accept) {
        const me = await UserRepository.findById(auth.userId);
        await NotificationRepository.create(friendship.requesterId, "friend_accepted", {
          username: me?.username ?? "A player",
        });
        const requesterSocket = userSockets.get(friendship.requesterId);
        if (requesterSocket) {
          requesterSocket.emit("friend_accepted", { username: me?.username ?? "A player" });
          await emitFriendsData(requesterSocket, friendship.requesterId);
        }
      }
      await emitFriendsData(socket, auth.userId);
    } catch {
      // refresh failed silently; client can re-request
    }
  });

  socket.on("remove_friend", async ({ friendshipId }: { friendshipId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) return;
    try {
      const { FriendshipRepository } = await import("@checkker/database");
      await FriendshipRepository.remove(friendshipId, auth.userId);
      await emitFriendsData(socket, auth.userId);
    } catch {
      // ignore
    }
  });

  socket.on("invite_friend", async ({ friendUserId, tc }: { friendUserId: string; tc?: TimeControl }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("invite_sent", { success: false, error: "Not authenticated" });
      return;
    }
    try {
      const { UserRepository, FriendshipRepository, NotificationRepository } = await import("@checkker/database");
      const friends = await FriendshipRepository.areFriends(auth.userId, friendUserId);
      if (!friends) {
        socket.emit("invite_sent", { success: false, error: "You can only invite friends" });
        return;
      }
      const me = await UserRepository.findById(auth.userId);
      const inviteId = uuid();
      const invite = {
        inviteId,
        fromUserId: auth.userId,
        fromUsername: me?.username ?? "A player",
        toUserId: friendUserId,
        tc: tc ?? "blitz",
        createdAt: Date.now(),
      };
      privateInvites.set(inviteId, invite);
      setTimeout(() => privateInvites.delete(inviteId), INVITE_TTL_MS).unref?.();

      await NotificationRepository.create(friendUserId, "game_invite", {
        inviteId,
        fromUsername: invite.fromUsername,
        tc: invite.tc,
      });
      const friendSocket = userSockets.get(friendUserId);
      if (friendSocket) {
        friendSocket.emit("private_invite", {
          inviteId,
          fromUsername: invite.fromUsername,
          tc: invite.tc,
        });
      }
      socket.emit("invite_sent", { success: true, online: !!friendSocket, inviteId });
    } catch {
      socket.emit("invite_sent", { success: false, error: "Failed to send invite" });
    }
  });

  socket.on("respond_invite", async ({ inviteId, accept }: { inviteId: string; accept: boolean }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) return;
    const invite = privateInvites.get(inviteId);
    if (!invite || invite.toUserId !== auth.userId) {
      socket.emit("invite_response_result", { success: false, error: "Invite expired" });
      return;
    }
    privateInvites.delete(inviteId);

    const inviterSocket = userSockets.get(invite.fromUserId);
    if (!accept) {
      inviterSocket?.emit("invite_declined", { inviteId, byUsername: playerStore.get(socket.id)?.displayName });
      socket.emit("invite_response_result", { success: true, accepted: false });
      return;
    }
    if (!inviterSocket) {
      socket.emit("invite_response_result", { success: false, error: "Inviter is no longer online" });
      return;
    }

    const inviterProfile = playerStore.getOrCreate(inviterSocket.id);
    const myProfile = playerStore.getOrCreate(socket.id);
    const inviterAuth = authenticatedSockets.get(inviterSocket.id);
    const inviter: Player = {
      id: inviterSocket.id,
      socket: inviterSocket,
      rating: inviterProfile.rating ?? 1000,
      casual: true,
      walletAddress: inviterAuth?.walletAddress,
      userId: invite.fromUserId,
    };
    const accepter: Player = {
      id: socket.id,
      socket,
      rating: myProfile.rating ?? 1000,
      casual: true,
      walletAddress: auth.walletAddress,
      userId: auth.userId,
    };
    socket.emit("invite_response_result", { success: true, accepted: true });
    server.startGamePublic(inviter, accepter, invite.tc, "casual", "beginner", "free");
  });
}
