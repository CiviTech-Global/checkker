import type { Socket } from "socket.io";
import { authenticatedSockets } from "./auth";

export function registerCosmeticHandlers(socket: Socket) {
  socket.on("get_cosmetics", async () => {
    try {
      const { CosmeticRepository, UserRepository } = await import("@checkker/database");
      const auth = authenticatedSockets.get(socket.id);
      const cosmetics = await CosmeticRepository.getAll();
      const userCosmetics = auth ? await CosmeticRepository.getByUser(auth.userId) : [];
      const coins = auth ? await UserRepository.getCoins(auth.userId) : 0;
      socket.emit("cosmetics", { cosmetics, userCosmetics, coins });
    } catch {
      socket.emit("cosmetics", { cosmetics: [], userCosmetics: [], coins: 0 });
    }
  });

  socket.on("purchase_cosmetic", async ({ cosmeticId }: { cosmeticId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("cosmetic_purchased", { success: false, error: "Not authenticated" });
      return;
    }
    try {
      const { CosmeticRepository } = await import("@checkker/database");
      const result = await CosmeticRepository.purchase(auth.userId, cosmeticId);
      if (result.success) {
        const userCosmetics = await CosmeticRepository.getByUser(auth.userId);
        socket.emit("cosmetic_purchased", { success: true, cosmeticId, coins: result.coins, userCosmetics });
      } else {
        socket.emit("cosmetic_purchased", { success: false, cosmeticId, error: result.error });
      }
    } catch {
      socket.emit("cosmetic_purchased", { success: false, cosmeticId, error: "Purchase failed" });
    }
  });

  socket.on("equip_cosmetic", async ({ cosmeticId }: { cosmeticId: string }) => {
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) {
      socket.emit("cosmetic_error", { error: "Not authenticated" });
      return;
    }
    try {
      const { CosmeticRepository } = await import("@checkker/database");
      await CosmeticRepository.equip(auth.userId, cosmeticId);
      const equipped = await CosmeticRepository.getEquipped(auth.userId);
      socket.emit("cosmetic_equipped", { cosmeticId, equipped });
    } catch {
      socket.emit("cosmetic_error", { error: "Failed to equip cosmetic" });
    }
  });
}
