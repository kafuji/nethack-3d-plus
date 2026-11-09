import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { isLavaCmapGlyph, isLitFloorCmapGlyph } from "../../glyphs/behavior";
import { getGlyphCatalogEntry, getGlyphCatalogRanges, setActiveGlyphCatalog } from "../../glyphs/registry";
import { NH5_TILE_KEYS } from "../../hires-tiles/tile-keys.5.generated";
import { VULTURE_MONSTER_KEYS_367 } from "../../vulture/vulture-monster-keys.367.generated";
import { resolveGlowingMonsterLight } from "./glowing-monsters";
import { LIGHT_FIELD_RANGE, LIGHT_FIELD_SUBCELLS, LightField, type LightFieldDependencies } from "./light-field";
import { WorldShading, createWorldShadingUniforms } from "./world-shading";

afterEach(async () => {
  await setActiveGlyphCatalog("3.6.7");
});

function cmapGlyph(symidx: number): number {
  const range = getGlyphCatalogRanges().find((entry) => entry.kind === "cmap")!;
  for (let glyph = range.start; glyph < range.endExclusive; glyph++) {
    if (getGlyphCatalogEntry(glyph)?.symidx === symidx) return glyph;
  }
  return range.start + symidx;
}

describe("light-related glyphs per runtime", () => {
  it("finds the lit corridor and lava in NetHack 3.6.7", async () => {
    await setActiveGlyphCatalog("3.6.7");
    expect(isLitFloorCmapGlyph(cmapGlyph(19))).toBe("room");
    expect(isLitFloorCmapGlyph(cmapGlyph(21))).toBeNull(); // corridor
    expect(isLitFloorCmapGlyph(cmapGlyph(22))).toBe("corridor");
    expect(isLavaCmapGlyph(cmapGlyph(34))).toBe(true);
  });

  it("follows NetHack 5's shifted corridor and lava symbols", async () => {
    await setActiveGlyphCatalog("5.0");
    expect(isLitFloorCmapGlyph(cmapGlyph(19))).toBe("room");
    expect(isLitFloorCmapGlyph(cmapGlyph(22))).toBeNull(); // plain corridor in NetHack 5
    expect(isLitFloorCmapGlyph(cmapGlyph(23))).toBe("corridor");
    expect(isLavaCmapGlyph(cmapGlyph(40))).toBe(true);
    expect(isLavaCmapGlyph(cmapGlyph(34))).toBe(false); // a grave in NetHack 5
  });

  it("recognises glowing monsters in both runtimes", async () => {
    await setActiveGlyphCatalog("3.6.7");
    const monStart = getGlyphCatalogRanges().find((range) => range.kind === "mon")!.start;
    expect(resolveGlowingMonsterLight(monStart + VULTURE_MONSTER_KEYS_367.indexOf("PM_FIRE_ELEMENTAL"))).not.toBeNull();
    expect(resolveGlowingMonsterLight(monStart + VULTURE_MONSTER_KEYS_367.indexOf("PM_YELLOW_LIGHT"))).not.toBeNull();
    expect(resolveGlowingMonsterLight(monStart + VULTURE_MONSTER_KEYS_367.indexOf("PM_GIANT_ANT"))).toBeNull();

    await setActiveGlyphCatalog("5.0");
    const mon = getGlyphCatalogRanges().find((range) => range.kind === "mon")!;
    const glyphFor = (key: string) => {
      for (let glyph = mon.start; glyph < mon.endExclusive; glyph++) {
        const tile = getGlyphCatalogEntry(glyph)?.tileIndex;
        if (typeof tile === "number" && NH5_TILE_KEYS[tile] === key) return glyph;
      }
      throw new Error(key);
    };
    expect(resolveGlowingMonsterLight(glyphFor("mon/gold_dragon_male"))).not.toBeNull();
    expect(resolveGlowingMonsterLight(glyphFor("mon/black_light_male"))?.color[2]).toBeGreaterThan(0.8);
    expect(resolveGlowingMonsterLight(glyphFor("mon/giant_ant_male"))).toBeNull();
  });
});

describe("LightField glows, magic light and memory", () => {
  function fixture() {
    const tileMap = new Map<string, THREE.Mesh>();
    const uniforms = createWorldShadingUniforms({ maxDarkAlpha: 0.82, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const player = { playerPos: { x: 4, y: 3 }, hasSeenPlayerPosition: true };
    const lights = new LightField({
      camera: { camera: new THREE.PerspectiveCamera() },
      engineState: { clientOptions: { lightingEnabled: true, dynamicLighting: true } },
      lighting: { vignetteUniforms: uniforms, lightingVignetteMaxDarkAlpha: 0.82 },
      movementInput: { isFpsMode: () => false },
      playerMovement: player,
      promptDialogs: { currentInventory: [] },
      terminalRendering: { isTerminalDisplayMode: () => false },
      tileRendering: { tileMap },
      tilesetAssets: { shouldUseVultureTiles: () => false },
    } as unknown as LightFieldDependencies);
    const put = (x: number, y: number, glyph: number, isWall = false) => {
      const mesh = new THREE.Mesh();
      mesh.userData = { tileX: x, tileY: y, sourceGlyph: glyph, isWall };
      tileMap.set(`${x},${y}`, mesh);
    };
    const texel = (x: number, y: number) => {
      const data = (uniforms.uLightField.value as THREE.DataTexture).image.data as Uint8Array;
      const width = lights.columns * LIGHT_FIELD_SUBCELLS;
      const middle = Math.floor(LIGHT_FIELD_SUBCELLS / 2);
      const base = ((y * LIGHT_FIELD_SUBCELLS + middle) * width + x * LIGHT_FIELD_SUBCELLS + middle) * 4;
      return [0, 1, 2].map((c) => (data[base + c] / 255) * LIGHT_FIELD_RANGE);
    };
    return { lights, uniforms, put, texel };
  }

  it("lets lava glow orange into a dark corridor", async () => {
    await setActiveGlyphCatalog("5.0");
    const { lights, put, texel } = fixture();
    const corridor = cmapGlyph(22);
    for (let x = 10; x <= 20; x++) put(x, 10, corridor);
    put(15, 10, cmapGlyph(40));
    lights.update(0);
    const [red, green] = texel(15, 10);
    const ambient = texel(20, 10);
    expect(red).toBeGreaterThan(ambient[0] + 0.3);
    expect(red).toBeGreaterThan(green);
    lights.dispose();
  });

  it("tints a room lit by a light scroll blue", async () => {
    await setActiveGlyphCatalog("5.0");
    const { lights, put, texel } = fixture();
    const room = cmapGlyph(19);
    for (let y = 2; y <= 6; y++) for (let x = 2; x <= 9; x++) put(x, y, room);
    lights.update(0);
    const [plainRed, , plainBlue] = texel(6, 4);
    expect(plainRed).toBeGreaterThan(plainBlue);
    lights.captureMessage("A lit field surrounds you!");
    lights.update(1000);
    const [magicRed, , magicBlue] = texel(6, 4);
    expect(magicBlue).toBeGreaterThan(magicRed);
    lights.reset();
    expect(lights.magicLightZones).toEqual([]);
    lights.dispose();
  });

  it("fades the colour of remembered terrain only", () => {
    const shading = new WorldShading({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const compile = (material: THREE.Material, options = {}) => {
      const base = material instanceof THREE.SpriteMaterial ? THREE.ShaderLib.sprite : THREE.ShaderLib.basic;
      const shader = { uniforms: {}, vertexShader: base.vertexShader, fragmentShader: base.fragmentShader } as Parameters<THREE.Material["onBeforeCompile"]>[0];
      shading.patchMaterial(material, options);
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      return shader;
    };
    expect(compile(new THREE.MeshBasicMaterial()).fragmentShader).toContain("memorySaturation");
    expect(compile(new THREE.MeshBasicMaterial(), { entity: true }).fragmentShader).not.toContain("memorySaturation");
    expect(compile(new THREE.SpriteMaterial()).fragmentShader).not.toContain("memorySaturation");
  });
});
