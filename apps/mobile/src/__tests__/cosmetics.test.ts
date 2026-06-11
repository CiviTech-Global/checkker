import { COSMETICS_CATALOG, getCosmeticDef, COIN_REWARDS } from "@checkker/shared";
import { setEquippedFromData, getEquippedTheme } from "../utils/cosmetics";

describe("cosmetics catalog", () => {
  test("has unique keys", () => {
    const keys = COSMETICS_CATALOG.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("has exactly one default per type", () => {
    for (const type of ["board", "piece", "card_back"] as const) {
      const defaults = COSMETICS_CATALOG.filter((c) => c.type === type && c.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].price).toBe(0);
    }
  });

  test("every entry carries visuals matching its type", () => {
    for (const c of COSMETICS_CATALOG) {
      if (c.type === "board") expect(c.board).toBeDefined();
      if (c.type === "piece") expect(c.piece).toBeDefined();
      if (c.type === "card_back") expect(c.cardBack).toBeDefined();
    }
  });

  test("getCosmeticDef resolves keys and rejects unknowns", () => {
    expect(getCosmeticDef("board_casino")?.type).toBe("board");
    expect(getCosmeticDef("nope")).toBeUndefined();
    expect(getCosmeticDef(null)).toBeUndefined();
  });

  test("coin rewards favor winning", () => {
    expect(COIN_REWARDS.win).toBeGreaterThan(COIN_REWARDS.draw);
    expect(COIN_REWARDS.draw).toBeGreaterThan(COIN_REWARDS.loss);
  });
});

describe("equipped theme store", () => {
  test("derives equipped visuals from server payload shapes", () => {
    const cosmetics = [
      { id: "c1", assetUrl: "board_midnight", type: "board" },
      { id: "c2", assetUrl: "piece_crimson", type: "piece" },
      { id: "c3", assetUrl: "back_navy", type: "card_back" },
    ];
    const userCosmetics = [
      { cosmeticId: "c1", equipped: true },
      { cosmeticId: "c2", equipped: false },
      { cosmeticId: "c3", equipped: true, cosmetic: cosmetics[2] },
    ];
    setEquippedFromData(cosmetics, userCosmetics);
    const theme = getEquippedTheme();
    expect(theme.board?.key).toBe("board_midnight");
    expect(theme.piece).toBeUndefined(); // not equipped
    expect(theme.cardBack?.key).toBe("back_navy");
  });

  test("clears the theme when data is missing", () => {
    setEquippedFromData(null, null);
    expect(getEquippedTheme()).toEqual({});
  });
});
