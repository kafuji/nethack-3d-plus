import type { MusicMood } from "./music-director";

/**
 * Coarse dungeon regions that get their own track preferences. Derived from
 * the status line's dungeon name, which the runtimes report in English.
 */
export type MusicRegion = "dungeon" | "mines" | "sokoban" | "quest" | "ludios" | "gehennom" | "endgame";

export function resolveMusicRegion(dungeonName: string | null | undefined): MusicRegion {
  const name = String(dungeonName ?? "").trim().replace(/^The /i, "").toLowerCase();
  if (/gnomish mines|mines/.test(name)) return "mines";
  if (/sokoban/.test(name)) return "sokoban";
  if (/^quest|home \d/.test(name)) return "quest";
  if (/ludios/.test(name)) return "ludios";
  if (/gehennom|vlad|tower/.test(name)) return "gehennom";
  if (/plane|astral|endgame|elemental/.test(name)) return "endgame";
  return "dungeon";
}

export type TrackPreference = Partial<Record<MusicMood, readonly string[]>>;

/**
 * Preferred track ids per mood for each region; tracks not listed keep their
 * library order after these. Gehennom borrows the darker danger pieces for
 * exploration so the descent feels different from the upper dungeon.
 */
export const regionTrackPreferences: Readonly<Record<MusicRegion, TrackPreference>> = {
  dungeon: { calm: ["calm-dungeon", "calm-unexplored"] },
  mines: { calm: ["calm-unexplored", "calm-dungeon"] },
  sokoban: { calm: ["calm-unexplored"] },
  quest: { calm: ["calm-unexplored"], combat: ["combat-determined-pursuit"] },
  ludios: { calm: ["calm-dungeon"], combat: ["combat-determined-pursuit"] },
  gehennom: {
    calm: ["danger-tension-and-distress", "calm-dungeon"],
    combat: ["combat-determined-pursuit"],
    danger: ["danger-panic-mode"],
  },
  endgame: {
    calm: ["combat-determined-pursuit"],
    combat: ["combat-determined-pursuit", "combat-battle-theme-a"],
    danger: ["danger-panic-mode"],
  },
};
