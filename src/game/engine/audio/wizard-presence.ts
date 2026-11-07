import { GLYPH_CATALOG as legacyGlyphCatalog, GLYPH_CATALOG_RANGES as legacyGlyphRanges } from "../../glyphs/glyph-catalog.367.generated";
import { getActiveGlyphCatalogVersion, getGlyphCatalogEntry } from "../../glyphs/registry";
import type { GlyphKind } from "../../glyphs/types";
import { translateNh5TileIndexToNh367 } from "../../tileset-367-to-5-translation";
import { VULTURE_MONSTER_KEYS_367 } from "../../vulture/vulture-monster-keys.367.generated";

/** The Wizard's tile in NetHack 3.6.7, which NetHack 5 tiles translate to. */
const WIZARD_TILE_367 = (() => {
  const monsterIndex = VULTURE_MONSTER_KEYS_367.indexOf("PM_WIZARD_OF_YENDOR");
  const start = legacyGlyphRanges.find((range) => range.kind === "mon")?.start;
  if (monsterIndex < 0 || start === undefined) return null;
  return legacyGlyphCatalog.find((entry) => entry.glyph === start + monsterIndex)?.tileIndex ?? null;
})();

/** Him in person, as a pet (!), sensed by telepathy, or ridden. Not a corpse or statue. */
const LIVE_MONSTER_KINDS: ReadonlySet<GlyphKind> = new Set(["mon", "pet", "detect", "ridden"]);

/**
 * Whether a map glyph shows the Wizard of Yendor. Works for NetHack 3.6.7 and
 * 5; SLASH'EM's monster list is not bundled, so it never matches there.
 */
export function isWizardOfYendorGlyph(glyph: unknown): boolean {
  if (WIZARD_TILE_367 === null || typeof glyph !== "number" || !Number.isFinite(glyph)) return false;
  const version = getActiveGlyphCatalogVersion();
  if (version === "slashem") return false;
  const entry = getGlyphCatalogEntry(Math.trunc(glyph));
  if (!entry || !LIVE_MONSTER_KINDS.has(entry.kind) || typeof entry.tileIndex !== "number") return false;
  const tile = version === "5.0" ? translateNh5TileIndexToNh367(entry.tileIndex) : entry.tileIndex;
  return tile === WIZARD_TILE_367;
}

/** Tracks the map cells currently showing the Wizard (he may have doubles). */
export class WizardPresenceTracker {
  private readonly cells = new Set<string>();

  constructor(private readonly isWizard: (glyph: unknown) => boolean = isWizardOfYendorGlyph) {}

  get present(): boolean {
    return this.cells.size > 0;
  }

  /** A map_glyph tile; returns whether presence changed. */
  update(event: unknown): boolean {
    const tile = event as { x?: unknown; y?: unknown; glyph?: unknown } | null | undefined;
    if (!tile || typeof tile.x !== "number" || typeof tile.y !== "number") return false;
    const before = this.present;
    const key = `${Math.trunc(tile.x)},${Math.trunc(tile.y)}`;
    if (this.isWizard(tile.glyph)) this.cells.add(key);
    else this.cells.delete(key);
    return this.present !== before;
  }

  /** Level change: the old map is gone. Returns whether presence changed. */
  clear(): boolean {
    const before = this.present;
    this.cells.clear();
    return before;
  }
}
