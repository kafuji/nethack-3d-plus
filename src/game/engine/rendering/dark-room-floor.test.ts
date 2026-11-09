import * as THREE from "three";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), location: { protocol: "http:", hostname: "localhost" } }));
import { createEngineSystems } from "../create-engine-systems";
import type { EngineCoordinator } from "../engine-coordinator";
import { getGlyphCatalogRanges } from "../../glyphs/registry";
import { getDefaultFloorGlyph } from "../../glyphs/behavior";

afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

function fixture(dynamicLighting: boolean) {
  const s = createEngineSystems({} as EngineCoordinator);
  s.engineState.clientOptions.tilesetMode = "tiles";
  s.engineState.clientOptions.lightingEnabled = true;
  s.engineState.clientOptions.dynamicLighting = dynamicLighting;
  s.renderPipeline.scene = new THREE.Scene();
  vi.spyOn(s.tilesetAssets, "shouldUseVultureTiles").mockReturnValue(false);
  vi.spyOn(s.glyphTextures, "createTileTexture").mockReturnValue(new THREE.CanvasTexture({} as HTMLCanvasElement));
  vi.spyOn(s.entityBillboards, "ensureMonsterBillboard").mockImplementation(() => {});
  vi.spyOn(s.vultureWalls, "refreshVultureWallMaterialsNear").mockImplementation(() => {});
  vi.spyOn(s.minimap, "queueMinimapTileUpdate").mockImplementation(() => {});
  const ranges = getGlyphCatalogRanges();
  const darkRoom = ranges.find((range) => range.kind === "cmap")!.start + 20;
  const item = ranges.find((range) => range.kind === "obj")!.start + 1;
  return { s, darkRoom, item };
}

describe("remembered dark-room floor under world lighting", () => {
  it("uses the room floor tile so the lighting alone sets its brightness", () => {
    const { s, darkRoom } = fixture(true);
    s.tileRendering.updateTile(4, 5, darkRoom, ".", 0);
    const mesh = s.tileRendering.tileMap.get("4,5")!;
    expect(mesh.userData.tileTextureSourceGlyph).toBe(getDefaultFloorGlyph());
    expect(mesh.userData.materialKind).toBe("floor");
    // The game's own glyph is kept for everything else, such as finding lit rooms.
    expect(mesh.userData.sourceGlyph).toBe(darkRoom);
  });

  it("draws the same floor under an item lying on remembered floor", () => {
    const { s, darkRoom, item } = fixture(true);
    s.tileRendering.updateTile(4, 5, darkRoom, ".", 0);
    s.tileRendering.updateTile(4, 5, item, ")", 7);
    expect(s.tileRendering.tileMap.get("4,5")!.userData.tileTextureSourceGlyph).toBe(getDefaultFloorGlyph());
  });

  it("keeps the dark tile when world lighting is off", () => {
    const { s, darkRoom } = fixture(false);
    s.tileRendering.updateTile(4, 5, darkRoom, ".", 0);
    expect(s.tileRendering.tileMap.get("4,5")!.userData.tileTextureSourceGlyph).toBe(darkRoom);
  });
});
