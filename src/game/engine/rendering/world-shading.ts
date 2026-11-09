import * as THREE from "three";
import { TILE_SIZE } from "../../constants";

/**
 * World z is up. The face normal comes from screen-space derivatives of the
 * world position, turned toward the camera. Vertical faces get a key light
 * from the north-west and darken toward their foot; floors keep their painted
 * brightness and raised tops are scaled separately. uFaceShade holds
 * (side facing away, side facing the light, foot, raised top).
 */
const FACE_SHADE_GLSL = `
        {
          vec3 faceNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
          if (dot(faceNormal, cameraPosition - vWorldPos) < 0.0) faceNormal = -faceNormal;
          float upness = clamp(faceNormal.z, 0.0, 1.0);
          vec2 keyDirection = normalize(vec2(-0.6, 0.8));
          float facing = dot(normalize(faceNormal.xy + vec2(0.000001)), keyDirection);
          float sideShade = mix(uFaceShade.x, uFaceShade.y, facing * 0.5 + 0.5);
          sideShade *= mix(uFaceShade.z, 1.0, smoothstep(0.0, 0.75, vWorldPos.z));
          // In first person every wall is a side face, so they are lifted
          // part of the way back toward their painted brightness.
          if (uIsFpsMode) sideShade = mix(sideShade, 1.0, 0.35);
          // Raised tops (wall caps) against the floor at z = 0.
          float topShade = mix(1.0, uFaceShade.w, smoothstep(0.2, 0.8, vWorldPos.z));
          gl_FragColor.rgb *= mix(sideShade, topShade, upness);
        }
`;

/**
 * Explored-area fade. The mask holds, for every map cell, how far that cell
 * is known (1) or still unexplored (0), already blurred on the CPU so the
 * value reaches 0.5 exactly on the boundary between the two. Fragments at the
 * boundary go fully dark and reach their painted colour a fraction of a tile
 * inside, so explored areas melt into the void instead of ending on a square
 * tile edge. World-anchored value noise wobbles the boundary so the tile grid
 * does not show through. uExploredFade holds
 * (fade start, fade end, noise amplitude, noise frequency per tile).
 */
const EXPLORED_MASK_PREFIX_GLSL = `
        uniform sampler2D uExploredMask;
        uniform float uExploredMaskEnabled;
        uniform vec2 uExploredMaskGrid;
        uniform vec4 uExploredFade;
        float nh3dExploredHash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        float nh3dExploredNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(nh3dExploredHash(i), nh3dExploredHash(i + vec2(1.0, 0.0)), u.x),
            mix(nh3dExploredHash(i + vec2(0.0, 1.0)), nh3dExploredHash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
`;

const EXPLORED_MASK_GLSL = `
        if (uExploredMaskEnabled > 0.0) {
          // Tile centres sit on integer cells; +y in the world is -y on the map.
          vec2 exploredCell = vec2(logicalWorldPosition.x, -logicalWorldPosition.y) / ${TILE_SIZE.toFixed(6)};
          float explored = texture2D(uExploredMask, (exploredCell + 0.5) / uExploredMaskGrid).r;
          float exploredNoise =
            nh3dExploredNoise(exploredCell * uExploredFade.w) * 0.65 +
            nh3dExploredNoise(exploredCell * uExploredFade.w * 2.3 + 19.7) * 0.35;
          explored += (exploredNoise - 0.5) * uExploredFade.z;
          float exploredFade = smoothstep(uExploredFade.x, uExploredFade.y, explored);
          gl_FragColor.rgb *= mix(1.0, exploredFade, uExploredMaskEnabled);
        }
`;

export interface WorldShadingInitialValues {
  readonly maxDarkAlpha: number;
  readonly bloodGroundStrength: number;
  readonly bloodGroundSpecularReferenceStrength: number;
}

export function createWorldShadingUniforms(initial: WorldShadingInitialValues) {
  return {
    uLightingCenter: { value: new THREE.Vector3(0, 0, 0) },
    uLightingRadius: { value: 20.0 * TILE_SIZE },
    uWorldTileScaleX: { value: 1 },
    uFalloffPower: { value: 1.08 },
    uMaxDarkAlpha: { value: initial.maxDarkAlpha },
    uIsFpsMode: { value: false },
    uFaceShade: { value: new THREE.Vector4(0.26, 0.58, 0.45, 1.22) },
    uBloodGroundStrength: { value: initial.bloodGroundStrength },
    uBloodGroundSpecularReferenceStrength: {
      value: initial.bloodGroundSpecularReferenceStrength,
    },
    uExploredMask: { value: null as THREE.Texture | null },
    /** 0 = off, 1 = on; values between blend the fade in or out. */
    uExploredMaskEnabled: { value: 0 },
    /** Map size in cells that the mask texture covers. */
    uExploredMaskGrid: { value: new THREE.Vector2(80, 21) },
    uExploredFade: { value: new THREE.Vector4(0.45, 0.95, 0.12, 2.4) },
  };
}

export type WorldShadingUniforms = ReturnType<typeof createWorldShadingUniforms>;

export interface WorldShadingPatchOptions {
  bloodGroundDiscardEmptyTexels?: boolean;
  bloodGroundSpecularEffectTexelSize?: THREE.Vector2;
  /**
   * Shades terrain by which way each face points: tops stay as painted,
   * walls facing away from the key light are darker, and wall faces fade
   * darker toward the floor. Tile materials are unlit, so without this
   * every face of a block has the same brightness.
   */
  faceShade?: boolean;
  /**
   * Monsters, items and the player are drawn wherever the game reports them,
   * including over cells whose terrain is still unknown, so they skip
   * terrain-only effects such as the explored-area fade. Sprite materials are
   * always treated as entities.
   */
  entity?: boolean;
}

/**
 * The shader hook shared by every terrain and billboard material. Tile
 * materials are unlit, so all lighting-like effects (face shading, the
 * player-centred darkening, blood sheen, the explored-area fade) are injected
 * here and driven by one set of shared uniforms.
 */
export class WorldShading {
  readonly uniforms: WorldShadingUniforms;

  constructor(initial: WorldShadingInitialValues) {
    this.uniforms = createWorldShadingUniforms(initial);
  }

  patchMaterial(
    material: THREE.Material,
    options: WorldShadingPatchOptions = {},
  ): void {
    const bloodGroundDiscardEmptyTexels =
      options.bloodGroundDiscardEmptyTexels === true;
    const bloodGroundSpecularEffectTexelSize =
      options.bloodGroundSpecularEffectTexelSize;
    const shaderKeySuffix = bloodGroundSpecularEffectTexelSize
      ? `_blood_ground_specular_v2_${bloodGroundSpecularEffectTexelSize.x.toFixed(
          8,
        )}_${bloodGroundSpecularEffectTexelSize.y.toFixed(8)}`
      : "";
    const bloodGroundGuardKeySuffix = bloodGroundDiscardEmptyTexels
      ? "_blood_ground_color_guard_v1"
      : "";
    const faceShade = options.faceShade === true;
    const faceShadeKeySuffix = faceShade ? "_face_shade_v1" : "";
    const exploredMask =
      options.entity !== true && !(material instanceof THREE.SpriteMaterial);
    const exploredMaskKeySuffix = exploredMask ? "_explored_mask_v1" : "";
    // Force Three.js to compile a unique shader for this patch
    material.customProgramCacheKey = () =>
      `vignette_patch_v10${shaderKeySuffix}${bloodGroundGuardKeySuffix}${faceShadeKeySuffix}${exploredMaskKeySuffix}`;

    material.onBeforeCompile = (shader) => {
      // Bind our class-level uniforms to this specific shader
      shader.uniforms.uLightingCenter = this.uniforms.uLightingCenter;
      shader.uniforms.uLightingRadius = this.uniforms.uLightingRadius;
      shader.uniforms.uWorldTileScaleX = this.uniforms.uWorldTileScaleX;
      shader.uniforms.uFalloffPower = this.uniforms.uFalloffPower;
      shader.uniforms.uMaxDarkAlpha = this.uniforms.uMaxDarkAlpha;
      shader.uniforms.uIsFpsMode = this.uniforms.uIsFpsMode;
      shader.uniforms.uFaceShade = this.uniforms.uFaceShade;
      shader.uniforms.uBloodGroundStrength =
        this.uniforms.uBloodGroundStrength;
      shader.uniforms.uBloodGroundSpecularReferenceStrength =
        this.uniforms.uBloodGroundSpecularReferenceStrength;
      if (exploredMask) {
        shader.uniforms.uExploredMask = this.uniforms.uExploredMask;
        shader.uniforms.uExploredMaskEnabled = this.uniforms.uExploredMaskEnabled;
        shader.uniforms.uExploredMaskGrid = this.uniforms.uExploredMaskGrid;
        shader.uniforms.uExploredFade = this.uniforms.uExploredFade;
      }

      // Inject varying into Vertex Shader
      shader.vertexShader = `
        varying vec3 vWorldPos;
        ${shader.vertexShader}
      `;

      // Branch based on material type (Standard Meshes vs Sprites)
      if (shader.vertexShader.includes("#include <project_vertex>")) {
        // --- 3D MESHES ---
        shader.vertexShader = shader.vertexShader.replace(
          "#include <project_vertex>",
          `#include <project_vertex>
          vec4 tempWorldPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            tempWorldPosition = instanceMatrix * tempWorldPosition;
          #endif
          vWorldPos = (modelMatrix * tempWorldPosition).xyz;`,
        );
      } else if (shader.vertexShader.includes("#include <fog_vertex>")) {
        // --- 2D SPRITES / BILLBOARDS ---
        shader.vertexShader = shader.vertexShader.replace(
          "#include <fog_vertex>",
          `#include <fog_vertex>
          // modelMatrix[3] is the translation column (vec4). Extract xyz for world position.
          vWorldPos = modelMatrix[3].xyz;`,
        );
      }

      let damageFlashLogic = "float uDamageFlash = 0.0;";

      // If it's a sprite, intercept the diffuse color (material.color)
      if (material instanceof THREE.SpriteMaterial) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          `vec4 diffuseColor = vec4( diffuse, opacity );
           // When color is set to red, green drops to 0. Calculate flash intensity from that.
           float uDamageFlashAmount = clamp(1.0 - diffuse.g, 0.0, 1.0);
           // Reset the base multiplier to white so the texture isn't darkened
           diffuseColor.rgb = vec3(1.0); 
          `,
        );
        damageFlashLogic = "float uDamageFlash = uDamageFlashAmount;";
      }

      if (bloodGroundDiscardEmptyTexels) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          #ifdef USE_MAP
            float bloodGroundColorCoverage = max(
              max(diffuseColor.r, diffuseColor.g),
              diffuseColor.b
            );
            if (bloodGroundColorCoverage < 0.0019607843) discard;
          #endif`,
        );
      }

      let bloodGroundSpecularPrefix = "";
      let bloodGroundSpecularLogic = "";
      if (bloodGroundSpecularEffectTexelSize) {
        shader.uniforms.uBloodGroundSpecularEffectTexelSize = {
          value: bloodGroundSpecularEffectTexelSize.clone(),
        };
        bloodGroundSpecularPrefix = `
        uniform vec2 uBloodGroundSpecularEffectTexelSize;
        uniform float uBloodGroundStrength;
        uniform float uBloodGroundSpecularReferenceStrength;

        float bloodGroundSpecularHash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float bloodGroundSpecularNoise(vec2 pixelCoord, float scale, float seed) {
          vec2 p = pixelCoord * scale + vec2(seed, seed * 1.37);
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = bloodGroundSpecularHash(i);
          float b = bloodGroundSpecularHash(i + vec2(1.0, 0.0));
          float c = bloodGroundSpecularHash(i + vec2(0.0, 1.0));
          float d = bloodGroundSpecularHash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        `;
        bloodGroundSpecularLogic = `
        #ifdef USE_MAP
          float bloodGroundOpacityT = clamp(gl_FragColor.a, 0.0, 1.0);
          float bloodGroundVisibleT = smoothstep(0.004, 0.04, bloodGroundOpacityT);
          float bloodGroundVisualAlphaForSpec = max(bloodGroundOpacityT, 0.001);
          float bloodGroundDensityFromVisualAlpha = pow(
            clamp(bloodGroundVisualAlphaForSpec / 0.94, 0.0, 1.0),
            1.3157895
          ) / max(uBloodGroundStrength, 0.001);
          float bloodGroundReferenceOpacityT =
            pow(
              clamp(
                bloodGroundDensityFromVisualAlpha *
                  uBloodGroundSpecularReferenceStrength,
                0.0,
                1.0
              ),
              0.76
            ) *
            0.94;
          float bloodGroundInteriorBlendCompensation = clamp(
            bloodGroundReferenceOpacityT / bloodGroundVisualAlphaForSpec,
            1.0,
            2.25
          );
          vec2 bloodGroundSpecularTexel = max(
            uBloodGroundSpecularEffectTexelSize,
            vec2(0.000001)
          );
          vec2 bloodGroundPixelCoord = vMapUv / bloodGroundSpecularTexel;
          float bloodGroundFineNoise = bloodGroundSpecularNoise(
            bloodGroundPixelCoord,
            0.1075,
            13.0
          );
          float bloodGroundBroadNoise = bloodGroundSpecularNoise(
            bloodGroundPixelCoord,
            0.04,
            37.0
          );
          float bloodGroundPooledNoise = mix(
            bloodGroundFineNoise,
            bloodGroundBroadNoise,
            0.38
          );
          float bloodGroundDepthNoise = bloodGroundSpecularNoise(
            bloodGroundPixelCoord,
            0.023,
            71.0
          );

          float bloodGroundAlphaLeft = texture2D(
            map,
            clamp(
              vMapUv - vec2(bloodGroundSpecularTexel.x, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundAlphaRight = texture2D(
            map,
            clamp(
              vMapUv + vec2(bloodGroundSpecularTexel.x, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundAlphaDown = texture2D(
            map,
            clamp(
              vMapUv - vec2(0.0, bloodGroundSpecularTexel.y),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundAlphaUp = texture2D(
            map,
            clamp(
              vMapUv + vec2(0.0, bloodGroundSpecularTexel.y),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          vec2 bloodGroundInteriorFadeStep = bloodGroundSpecularTexel * 3.0;
          float bloodGroundFadeNearAlphaLeft = texture2D(
            map,
            clamp(
              vMapUv - vec2(bloodGroundInteriorFadeStep.x, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeNearAlphaRight = texture2D(
            map,
            clamp(
              vMapUv + vec2(bloodGroundInteriorFadeStep.x, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeNearAlphaDown = texture2D(
            map,
            clamp(
              vMapUv - vec2(0.0, bloodGroundInteriorFadeStep.y),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeNearAlphaUp = texture2D(
            map,
            clamp(
              vMapUv + vec2(0.0, bloodGroundInteriorFadeStep.y),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeMidAlphaLeft = texture2D(
            map,
            clamp(
              vMapUv - vec2(bloodGroundInteriorFadeStep.x * 3.0, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeMidAlphaRight = texture2D(
            map,
            clamp(
              vMapUv + vec2(bloodGroundInteriorFadeStep.x * 3.0, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeMidAlphaDown = texture2D(
            map,
            clamp(
              vMapUv - vec2(0.0, bloodGroundInteriorFadeStep.y * 3.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeMidAlphaUp = texture2D(
            map,
            clamp(
              vMapUv + vec2(0.0, bloodGroundInteriorFadeStep.y * 3.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeFarAlphaLeft = texture2D(
            map,
            clamp(
              vMapUv - vec2(bloodGroundInteriorFadeStep.x * 5.0, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeFarAlphaRight = texture2D(
            map,
            clamp(
              vMapUv + vec2(bloodGroundInteriorFadeStep.x * 5.0, 0.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeFarAlphaDown = texture2D(
            map,
            clamp(
              vMapUv - vec2(0.0, bloodGroundInteriorFadeStep.y * 5.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundFadeFarAlphaUp = texture2D(
            map,
            clamp(
              vMapUv + vec2(0.0, bloodGroundInteriorFadeStep.y * 5.0),
              vec2(0.0),
              vec2(1.0)
            )
          ).a;
          float bloodGroundNeighborMin = min(
            min(bloodGroundAlphaLeft, bloodGroundAlphaRight),
            min(bloodGroundAlphaDown, bloodGroundAlphaUp)
          );
          float bloodGroundInnerEdgeDrop = max(
            bloodGroundOpacityT - bloodGroundNeighborMin,
            0.0
          );
          vec4 bloodGroundFadeNearRing = vec4(
            bloodGroundFadeNearAlphaLeft,
            bloodGroundFadeNearAlphaRight,
            bloodGroundFadeNearAlphaDown,
            bloodGroundFadeNearAlphaUp
          );
          vec4 bloodGroundFadeMidRing = vec4(
            bloodGroundFadeMidAlphaLeft,
            bloodGroundFadeMidAlphaRight,
            bloodGroundFadeMidAlphaDown,
            bloodGroundFadeMidAlphaUp
          );
          vec4 bloodGroundFadeFarRing = vec4(
            bloodGroundFadeFarAlphaLeft,
            bloodGroundFadeFarAlphaRight,
            bloodGroundFadeFarAlphaDown,
            bloodGroundFadeFarAlphaUp
          );
          float bloodGroundFadeNearDrop = max(
            bloodGroundOpacityT - dot(bloodGroundFadeNearRing, vec4(0.25)),
            0.0
          );
          float bloodGroundFadeMidDrop = max(
            bloodGroundOpacityT - dot(bloodGroundFadeMidRing, vec4(0.25)),
            0.0
          );
          float bloodGroundFadeFarDrop = max(
            bloodGroundOpacityT - dot(bloodGroundFadeFarRing, vec4(0.25)),
            0.0
          );
          float bloodGroundRimScale = uIsFpsMode ? 2.0 : 3.0;
          vec2 bloodGroundRimNearStep =
            bloodGroundInteriorFadeStep * bloodGroundRimScale;
          vec2 bloodGroundRimMidStep =
            bloodGroundInteriorFadeStep * 3.0 * bloodGroundRimScale;
          vec4 bloodGroundRimNearRing = vec4(
            texture2D(
              map,
              clamp(
                vMapUv - vec2(bloodGroundRimNearStep.x, 0.0),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv + vec2(bloodGroundRimNearStep.x, 0.0),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv - vec2(0.0, bloodGroundRimNearStep.y),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv + vec2(0.0, bloodGroundRimNearStep.y),
                vec2(0.0),
                vec2(1.0)
              )
            ).a
          );
          vec4 bloodGroundRimMidRing = vec4(
            texture2D(
              map,
              clamp(
                vMapUv - vec2(bloodGroundRimMidStep.x, 0.0),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv + vec2(bloodGroundRimMidStep.x, 0.0),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv - vec2(0.0, bloodGroundRimMidStep.y),
                vec2(0.0),
                vec2(1.0)
              )
            ).a,
            texture2D(
              map,
              clamp(
                vMapUv + vec2(0.0, bloodGroundRimMidStep.y),
                vec2(0.0),
                vec2(1.0)
              )
            ).a
          );
          float bloodGroundRimNearDrop = max(
            bloodGroundOpacityT - dot(bloodGroundRimNearRing, vec4(0.25)),
            0.0
          );
          float bloodGroundRimMidDrop = max(
            bloodGroundOpacityT - dot(bloodGroundRimMidRing, vec4(0.25)),
            0.0
          );
          float bloodGroundInteriorEdgeReach =
            smoothstep(0.02, 0.22, bloodGroundFadeNearDrop) * 0.52 +
            smoothstep(0.02, 0.22, bloodGroundFadeMidDrop) * 0.32 +
            smoothstep(0.02, 0.22, bloodGroundFadeFarDrop) * 0.16;
          float bloodGroundInteriorFadeT = smoothstep(
            0.0,
            1.0,
            clamp(1.0 - bloodGroundInteriorEdgeReach, 0.0, 1.0)
          );

          float bloodGroundPooledPhase = smoothstep(
            0.55,
            0.9,
            bloodGroundOpacityT
          );

          float bloodGroundPooledSheen =
            bloodGroundPooledPhase *
            (0.026 + bloodGroundDepthNoise * 0.012);
          float bloodGroundCompensatedInnerEdgeDrop = clamp(
            bloodGroundInnerEdgeDrop * bloodGroundInteriorBlendCompensation,
            0.0,
            1.0
          );
          float bloodGroundCompensatedRimNearDrop = clamp(
            bloodGroundRimNearDrop * bloodGroundInteriorBlendCompensation,
            0.0,
            1.0
          );
          float bloodGroundCompensatedRimMidDrop = clamp(
            bloodGroundRimMidDrop * bloodGroundInteriorBlendCompensation,
            0.0,
            1.0
          );
          float bloodGroundRimTightT = smoothstep(
            0.03,
            0.16,
            bloodGroundCompensatedInnerEdgeDrop
          );
          float bloodGroundRimNearT = smoothstep(
            0.02,
            0.24,
            bloodGroundCompensatedRimNearDrop
          );
          float bloodGroundRimMidT = smoothstep(
            0.025,
            0.28,
            bloodGroundCompensatedRimMidDrop
          );
          float bloodGroundEdgeTension =
            (
              bloodGroundRimTightT * 0.52 +
              bloodGroundRimNearT * 0.35 +
              bloodGroundRimMidT * 0.13
            ) *
            (0.42 + bloodGroundPooledNoise * 0.58);
          float bloodGroundPooledTensionEdge =
            bloodGroundPooledPhase *
            bloodGroundEdgeTension *
            bloodGroundInteriorBlendCompensation;
          float bloodGroundPooledInteriorT =
            bloodGroundPooledPhase *
            bloodGroundInteriorFadeT;
          float bloodGroundInteriorSheenCompensation = mix(
            1.0,
            bloodGroundInteriorBlendCompensation,
            bloodGroundInteriorFadeT
          );
          float bloodGroundPoolCoreT =
            bloodGroundPooledInteriorT *
            smoothstep(0.7, 0.96, bloodGroundOpacityT);
          float bloodGroundCompensatedPooledInteriorT = clamp(
            bloodGroundPooledInteriorT * bloodGroundInteriorBlendCompensation,
            0.0,
            1.0
          );
          float bloodGroundCompensatedPoolCoreT = clamp(
            bloodGroundPoolCoreT * bloodGroundInteriorBlendCompensation,
            0.0,
            1.0
          );
          float bloodGroundDepthDarken =
            bloodGroundCompensatedPooledInteriorT *
              (0.028 + (1.0 - bloodGroundDepthNoise) * 0.048) +
            bloodGroundCompensatedPoolCoreT *
              (0.019 + (1.0 - bloodGroundDepthNoise) * 0.034);
          gl_FragColor.rgb *= 1.0 - bloodGroundDepthDarken;
          gl_FragColor.rgb = mix(
            gl_FragColor.rgb,
            vec3(0.24, 0.0, 0.01),
            bloodGroundCompensatedPooledInteriorT *
              (0.019 + (1.0 - bloodGroundDepthNoise) * 0.034) +
              bloodGroundCompensatedPoolCoreT *
              (0.013 + (1.0 - bloodGroundDepthNoise) * 0.023)
          );
          gl_FragColor.rgb = mix(
            gl_FragColor.rgb,
            vec3(0.58, 0.015, 0.006),
            bloodGroundCompensatedPooledInteriorT * bloodGroundDepthNoise * 0.012
          );
          float bloodGroundPooledSurfaceSheen =
            bloodGroundCompensatedPooledInteriorT *
            (
              0.01 +
              bloodGroundDepthNoise * 0.012 +
              bloodGroundBroadNoise * 0.006
            ) *
            0.72;
          float bloodGroundHighlight =
            bloodGroundVisibleT *
            (
              bloodGroundPooledSheen * bloodGroundInteriorSheenCompensation +
              bloodGroundPooledSurfaceSheen +
              bloodGroundPooledTensionEdge * 0.12
            );
          vec3 bloodGroundHighlightColor = mix(
            vec3(1.0, 0.58, 0.38),
            vec3(1.0, 0.84, 0.62),
            bloodGroundPooledPhase
          );
          gl_FragColor.rgb = mix(
            gl_FragColor.rgb,
            bloodGroundHighlightColor,
            clamp(bloodGroundHighlight, 0.0, 0.34)
          );
          gl_FragColor.rgb +=
            bloodGroundHighlightColor *
            clamp(bloodGroundHighlight * 0.45, 0.0, 0.14);
        #endif`;
      }

      // Inject logic into Fragment Shader right at the end (before fog)
      shader.fragmentShader = `
        uniform vec3 uLightingCenter;
        uniform float uLightingRadius;
        uniform float uWorldTileScaleX;
        uniform float uFalloffPower;
        uniform float uMaxDarkAlpha;
        uniform bool uIsFpsMode;
        uniform vec4 uFaceShade;
        varying vec3 vWorldPos;
        ${bloodGroundSpecularPrefix}
        ${exploredMask ? EXPLORED_MASK_PREFIX_GLSL : ""}
        ${shader.fragmentShader}
      `.replace(
        "#include <fog_fragment>",
        `${bloodGroundSpecularLogic}
        #include <fog_fragment>
        ${faceShade ? FACE_SHADE_GLSL : ""}
        
        ${damageFlashLogic}
        if (uDamageFlash > 0.0) {
            // Mix in solid red while perfectly preserving original alpha/transparency
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), uDamageFlash);
        }

        // Apply vignette in both normal and FPS modes.
        float radius = uIsFpsMode ? (uLightingRadius) : uLightingRadius;
        vec2 logicalWorldPosition = vec2(vWorldPos.x / max(uWorldTileScaleX, 0.000001), vWorldPos.y);
        float dist = distance(logicalWorldPosition, uLightingCenter.xy);
        float t = clamp(dist / radius, 0.0, 1.0);
        float effectiveFalloff = uIsFpsMode ? (uFalloffPower / 2.0) : uFalloffPower;
        float alpha = pow(t, effectiveFalloff) * uMaxDarkAlpha;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), alpha);
        ${exploredMask ? EXPLORED_MASK_GLSL : ""}`,
      );
    };

    material.needsUpdate = true;
  }
}
