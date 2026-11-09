import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { classifyCarriedLight, resolveCarriedLight, sampleFlicker } from "./carried-light";
import {
  DEFAULT_LIGHT_FIELD_TUNING,
  LightField,
  computeLightReach,
  findLitRooms,
  type LightFieldDependencies,
} from "./light-field";
import { WorldShading, createWorldShadingUniforms } from "./world-shading";
import { getGlyphCatalogRanges } from "../../glyphs/registry";

describe("carried light sources", () => {
  it("reads lit sources and their NetHack radius from inventory text", () => {
    expect(classifyCarriedLight("a brass lantern (lit)")).toEqual({ kind: "lantern", radius: 1 });
    expect(classifyCarriedLight("an oil lamp (lit)")).toEqual({ kind: "lamp", radius: 1 });
    expect(classifyCarriedLight("a lamp (lit)")).toEqual({ kind: "lamp", radius: 1 });
    expect(classifyCarriedLight("a magic lamp (lit)")).toEqual({ kind: "magic", radius: 1 });
    expect(classifyCarriedLight("2 wax candles (lit)")).toEqual({ kind: "candle", radius: 2 });
    expect(classifyCarriedLight("7 tallow candles (lit)")).toEqual({ kind: "candle", radius: 3 });
    expect(classifyCarriedLight("the Candelabrum of Invocation (7 candles, lit)")).toEqual({ kind: "candle", radius: 4 });
    expect(classifyCarriedLight("Sunsword (weapon in hand, lit)")).toEqual({ kind: "sunlight", radius: 1 });
    expect(classifyCarriedLight("a brass lantern")).toBeNull();
    expect(classifyCarriedLight("a lit candle shop flyer")).toBeNull();
  });

  it("picks the brightest lit item and ignores categories", () => {
    expect(resolveCarriedLight([
      { text: "Tools", isCategory: true },
      { text: "a brass lantern (lit)" },
      { text: "3 wax candles (lit)" },
      { text: "an oil lamp" },
    ])).toEqual({ kind: "candle", radius: 2 });
    expect(resolveCarriedLight([])).toBeNull();
  });

  it("keeps steady sources steady and flames within a few percent", () => {
    expect(sampleFlicker(12.3, 0)).toBe(1);
    for (let t = 0; t < 10; t += 0.37) {
      expect(Math.abs(sampleFlicker(t, 1) - 1)).toBeLessThan(0.15);
    }
  });
});

describe("lit rooms and light reach", () => {
  const columns = 12, rows = 8;
  const grid = (cells: Array<[number, number]>) => {
    const out = new Uint8Array(columns * rows);
    for (const [x, y] of cells) out[y * columns + x] = 1;
    return out;
  };

  it("finds lit rooms as rectangles and ignores the lit squares around a hero in a dark room", () => {
    const room: Array<[number, number]> = [];
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 6; x++) if (!(x === 4 && y === 3)) room.push([x, y]);
    expect(findLitRooms(grid(room), columns, rows, { x: 4, y: 3 })).toEqual([{ minX: 2, minY: 2, maxX: 6, maxY: 4 }]);

    const darkRoomPatch: Array<[number, number]> = [[8, 5], [9, 5], [10, 5], [8, 6], [10, 6]];
    expect(findLitRooms(grid(darkRoomPatch), columns, rows, { x: 9, y: 6 })).toEqual([]);
  });

  it("reaches cells in a straight clear line, including the wall that stops it", () => {
    const wall = grid([[5, 3]]);
    const reach = new Uint8Array(columns * rows);
    computeLightReach(wall, columns, rows, 3, 3, 3, reach);
    expect(reach[3 * columns + 3]).toBe(1);
    expect(reach[3 * columns + 4]).toBe(1);
    expect(reach[3 * columns + 5]).toBe(1); // the wall face toward the hero
    expect(reach[3 * columns + 6]).toBe(0); // behind the wall
    expect(reach[3 * columns + 7]).toBe(0); // out of range anyway
    expect(reach[0 * columns + 3]).toBe(1);
  });
});

describe("LightField", () => {
  const cmap = getGlyphCatalogRanges().find((range) => range.kind === "cmap")!.start;
  const litFloor = cmap + 19;
  const wall = cmap + 1;

  function fixture() {
    const tileMap = new Map<string, THREE.Mesh>();
    const uniforms = createWorldShadingUniforms({ maxDarkAlpha: 0.82, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const state = { inventory: [] as unknown[], enabled: true };
    const lights = new LightField({
      camera: { camera: new THREE.PerspectiveCamera() },
      engineState: { get clientOptions() { return { lightingEnabled: true, dynamicLighting: state.enabled }; } },
      lighting: { vignetteUniforms: uniforms, lightingVignetteMaxDarkAlpha: 0.82 },
      movementInput: { isFpsMode: () => false },
      playerMovement: { playerPos: { x: 4, y: 3 }, hasSeenPlayerPosition: true },
      promptDialogs: { get currentInventory() { return state.inventory; } },
      terminalRendering: { isTerminalDisplayMode: () => false },
      tileRendering: { tileMap },
      tilesetAssets: { shouldUseVultureTiles: () => false },
    } as unknown as LightFieldDependencies);
    const put = (x: number, y: number, glyph: number, isWall = false) => {
      const mesh = new THREE.Mesh();
      mesh.userData = { tileX: x, tileY: y, sourceGlyph: glyph, isWall };
      tileMap.set(`${x},${y}`, mesh);
    };
    return { lights, uniforms, state, put };
  }

  it("lights a room, softens the old darkening and follows the carried light", () => {
    const { lights, uniforms, state, put } = fixture();
    for (let y = 1; y <= 5; y++) {
      for (let x = 1; x <= 8; x++) {
        const edge = y === 1 || y === 5 || x === 1 || x === 8;
        put(x, y, edge ? wall : litFloor, edge);
      }
    }
    lights.update(0);
    expect(lights.rooms).toEqual([{ minX: 2, minY: 2, maxX: 7, maxY: 4 }]);
    expect(uniforms.uLightFieldEnabled.value).toBe(1);
    expect(uniforms.uLightField.value).toBeInstanceOf(THREE.DataTexture);
    expect(uniforms.uMaxDarkAlpha.value).toBe(DEFAULT_LIGHT_FIELD_TUNING.vignette);
    const personal = uniforms.uPlayerLightColor.value.clone();

    state.inventory = [{ text: "a magic lamp (lit)" }];
    lights.update(16);
    expect(lights.carriedLight).toEqual({ kind: "magic", radius: 1 });
    // Bluish and brighter than the hero's own small light.
    expect(uniforms.uPlayerLightColor.value.z).toBeGreaterThan(uniforms.uPlayerLightColor.value.x);
    expect(uniforms.uPlayerLightColor.value.length()).toBeGreaterThan(personal.length());
    expect(uniforms.uPlayerLightRadius.value).toBeCloseTo(1 + DEFAULT_LIGHT_FIELD_TUNING.carriedReachBonus);

    state.enabled = false;
    lights.update(32);
    expect(uniforms.uLightFieldEnabled.value).toBe(0);
    expect(uniforms.uMaxDarkAlpha.value).toBe(0.82);
    lights.dispose();
  });
});

describe("WorldShading world light", () => {
  it("uses surface direction on terrain and the sprite centre on entities", () => {
    const shading = new WorldShading({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const compile = (material: THREE.Material, options = {}) => {
      const base = material instanceof THREE.SpriteMaterial ? THREE.ShaderLib.sprite : THREE.ShaderLib.basic;
      const shader = { uniforms: {}, vertexShader: base.vertexShader, fragmentShader: base.fragmentShader } as Parameters<THREE.Material["onBeforeCompile"]>[0];
      shading.patchMaterial(material, options);
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      return shader;
    };
    const terrain = compile(new THREE.MeshBasicMaterial(), { faceShade: true });
    expect(terrain.uniforms.uLightField).toBe(shading.uniforms.uLightField);
    expect(terrain.fragmentShader).toContain("lightNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)))");
    const sprite = compile(new THREE.SpriteMaterial());
    expect(sprite.uniforms.uPlayerLightColor).toBe(shading.uniforms.uPlayerLightColor);
    expect(sprite.fragmentShader).toContain("uLightFieldEnabled");
    expect(sprite.fragmentShader).not.toContain("dFdx(vWorldPos)");
  });
});
