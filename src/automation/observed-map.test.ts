import { describe, expect, it } from "vitest";
import type { RuntimeObservationScope } from "../runtime/protocol/types";
import { ObservedMap } from "./observed-map";
import { getGlyphCatalogRanges, setActiveGlyphCatalog } from "../game/glyphs/registry";

const scope = (levelGeneration: number, presentationGeneration = 0): RuntimeObservationScope => ({
  levelGeneration, presentationGeneration, level: { dnum: 0, dlevel: levelGeneration },
});

describe("observed map", () => {
  it("records displayed cells without exporting underlying identities or mutable references", () => {
    const map = new ObservedMap();
    map.observe({ type: "map_glyph_batch", tiles: [
      { x: 5, y: 3, char: "!", color: 2, glyph: 432, objectId: 1337, floorUnderlayGlyph: 123 },
      { x: 2, y: 1, char: "@", color: 15, monsterId: 78 },
      { x: -1, y: 0, char: "?" }, { x: 1.5, y: 0, char: "?" },
    ] }, "s", scope(1));
    const before = map.snapshot();
    expect(before.cells).toEqual([{ x: 2, y: 1, char: "@", color: 15, kind: "unknown" }, { x: 5, y: 3, char: "!", color: 2, kind: "creature" }]);
    before.cells[0].char = "x";
    expect(map.snapshot().cells[0].char).toBe("@");
  });

  it("applies ordered updates and undiscovered clear without keeping hidden occupants", () => {
    const map = new ObservedMap();
    map.observe({ type: "map_glyph", x: 4, y: 5, char: "d", color: 1 }, "s", scope(1));
    map.observe({ type: "map_glyph", x: 4, y: 5, char: ".", color: 7 }, "s", scope(1));
    expect(map.snapshot().cells).toEqual([{ x: 4, y: 5, char: ".", color: 7, kind: "unknown" }]);
    const revision = map.snapshot().revision;
    map.observe({ type: "map_glyph", x: 4, y: 5, isRuntimeUndiscoveredClear: true }, "s", scope(1));
    expect(map.snapshot().cells).toEqual([]);
    expect(map.snapshot().revision).toBeGreaterThan(revision);
  });

  it("clears the displayed map at a level change, presentation reset, and session change", () => {
    const map = new ObservedMap();
    map.observe({ type: "map_glyph", x: 1, y: 2, char: "." }, "s", scope(1));
    map.observe({ type: "status_update" }, "s", scope(2));
    expect(map.snapshot()).toMatchObject({ levelGeneration: 2, cells: [] });
    map.observe({ type: "map_glyph", x: 2, y: 3, char: "#" }, "s", scope(2));
    map.observe({ type: "clear_scene" }, "s", scope(2, 1));
    expect(map.snapshot()).toMatchObject({ levelGeneration: 2, presentationGeneration: 1, cells: [] });
    map.observe({ type: "map_glyph", x: 3, y: 4, char: "@" }, "s", scope(2, 1));
    map.observe({ type: "status_update" }, "s2", scope(1));
    expect(map.snapshot()).toMatchObject({ levelGeneration: 1, cells: [] });
  });

  it("classifies IBM display characters from displayed glyphs without leaking underlying data", () => {
    const map = new ObservedMap();
    map.observe({ type: "map_glyph_batch", tiles: [
      { x: 1, y: 1, glyph: 2359 + 19, symidx: 19, char: "ú", color: 7, floorUnderlayGlyph: 999 },
      { x: 2, y: 1, glyph: 2359 + 1, symidx: 1, char: "³", color: 7 },
      { x: 3, y: 1, glyph: 2359 + 15, symidx: 15, char: "+", color: 7 },
      { x: 4, y: 1, glyph: 2359 + 13, symidx: 13, char: "þ", color: 7 },
      { x: 5, y: 1, glyph: 2359 + 23, symidx: 23, char: "<", color: 7 },
      { x: 6, y: 1, glyph: 1906, char: "!", color: 3, identifier: 42 },
      { x: 7, y: 1, glyph: 0, char: "a", color: 3, monsterId: 42 },
    ] }, "s", scope(1));
    expect(map.snapshot().cells.map(cell => cell.kind)).toEqual(["floor", "wall", "door_closed", "door_open", "stairs_up", "item", "creature"]);
    expect(JSON.stringify(map.snapshot())).not.toMatch(/glyph|identifier|monsterId|underlay/i);
  });

  it.each(["3.6.7", "5.0", "slashem"] as const)("uses the %s catalog when classifying observed cells", async version => {
    try {
      await setActiveGlyphCatalog(version);
      const start = getGlyphCatalogRanges().find(range => range.kind === "cmap")!.start;
      const map = new ObservedMap();
      map.observe({ type: "map_glyph_batch", tiles: [
        { x: 1, y: 1, glyph: start + 1, symidx: 19, char: "ú" },
        { x: 2, y: 1, glyph: start + 1, symidx: 1, char: "³" },
      ] }, "s", scope(1));
      expect(map.snapshot().cells.map(cell => cell.kind)).toEqual(["floor", "wall"]);
    } finally {
      await setActiveGlyphCatalog("3.6.7");
    }
  });
});
