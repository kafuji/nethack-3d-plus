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
 * Track ids per mood for each region. A mood listed here plays only these
 * tracks (in order) while in the region; unlisted moods use the whole library.
 * The faster boss-combat piece is kept for the deep and dangerous places.
 */
export const regionTrackPreferences: Readonly<Record<MusicRegion, TrackPreference>> = {
  dungeon: { calm: ["dungeon"], combat: ["combat"] },
  mines: { calm: ["mines"], combat: ["combat"] },
  sokoban: { calm: ["sokoban"], combat: ["combat"] },
  quest: { calm: ["dungeon"], combat: ["combat"] },
  ludios: { calm: ["dungeon"], combat: ["combat-boss"] },
  gehennom: { calm: ["dungeon"], combat: ["combat-boss"] },
  endgame: { calm: ["combat"], combat: ["combat-boss"] },
};
