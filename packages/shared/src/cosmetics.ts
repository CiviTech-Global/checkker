/**
 * Cosmetics catalog — single source of truth for the shop.
 *
 * Each entry has a stable `key` that is stored in the DB `assetUrl` column,
 * so clients can map a Cosmetic row back to its visual definition without
 * shipping image assets. Visuals are color-based for v1.
 */

export type CosmeticType = "board" | "piece" | "card_back";
export type CosmeticRarity = "common" | "rare" | "epic";

export interface CosmeticDef {
  key: string;
  type: CosmeticType;
  name: string;
  description: string;
  price: number;
  rarity: CosmeticRarity;
  isDefault?: boolean;
  /** Board themes: square colors. */
  board?: { light: string; dark: string };
  /** Piece themes: text tint applied to white/black piece glyphs. */
  piece?: { white: string; black: string };
  /** Card backs: back face colors. */
  cardBack?: { primary: string; accent: string };
}

export const COSMETICS_CATALOG: CosmeticDef[] = [
  /* ── Board themes ──────────────────────────────────────────────── */
  { key: "board_casino", type: "board", name: "Casino Felt", description: "Warm tan on rich green felt", price: 0, rarity: "common", isDefault: true, board: { light: "#c8b078", dark: "#2a6830" } },
  { key: "board_walnut", type: "board", name: "Walnut", description: "Classic tournament wood", price: 100, rarity: "common", board: { light: "#e8d0aa", dark: "#7a5230" } },
  { key: "board_marble", type: "board", name: "Marble Hall", description: "Cool grey marble", price: 100, rarity: "common", board: { light: "#d8d8d8", dark: "#7e8a93" } },
  { key: "board_midnight", type: "board", name: "Midnight", description: "Deep blue under lamplight", price: 150, rarity: "common", board: { light: "#9fb4cc", dark: "#27496d" } },
  { key: "board_rosewood", type: "board", name: "Rosewood", description: "Reddish exotic hardwood", price: 150, rarity: "common", board: { light: "#e3c1a0", dark: "#8b3a2f" } },
  { key: "board_emerald", type: "board", name: "Emerald Table", description: "High-stakes emerald baize", price: 250, rarity: "rare", board: { light: "#bfe3c0", dark: "#1f6f43" } },
  { key: "board_lapis", type: "board", name: "Persian Lapis", description: "Lapis lazuli and ivory", price: 250, rarity: "rare", board: { light: "#e9e2cf", dark: "#1a3a6b" } },
  { key: "board_burgundy", type: "board", name: "Burgundy Velvet", description: "Velvet from the high-roller room", price: 300, rarity: "rare", board: { light: "#dcb8a6", dark: "#6b1f2d" } },
  { key: "board_gold", type: "board", name: "Gilded Court", description: "Gold leaf and obsidian", price: 500, rarity: "epic", board: { light: "#f5d680", dark: "#2b2b2b" } },
  { key: "board_neon", type: "board", name: "Neon Underground", description: "Backroom arcade glow", price: 500, rarity: "epic", board: { light: "#3dd6c3", dark: "#23104a" } },

  /* ── Piece themes ──────────────────────────────────────────────── */
  { key: "piece_classic", type: "piece", name: "Classic", description: "Readable ivory and near-black", price: 0, rarity: "common", isDefault: true, piece: { white: "#F5F2FC", black: "#15101F" } },
  { key: "piece_bone", type: "piece", name: "Bone & Coal", description: "Aged bone, raw coal", price: 100, rarity: "common", piece: { white: "#efe6d0", black: "#2e2620" } },
  { key: "piece_navy", type: "piece", name: "Naval Brass", description: "Cream against navy blue", price: 100, rarity: "common", piece: { white: "#f4ead6", black: "#16365c" } },
  { key: "piece_crimson", type: "piece", name: "Crimson Guard", description: "Bone white versus blood red", price: 150, rarity: "common", piece: { white: "#f5efe0", black: "#7a1622" } },
  { key: "piece_forest", type: "piece", name: "Forest", description: "Birch and deep pine", price: 150, rarity: "common", piece: { white: "#eef2dd", black: "#1d4a2c" } },
  { key: "piece_silver", type: "piece", name: "Sterling", description: "Polished silver and pewter", price: 250, rarity: "rare", piece: { white: "#e8eef2", black: "#4d5a66" } },
  { key: "piece_amethyst", type: "piece", name: "Amethyst", description: "Quartz and royal purple", price: 250, rarity: "rare", piece: { white: "#f0e6f7", black: "#4d2178" } },
  { key: "piece_bronze", type: "piece", name: "Bronze Age", description: "Hammered bronze relics", price: 300, rarity: "rare", piece: { white: "#e9cf9e", black: "#6e4218" } },
  { key: "piece_gold", type: "piece", name: "Royal Gold", description: "24-karat court pieces", price: 500, rarity: "epic", piece: { white: "#f5d680", black: "#8a6a1d" } },
  { key: "piece_neon", type: "piece", name: "Hologram", description: "Light-forged projections", price: 500, rarity: "epic", piece: { white: "#7df9ff", black: "#ff4fd8" } },

  /* ── Card backs ────────────────────────────────────────────────── */
  { key: "back_casino", type: "card_back", name: "House Green", description: "The house standard", price: 0, rarity: "common", isDefault: true, cardBack: { primary: "#18472a", accent: "#d4a843" } },
  { key: "back_crimson", type: "card_back", name: "Crimson Deck", description: "Riverboat classic red", price: 100, rarity: "common", cardBack: { primary: "#7a1622", accent: "#f5d680" } },
  { key: "back_navy", type: "card_back", name: "Navy Deck", description: "Captain's quarters blue", price: 100, rarity: "common", cardBack: { primary: "#16365c", accent: "#c9d6e8" } },
  { key: "back_slate", type: "card_back", name: "Slate Deck", description: "Understated grey slate", price: 150, rarity: "common", cardBack: { primary: "#3c454d", accent: "#aeb9c2" } },
  { key: "back_violet", type: "card_back", name: "Violet Hour", description: "Dusk in the card room", price: 150, rarity: "common", cardBack: { primary: "#3d1d63", accent: "#c9a7f0" } },
  { key: "back_paisley", type: "card_back", name: "Persian Paisley", description: "Hand-inked paisley", price: 250, rarity: "rare", cardBack: { primary: "#1a3a6b", accent: "#d4a843" } },
  { key: "back_ember", type: "card_back", name: "Ember", description: "Coals from the fireplace", price: 250, rarity: "rare", cardBack: { primary: "#5c2510", accent: "#ff8c42" } },
  { key: "back_jade", type: "card_back", name: "Imperial Jade", description: "Carved jade inlay", price: 300, rarity: "rare", cardBack: { primary: "#0f5132", accent: "#9be8c0" } },
  { key: "back_gold", type: "card_back", name: "Gold Filigree", description: "Gilt-edged luxury deck", price: 500, rarity: "epic", cardBack: { primary: "#2b2b2b", accent: "#f5d680" } },
  { key: "back_neon", type: "card_back", name: "Cyber Deck", description: "Glow-wire circuitry", price: 500, rarity: "epic", cardBack: { primary: "#0d0d2b", accent: "#3dd6c3" } },
];

const byKey = new Map(COSMETICS_CATALOG.map((c) => [c.key, c]));

/** Look up a catalog definition by its stable key (stored in Cosmetic.assetUrl). */
export function getCosmeticDef(key: string | null | undefined): CosmeticDef | undefined {
  if (!key) return undefined;
  return byKey.get(key);
}

/** Coins awarded after an online game completes. */
export const COIN_REWARDS = { win: 50, draw: 20, loss: 10 } as const;
