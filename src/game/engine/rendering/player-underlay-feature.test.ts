import * as THREE from "three";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), location: { protocol: "http:", hostname: "localhost" } }));
import { createEngineSystems } from "../create-engine-systems";
import type { EngineCoordinator } from "../engine-coordinator";
import { getGlyphCatalogRanges } from "../../glyphs/registry";
import { classifyTileBehavior, getDefaultFloorGlyph } from "../../glyphs/behavior";

afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

function overheadTilesFixture() {
  const s = createEngineSystems({} as EngineCoordinator);
  s.engineState.clientOptions.tilesetMode = "tiles";
  s.engineState.clientOptions.showItemsUnderPlayerInOverheadTilesMode = true;
  s.renderPipeline.scene = new THREE.Scene();
  vi.spyOn(s.tilesetAssets, "shouldUseVultureTiles").mockReturnValue(false);
  vi.spyOn(s.glyphTextures, "createTileTexture").mockReturnValue(new THREE.CanvasTexture({} as HTMLCanvasElement));
  const billboard = vi.spyOn(s.entityBillboards, "ensureMonsterBillboard").mockImplementation(() => {});
  vi.spyOn(s.vultureWalls, "refreshVultureWallMaterialsNear").mockImplementation(() => {});
  vi.spyOn(s.minimap, "queueMinimapTileUpdate").mockImplementation(() => {});
  const ranges = getGlyphCatalogRanges();
  const cmap = ranges.find((range) => range.kind === "cmap")!.start;
  const player = ranges.find((range) => range.kind === "mon")!.start;
  const object = ranges.find((range) => range.kind === "obj")!.start;
  const standOn = (glyph: number, char: string) => {
    s.tileRendering.updateTile(4, 5, glyph, char, 7);
    s.playerMovement.playerPos = { x: 4, y: 5 };
    s.playerMovement.hasSeenPlayerPosition = true;
    billboard.mockClear();
    s.tileRendering.updateTile(4, 5, player, "@", 15, { runtimeTrackedEntityId: 0 });
  };
  const underlayCalls = () => billboard.mock.calls.filter((call) => call[0] === "4,5|underlay-feature");
  return { s, cmap, object, standOn, underlayCalls };
}

describe("feature under the player in overhead tiles mode", () => {
  // 24 = down stairs: the floor tile keeps showing the stairs.
  // 12 = doorway without a door: like any entity in a doorway, the player
  // stands on plain room floor (see isDisallowedSpecialDotFloorBehavior).
  it.each([[24, ">", "self"], [12, ".", "floor"]])("draws cmap %s on the floor without a standing copy", (index, char, base) => {
    const { s, cmap, standOn, underlayCalls } = overheadTilesFixture();
    const glyph = cmap + index;
    const behavior = classifyTileBehavior({ glyph, runtimeChar: char, runtimeColor: 7, priorTerrain: null });
    expect(s.worldClassification.shouldRenderFlatFeatureUnderPlayer(behavior)).toBe(true);
    expect(s.worldClassification.isFlatTerrainFeatureUnderPlayer(behavior)).toBe(true);
    standOn(glyph, char);
    expect(underlayCalls()).toEqual([]);
    expect(s.tileRendering.tileMap.get("4,5")!.userData.tileTextureSourceGlyph).toBe(
      base === "self" ? glyph : getDefaultFloorGlyph(),
    );
  });

  it("still stands an item up behind the player", () => {
    const { s, object, standOn, underlayCalls } = overheadTilesFixture();
    const item = object + 1;
    const behavior = classifyTileBehavior({ glyph: item, runtimeChar: ")", runtimeColor: 7, priorTerrain: null });
    expect(s.worldClassification.isFlatTerrainFeatureUnderPlayer(behavior)).toBe(false);
    s.worldClassification.flatFeatureUnderPlayerCache.set("4,5", { glyph: item, char: ")", color: 7 });
    standOn(item, ")");
    expect(underlayCalls().some((call) => call[8] === item)).toBe(true);
  });
});
