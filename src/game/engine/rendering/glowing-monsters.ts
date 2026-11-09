import {
  GLYPH_CATALOG as legacyGlyphCatalog,
  GLYPH_CATALOG_RANGES as legacyGlyphRanges,
} from "../../glyphs/glyph-catalog.367.generated";
import { getActiveGlyphCatalogVersion, getGlyphCatalogEntry } from "../../glyphs/registry";
import type { GlyphKind } from "../../glyphs/types";
import { NH5_TILE_KEYS } from "../../hires-tiles/tile-keys.5.generated";
import { VULTURE_MONSTER_KEYS_367 } from "../../vulture/vulture-monster-keys.367.generated";

export interface GlowLight {
  /** Linear RGB times intensity. */
  readonly color: readonly [number, number, number];
  /** Reach in tiles, including a soft edge. */
  readonly radius: number;
}

/**
 * Monsters that emit light in NetHack (emits_light): the lights, the
 * flaming and shocking spheres, fire vortices and fire elementals, plus gold
 * dragons in NetHack 5. Keyed by species name as in the tile files.
 */
const GLOWING_SPECIES: Readonly<Record<string, GlowLight>> = {
  yellow_light: { color: [0.95, 0.85, 0.3], radius: 2.5 },
  black_light: { color: [0.55, 0.3, 0.95], radius: 2.5 },
  flaming_sphere: { color: [0.95, 0.48, 0.16], radius: 2.5 },
  shocking_sphere: { color: [0.55, 0.7, 1.0], radius: 2.5 },
  fire_vortex: { color: [0.95, 0.42, 0.14], radius: 2.5 },
  fire_elemental: { color: [0.95, 0.4, 0.12], radius: 2.5 },
  gold_dragon: { color: [0.95, 0.78, 0.32], radius: 2.5 },
  baby_gold_dragon: { color: [0.95, 0.78, 0.32], radius: 2.5 },
};

/** Lava glows a deep orange; it is baked per lava cell. */
export const LAVA_GLOW: GlowLight = { color: [0.85, 0.32, 0.08], radius: 1.8 };

/** The monster itself, a pet, one sensed by telepathy, or ridden. Not corpses or statues. */
const LIVE_MONSTER_KINDS: ReadonlySet<GlyphKind> = new Set(["mon", "pet", "detect", "ridden"]);

/** NetHack 3.6.7 tile index → species, for the glowing species only. */
const GLOWING_TILES_367: ReadonlyMap<number, string> = (() => {
  const start = legacyGlyphRanges.find((range) => range.kind === "mon")?.start;
  const tiles = new Map<number, string>();
  if (start === undefined) return tiles;
  for (const species of Object.keys(GLOWING_SPECIES)) {
    const monsterIndex = VULTURE_MONSTER_KEYS_367.indexOf(`PM_${species.toUpperCase()}`);
    if (monsterIndex < 0) continue;
    const tile = legacyGlyphCatalog.find((entry) => entry.glyph === start + monsterIndex)?.tileIndex;
    if (typeof tile === "number") tiles.set(tile, species);
  }
  return tiles;
})();

function speciesFromNh5TileKey(key: string | undefined): string | null {
  if (!key || !key.startsWith("mon/")) return null;
  return key.slice(4).replace(/_(?:male|female)$/, "").replace(/\.\d+$/, "");
}

/**
 * The light a map glyph gives off when it shows a glowing monster. Works for
 * NetHack 5 and 3.6.7; SLASH'EM's monster list is not bundled, so it never
 * matches there.
 */
export function resolveGlowingMonsterLight(glyph: unknown): GlowLight | null {
  if (typeof glyph !== "number" || !Number.isFinite(glyph)) return null;
  const version = getActiveGlyphCatalogVersion();
  if (version === "slashem") return null;
  const entry = getGlyphCatalogEntry(Math.trunc(glyph));
  if (!entry || !LIVE_MONSTER_KINDS.has(entry.kind) || typeof entry.tileIndex !== "number") return null;
  const species = version === "5.0"
    ? speciesFromNh5TileKey(NH5_TILE_KEYS[entry.tileIndex])
    : GLOWING_TILES_367.get(entry.tileIndex) ?? null;
  return species ? GLOWING_SPECIES[species] ?? null : null;
}
