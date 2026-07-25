import type { Socket } from "socket.io";
import type { AuthEntry } from "./types";
import { createChallenge, verifyChallenge } from "../auth/WalletAuth";
import { playerStore } from "../PlayerStore";
import { UserRepository, AccountRepository } from "@checkker/database";
import { isBettingEnabled } from "../blockchain/config";
import { addGameBreadcrumb, setSentryUser } from "../monitoring";
import { SessionService } from "../services/SessionService";

/**
 * Shared auth state: maps socket ID to the authenticated user identity.
 * Lives here as module-level state shared across all handler modules.
 */
export const authenticatedSockets = new Map<string, AuthEntry>();

async function buildAuthSuccessPayload(
  socket: Socket,
  profile: Awaited<ReturnType<typeof playerStore.loadFromWallet>>,
  sessionToken: string,
  options: { isNewUser?: boolean; isGuest?: boolean; walletAddress?: string } = {}
) {
  return {
    profile,
    isNewUser: options.isNewUser ?? false,
    isGuest: options.isGuest ?? false,
    walletAddress: options.walletAddress,
    sessionToken,
    bettingEnabled: isBettingEnabled(),
  };
}

export function registerAuthHandlers(
  socket: Socket,
  rateLimiter: { allow: (id: string, key: string) => boolean },
  userSockets: Map<string, Socket>
) {
  socket.on("auth_request", ({ walletAddress }: { walletAddress: string }) => {
    if (!rateLimiter.allow(socket.id, "auth_request")) {
      socket.emit("auth_error", { error: "Rate limit exceeded. Try again later." });
      return;
    }
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      socket.emit("auth_error", { error: "Invalid wallet address" });
      return;
    }
    const { nonce, message } = createChallenge(walletAddress);
    socket.emit("auth_challenge", { nonce, message });
  });

  socket.on("auth_verify", async ({ walletAddress, signature }: { walletAddress: string; signature: string }) => {
    if (!rateLimiter.allow(socket.id, "auth_verify")) {
      socket.emit("auth_error", { error: "Rate limit exceeded. Try again later." });
      return;
    }
    const result = verifyChallenge(walletAddress, signature);
    if (!result.valid) {
      socket.emit("auth_error", { error: result.error ?? "Verification failed" });
      return;
    }

    const profile = await playerStore.loadFromWallet(socket.id, walletAddress);
    if (profile) {
      const account = await AccountRepository.findById(profile.id);
      const { token } = account
        ? await SessionService.createSession(account, { ip: socket.handshake.address, userAgent: socket.handshake.headers["user-agent"] })
        : { token: "" };

      authenticatedSockets.set(socket.id, {
        walletAddress: walletAddress.toLowerCase(),
        userId: profile.id,
        isGuest: false,
      });
      setSentryUser(profile.id, { wallet: walletAddress.toLowerCase() });
      addGameBreadcrumb("auth", "wallet authenticated", { userId: profile.id });
      userSockets.set(profile.id, socket);
      socket.emit("auth_success", await buildAuthSuccessPayload(socket, profile, token));
    } else {
      // New wallet: no account exists yet; no session token until set_username completes.
      socket.emit("auth_success", await buildAuthSuccessPayload(socket, null, "", { isNewUser: true, walletAddress }));
    }
  });

  socket.on("auth_token", async ({ token }: { token: string }) => {
    const account = await SessionService.validateToken(token);
    if (!account) {
      socket.emit("auth_error", { error: "Session expired", sessionExpired: true });
      return;
    }
    const profile = await playerStore.loadFromWallet(socket.id, account.walletAddress ?? "");
    if (profile) {
      authenticatedSockets.set(socket.id, { walletAddress: account.walletAddress ?? undefined, userId: profile.id, isGuest: false });
      userSockets.set(profile.id, socket);
      socket.emit("auth_success", await buildAuthSuccessPayload(socket, profile, token));
    } else {
      socket.emit("auth_success", await buildAuthSuccessPayload(socket, null, token, { isNewUser: true, walletAddress: account.walletAddress ?? undefined }));
    }
  });

  socket.on("guest_identify", async ({ deviceId, username, avatarId }: { deviceId?: string; username?: string; avatarId?: string }) => {
    if (!deviceId || deviceId.length < 8 || deviceId.length > 64) {
      socket.emit("auth_error", { error: "Invalid guest device id" });
      return;
    }
    const safeUsername = (username?.trim() || `Guest-${deviceId.slice(0, 6)}`).slice(0, 32);
    try {
      let user = await UserRepository.findByGuestDeviceId(deviceId);
      if (!user) {
        let candidate = safeUsername;
        let suffix = 0;
        while (await UserRepository.isUsernameTaken(candidate)) {
          suffix += 1;
          const suffixStr = `-${suffix}`;
          candidate = safeUsername.slice(0, 32 - suffixStr.length) + suffixStr;
        }
        user = await UserRepository.createGuest({ guestDeviceId: deviceId, username: candidate, avatarId });
      }
      authenticatedSockets.set(socket.id, { userId: user.id, isGuest: true });
      userSockets.set(user.id, socket);
      const profile = await playerStore.loadFromUser(socket.id, user);

      const account = await AccountRepository.findById(user.id);
      const { token } = account
        ? await SessionService.createSession(account, { ip: socket.handshake.address, userAgent: socket.handshake.headers["user-agent"] })
        : { token: "" };

      socket.emit("auth_success", await buildAuthSuccessPayload(socket, profile, token, { isGuest: true }));
    } catch (err: any) {
      socket.emit("auth_error", { error: err?.message ?? "Guest identification failed" });
    }
  });

  socket.on("auth_logout", ({ token }: { token?: string } = {}) => {
    const auth = authenticatedSockets.get(socket.id);
    if (token && auth) {
      SessionService.logout(auth.userId, token, { ip: socket.handshake.address, userAgent: socket.handshake.headers["user-agent"] }).catch(() => {});
    }
    authenticatedSockets.delete(socket.id);
  });

  socket.on("set_username", async ({ walletAddress, username, avatarId }: { walletAddress: string; username: string; avatarId?: string }) => {
    if (!username || username.length < 3 || username.length > 32) {
      socket.emit("auth_error", { error: "Username must be 3-32 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      socket.emit("auth_error", { error: "Username can only contain letters, numbers, and underscores" });
      return;
    }

    const taken = await playerStore.isUsernameTaken(username);
    if (taken) {
      socket.emit("auth_error", { error: "Username already taken" });
      return;
    }

    const profile = await playerStore.registerUser(socket.id, walletAddress, username, avatarId);
    if (profile) {
      authenticatedSockets.set(socket.id, {
        walletAddress: walletAddress.toLowerCase(),
        userId: profile.id,
        isGuest: false,
      });
      setSentryUser(profile.id, { wallet: walletAddress.toLowerCase() });
      addGameBreadcrumb("auth", "wallet authenticated", { userId: profile.id });
      userSockets.set(profile.id, socket);

      const account = await AccountRepository.findById(profile.id);
      const { token } = account
        ? await SessionService.createSession(account, { ip: socket.handshake.address, userAgent: socket.handshake.headers["user-agent"] })
        : { token: "" };

      socket.emit("auth_success", await buildAuthSuccessPayload(socket, profile, token));
    } else {
      socket.emit("auth_error", { error: "Failed to create account" });
    }
  });

  socket.on("check_username", async ({ username }: { username: string }) => {
    const taken = await playerStore.isUsernameTaken(username);
    socket.emit("username_check", { username, available: !taken });
  });

  socket.on("update_avatar", async ({ avatarId }: { avatarId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("auth_error", { error: "Not authenticated" });
      return;
    }
    try {
      await UserRepository.updateAvatar(auth.userId, avatarId);
      const profile = playerStore.get(socket.id);
      if (profile) profile.avatarId = avatarId;
      socket.emit("avatar_updated", { avatarId });
    } catch {
      socket.emit("auth_error", { error: "Failed to update avatar" });
    }
  });
}
