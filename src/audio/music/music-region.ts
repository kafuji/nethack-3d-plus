import type { MusicMood } from "./music-director";

/**
 * Coarse dungeon regions that get their own track preferences. Derived from
 * the status line's dungeon name, which the runtimes report in English, plus
 * the special levels inside the Dungeons of Doom that have their own music.
 */
export type MusicRegion =
  | "dungeon"
  | "medusa"
  | "castle"
  | "mines"
  | "sokoban"
  | "quest"
  | "ludios"
  | "gehennom"
  | "endgame";

/** Special levels inside the Dungeons of Doom that get their own region. */
export type MusicSpecialLevel = "medusa" | "castle";

export type MusicLevelInfo = {
  /** Dungeon index and level within it (`u.uz`). Dungeon 0 is the Dungeons of Doom. */
  dnum: number;
  dlevel: number;
  /** Exact special level, when the runtime exports it. */
  specialLevel?: MusicSpecialLevel | null;
  /** Number of levels in the Dungeons of Doom; the Castle is the last one. */
  mainDungeonLevelCount?: number | null;
  /** Water tiles seen so far on the current level. */
  knownWaterTiles?: number;
};

/** Medusa's level sits 1-4 levels above the Castle (dungeon.def: medusa @ (-5, 4)). */
const MEDUSA_LEVELS_ABOVE_CASTLE = 4;
/**
 * Medusa's island is surrounded by open water, while the ordinary levels
 * around it have at most a small moat or a few pools.
 */
export const MEDUSA_MIN_WATER_TILES = 40;

/**
 * None of the bundled runtimes exports Medusa's or the Castle's level, so
 * without `specialLevel` the Castle is the bottom of the Dungeons of Doom and
 * Medusa's level is the water level just above it.
 */
export function resolveMusicSpecialLevel(
  level: MusicLevelInfo | null | undefined,
): MusicSpecialLevel | null {
  if (!level) return null;
  if (level.specialLevel) return level.specialLevel;
  const count = level.mainDungeonLevelCount;
  if (level.dnum === 0 && count && level.dlevel === count) return "castle";
  if (couldBeMedusaLevel(level) && (level.knownWaterTiles ?? 0) >= MEDUSA_MIN_WATER_TILES) {
    return "medusa";
  }
  return null;
}

/** Whether the water count decides if this is Medusa's level. */
export function couldBeMedusaLevel(level: MusicLevelInfo): boolean {
  const count = level.mainDungeonLevelCount;
  if (level.specialLevel || level.dnum !== 0 || !count || count <= MEDUSA_LEVELS_ABOVE_CASTLE) {
    return false;
  }
  return level.dlevel >= count - MEDUSA_LEVELS_ABOVE_CASTLE && level.dlevel < count;
}

export function resolveMusicRegion(
  dungeonName: string | null | undefined,
  specialLevel: MusicSpecialLevel | null = null,
): MusicRegion {
  if (specialLevel) return specialLevel;
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
  medusa: { calm: ["medusa"], combat: ["combat"] },
  castle: { calm: ["castle"], combat: ["combat-boss"] },
  mines: { calm: ["mines"], combat: ["combat"] },
  sokoban: { calm: ["sokoban"], combat: ["combat"] },
  quest: { calm: ["quest"], combat: ["combat"] },
  ludios: { calm: ["dungeon"], combat: ["combat-boss"] },
  gehennom: { calm: ["gehennom"], combat: ["combat-boss"] },
  endgame: { calm: ["combat"], combat: ["combat-boss"] },
};
