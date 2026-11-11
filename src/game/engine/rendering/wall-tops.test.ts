import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { getGlyphCatalogRanges } from "../../glyphs/registry";
import {
  DEFAULT_WALL_TOPS_TUNING,
  WALL_TOP_BLOCKED,
  WALL_TOP_OPEN,
  WALL_TOP_WALL,
  WallTops,
  classifyWallTopCell,
  type WallTopsDependencies,
} from "./wall-tops";
import { WorldShading, createWorldShadingUniforms } from "./world-shading";

const cmap = getGlyphCatalogRanges().find((range) => range.kind === "cmap")!.start;
const hwall = cmap + 2;
const tree = cmap + 18;

describe("wall-top cells", () => {
  it("darkens walls and inferred rock, keeps doors and other blocks, opens floor", () => {
    expect(classifyWallTopCell({ isWall: true, materialKind: "wall", tileTextureSourceGlyph: hwall })).toBe(WALL_TOP_WALL);
    expect(classifyWallTopCell({ isWall: true, materialKind: "dark_wall", isInferredDarkCorridorWall: true })).toBe(WALL_TOP_WALL);
    expect(classifyWallTopCell({ isWall: true, materialKind: "door", tileTextureSourceGlyph: cmap + 15 })).toBe(WALL_TOP_BLOCKED);
    expect(classifyWallTopCell({ isWall: true, materialKind: "wall", tileTextureSourceGlyph: tree })).toBe(WALL_TOP_BLOCKED);
    expect(classifyWallTopCell({ isWall: false, materialKind: "floor" })).toBe(WALL_TOP_OPEN);
    expect(classifyWallTopCell({ isWall: false, isVoidFill: true })).toBe(WALL_TOP_BLOCKED);
    expect(classifyWallTopCell(null)).toBe(WALL_TOP_BLOCKED);
  });
});

describe("WallTops", () => {
  function fixture() {
    const tileMap = new Map<string, THREE.Mesh>();
    const uniforms = createWorldShadingUniforms({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const state = { enabled: true, rounded: true };
    const tops = new WallTops({
      engineState: { get clientOptions() { return { darkWallTops: state.enabled }; } },
      lighting: { vignetteUniforms: uniforms },
      terminalRendering: { isTerminalDisplayMode: () => false },
      tileRendering: { tileMap },
      tilesetAssets: { shouldUseVultureTiles: () => false },
      wallGeometry: { usesRoundedWallShape: () => state.rounded, shouldUseChamferedWallGeometry: () => true },
    } as unknown as WallTopsDependencies);
    const put = (x: number, y: number, userData: Record<string, unknown>) => {
      const mesh = new THREE.Mesh();
      mesh.userData = { tileX: x, tileY: y, ...userData };
      tileMap.set(`${x},${y}`, mesh);
    };
    return { tops, uniforms, state, put };
  }

  it("uploads the grid and turns the shading on with its tuning", () => {
    const { tops, uniforms, put } = fixture();
    put(3, 2, { isWall: true, materialKind: "wall", tileTextureSourceGlyph: hwall });
    put(3, 3, { isWall: false, materialKind: "floor" });
    tops.update();
    expect(tops.getCell(3, 2)).toBe(WALL_TOP_WALL);
    expect(tops.getCell(3, 3)).toBe(WALL_TOP_OPEN);
    expect(tops.getCell(9, 9)).toBe(WALL_TOP_BLOCKED); // unknown
    expect(uniforms.uWallTopGrid.value).toBeInstanceOf(THREE.DataTexture);
    expect(uniforms.uWallTop.value.toArray()).toEqual([
      1,
      DEFAULT_WALL_TOPS_TUNING.topBrightness,
      DEFAULT_WALL_TOPS_TUNING.rimWidth,
      DEFAULT_WALL_TOPS_TUNING.rimBrightness,
    ]);
    expect(uniforms.uWallTopRounded.value).toBe(1);
    tops.dispose();
  });

  it("switches off with the option", () => {
    const { tops, uniforms, state } = fixture();
    tops.update();
    state.enabled = false;
    tops.update();
    expect(uniforms.uWallTop.value.x).toBe(0);
    tops.dispose();
  });

  it("adds the wall-top chunk to face-shaded terrain only", () => {
    const shading = new WorldShading({ maxDarkAlpha: 0.8, bloodGroundStrength: 1, bloodGroundSpecularReferenceStrength: 1 });
    const compile = (options: object) => {
      const material = new THREE.MeshBasicMaterial();
      const shader = {
        uniforms: {},
        vertexShader: THREE.ShaderLib.basic.vertexShader,
        fragmentShader: THREE.ShaderLib.basic.fragmentShader,
      } as Parameters<THREE.Material["onBeforeCompile"]>[0];
      shading.patchMaterial(material, options);
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      return shader;
    };
    const terrain = compile({ faceShade: true });
    expect(terrain.fragmentShader).toContain("nh3dWallTopCell");
    // Inner corners glow from the corner point toward a diagonal open cell.
    expect(terrain.fragmentShader).toContain("nh3dWallTopCell(topCell + topSide)");
    expect(terrain.uniforms.uWallTop).toBe(shading.uniforms.uWallTop);
    expect(compile({}).fragmentShader).not.toContain("nh3dWallTopCell");
  });
});
