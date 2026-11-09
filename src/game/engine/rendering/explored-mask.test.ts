import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPLORED_MASK_TUNING,
  ExploredMask,
  buildExploredMaskAxisWeights,
  rasterizeExploredMask,
  type ExploredMaskDependencies,
} from "./explored-mask";
import { WorldShading, createWorldShadingUniforms } from "./world-shading";

const SIGMA = DEFAULT_EXPLORED_MASK_TUNING.blurTiles;

function rasterize(columns: number, rows: number, explored: Array<[number, number]>, subcells = 8) {
  const coverage = new Float32Array(columns * rows);
  for (const [x, y] of explored) coverage[y * columns + x] = 1;
  const out = new Uint8Array(columns * subcells * rows * subcells);
  rasterizeExploredMask(coverage, columns, rows, subcells, SIGMA, out);
  const width = columns * subcells;
  // Sample at a map position in tile units (tile centres on integers).
  const at = (x: number, y: number) => {
    const tx = Math.min(width - 1, Math.max(0, Math.floor((x + 0.5) * subcells)));
    const ty = Math.min(rows * subcells - 1, Math.max(0, Math.floor((y + 0.5) * subcells)));
    return out[ty * width + tx] / 255;
  };
  return { at };
}

describe("explored mask rasterization", () => {
  it("normalizes each texel's weights and only reaches neighbouring cells", () => {
    const { reach, weights } = buildExploredMaskAxisWeights(8, SIGMA);
    expect(reach).toBe(1);
    for (let s = 0; s < 8; s++) {
      const sum = weights[s * 3] + weights[s * 3 + 1] + weights[s * 3 + 2];
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it("reads one half on the boundary, full inside and nothing outside", () => {
    // Left half of a 10x5 map explored.
    const explored: Array<[number, number]> = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) explored.push([x, y]);
    const { at } = rasterize(10, 5, explored);
    // Texels straddling the x = 4.5 boundary.
    expect(at(4.5 - 1 / 16, 2)).toBeGreaterThan(0.5);
    expect(at(4.5 - 1 / 16, 2)).toBeLessThan(0.7);
    expect(at(4.5 + 1 / 16, 2)).toBeLessThan(0.5);
    expect(at(4.5 + 1 / 16, 2)).toBeGreaterThan(0.3);
    // The centre of the last explored cell is already (almost) fully known.
    expect(at(4, 2)).toBeGreaterThan(0.95);
    expect(at(2, 2)).toBe(1);
    expect(at(7, 2)).toBe(0);
  });

  it("rounds convex corners and keeps a lone cell's centre visible", () => {
    const explored: Array<[number, number]> = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) explored.push([x, y]);
    const { at } = rasterize(8, 6, explored);
    // A convex corner reads about a quarter, so it fades out before the edge midpoints do.
    expect(at(2.5 - 1 / 16, 2.5 - 1 / 16)).toBeLessThan(at(1, 2.5 - 1 / 16));
    expect(at(2.5 - 1 / 16, 2.5 - 1 / 16)).toBeLessThan(0.45);

    const lone = rasterize(5, 5, [[2, 2]]);
    expect(lone.at(2, 2)).toBeGreaterThan(0.9);
    // Well below the fade start, so the neighbouring cell stays dark.
    expect(lone.at(1, 2)).toBeLessThan(DEFAULT_EXPLORED_MASK_TUNING.fadeStart / 4);
  });
});

function maskFixture(options: Partial<{ enabled: boolean; terminal: boolean; vulture: boolean }> = {}) {
  const tileMap = new Map<string, THREE.Mesh>();
  const uniforms = createWorldShadingUniforms({
    maxDarkAlpha: 0.8,
    bloodGroundStrength: 1,
    bloodGroundSpecularReferenceStrength: 1,
  });
  const state = { enabled: options.enabled ?? true, terminal: options.terminal ?? false, vulture: options.vulture ?? false };
  const deps = {
    engineState: { get clientOptions() { return { smoothExploredEdges: state.enabled }; } },
    lighting: { vignetteUniforms: uniforms },
    terminalRendering: { isTerminalDisplayMode: () => state.terminal },
    tileRendering: { tileMap },
    tilesetAssets: { shouldUseVultureTiles: () => state.vulture },
  } as unknown as ExploredMaskDependencies;
  const mask = new ExploredMask(deps);
  const addTile = (x: number, y: number, userData: Record<string, unknown> = {}) => {
    const mesh = new THREE.Mesh();
    mesh.userData = { tileX: x, tileY: y, ...userData };
    tileMap.set(`${x},${y}`, mesh);
  };
  return { mask, tileMap, uniforms, state, addTile };
}

describe("ExploredMask", () => {
  it("shows the existing map at once when it first activates, then fades new cells in", () => {
    const { mask, uniforms, addTile } = maskFixture();
    addTile(10, 5);
    mask.update(0);
    expect(uniforms.uExploredMaskEnabled.value).toBe(1);
    expect(uniforms.uExploredMask.value).toBeInstanceOf(THREE.DataTexture);
    expect(mask.getCellCoverage(10, 5)).toBe(1);

    addTile(11, 5);
    mask.update(16);
    const early = mask.getCellCoverage(11, 5);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.1);
    mask.update(16 + DEFAULT_EXPLORED_MASK_TUNING.revealMs / 2);
    expect(mask.getCellCoverage(11, 5)).toBeGreaterThan(0.4);
    mask.update(16 + DEFAULT_EXPLORED_MASK_TUNING.revealMs * 2);
    expect(mask.getCellCoverage(11, 5)).toBe(1);
    mask.dispose();
    expect(uniforms.uExploredMask.value).toBeNull();
  });

  it("ignores 3.6.7 blank-stone fillers and cells off the map", () => {
    const { mask, addTile, tileMap } = maskFixture();
    addTile(3, 3, { isVoidFill: true });
    addTile(4, 3);
    const offMap = new THREE.Mesh();
    offMap.userData = { tileX: 90, tileY: 3 };
    tileMap.set("90,3", offMap);
    mask.update(0);
    expect(mask.getCellCoverage(3, 3)).toBe(0);
    expect(mask.getCellCoverage(4, 3)).toBe(1);
    mask.dispose();
  });

  it("turns off in terminal and Vulture views and when the option is off", () => {
    const { mask, uniforms, state, addTile } = maskFixture();
    addTile(1, 1);
    mask.update(0);
    expect(uniforms.uExploredMaskEnabled.value).toBe(1);
    for (const key of ["terminal", "vulture"] as const) {
      state[key] = true;
      mask.update(10);
      expect(uniforms.uExploredMaskEnabled.value).toBe(0);
      state[key] = false;
    }
    state.enabled = false;
    mask.update(20);
    expect(uniforms.uExploredMaskEnabled.value).toBe(0);
    mask.dispose();
  });

  it("forgets the level at once on reset", () => {
    const { mask, tileMap, addTile } = maskFixture();
    addTile(6, 6);
    mask.update(0);
    tileMap.clear();
    mask.reset();
    mask.update(5);
    expect(mask.getCellCoverage(6, 6)).toBe(0);
    mask.dispose();
  });
});

describe("WorldShading explored fade", () => {
  function compile(shading: WorldShading, material: THREE.Material, options = {}) {
    const base = material instanceof THREE.SpriteMaterial ? THREE.ShaderLib.sprite : THREE.ShaderLib.basic;
    const shader = {
      uniforms: {},
      vertexShader: base.vertexShader,
      fragmentShader: base.fragmentShader,
    } as Parameters<THREE.Material["onBeforeCompile"]>[0];
    shading.patchMaterial(material, options);
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    return { shader, key: material.customProgramCacheKey() };
  }

  it("fades terrain but leaves entities and sprites alone", () => {
    const shading = new WorldShading({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const terrain = compile(shading, new THREE.MeshBasicMaterial(), { faceShade: true });
    expect(terrain.shader.fragmentShader).toContain("uExploredMask");
    expect(terrain.shader.uniforms.uExploredMask).toBe(shading.uniforms.uExploredMask);
    expect(terrain.key).toContain("_explored_mask_v1");

    const entity = compile(shading, new THREE.MeshBasicMaterial(), { entity: true });
    expect(entity.shader.fragmentShader).not.toContain("uExploredMask");
    expect(entity.key).not.toContain("_explored_mask");

    const sprite = compile(shading, new THREE.SpriteMaterial());
    expect(sprite.shader.fragmentShader).not.toContain("uExploredMask");
  });
});
