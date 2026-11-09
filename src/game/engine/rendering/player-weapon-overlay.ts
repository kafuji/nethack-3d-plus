import * as THREE from "three";
import { TILE_SIZE } from "../../constants";
import type { Camera } from "../camera/camera";
import type { EngineState } from "../runtime/engine-state";
import type { EntityBillboards } from "./entity-billboards";
import type { GlyphTextures } from "./glyph-textures";
import type { Lighting } from "./lighting";
import type { MovementInput } from "../input/movement-input";
import type { PlayerMovement } from "../world/player-movement";
import type { PromptDialogs } from "../ui/prompt-dialogs";
import type { RenderPipeline } from "./render-pipeline";
import type { TilesetAssets } from "./tileset-assets";
import {
  createOutlinedWeaponCanvas,
  resolvePlayerHeldWeapons,
  type PlayerHeldWeaponTile,
  type PlayerHeldWeapons,
} from "./player-held-weapon-overlay";
import {
  PLAYER_WEAPON_GRIP_UV,
  PLAYER_WEAPON_HAND_UV,
  PLAYER_WEAPON_OFF_HAND_SWING_DELAY_MS,
  PLAYER_WEAPON_SIZE,
  PLAYER_WEAPON_SWING_DURATION_MS,
  resolveScreenSide,
  samplePlayerWeaponSwing,
  type ScreenSide,
} from "./player-weapon-swing";

export interface PlayerWeaponOverlayDependencies {
  readonly camera: Pick<Camera, "getActiveCamera">;
  readonly engineState: Pick<EngineState, "clientOptions">;
  readonly entityBillboards: Pick<EntityBillboards, "monsterBillboards">;
  readonly glyphTextures: Pick<GlyphTextures, "createTileTexture">;
  readonly lighting: Pick<Lighting, "patchMaterialForVignette">;
  readonly movementInput: Pick<MovementInput, "isFpsMode">;
  readonly playerMovement: Pick<PlayerMovement, "hasSeenPlayerPosition" | "playerPos">;
  readonly promptDialogs: Pick<PromptDialogs, "currentInventory">;
  readonly renderPipeline: Pick<RenderPipeline, "scene">;
  readonly tilesetAssets: Pick<TilesetAssets, "resolveRuntimeVersion" | "tileSourceSize">;
}

type WeaponSlot = "primary" | "secondary";

/** Viewer side each hand rests on: main weapon right, off-hand left. */
const REST_SIDE: Record<WeaponSlot, ScreenSide> = { primary: 1, secondary: -1 };

interface WeaponSwing {
  readonly startMs: number;
  readonly side: ScreenSide;
  readonly lunge: { x: number; y: number } | null;
}

interface WeaponVisual {
  readonly sprite: THREE.Sprite;
  readonly material: THREE.SpriteMaterial;
  textureKey: string;
  aspect: number;
  paddingU: number;
  paddingV: number;
  swing: WeaponSwing | null;
}

/**
 * Wielded weapons drawn as their own sprites over the player in overhead view,
 * so they can swing around the grip when the hero attacks.
 */
export class PlayerWeaponOverlay {
  constructor(private readonly dependencies: PlayerWeaponOverlayDependencies) {}

  private readonly visuals: Record<WeaponSlot, WeaponVisual | null> = {
    primary: null,
    secondary: null,
  };

  private inventoryRef: readonly unknown[] | null = null;

  private weapons: PlayerHeldWeapons = { primary: null, secondary: null };

  private lastSwing: { slot: WeaponSlot; startMs: number } | null = null;

  /** Swings requested before the weapon's sprite exists. */
  private readonly pendingSwings: Record<WeaponSlot, WeaponSwing | null> = {
    primary: null,
    secondary: null,
  };

  private readonly cameraRight = new THREE.Vector3();

  private readonly cameraUp = new THREE.Vector3();

  private readonly anchor = new THREE.Vector3();

  /** Whether wielded weapons are shown over the player right now. */
  isActive(): boolean {
    const options = this.dependencies.engineState.clientOptions;
    return (
      options.playerHeldWeaponOverlayVisible === true &&
      options.tilesetMode === "tiles" &&
      !this.dependencies.movementInput.isFpsMode() &&
      this.dependencies.playerMovement.hasSeenPlayerPosition
    );
  }

  resolveHeldWeapons(): PlayerHeldWeapons {
    const inventory = this.dependencies.promptDialogs.currentInventory;
    if (this.inventoryRef !== inventory) {
      this.inventoryRef = inventory;
      this.weapons = resolvePlayerHeldWeapons(inventory);
    }
    return this.weapons;
  }

  /**
   * Swing a wielded weapon at a target `delta` tiles away (null when the
   * direction is unknown). Back-to-back blows of a two-weapon attack alternate
   * hands, the off hand trailing slightly behind.
   */
  playSwing(delta: { dx: number; dy: number } | null, nowMs: number = performance.now()): void {
    if (!this.isActive()) {
      return;
    }
    const weapons = this.resolveHeldWeapons();
    const available = (["primary", "secondary"] as const).filter((slot) => weapons[slot]);
    if (available.length === 0) {
      return;
    }
    const screen = delta ? this.projectTileDeltaToScreen(delta.dx, delta.dy) : null;
    const targetSide = screen ? resolveScreenSide(screen.x) : null;
    let slot: WeaponSlot = available[0];
    let startMs = nowMs;
    const previous = this.lastSwing;
    if (
      available.length === 2 &&
      previous &&
      nowMs - previous.startMs < PLAYER_WEAPON_SWING_DURATION_MS
    ) {
      slot = previous.slot === "primary" ? "secondary" : "primary";
      startMs = Math.max(nowMs, previous.startMs + PLAYER_WEAPON_OFF_HAND_SWING_DELAY_MS);
    } else if (available.length === 2 && targetSide !== null) {
      slot = targetSide === REST_SIDE.primary ? "primary" : "secondary";
    }
    const length = screen ? Math.hypot(screen.x, screen.y) : 0;
    const swing: WeaponSwing = {
      startMs,
      side: targetSide ?? REST_SIDE[slot],
      lunge: length > 1e-6 ? { x: screen!.x / length, y: screen!.y / length } : null,
    };
    this.lastSwing = { slot, startMs };
    const visual = this.visuals[slot];
    if (visual) {
      visual.swing = swing;
    } else {
      this.pendingSwings[slot] = swing;
    }
  }

  /** Place (and animate) the weapon sprites over the current player sprite. */
  sync(nowMs: number = performance.now()): void {
    const playerSprite = this.isActive() ? this.resolvePlayerSprite() : null;
    const weapons = playerSprite ? this.resolveHeldWeapons() : null;
    for (const slot of ["primary", "secondary"] as const) {
      const tile = weapons?.[slot] ?? null;
      if (!playerSprite || !tile || !playerSprite.visible) {
        this.hide(slot);
        continue;
      }
      try {
        this.syncSlot(slot, tile, playerSprite, nowMs);
      } catch (error) {
        // Cosmetic layer: never let it stop the render loop.
        console.warn("Failed to draw the player's weapon", error);
        this.hide(slot);
      }
    }
  }

  dispose(): void {
    for (const slot of ["primary", "secondary"] as const) {
      const visual = this.visuals[slot];
      if (!visual) {
        continue;
      }
      this.dependencies.renderPipeline.scene.remove(visual.sprite);
      visual.material.map?.dispose();
      visual.material.dispose();
      this.visuals[slot] = null;
    }
  }

  private resolvePlayerSprite(): THREE.Sprite | null {
    const { x, y } = this.dependencies.playerMovement.playerPos;
    return this.dependencies.entityBillboards.monsterBillboards.get(`${x},${y}`) ?? null;
  }

  private hide(slot: WeaponSlot): void {
    const visual = this.visuals[slot];
    if (visual) {
      visual.sprite.visible = false;
      visual.swing = null;
    }
    this.pendingSwings[slot] = null;
  }

  private updateCameraAxes(): void {
    const camera = this.dependencies.camera.getActiveCamera();
    camera.updateMatrixWorld();
    this.cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  }

  private projectTileDeltaToScreen(dx: number, dy: number): { x: number; y: number } {
    this.updateCameraAxes();
    const world = new THREE.Vector3(dx * TILE_SIZE, -dy * TILE_SIZE, 0);
    return { x: world.dot(this.cameraRight), y: world.dot(this.cameraUp) };
  }

  private ensureVisual(slot: WeaponSlot, tile: PlayerHeldWeaponTile): WeaponVisual {
    let visual = this.visuals[slot];
    if (!visual) {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      this.dependencies.lighting.patchMaterialForVignette(material);
      const sprite = new THREE.Sprite(material);
      sprite.name = `player-weapon-${slot}`;
      this.dependencies.renderPipeline.scene.add(sprite);
      visual = {
        sprite,
        material,
        textureKey: "",
        aspect: 1,
        paddingU: 0,
        paddingV: 0,
        swing: this.pendingSwings[slot],
      };
      this.pendingSwings[slot] = null;
      this.visuals[slot] = visual;
    }
    const options = this.dependencies.engineState.clientOptions;
    const textureKey = [
      options.tilesetPath,
      this.dependencies.tilesetAssets.resolveRuntimeVersion(),
      this.dependencies.tilesetAssets.tileSourceSize,
      options.tilesetBackgroundRemovalMode,
      options.tilesetSolidChromaKeyColorHex,
      options.tilesetBackgroundTileId,
      tile.tileIndex,
      tile.sourceGlyph ?? -1,
    ].join("|");
    if (visual.textureKey !== textureKey) {
      const tileTexture = this.dependencies.glyphTextures.createTileTexture(tile.tileIndex, 1, true, {
        sourceGlyph: tile.sourceGlyph,
      });
      const image = tileTexture.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
      const width = Number(image?.width) || 1;
      const height = Number(image?.height) || 1;
      const outlined = image
        ? createOutlinedWeaponCanvas({ source: image, width, height })
        : null;
      let texture: THREE.Texture = tileTexture;
      visual.paddingU = 0;
      visual.paddingV = 0;
      if (outlined) {
        const canvasTexture = new THREE.CanvasTexture(outlined.canvas);
        canvasTexture.magFilter = tileTexture.magFilter;
        canvasTexture.minFilter = tileTexture.minFilter;
        canvasTexture.generateMipmaps = false;
        canvasTexture.colorSpace = tileTexture.colorSpace;
        canvasTexture.needsUpdate = true;
        tileTexture.dispose();
        texture = canvasTexture;
        visual.paddingU = outlined.paddingU;
        visual.paddingV = outlined.paddingV;
      }
      visual.material.map?.dispose();
      visual.material.map = texture;
      visual.material.needsUpdate = true;
      visual.aspect = width / height;
      visual.textureKey = textureKey;
    }
    return visual;
  }

  private syncSlot(
    slot: WeaponSlot,
    tile: PlayerHeldWeaponTile,
    playerSprite: THREE.Sprite,
    nowMs: number,
  ): void {
    const visual = this.ensureVisual(slot, tile);
    const swing = visual.swing;
    const progress = swing ? (nowMs - swing.startMs) / PLAYER_WEAPON_SWING_DURATION_MS : 0;
    if (swing && progress >= 1) {
      visual.swing = null;
    }
    const swinging = swing !== null && progress > 0 && progress < 1;
    const restSide = REST_SIDE[slot];
    const side = swinging ? swing.side : restSide;
    const pose = samplePlayerWeaponSwing(swinging ? progress : 0, side, swing?.lunge ?? null);

    // Slide the hand across when the target is on the other side.
    const crossBlend = !swinging || side === restSide
      ? 0
      : progress < 0.15 ? progress / 0.15 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
    const restHandU = 0.5 + restSide * (PLAYER_WEAPON_HAND_UV.u - 0.5);
    const swingHandU = 0.5 + side * (PLAYER_WEAPON_HAND_UV.u - 0.5);
    const handU = restHandU + (swingHandU - restHandU) * crossBlend;
    const mirrored = (crossBlend >= 0.5 ? side : restSide) < 0;

    this.updateCameraAxes();
    const playerScaleX = Math.abs(playerSprite.scale.x);
    const playerScaleY = Math.abs(playerSprite.scale.y);
    const size = PLAYER_WEAPON_SIZE * Math.min(playerScaleX, playerScaleY);
    this.anchor
      .copy(playerSprite.position)
      .addScaledVector(
        this.cameraRight,
        (handU - playerSprite.center.x) * playerScaleX + pose.offsetX * playerScaleY,
      )
      .addScaledVector(
        this.cameraUp,
        (PLAYER_WEAPON_HAND_UV.v - playerSprite.center.y) * playerScaleY + pose.offsetY * playerScaleY,
      );

    const { sprite, material } = visual;
    sprite.position.copy(this.anchor);
    // The sprite pivots around its centre point, i.e. the grip; the outline
    // margin widens the quad without changing the weapon's own size.
    const innerU = 1 - visual.paddingU * 2;
    const innerV = 1 - visual.paddingV * 2;
    sprite.center.set(
      visual.paddingU + PLAYER_WEAPON_GRIP_UV.u * innerU,
      visual.paddingV + PLAYER_WEAPON_GRIP_UV.v * innerV,
    );
    sprite.scale.set(
      (size * visual.aspect * (mirrored ? -1 : 1)) / innerU,
      size / innerV,
      1,
    );
    material.rotation = pose.angle;
    sprite.renderOrder = playerSprite.renderOrder + 0.05;
    const playerMaterial = playerSprite.material;
    if (playerMaterial instanceof THREE.SpriteMaterial) {
      material.opacity = playerMaterial.opacity;
      material.depthTest = playerMaterial.depthTest;
      material.alphaTest = playerMaterial.alphaTest;
    }
    sprite.visible = true;
  }
}
