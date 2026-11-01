import { getActiveGlyphCatalogVersion, getGlyphCatalogEntry, getGlyphCatalogRanges } from "../../game/glyphs/registry";
import type { TerrainSnapshot } from "../../game/types";

/** Stable ids for map features the player can stand on, keyed by NetHack's defsym explanations. */
export type PlayerTileTerrainId =
  | "stone" | "wall" | "doorway" | "openDoor" | "closedDoor" | "ironBars" | "tree"
  | "room" | "darkRoom" | "corridor" | "litCorridor" | "engravedRoom" | "engravedCorridor"
  | "stairsUp" | "stairsDown" | "ladderUp" | "ladderDown" | "branchStairsUp" | "branchStairsDown"
  | "branchLadderUp" | "branchLadderDown" | "altar" | "grave" | "throne" | "sink" | "fountain"
  | "water" | "ice" | "lava" | "lavaWall" | "loweredDrawbridge" | "raisedDrawbridge" | "air" | "cloud"
  | "arrowTrap" | "dartTrap" | "fallingRockTrap" | "squeakyBoard" | "bearTrap" | "landMine"
  | "rollingBoulderTrap" | "sleepingGasTrap" | "rustTrap" | "fireTrap" | "pit" | "spikedPit" | "hole"
  | "trapDoor" | "teleportationTrap" | "levelTeleporter" | "magicPortal" | "web" | "statueTrap"
  | "magicTrap" | "antiMagicField" | "polymorphTrap" | "vibratingSquare" | "trappedDoor" | "trappedChest";

const walls: PlayerTileTerrainId[] = Array(11).fill("wall");
const traps: PlayerTileTerrainId[] = [
  "arrowTrap", "dartTrap", "fallingRockTrap", "squeakyBoard", "bearTrap", "landMine",
  "rollingBoulderTrap", "sleepingGasTrap", "rustTrap", "fireTrap", "pit", "spikedPit", "hole",
  "trapDoor", "teleportationTrap", "levelTeleporter", "magicPortal", "web", "statueTrap",
  "magicTrap", "antiMagicField", "polymorphTrap", "vibratingSquare",
];

// NetHack 3.6 defsyms order (drawing.c).
const cmap367: readonly PlayerTileTerrainId[] = [
  "stone", ...walls, "doorway", "openDoor", "openDoor", "closedDoor", "closedDoor", "ironBars", "tree",
  "room", "darkRoom", "corridor", "litCorridor", "stairsUp", "stairsDown", "ladderUp", "ladderDown",
  "altar", "grave", "throne", "sink", "fountain", "water", "ice", "lava",
  "loweredDrawbridge", "loweredDrawbridge", "raisedDrawbridge", "raisedDrawbridge", "air", "cloud", "water",
  ...traps,
];

// NetHack 3.7 / 5 defsyms order (defsym.h), with engravings, branch stairs and lava walls split out.
const cmap5: readonly PlayerTileTerrainId[] = [
  "stone", ...walls, "doorway", "openDoor", "openDoor", "closedDoor", "closedDoor", "ironBars", "tree",
  "room", "darkRoom", "engravedRoom", "corridor", "litCorridor", "engravedCorridor",
  "stairsUp", "stairsDown", "ladderUp", "ladderDown",
  "branchStairsUp", "branchStairsDown", "branchLadderUp", "branchLadderDown",
  "altar", "grave", "throne", "sink", "fountain", "water", "ice", "lava", "lavaWall",
  "loweredDrawbridge", "loweredDrawbridge", "raisedDrawbridge", "raisedDrawbridge", "air", "cloud", "water",
  ...traps, "trappedDoor", "trappedChest",
];

/** Name the remembered map feature under the player, or null when it is not a known map symbol. */
export function resolvePlayerTileTerrainId(snapshot: TerrainSnapshot | null | undefined): PlayerTileTerrainId | null {
  if (!snapshot || !Number.isFinite(snapshot.glyph)) return null;
  const version = getActiveGlyphCatalogVersion();
  // Slash'EM uses a 3.4.3-era symbol table that this list does not describe.
  if (version === "slashem") return null;
  const table = version === "5.0" ? cmap5 : cmap367;
  const entry = getGlyphCatalogEntry(snapshot.glyph);
  let index: number | null = null;
  if (typeof snapshot.symidx === "number" && Number.isFinite(snapshot.symidx) && snapshot.symidx >= 0) {
    index = Math.trunc(snapshot.symidx);
  }
  if (entry) {
    if (entry.kind !== "cmap") return null;
    if (index === null && typeof entry.symidx === "number" && entry.symidx >= 0) index = Math.trunc(entry.symidx);
  }
  if (index === null) {
    const range = getGlyphCatalogRanges().find((candidate) => candidate.kind === "cmap");
    if (!range || snapshot.glyph < range.start || snapshot.glyph >= range.endExclusive) return null;
    index = snapshot.glyph - range.start;
  }
  const id = table[index] ?? null;
  // Standing in stone or a wall means the cache does not describe this spot.
  return id === "stone" || id === "wall" ? null : id;
}
