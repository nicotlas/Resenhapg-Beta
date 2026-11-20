// Quest rules and save data shared by the engine, the autosave and tests (no browser APIs here).
import type { RpgState } from "./engine";

/** Ricardo Milos' magic key: none (no quest), hidden in the forest, or carried to Nelson. */
export type KeyState = "none" | "hidden" | "carried";

/** Chance that talking to Ricardo Milos gives the magic-key quest instead of his classic line. */
export const MILOS_QUEST_CHANCE = 0.35;

/** `roll` is a random number in [0, 1). Only offered while no key quest is running. */
export function milosGivesQuest(roll: number, key: KeyState): boolean {
  return key === "none" && roll < MILOS_QUEST_CHANCE;
}

export interface SaveData {
  v: 1;
  hero: number;
  phase: number;
  hp: number;
  mana: number;
  coins: number;
  inv: [number, number];
  disc: boolean;
  rpg: RpgState;
  metDavid: boolean;
  key: KeyState;
}

export const SAVE_KEY = "resenhapg-save";

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;

/** Reads a stored save; anything broken or from another version gives null. */
export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as { [K in keyof SaveData]?: unknown } | null;
    if (!d || d.v !== 1) return null;
    const inv = Array.isArray(d.inv) ? d.inv : [];
    return {
      v: 1,
      hero: num(d.hero, 0, 3, 0),
      phase: num(d.phase, 1, 2, 1),
      hp: num(d.hp, 1, 100, 100),
      mana: num(d.mana, 0, 100, 100),
      coins: num(d.coins, 0, 99999, 12),
      inv: [num(inv[0], 0, 999, 0), num(inv[1], 0, 999, 0)],
      disc: d.disc === true,
      rpg: d.rpg === "carried" || d.rpg === "delivered" ? d.rpg : "hidden",
      metDavid: d.metDavid === true,
      key: d.key === "hidden" || d.key === "carried" ? d.key : "none",
    };
  } catch {
    return null;
  }
}

export function loadSave(): SaveData | null {
  try {
    return parseSave(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: playing still works, just without saving
  }
}
