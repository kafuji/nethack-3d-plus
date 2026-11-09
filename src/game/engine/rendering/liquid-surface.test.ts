import * as THREE from "three";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), location: { protocol: "http:", hostname: "localhost" } }));
import { createEngineSystems } from "../create-engine-systems";
import type { EngineCoordinator } from "../engine-coordinator";
import { getGlyphCatalogRanges } from "../../glyphs/registry";
import { WorldShading, setLiquidSurface } from "./world-shading";

afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

describe("liquid surfaces", () => {
  it("animates only materials that opt in, with a per-material kind", () => {
    const shading = new WorldShading({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const compile = (material: THREE.Material, options = {}) => {
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.basic.vertexShader,
        fragmentShader: THREE.ShaderLib.basic.fragmentShader,
      } as Parameters<THREE.Material["onBeforeCompile"]>[0];
      shading.patchMaterial(material, options);
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      return { shader, key: material.customProgramCacheKey() };
    };
    const overlay = new THREE.MeshBasicMaterial();
    const { shader, key } = compile(overlay, { faceShade: true, liquid: true });
    expect(shader.fragmentShader).toContain("liquidUv");
    expect(shader.fragmentShader).not.toContain("#include <map_fragment>");
    expect(shader.uniforms.uWorldTime).toBe(shading.uniforms.uWorldTime);
    expect(key).toContain("_liquid_v1");
    setLiquidSurface(overlay, 2);
    expect((shader.uniforms.uLiquid as { value: number }).value).toBe(2);

    const plain = compile(new THREE.MeshBasicMaterial(), { faceShade: true });
    expect(plain.shader.fragmentShader).not.toContain("liquidUv");
    // Blood decals keep their own map handling.
    const blood = compile(new THREE.MeshBasicMaterial(), { liquid: true, bloodGroundDiscardEmptyTexels: true });
    expect(blood.shader.fragmentShader).not.toContain("liquidUv");
  });

  it("marks pool tiles as water, lava tiles as lava and floor as still", () => {
    const s = createEngineSystems({} as EngineCoordinator);
    s.engineState.clientOptions.tilesetMode = "tiles";
    s.renderPipeline.scene = new THREE.Scene();
    vi.spyOn(s.tilesetAssets, "shouldUseVultureTiles").mockReturnValue(false);
    vi.spyOn(s.glyphTextures, "createTileTexture").mockReturnValue(new THREE.CanvasTexture({} as HTMLCanvasElement));
    vi.spyOn(s.entityBillboards, "ensureMonsterBillboard").mockImplementation(() => {});
    vi.spyOn(s.vultureWalls, "refreshVultureWallMaterialsNear").mockImplementation(() => {});
    vi.spyOn(s.minimap, "queueMinimapTileUpdate").mockImplementation(() => {});
    const cmap = getGlyphCatalogRanges().find((range) => range.kind === "cmap")!.start;
    const liquidOf = (x: number) =>
      (s.glyphTextures.glyphOverlayMap.get(`${x},5`)!.material.userData.nh3dLiquid as { value: number }).value;
    // NetHack 3.6.7 symbols: 32 pool, 34 lava, 19 room floor.
    s.tileRendering.updateTile(4, 5, cmap + 32, "}", 4);
    s.tileRendering.updateTile(5, 5, cmap + 34, "}", 1);
    s.tileRendering.updateTile(6, 5, cmap + 19, ".", 7);
    expect(liquidOf(4)).toBe(1);
    expect(liquidOf(5)).toBe(2);
    expect(liquidOf(6)).toBe(0);
  });
});
