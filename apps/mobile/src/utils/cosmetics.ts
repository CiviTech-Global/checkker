import { useEffect, useState } from "react";
import { getCosmeticDef, type CosmeticDef } from "@checkker/shared";

/**
 * Reactive store for the player's equipped cosmetics, derived from the
 * server's cosmetics payloads (see useSocket). Game components subscribe
 * via useEquippedTheme() so equipped themes apply live.
 */

export interface EquippedTheme {
  board?: CosmeticDef;
  piece?: CosmeticDef;
  cardBack?: CosmeticDef;
}

let _theme: EquippedTheme = {};
const listeners = new Set<(t: EquippedTheme) => void>();

export function setEquippedFromData(cosmetics: any[] | null, userCosmetics: any[] | null): void {
  const next: EquippedTheme = {};
  if (cosmetics && userCosmetics) {
    for (const uc of userCosmetics) {
      if (!uc.equipped) continue;
      const cosmetic = uc.cosmetic ?? cosmetics.find((c) => c.id === uc.cosmeticId);
      const def = getCosmeticDef(cosmetic?.assetUrl);
      if (!def) continue;
      if (def.type === "board") next.board = def;
      else if (def.type === "piece") next.piece = def;
      else if (def.type === "card_back") next.cardBack = def;
    }
  }
  _theme = next;
  listeners.forEach((fn) => fn(_theme));
}

export function getEquippedTheme(): EquippedTheme {
  return _theme;
}

export function useEquippedTheme(): EquippedTheme {
  const [theme, setTheme] = useState<EquippedTheme>(_theme);
  useEffect(() => {
    const fn = (t: EquippedTheme) => setTheme(t);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return theme;
}
