import * as THREE from "three";
import { TILE_SIZE } from "../../constants";
import type { BloodGround } from "../effects/blood-ground";
import type { Camera } from "../camera/camera";
import type { EngineState } from "../runtime/engine-state";
import type { MovementInput } from "../input/movement-input";
import type { PlayerMovement } from "../world/player-movement";
import type { RenderPipeline } from "./render-pipeline";
import {
  WorldShading,
  type WorldShadingPatchOptions,
  type WorldShadingUniforms,
} from "./world-shading";

export interface LightingDependencies {
  readonly bloodGround: Pick<
    BloodGround,
    "bloodGroundSpecularReferenceStrength"
  >;
  readonly camera: Pick<
    Camera,
    "camera"
  >;
  readonly engineState: Pick<
    EngineState,
    "clientOptions"
  >;
  readonly movementInput: Pick<
    MovementInput,
    "isFpsMode"
  >;
  readonly playerMovement: Pick<
    PlayerMovement,
    "playerPos"
  >;
  readonly renderPipeline: Pick<
    RenderPipeline,
    "scene"
  >;
}

/** Lighting resources, player light and light-center smoothing; shader code lives in WorldShading */
export class Lighting {
  constructor(private readonly dependencies: LightingDependencies) {}

  lightingOverlayMesh: THREE.Mesh | null = null;

  lightingOverlayTexture: THREE.CanvasTexture | null = null;

  lightingWallOverlayMesh: THREE.Mesh | null = null;

  lightingWallOverlayTexture: THREE.CanvasTexture | null = null;

  readonly lightingCenterHalfLifeMs: number = 95;

  readonly lightingCenterEpsilonTiles: number = 0.001;

  lightingCenterCurrent = new THREE.Vector2();

  lightingCenterTarget = new THREE.Vector2();

  lightingCenterInitialized: boolean = false;

  readonly lightingVignetteMaxDarkAlpha: number = 0.82;

  ambientLight: THREE.AmbientLight | null = null;

  directionalLight: THREE.DirectionalLight | null = null;

  fpsPlayerLight: THREE.PointLight | null = null;

  markLightingDirty(): void {
    // Lighting currently tracks from shared vignette uniforms, so this is a no-op.
  }

  updateLightingCenter(deltaSeconds: number): void {
    // World geometry is scaled for rectangular tiles; light distances remain
    // measured in logical game tiles, just like player/camera coordinates.
    this.vignetteUniforms.uWorldTileScaleX.value = this.dependencies.renderPipeline.scene.scale.x;
    if (this.dependencies.movementInput.isFpsMode()) {
      // In FPS mode, keep the vignette centered on the camera/player position in world space.
      // (World space in this renderer uses X/Y as the horizontal plane.)
      this.vignetteUniforms.uLightingCenter.value.set(
        this.dependencies.camera.camera.position.x,
        this.dependencies.camera.camera.position.y,
        0,
      );
      this.vignetteUniforms.uIsFpsMode.value = true;
      return;
    }

    this.lightingCenterTarget.set(this.dependencies.playerMovement.playerPos.x, this.dependencies.playerMovement.playerPos.y);
    if (!this.lightingCenterInitialized) {
      this.lightingCenterCurrent.copy(this.lightingCenterTarget);
      this.lightingCenterInitialized = true;
      // Initialize uniforms right away
      this.vignetteUniforms.uLightingCenter.value.set(
        this.lightingCenterCurrent.x * TILE_SIZE,
        -this.lightingCenterCurrent.y * TILE_SIZE,
        0,
      );
      this.vignetteUniforms.uIsFpsMode.value = false;
      return;
    }

    const deltaMs = Math.max(0, deltaSeconds * 1000);
    if (deltaMs > 0) {
      const lerpAlpha =
        1 - Math.exp((-Math.LN2 * deltaMs) / this.lightingCenterHalfLifeMs);
      this.lightingCenterCurrent.lerp(this.lightingCenterTarget, lerpAlpha);
    }

    if (
      this.lightingCenterCurrent.distanceToSquared(this.lightingCenterTarget) <=
      this.lightingCenterEpsilonTiles * this.lightingCenterEpsilonTiles
    ) {
      this.lightingCenterCurrent.copy(this.lightingCenterTarget);
    }

    // --- NEW: Update the globally shared uniforms for the shaders ---
    this.vignetteUniforms.uLightingCenter.value.set(
      this.lightingCenterCurrent.x * TILE_SIZE,
      -this.lightingCenterCurrent.y * TILE_SIZE,
      0,
    );
    this.vignetteUniforms.uIsFpsMode.value = false;
  }

  disposeLightingOverlay(): void {
    if (this.lightingOverlayMesh) {
      this.dependencies.renderPipeline.scene.remove(this.lightingOverlayMesh);
      this.lightingOverlayMesh.geometry.dispose();
      const material = this.lightingOverlayMesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
      this.lightingOverlayMesh = null;
    }
    if (this.lightingWallOverlayMesh) {
      this.dependencies.renderPipeline.scene.remove(this.lightingWallOverlayMesh);
      this.lightingWallOverlayMesh.geometry.dispose();
      const material = this.lightingWallOverlayMesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
      this.lightingWallOverlayMesh = null;
    }

    if (this.lightingOverlayTexture) {
      this.lightingOverlayTexture.dispose();
      this.lightingOverlayTexture = null;
    }
    if (this.lightingWallOverlayTexture) {
      this.lightingWallOverlayTexture.dispose();
      this.lightingWallOverlayTexture = null;
    }
  }

  configureBaseLightingForPlayMode(): void {
    if (!this.ambientLight || !this.directionalLight) {
      return;
    }

    this.vignetteUniforms.uMaxDarkAlpha.value = this.dependencies.engineState.clientOptions
      .lightingEnabled
      ? this.lightingVignetteMaxDarkAlpha
      : 0;

    if (!this.dependencies.engineState.clientOptions.lightingEnabled) {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1;
      this.directionalLight.intensity = 0;
      if (this.fpsPlayerLight) {
        this.fpsPlayerLight.visible = false;
      }
      return;
    }

    this.ambientLight.color.setHex(0x404040);
    if (this.dependencies.movementInput.isFpsMode()) {
      this.ambientLight.intensity = 0.72;
      this.directionalLight.intensity = 1.25;
      if (!this.fpsPlayerLight) {
        this.fpsPlayerLight = new THREE.PointLight(0xfff4d8, 2.8, 14, 1.35);
        this.fpsPlayerLight.castShadow = false;
        this.dependencies.renderPipeline.scene.add(this.fpsPlayerLight);
      }
      this.fpsPlayerLight.intensity = 2.8;
      this.fpsPlayerLight.distance = 14;
      this.fpsPlayerLight.decay = 1.35;
      this.fpsPlayerLight.visible = true;
      this.updateFpsPlayerLightPosition();
      return;
    }

    this.ambientLight.intensity = 0.4;
    this.directionalLight.intensity = 0.8;
    if (this.fpsPlayerLight) {
      this.fpsPlayerLight.visible = false;
    }
  }

  updateFpsPlayerLightPosition(): void {
    if (!this.fpsPlayerLight || !this.dependencies.movementInput.isFpsMode()) {
      return;
    }
    this.fpsPlayerLight.position.copy(this.dependencies.camera.camera.position);
    this.fpsPlayerLight.position.z = this.dependencies.camera.camera.position.z + 0.04;
  }

  /**
   * The shared terrain/billboard shader hook. Kept on Lighting so existing
   * callers keep using `patchMaterialForVignette` and `vignetteUniforms`.
   */
  readonly worldShading = new WorldShading({
    maxDarkAlpha: this.lightingVignetteMaxDarkAlpha,
    bloodGroundStrength: this.dependencies.engineState.clientOptions.bloodStrength,
    bloodGroundSpecularReferenceStrength:
      this.dependencies.bloodGround.bloodGroundSpecularReferenceStrength,
  });

  get vignetteUniforms(): WorldShadingUniforms {
    return this.worldShading.uniforms;
  }

  patchMaterialForVignette(
    material: THREE.Material,
    options: WorldShadingPatchOptions = {},
  ): void {
    this.worldShading.patchMaterial(material, options);
  }
}
