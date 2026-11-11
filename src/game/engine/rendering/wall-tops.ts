import * as THREE from "three";
import { isWallBlockCmapGlyph } from "../../glyphs/behavior";
import type { EngineState } from "../runtime/engine-state";
import type { Lighting } from "./lighting";
import type { TerminalRendering } from "./terminal-rendering";
import type { TileRendering } from "./tile-rendering";
import type { TilesetAssets } from "./tileset-assets";
import type { WallGeometry } from "./wall-geometry";

export interface WallTopsDependencies {
  readonly engineState: Pick<EngineState, "clientOptions">;
  readonly lighting: Pick<Lighting, "vignetteUniforms">;
  readonly terminalRendering: Pick<TerminalRendering, "isTerminalDisplayMode">;
  readonly tileRendering: Pick<TileRendering, "tileMap">;
  readonly tilesetAssets: Pick<TilesetAssets, "shouldUseVultureTiles">;
  readonly wallGeometry: Pick<WallGeometry, "usesRoundedWallShape" | "shouldUseChamferedWallGeometry">;
}

export const WALL_TOP_GRID_COLUMNS = 80;
export const WALL_TOP_GRID_ROWS = 21;

/** Cell kinds in the wall-top grid texture. */
export const WALL_TOP_OPEN = 0;
export const WALL_TOP_BLOCKED = 128;
export const WALL_TOP_WALL = 255;

export interface WallTopsTuning {
  /** Brightness of a wall top away from its edges (0 = black, 1 = as painted). */
  topBrightness: number;
  /**
   * How far in tiles the light fades in from an edge that faces open floor,
   * on a smooth curve, before the top reaches topBrightness.
   */
  rimWidth: number;
  /** Brightness right at that edge. */
  rimBrightness: number;
}

export const DEFAULT_WALL_TOPS_TUNING: Readonly<WallTopsTuning> = {
  topBrightness: 0,
  rimWidth: 0.32,
  rimBrightness: 0.9,
};

/**
 * What a map cell is for wall-top shading. Walls (and the rock the client
 * infers beside dark corridors) get a dark top. Doors and other raised blocks
 * (trees, iron bars, drawbridges) keep theirs, and like unknown cells they
 * hide the side of a wall next to them, so no rim is drawn toward them. Open
 * cells (floor, corridors, doorways, water...) leave a wall side visible.
 */
export function classifyWallTopCell(userData: Record<string, unknown> | null | undefined): number {
  if (!userData || userData.isVoidFill === true) return WALL_TOP_BLOCKED;
  if (userData.isWall !== true) return WALL_TOP_OPEN;
  if (userData.materialKind === "door") return WALL_TOP_BLOCKED;
  if (userData.isInferredDarkCorridorWall === true) return WALL_TOP_WALL;
  const glyph = typeof userData.tileTextureSourceGlyph === "number"
    ? userData.tileTextureSourceGlyph
    : userData.sourceGlyph;
  return typeof glyph === "number" && isWallBlockCmapGlyph(Math.trunc(glyph))
    ? WALL_TOP_WALL
    : WALL_TOP_BLOCKED;
}

/**
 * Keeps a one-texel-per-cell grid of walls, open cells and other blocks so the
 * world shader can darken wall tops: only the wall faces stand out. The top
 * is black in the middle and lightens smoothly toward edges where it meets a
 * visible side, so walls still read from straight above.
 */
export class WallTops {
  constructor(private readonly dependencies: WallTopsDependencies) {}

  readonly columns = WALL_TOP_GRID_COLUMNS;

  readonly rows = WALL_TOP_GRID_ROWS;

  readonly tuning: WallTopsTuning = { ...DEFAULT_WALL_TOPS_TUNING };

  private readonly grid = new Uint8Array(this.columns * this.rows);

  private texture: THREE.DataTexture | null = null;

  isActive(): boolean {
    return (
      this.dependencies.engineState.clientOptions.darkWallTops === true &&
      !this.dependencies.terminalRendering.isTerminalDisplayMode() &&
      !this.dependencies.tilesetAssets.shouldUseVultureTiles()
    );
  }

  setTuning(next: Partial<WallTopsTuning>): void {
    for (const [key, value] of Object.entries(next)) {
      if (key in this.tuning && typeof value === "number" && Number.isFinite(value)) {
        this.tuning[key as keyof WallTopsTuning] = value;
      }
    }
  }

  update(): void {
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    if (!this.isActive()) {
      uniforms.uWallTop.value.x = 0;
      return;
    }
    const texture = this.ensureTexture();
    const data = texture.image.data as Uint8Array;
    this.grid.fill(WALL_TOP_BLOCKED);
    for (const [key, mesh] of this.dependencies.tileRendering.tileMap) {
      let x = mesh.userData?.tileX;
      let y = mesh.userData?.tileY;
      if (typeof x !== "number" || typeof y !== "number") {
        const comma = key.indexOf(",");
        x = Number(key.slice(0, comma));
        y = Number(key.slice(comma + 1));
      }
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) continue;
      this.grid[y * this.columns + x] = classifyWallTopCell(mesh.userData);
    }
    let changed = false;
    for (let i = 0; i < this.grid.length; i++) {
      if (data[i] !== this.grid[i]) {
        data[i] = this.grid[i];
        changed = true;
      }
    }
    if (changed) texture.needsUpdate = true;

    uniforms.uWallTopGrid.value = texture;
    uniforms.uWallTopGridSize.value.set(this.columns, this.rows);
    uniforms.uWallTop.value.set(1, this.tuning.topBrightness, this.tuning.rimWidth, this.tuning.rimBrightness);
    uniforms.uWallTopRounded.value =
      this.dependencies.wallGeometry.usesRoundedWallShape() &&
      this.dependencies.wallGeometry.shouldUseChamferedWallGeometry()
        ? 1
        : 0;
  }

  /** Grid value of a cell, for tests and debugging. */
  getCell(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) return WALL_TOP_BLOCKED;
    return this.grid[y * this.columns + x];
  }

  dispose(): void {
    this.texture?.dispose();
    this.texture = null;
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    uniforms.uWallTopGrid.value = null;
    uniforms.uWallTop.value.x = 0;
  }

  private ensureTexture(): THREE.DataTexture {
    if (this.texture) return this.texture;
    const texture = new THREE.DataTexture(
      new Uint8Array(this.columns * this.rows).fill(WALL_TOP_BLOCKED),
      this.columns,
      this.rows,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    // One texel per cell, read exactly: no blending between neighbours.
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    this.texture = texture;
    return texture;
  }
}
