import { afterAll, describe, expect, it } from "vitest";
import { getGlyphCatalogEntriesForVersion, setActiveGlyphCatalog } from "../../game/glyphs/registry";
import { resolvePlayerTileTerrainId } from "./terrain-names";

async function firstCmapGlyph(version: "3.6.7" | "5.0", asciiChar: string): Promise<number> {
  const entries = await getGlyphCatalogEntriesForVersion(version);
  const entry = entries.find((candidate) => candidate.kind === "cmap" && candidate.asciiChar === asciiChar);
  if (!entry) throw new Error(`no cmap glyph for ${asciiChar}`);
  return entry.glyph;
}

describe("resolvePlayerTileTerrainId", () => {
  afterAll(async () => {
    await setActiveGlyphCatalog("3.6.7");
  });

  for (const version of ["3.6.7", "5.0"] as const) {
    it(`names ${version} map features`, async () => {
      await setActiveGlyphCatalog(version);
      expect(resolvePlayerTileTerrainId({ glyph: await firstCmapGlyph(version, "<") })).toBe("stairsUp");
      expect(resolvePlayerTileTerrainId({ glyph: await firstCmapGlyph(version, ">") })).toBe("stairsDown");
      // 3.7 draws sinks with "{" too, ahead of fountains.
      expect(resolvePlayerTileTerrainId({ glyph: await firstCmapGlyph(version, "{") })).toBe(
        version === "5.0" ? "sink" : "fountain",
      );
      expect(resolvePlayerTileTerrainId({ glyph: await firstCmapGlyph(version, "_") })).toBe("altar");
      expect(resolvePlayerTileTerrainId({ glyph: await firstCmapGlyph(version, "|") })).toBeNull();
    });
  }

  it("ignores missing snapshots", () => {
    expect(resolvePlayerTileTerrainId(null)).toBeNull();
  });
});
