import * as THREE from "three";
import type { EngineState } from "../runtime/engine-state";
import type { Lighting } from "./lighting";
import type { TerminalRendering } from "./terminal-rendering";
import type { TileRendering } from "./tile-rendering";
import type { TilesetAssets } from "./tileset-assets";

export interface ExploredMaskDependencies {
  readonly engineState: Pick<EngineState, "clientOptions">;
  readonly lighting: Pick<Lighting, "vignetteUniforms">;
  readonly terminalRendering: Pick<TerminalRendering, "isTerminalDisplayMode">;
  readonly tileRendering: Pick<TileRendering, "tileMap">;
  readonly tilesetAssets: Pick<TilesetAssets, "shouldUseVultureTiles">;
}

/** NetHack's COLNO x ROWNO; every runtime this client loads uses this map size. */
export const EXPLORED_MASK_COLUMNS = 80;
export const EXPLORED_MASK_ROWS = 21;
/** Mask texels per map cell along each axis. */
export const EXPLORED_MASK_SUBCELLS = 8;

export interface ExploredMaskTuning {
  /** Gaussian blur radius (sigma) in tiles; sets how far the fade reaches into explored cells. */
  blurTiles: number;
  /** How long a newly explored (or forgotten) cell takes to fade in (or out). */
  revealMs: number;
  /** Blurred mask value where the fade starts (fully dark) and ends (painted colour). */
  fadeStart: number;
  fadeEnd: number;
  /** Boundary wobble: added mask noise and its frequency per tile. */
  noiseAmplitude: number;
  noiseFrequency: number;
}

export const DEFAULT_EXPLORED_MASK_TUNING: Readonly<ExploredMaskTuning> = {
  blurTiles: 0.22,
  revealMs: 260,
  fadeStart: 0.45,
  fadeEnd: 0.95,
  noiseAmplitude: 0.12,
  noiseFrequency: 2.4,
};

function standardNormalCdf(x: number): number {
  // Abramowitz-Stegun 7.1.26 erf approximation; max error ~1.5e-7.
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * Weights for one axis: how much of a Gaussian centred on each texel of a cell
 * falls inside the cell `d` steps away. Rasterizing a 0/1 cell grid with these
 * equals blurring its box-upsampled image, so a texel on the shared edge of an
 * explored and an unexplored cell reads exactly 0.5.
 */
export function buildExploredMaskAxisWeights(
  subcells: number,
  sigmaTiles: number,
): { reach: number; weights: Float32Array } {
  const sigma = Math.max(1e-4, sigmaTiles);
  const reach = Math.max(0, Math.ceil(0.5 + 3.5 * sigma + 0.5) - 1);
  const span = reach * 2 + 1;
  const weights = new Float32Array(subcells * span);
  for (let s = 0; s < subcells; s++) {
    const offset = -0.5 + (s + 0.5) / subcells;
    for (let d = -reach; d <= reach; d++) {
      weights[s * span + d + reach] =
        standardNormalCdf((d + 0.5 - offset) / sigma) -
        standardNormalCdf((d - 0.5 - offset) / sigma);
    }
  }
  return { reach, weights };
}

/**
 * Blurs per-cell coverage (0..1, row-major, `columns` x `rows`) into an 8-bit
 * mask of `columns * subcells` x `rows * subcells` texels. Cells outside the
 * map count as unexplored. Separable, so a full 80x21 map costs well under a
 * millisecond.
 */
export function rasterizeExploredMask(
  coverage: Float32Array,
  columns: number,
  rows: number,
  subcells: number,
  sigmaTiles: number,
  out: Uint8Array,
  scratch?: Float32Array,
): void {
  const { reach, weights } = buildExploredMaskAxisWeights(subcells, sigmaTiles);
  const span = reach * 2 + 1;
  const width = columns * subcells;
  const height = rows * subcells;
  const horizontal =
    scratch && scratch.length >= rows * width ? scratch : new Float32Array(rows * width);

  for (let cy = 0; cy < rows; cy++) {
    const coverageRow = cy * columns;
    const outRow = cy * width;
    for (let tx = 0; tx < width; tx++) {
      const cx = Math.floor(tx / subcells);
      const weightRow = (tx - cx * subcells) * span;
      let sum = 0;
      for (let d = -reach; d <= reach; d++) {
        const x = cx + d;
        if (x < 0 || x >= columns) continue;
        sum += coverage[coverageRow + x] * weights[weightRow + d + reach];
      }
      horizontal[outRow + tx] = sum;
    }
  }

  for (let ty = 0; ty < height; ty++) {
    const cy = Math.floor(ty / subcells);
    const weightRow = (ty - cy * subcells) * span;
    const outRow = ty * width;
    for (let tx = 0; tx < width; tx++) {
      let sum = 0;
      for (let d = -reach; d <= reach; d++) {
        const y = cy + d;
        if (y < 0 || y >= rows) continue;
        sum += horizontal[y * width + tx] * weights[weightRow + d + reach];
      }
      out[outRow + tx] = Math.round(Math.min(1, Math.max(0, sum)) * 255);
    }
  }
}

/**
 * Tracks which map cells have terrain on screen and keeps a blurred mask of
 * them in a texture that the shared world shader uses to fade explored areas
 * into the unexplored void. Cells fade in (and out) over `revealMs`.
 */
export class ExploredMask {
  constructor(private readonly dependencies: ExploredMaskDependencies) {}

  readonly columns = EXPLORED_MASK_COLUMNS;

  readonly rows = EXPLORED_MASK_ROWS;

  readonly subcells = EXPLORED_MASK_SUBCELLS;

  readonly tuning: ExploredMaskTuning = { ...DEFAULT_EXPLORED_MASK_TUNING };

  private readonly target = new Uint8Array(this.columns * this.rows);

  private readonly present = new Uint8Array(this.columns * this.rows);

  private readonly coverage = new Float32Array(this.columns * this.rows);

  private readonly progress = new Float32Array(this.columns * this.rows);

  private readonly scratch = new Float32Array(this.rows * this.columns * this.subcells);

  private texture: THREE.DataTexture | null = null;

  private animatingCells = 0;

  private dirty = true;

  private wasActive = false;

  private lastTimeMs: number | null = null;

  isActive(): boolean {
    return (
      this.dependencies.engineState.clientOptions.smoothExploredEdges === true &&
      !this.dependencies.terminalRendering.isTerminalDisplayMode() &&
      !this.dependencies.tilesetAssets.shouldUseVultureTiles()
    );
  }

  /** Forget the current level at once: a new level fades in from nothing. */
  reset(): void {
    this.target.fill(0);
    this.coverage.fill(0);
    this.progress.fill(0);
    this.animatingCells = 0;
    this.dirty = true;
  }

  setTuning(next: Partial<ExploredMaskTuning>): void {
    for (const [key, value] of Object.entries(next)) {
      if (key in this.tuning && typeof value === "number" && Number.isFinite(value)) {
        this.tuning[key as keyof ExploredMaskTuning] = value;
      }
    }
    this.dirty = true;
  }

  update(timeMs: number): void {
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    const active = this.isActive();
    const deltaMs = this.lastTimeMs === null ? 0 : Math.max(0, timeMs - this.lastTimeMs);
    this.lastTimeMs = timeMs;
    if (!active) {
      uniforms.uExploredMaskEnabled.value = 0;
      this.wasActive = false;
      return;
    }

    this.collectPresentCells();
    // Turning the option on mid-level shows the current map at once.
    this.applyPresentCells(!this.wasActive);
    this.wasActive = true;
    this.advanceAnimation(deltaMs);

    const texture = this.ensureTexture();
    if (this.dirty) {
      this.dirty = false;
      rasterizeExploredMask(
        this.coverage,
        this.columns,
        this.rows,
        this.subcells,
        this.tuning.blurTiles,
        texture.image.data as Uint8Array,
        this.scratch,
      );
      texture.needsUpdate = true;
    }

    uniforms.uExploredMask.value = texture;
    uniforms.uExploredMaskGrid.value.set(this.columns, this.rows);
    uniforms.uExploredFade.value.set(
      this.tuning.fadeStart,
      this.tuning.fadeEnd,
      this.tuning.noiseAmplitude,
      this.tuning.noiseFrequency,
    );
    uniforms.uExploredMaskEnabled.value = 1;
  }

  /** Coverage of one cell, 0 (unexplored) to 1 (explored); for tests and debugging. */
  getCellCoverage(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) return 0;
    return this.coverage[y * this.columns + x];
  }

  dispose(): void {
    this.texture?.dispose();
    this.texture = null;
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    uniforms.uExploredMask.value = null;
    uniforms.uExploredMaskEnabled.value = 0;
    this.wasActive = false;
  }

  private collectPresentCells(): void {
    const present = this.present;
    present.fill(0);
    for (const [key, mesh] of this.dependencies.tileRendering.tileMap) {
      // 3.6.7 reports unexplored stone as a blank glyph that is drawn as a flat
      // dark tile; it is not known terrain.
      if (mesh.userData?.isVoidFill === true) continue;
      let x = mesh.userData?.tileX;
      let y = mesh.userData?.tileY;
      if (typeof x !== "number" || typeof y !== "number") {
        const comma = key.indexOf(",");
        x = Number(key.slice(0, comma));
        y = Number(key.slice(comma + 1));
      }
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) continue;
      present[y * this.columns + x] = 1;
    }
  }

  private applyPresentCells(snap: boolean): void {
    const { present, target, coverage, progress } = this;
    for (let i = 0; i < present.length; i++) {
      if (present[i] === target[i] && !snap) continue;
      target[i] = present[i];
      if (snap || this.tuning.revealMs <= 0) {
        progress[i] = target[i];
        coverage[i] = target[i];
      }
      this.dirty = true;
    }
    this.animatingCells = 0;
    for (let i = 0; i < target.length; i++) {
      if (progress[i] !== target[i]) this.animatingCells++;
    }
  }

  private advanceAnimation(deltaMs: number): void {
    if (this.animatingCells === 0 || deltaMs <= 0) return;
    const step = deltaMs / Math.max(1, this.tuning.revealMs);
    const { target, coverage, progress } = this;
    let remaining = 0;
    for (let i = 0; i < target.length; i++) {
      const goal = target[i];
      let p = progress[i];
      if (p === goal) continue;
      p = goal > p ? Math.min(goal, p + step) : Math.max(goal, p - step);
      progress[i] = p;
      // Smoothstep: eases in and out of each reveal.
      coverage[i] = p * p * (3 - 2 * p);
      if (p !== goal) remaining++;
    }
    this.animatingCells = remaining;
    this.dirty = true;
  }

  private ensureTexture(): THREE.DataTexture {
    if (this.texture) return this.texture;
    const width = this.columns * this.subcells;
    const height = this.rows * this.subcells;
    const texture = new THREE.DataTexture(
      new Uint8Array(width * height),
      width,
      height,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    this.texture = texture;
    this.dirty = true;
    return texture;
  }
}
