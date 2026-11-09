import * as THREE from "three";
import { TILE_SIZE } from "../../constants";
import { isLavaCmapGlyph, isLitFloorCmapGlyph } from "../../glyphs/behavior";
import type { Camera } from "../camera/camera";
import type { MovementInput } from "../input/movement-input";
import type { EngineState } from "../runtime/engine-state";
import type { PromptDialogs } from "../ui/prompt-dialogs";
import type { PlayerMovement } from "../world/player-movement";
import {
  CARRIED_LIGHT_LOOKS,
  resolveCarriedLight,
  sampleFlicker,
  type CarriedLight,
} from "./carried-light";
import { LAVA_GLOW, resolveGlowingMonsterLight, type GlowLight } from "./glowing-monsters";
import type { Lighting } from "./lighting";
import type { TerminalRendering } from "./terminal-rendering";
import type { TileRendering } from "./tile-rendering";
import type { TilesetAssets } from "./tileset-assets";

export interface LightFieldDependencies {
  readonly camera: Pick<Camera, "camera">;
  readonly engineState: Pick<EngineState, "clientOptions">;
  readonly lighting: Pick<Lighting, "vignetteUniforms" | "lightingVignetteMaxDarkAlpha">;
  readonly movementInput: Pick<MovementInput, "isFpsMode">;
  readonly playerMovement: Pick<PlayerMovement, "playerPos" | "hasSeenPlayerPosition">;
  readonly promptDialogs: Pick<PromptDialogs, "currentInventory">;
  readonly terminalRendering: Pick<TerminalRendering, "isTerminalDisplayMode">;
  readonly tileRendering: Pick<TileRendering, "tileMap">;
  readonly tilesetAssets: Pick<TilesetAssets, "shouldUseVultureTiles">;
}

export const LIGHT_FIELD_COLUMNS = 80;
export const LIGHT_FIELD_ROWS = 21;
/** Texels per map cell along each axis; enough for soft corner falloff. */
export const LIGHT_FIELD_SUBCELLS = 4;
/** Texture values cover 0..LIGHT_FIELD_RANGE so lit rooms can exceed 1. */
export const LIGHT_FIELD_RANGE = 2;

export interface LightFieldTuning {
  /** Light everywhere the hero has no light: remembered and unlit areas. */
  ambient: number;
  /** Base light inside a lit room (including its walls). */
  roomLight: number;
  /** Extra light from each room corner, and how far it reaches in tiles. */
  cornerLight: number;
  cornerReach: number;
  /** The hero's own small light when carrying nothing lit. */
  personalLight: number;
  personalRadius: number;
  /** Tiles added to a carried source's game radius for a soft edge. */
  carriedReachBonus: number;
  /** How much the hero's light is dimmed inside a lit room (0..1). */
  playerLightInRoom: number;
  /** Upper limit for the combined light multiplier. */
  maxLight: number;
  /** How long lights take to fade when rooms or sight lines change. */
  fadeMs: number;
  /** Strength of the old distance darkening while this lighting is on. */
  vignette: number;
  /** Brightness of glowing monsters and lava. */
  glowLight: number;
  /** Colour saturation of terrain the hero only remembers (1 = unchanged). */
  memorySaturation: number;
  /** Radius of the area a light scroll or spell lights, tinted blue. */
  magicLightRadius: number;
}

export const DEFAULT_LIGHT_FIELD_TUNING: Readonly<LightFieldTuning> = {
  ambient: 0.55,
  roomLight: 0.95,
  cornerLight: 0.3,
  cornerReach: 3,
  personalLight: 0.45,
  personalRadius: 1.8,
  carriedReachBonus: 1.5,
  playerLightInRoom: 0.6,
  maxLight: 1.35,
  fadeMs: 220,
  vignette: 0.3,
  glowLight: 0.9,
  memorySaturation: 0.5,
  magicLightRadius: 5,
};

const AMBIENT_TINT: readonly [number, number, number] = [0.92, 0.95, 1.06];
const ROOM_TINT: readonly [number, number, number] = [1.0, 0.97, 0.9];
const PERSONAL_TINT: readonly [number, number, number] = [0.9, 0.92, 1.0];
/** Light from a light scroll or spell: a cooler, slightly blue white. */
const MAGIC_TINT: readonly [number, number, number] = [0.78, 0.88, 1.12];
/** Remembered terrain drifts slightly toward blue as it loses colour. */
const MEMORY_TINT: readonly [number, number, number] = [0.94, 0.97, 1.06];

interface PlacedGlow {
  readonly x: number;
  readonly y: number;
  readonly light: GlowLight;
}

interface MagicLightZone {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}
const CORNER_LIGHT_HEIGHT = 0.8;

export interface LitRoom {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Lit rooms on screen: 4-connected groups of lit room floor, as bounding
 * rectangles. In a dark room the game shows the squares next to the hero as
 * lit floor, so groups that never leave the hero's 3x3 are not rooms.
 */
export function findLitRooms(
  litRoomCells: Uint8Array,
  columns: number,
  rows: number,
  player: { x: number; y: number } | null,
): LitRoom[] {
  const seen = new Uint8Array(columns * rows);
  const rooms: LitRoom[] = [];
  const stack: number[] = [];
  for (let start = 0; start < litRoomCells.length; start++) {
    if (!litRoomCells[start] || seen[start]) continue;
    let minX = columns, minY = rows, maxX = -1, maxY = -1;
    let leavesPlayer = player === null;
    seen[start] = 1;
    stack.push(start);
    while (stack.length > 0) {
      const index = stack.pop()!;
      const x = index % columns;
      const y = (index - x) / columns;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (player && Math.max(Math.abs(x - player.x), Math.abs(y - player.y)) > 1) leavesPlayer = true;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < columns - 1 ? index + 1 : -1,
        y > 0 ? index - columns : -1,
        y < rows - 1 ? index + columns : -1,
      ];
      for (const next of neighbours) {
        if (next >= 0 && litRoomCells[next] && !seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (leavesPlayer) rooms.push({ minX, minY, maxX, maxY });
  }
  return rooms;
}

/**
 * Cells the hero's light reaches: within `radius` and with a clear straight
 * line (as NetHack's clear_path walks it) through non-opaque cells. The
 * blocking cell itself is reached, so walls facing the hero light up.
 */
export function computeLightReach(
  opaque: Uint8Array,
  columns: number,
  rows: number,
  originX: number,
  originY: number,
  radius: number,
  out: Uint8Array,
): void {
  out.fill(0);
  if (originX < 0 || originY < 0 || originX >= columns || originY >= rows) return;
  const reach = Math.ceil(radius);
  for (let y = Math.max(0, originY - reach); y <= Math.min(rows - 1, originY + reach); y++) {
    for (let x = Math.max(0, originX - reach); x <= Math.min(columns - 1, originX + reach); x++) {
      const dx = x - originX, dy = y - originY;
      if (dx * dx + dy * dy > radius * radius) continue;
      // Bresenham from the hero to the cell; every cell strictly between must be clear.
      let cx = originX, cy = originY;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      const ax = Math.abs(dx), ay = Math.abs(dy);
      let error = ax - ay;
      let clear = true;
      while (cx !== x || cy !== y) {
        const doubled = error * 2;
        if (doubled > -ay) { error -= ay; cx += sx; }
        if (doubled < ax) { error += ax; cy += sy; }
        if ((cx !== x || cy !== y) && opaque[cy * columns + cx]) { clear = false; break; }
      }
      if (clear) out[y * columns + x] = 1;
    }
  }
}

/**
 * Lighting that follows the game: lit rooms (with light pooling toward their
 * corners) and the hero's own light, which reaches only what it can see and
 * flickers like the flame being carried. Room light and the hero's light
 * reach are baked into a small texture; the hero's light position, colour and
 * flicker are uniforms updated every frame.
 */
export class LightField {
  constructor(private readonly dependencies: LightFieldDependencies) {}

  readonly columns = LIGHT_FIELD_COLUMNS;

  readonly rows = LIGHT_FIELD_ROWS;

  readonly subcells = LIGHT_FIELD_SUBCELLS;

  readonly tuning: LightFieldTuning = { ...DEFAULT_LIGHT_FIELD_TUNING };

  private readonly litRoom = new Uint8Array(this.columns * this.rows);

  private readonly litCorridor = new Uint8Array(this.columns * this.rows);

  private readonly opaque = new Uint8Array(this.columns * this.rows);

  private readonly reach = new Uint8Array(this.columns * this.rows);

  private readonly texelCount = this.columns * this.subcells * this.rows * this.subcells;

  private readonly target = new Float32Array(this.texelCount * 4);

  private readonly current = new Float32Array(this.texelCount * 4);

  private texture: THREE.DataTexture | null = null;

  private signature = "";

  private settled = false;

  private wasActive = false;

  private lastTimeMs: number | null = null;

  private inventoryRef: unknown = null;

  carriedLight: CarriedLight | null = null;

  rooms: LitRoom[] = [];

  glows: PlacedGlow[] = [];

  /** Areas lit by a light scroll or spell on this level. */
  magicLightZones: MagicLightZone[] = [];

  isActive(): boolean {
    const options = this.dependencies.engineState.clientOptions;
    return (
      options.lightingEnabled === true &&
      options.dynamicLighting === true &&
      !this.dependencies.terminalRendering.isTerminalDisplayMode() &&
      !this.dependencies.tilesetAssets.shouldUseVultureTiles()
    );
  }

  /** A new level starts dark; its lights fade in as it is drawn. */
  reset(): void {
    this.current.fill(0);
    this.target.fill(0);
    this.signature = "";
    this.settled = false;
    this.rooms = [];
    this.glows = [];
    this.magicLightZones = [];
  }

  /**
   * Game messages that change light. A light scroll or spell lights the area
   * around the hero; that area is tinted as magical light from then on.
   */
  captureMessage(text: unknown): void {
    if (typeof text !== "string" || !/\bA lit field surrounds you\b/i.test(text)) return;
    if (!this.dependencies.playerMovement.hasSeenPlayerPosition) return;
    const player = this.dependencies.playerMovement.playerPos;
    this.magicLightZones.push({ x: player.x, y: player.y, radius: this.tuning.magicLightRadius });
    this.signature = "";
  }

  setTuning(next: Partial<LightFieldTuning>): void {
    for (const [key, value] of Object.entries(next)) {
      if (key in this.tuning && typeof value === "number" && Number.isFinite(value)) {
        this.tuning[key as keyof LightFieldTuning] = value;
      }
    }
    this.signature = "";
  }

  update(timeMs: number): void {
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    const deltaMs = this.lastTimeMs === null ? 0 : Math.max(0, timeMs - this.lastTimeMs);
    this.lastTimeMs = timeMs;
    if (!this.isActive()) {
      uniforms.uLightFieldEnabled.value = 0;
      if (this.wasActive) {
        uniforms.uMaxDarkAlpha.value = this.dependencies.engineState.clientOptions.lightingEnabled
          ? this.dependencies.lighting.lightingVignetteMaxDarkAlpha
          : 0;
      }
      this.wasActive = false;
      return;
    }

    const inventory = this.dependencies.promptDialogs.currentInventory;
    if (inventory !== this.inventoryRef) {
      this.inventoryRef = inventory;
      this.carriedLight = resolveCarriedLight(inventory);
    }

    const player = this.dependencies.playerMovement.hasSeenPlayerPosition
      ? this.dependencies.playerMovement.playerPos
      : null;
    this.collectCells();
    const lightRadius = this.resolvePlayerLightRadius();
    const signature = this.buildSignature(player, lightRadius);
    if (signature !== this.signature) {
      this.signature = signature;
      this.rebuildTarget(player, lightRadius);
      this.settled = false;
    }
    // Turning the lighting on mid-level shows it at once.
    this.advance(this.wasActive ? deltaMs : Number.POSITIVE_INFINITY);
    this.wasActive = true;

    const texture = this.ensureTexture();
    uniforms.uLightField.value = texture;
    uniforms.uLightFieldGrid.value.set(this.columns, this.rows);
    uniforms.uLightFieldEnabled.value = 1;
    uniforms.uMaxDarkAlpha.value = this.tuning.vignette;
    const ambient = this.tuning.ambient;
    uniforms.uAmbientLight.value.set(ambient * AMBIENT_TINT[0], ambient * AMBIENT_TINT[1], ambient * AMBIENT_TINT[2]);
    uniforms.uLightParams.value.set(this.tuning.maxLight, this.tuning.playerLightInRoom, LIGHT_FIELD_RANGE, 0);
    uniforms.uMemoryLook.value.set(this.tuning.memorySaturation, MEMORY_TINT[0], MEMORY_TINT[1], MEMORY_TINT[2]);
    this.updatePlayerLightUniforms(timeMs / 1000, lightRadius);
  }

  dispose(): void {
    this.texture?.dispose();
    this.texture = null;
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    uniforms.uLightField.value = null;
    uniforms.uLightFieldEnabled.value = 0;
    this.wasActive = false;
  }

  private resolvePlayerLightRadius(): number {
    return this.carriedLight
      ? this.carriedLight.radius + this.tuning.carriedReachBonus
      : this.tuning.personalRadius;
  }

  private collectCells(): void {
    this.litRoom.fill(0);
    this.litCorridor.fill(0);
    this.opaque.fill(1);
    this.glows = [];
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
      const index = y * this.columns + x;
      if (mesh.userData?.isVoidFill === true) continue;
      this.opaque[index] = mesh.userData?.isWall === true ? 1 : 0;
      const glyph = mesh.userData?.sourceGlyph;
      if (typeof glyph === "number") {
        const lit = isLitFloorCmapGlyph(glyph);
        if (lit === "room") this.litRoom[index] = 1;
        else if (lit === "corridor") this.litCorridor[index] = 1;
        const glow = isLavaCmapGlyph(glyph) ? LAVA_GLOW : resolveGlowingMonsterLight(glyph);
        if (glow) this.glows.push({ x, y, light: glow });
      }
    }
  }

  private buildSignature(player: { x: number; y: number } | null, lightRadius: number): string {
    // Cheap change detection: the lit and opaque grids plus where the light is.
    let hash = 2166136261;
    for (let i = 0; i < this.litRoom.length; i++) {
      hash ^= this.litRoom[i] | (this.litCorridor[i] << 1) | (this.opaque[i] << 2);
      hash = Math.imul(hash, 16777619);
    }
    const glows = this.glows.map((glow) => `${glow.x},${glow.y},${glow.light.color.join(",")}`).join(";");
    return `${hash >>> 0}|${player ? `${player.x},${player.y}` : "-"}|${lightRadius}|${glows}`;
  }

  private rebuildTarget(player: { x: number; y: number } | null, lightRadius: number): void {
    const { columns, rows, subcells, target, tuning } = this;
    const width = columns * subcells;
    const height = rows * subcells;
    // RGB holds all static light, starting from the ambient level everywhere.
    for (let i = 0; i < target.length; i += 4) {
      target[i] = tuning.ambient * AMBIENT_TINT[0];
      target[i + 1] = tuning.ambient * AMBIENT_TINT[1];
      target[i + 2] = tuning.ambient * AMBIENT_TINT[2];
      target[i + 3] = 0;
    }
    this.rooms = findLitRooms(this.litRoom, columns, rows, player);

    const isMagicLit = (x: number, y: number) =>
      this.magicLightZones.some((zone) => (x - zone.x) ** 2 + (y - zone.y) ** 2 <= zone.radius * zone.radius);
    const writeLight = (tx: number, ty: number, value: number, tint: readonly [number, number, number]) => {
      const base = (ty * width + tx) * 4;
      const look = isMagicLit(Math.floor(tx / subcells), Math.floor(ty / subcells)) ? MAGIC_TINT : tint;
      target[base] = Math.max(target[base], value * look[0]);
      target[base + 1] = Math.max(target[base + 1], value * look[1]);
      target[base + 2] = Math.max(target[base + 2], value * look[2]);
    };

    for (const room of this.rooms) {
      const corners = [
        [room.minX, room.minY], [room.maxX, room.minY], [room.minX, room.maxY], [room.maxX, room.maxY],
      ];
      // The room and its surrounding walls.
      const fromX = Math.max(0, (room.minX - 1) * subcells);
      const toX = Math.min(width - 1, (room.maxX + 2) * subcells - 1);
      const fromY = Math.max(0, (room.minY - 1) * subcells);
      const toY = Math.min(rows * subcells - 1, (room.maxY + 2) * subcells - 1);
      for (let ty = fromY; ty <= toY; ty++) {
        const y = (ty + 0.5) / subcells - 0.5;
        for (let tx = fromX; tx <= toX; tx++) {
          const x = (tx + 0.5) / subcells - 0.5;
          let value = tuning.roomLight;
          for (const [cx, cy] of corners) {
            const d2 = (x - cx) ** 2 + (y - cy) ** 2 + CORNER_LIGHT_HEIGHT ** 2;
            value += tuning.cornerLight / (1 + d2 / (tuning.cornerReach * tuning.cornerReach) * 4);
          }
          writeLight(tx, ty, value, ROOM_TINT);
        }
      }
    }

    for (let index = 0; index < this.litCorridor.length; index++) {
      if (!this.litCorridor[index]) continue;
      const cx = index % columns, cy = (index - cx) / columns;
      for (let sy = 0; sy < subcells; sy++) {
        for (let sx = 0; sx < subcells; sx++) {
          writeLight(cx * subcells + sx, cy * subcells + sy, tuning.roomLight * 0.85, ROOM_TINT);
        }
      }
    }

    // Glowing monsters and lava add coloured light where it can reach.
    for (const glow of this.glows) {
      const radius = glow.light.radius;
      computeLightReach(this.opaque, columns, rows, glow.x, glow.y, radius + 0.5, this.reach);
      const fromX = Math.max(0, Math.floor((glow.x - radius - 1) * subcells));
      const toX = Math.min(width - 1, Math.ceil((glow.x + radius + 1) * subcells));
      const fromY = Math.max(0, Math.floor((glow.y - radius - 1) * subcells));
      const toY = Math.min(height - 1, Math.ceil((glow.y + radius + 1) * subcells));
      for (let ty = fromY; ty <= toY; ty++) {
        const cellY = Math.floor(ty / subcells);
        const y = (ty + 0.5) / subcells - 0.5;
        for (let tx = fromX; tx <= toX; tx++) {
          const cellX = Math.floor(tx / subcells);
          if (!this.reach[cellY * columns + cellX]) continue;
          const x = (tx + 0.5) / subcells - 0.5;
          const falloff = Math.max(0, 1 - Math.hypot(x - glow.x, y - glow.y) / radius) ** 2;
          if (falloff <= 0) continue;
          const base = (ty * width + tx) * 4;
          for (let c = 0; c < 3; c++) {
            target[base + c] = Math.min(
              LIGHT_FIELD_RANGE,
              target[base + c] + glow.light.color[c] * tuning.glowLight * falloff,
            );
          }
        }
      }
    }

    if (player) {
      computeLightReach(this.opaque, columns, rows, player.x, player.y, lightRadius + 0.5, this.reach);
      for (let index = 0; index < this.reach.length; index++) {
        if (!this.reach[index]) continue;
        const cx = index % columns, cy = (index - cx) / columns;
        for (let sy = 0; sy < subcells; sy++) {
          for (let sx = 0; sx < subcells; sx++) {
            target[((cy * subcells + sy) * width + cx * subcells + sx) * 4 + 3] = 1;
          }
        }
      }
    }
  }

  private advance(deltaMs: number): void {
    if (this.settled) return;
    const { current, target } = this;
    const step = deltaMs / Math.max(1, this.tuning.fadeMs);
    let moving = false;
    for (let i = 0; i < current.length; i++) {
      const goal = target[i];
      const value = current[i];
      if (value === goal) continue;
      const span = Math.max(1, Math.abs(goal - value)) * step;
      const next = goal > value ? Math.min(goal, value + span) : Math.max(goal, value - span);
      current[i] = next;
      if (next !== goal) moving = true;
    }
    this.settled = !moving;
    const texture = this.ensureTexture();
    const data = texture.image.data as Uint8Array;
    for (let i = 0; i < current.length; i++) {
      const scaled = (i & 3) === 3 ? current[i] : current[i] / LIGHT_FIELD_RANGE;
      data[i] = Math.round(Math.min(1, Math.max(0, scaled)) * 255);
    }
    texture.needsUpdate = true;
  }

  private updatePlayerLightUniforms(timeSeconds: number, radius: number): void {
    const uniforms = this.dependencies.lighting.vignetteUniforms;
    const center = uniforms.uLightingCenter.value;
    const fps = this.dependencies.movementInput.isFpsMode();
    const carried = this.carriedLight;
    const look = carried ? CARRIED_LIGHT_LOOKS[carried.kind] : null;
    const flicker = look ? sampleFlicker(timeSeconds, look.flicker) : 1;
    // A flame also wavers a little in place.
    const sway = look ? look.flicker * 0.04 : 0;
    const z = fps ? this.dependencies.camera.camera.position.z : 0.75 * TILE_SIZE;
    uniforms.uPlayerLightPos.value.set(
      center.x + Math.sin(timeSeconds * 5.3) * sway,
      center.y + Math.cos(timeSeconds * 4.1) * sway,
      z,
    );
    const intensity = look ? look.intensity : this.tuning.personalLight;
    const color = look ? look.color : PERSONAL_TINT;
    uniforms.uPlayerLightColor.value.set(
      color[0] * intensity * flicker,
      color[1] * intensity * flicker,
      color[2] * intensity * flicker,
    );
    uniforms.uPlayerLightRadius.value = radius * TILE_SIZE;
  }

  private ensureTexture(): THREE.DataTexture {
    if (this.texture) return this.texture;
    const width = this.columns * this.subcells;
    const height = this.rows * this.subcells;
    const texture = new THREE.DataTexture(
      new Uint8Array(width * height * 4),
      width,
      height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.texture = texture;
    return texture;
  }
}
