/**
 * Terrain styles let a high-resolution pack draw some tiles differently in
 * one part of the dungeon, where NetHack itself has no separate tile: the
 * Gnomish Mines use the room floor tile, but a pack can paint a cave floor
 * for them.
 *
 * Each style maps a NetHack 5 tile key to the pack file used instead. The
 * replacement files are listed in the pack manifest like any other tile;
 * scripts/tilesets/hires-pack.mjs reads the quoted "other/..." keys below,
 * so keep them as plain string literals.
 */
export type HiResTerrainStyle = "mines";

export const HIRES_TERRAIN_STYLE_TILE_KEYS: Readonly<
  Record<HiResTerrainStyle, Readonly<Record<string, string>>>
> = {
  mines: {
    "other/floor_of_a_room": "other/mines_floor_of_a_room",
    "other/dark_part_of_a_room": "other/mines_dark_part_of_a_room",
  },
};

/** Every pack file a terrain style can use. */
export const HIRES_TERRAIN_STYLE_KEYS: readonly string[] = Object.values(
  HIRES_TERRAIN_STYLE_TILE_KEYS,
).flatMap((replacements) => Object.values(replacements));

/** The terrain style for a level, from the runtime's level identity. */
export function resolveHiResTerrainStyle(
  identity: { branchTag: string | null; dungeonName: string | null } | null,
): HiResTerrainStyle | null {
  if (!identity) return null;
  if (identity.branchTag?.toLowerCase() === "mines") return "mines";
  if (/gnomish mines/i.test(identity.dungeonName ?? "")) return "mines";
  return null;
}
