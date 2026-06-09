import { getDb } from "../client";
import type { Cosmetic, UserCosmetic } from "@prisma/client";

export const CosmeticRepository = {
  async getAll(): Promise<Cosmetic[]> {
    return getDb().cosmetic.findMany({ orderBy: { type: "asc", price: "asc" } });
  },

  async getByType(type: string): Promise<Cosmetic[]> {
    return getDb().cosmetic.findMany({ where: { type }, orderBy: { price: "asc" } });
  },

  async getDefaults(): Promise<Cosmetic[]> {
    return getDb().cosmetic.findMany({ where: { isDefault: true } });
  },

  async getByUser(userId: string): Promise<Array<UserCosmetic & { cosmetic: Cosmetic }>> {
    return getDb().userCosmetic.findMany({
      where: { userId },
      include: { cosmetic: true },
    });
  },

  async equip(userId: string, cosmeticId: string): Promise<void> {
    // Unequip any currently equipped cosmetic of the same type
    const cosmetic = await getDb().cosmetic.findUnique({ where: { id: cosmeticId } });
    if (!cosmetic) return;

    await getDb().$transaction([
      getDb().userCosmetic.updateMany({
        where: { userId, cosmetic: { type: cosmetic.type }, equipped: true },
        data: { equipped: false },
      }),
      getDb().userCosmetic.updateMany({
        where: { userId, cosmeticId },
        data: { equipped: true },
      }),
    ]);
  },

  async getEquipped(userId: string): Promise<Array<UserCosmetic & { cosmetic: Cosmetic }>> {
    return getDb().userCosmetic.findMany({
      where: { userId, equipped: true },
      include: { cosmetic: true },
    });
  },
};
