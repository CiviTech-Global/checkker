import { getDb } from "../client";
import type { Cosmetic, UserCosmetic } from "@prisma/client";

export type SeedCosmeticInput = {
  type: string;
  name: string;
  description?: string;
  price: number;
  rarity: string;
  assetUrl: string; // stable catalog key
  isDefault?: boolean;
};

export type PurchaseResult =
  | { success: true; coins: number }
  | { success: false; error: string };

export const CosmeticRepository = {
  async count(): Promise<number> {
    return getDb().cosmetic.count();
  },

  /** Idempotent catalog seed — inserts entries whose assetUrl key is missing. */
  async seedCatalog(items: SeedCosmeticInput[]): Promise<number> {
    const existing = await getDb().cosmetic.findMany({ select: { assetUrl: true } });
    const have = new Set(existing.map((c) => c.assetUrl));
    const missing = items.filter((i) => !have.has(i.assetUrl));
    if (missing.length === 0) return 0;
    await getDb().cosmetic.createMany({
      data: missing.map((i) => ({
        type: i.type,
        name: i.name,
        description: i.description,
        price: i.price,
        rarity: i.rarity,
        assetUrl: i.assetUrl,
        isDefault: i.isDefault ?? false,
      })),
    });
    return missing.length;
  },

  /** Buy a cosmetic with coins. Free/default items are claimed at no cost. */
  async purchase(userId: string, cosmeticId: string): Promise<PurchaseResult> {
    const db = getDb();
    const cosmetic = await db.cosmetic.findUnique({ where: { id: cosmeticId } });
    if (!cosmetic) return { success: false, error: "Item not found" };

    const owned = await db.userCosmetic.findUnique({
      where: { userId_cosmeticId: { userId, cosmeticId } },
    });
    if (owned) return { success: false, error: "Already owned" };

    const price = cosmetic.isDefault ? 0 : cosmetic.price;
    const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!user) return { success: false, error: "User not found" };
    if (user.coins < price) return { success: false, error: "Not enough coins" };

    const [updatedUser] = await db.$transaction([
      db.user.update({ where: { id: userId }, data: { coins: { decrement: price } } }),
      db.userCosmetic.create({ data: { userId, cosmeticId } }),
    ]);
    return { success: true, coins: updatedUser.coins };
  },

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
