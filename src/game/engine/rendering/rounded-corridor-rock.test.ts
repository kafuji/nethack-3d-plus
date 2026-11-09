import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { DarkCorridorInference, type DarkCorridorInferenceDependencies } from "../world/dark-corridor-inference";
import { WallGeometry, type WallGeometryDependencies } from "./wall-geometry";

describe("rock beside dark corridors with a high-resolution stone tile", () => {
  it("drops the flat colour only for blocks whose tile has high-resolution art", () => {
    const inference = new DarkCorridorInference({
      engineState: {
        clientOptions: {
          darkCorridorWallSolidColorOverrideEnabled: true,
          darkCorridorWallSolidColorHex: "#223344",
          darkCorridorWallSolidColorHexFps: "#223344",
        },
      },
      movementInput: { isFpsMode: () => false },
      tilesetAssets: {
        isVultureTilesActive: () => false,
        resolveHiResTile: (tile: number) => (tile === 7 ? {} : null),
      },
    } as unknown as DarkCorridorInferenceDependencies);
    expect(inference.resolveInferredDarkCorridorWallSolidColorHexForTile(true, 7, true)).toBeNull();
    expect(inference.resolveInferredDarkCorridorWallSolidColorHexForTile(true, 8, true)).toBe("#223344");
    // ASCII walls have no tile art to show, so they keep the colour.
    expect(inference.resolveInferredDarkCorridorWallSolidColorHexForTile(true, 7, false)).toBe("#223344");
    expect(inference.resolveInferredDarkCorridorWallSolidColorHexForTile(false, 7, true)).toBeNull();
  });

  it("keeps the stone tile when a block is rebuilt with a rounded corner", () => {
    const tileMap = new Map<string, THREE.Mesh>();
    const put = (x: number, y: number, userData: Record<string, unknown>) => {
      const mesh = new THREE.Mesh();
      mesh.userData = { tileX: x, tileY: y, ...userData };
      tileMap.set(`${x},${y}`, mesh);
      return mesh;
    };
    const rock = put(5, 5, { isWall: true, materialKind: "dark_wall", tileIndex: 7, glyphChar: " ", sourceGlyph: 0 });
    put(6, 5, { isWall: false, materialKind: "dark" }); // corridor east
    put(5, 4, { isWall: false, materialKind: "dark" }); // corridor north
    const solidColour = vi.fn(() => null);
    const applyGlyphMaterial = vi.fn();
    const wall = new WallGeometry({
      darkCorridorInference: {
        getKnownTerrainSnapshotForInferenceAtKey: () => null,
        resolveInferredDarkCorridorWallSolidColorHexForTile: solidColour,
        resolveInferredDarkCorridorWallSolidColorGridEnabled: () => false,
        resolveInferredDarkCorridorWallSolidColorGridDarknessPercent: () => 15,
      },
      engineState: { clientOptions: { roundedWalls: true, tilesetMode: "tiles" } },
      floorOcclusion: {
        refreshFpsWallChamferFloorAmbientOcclusionNear: vi.fn(),
        refreshFpsWallChamferFloorAmbientOcclusionAt: vi.fn(),
        removeFpsWallChamferFloorAmbientOcclusionOverlay: vi.fn(),
      },
      movementInput: { isFpsMode: () => false },
      terminalRendering: { isTerminalDisplayMode: () => false },
      tileMaterials: { getMaterialByKind: () => new THREE.MeshLambertMaterial(), applyGlyphMaterial },
      tileRendering: { tileMap },
      tilesetAssets: { shouldUseVultureTiles: () => false, isDarkCorridorWallCompatibilityActiveOnMesh: () => true },
      vultureWalls: { resolveWallOrientationChar: () => "-" },
    } as unknown as WallGeometryDependencies);
    vi.spyOn(wall, "upsertFpsWallChamferFloorMesh").mockImplementation(() => {});

    wall.refreshFpsWallChamferGeometryAt(5, 5);

    expect(rock.userData.fpsWallChamferMask).toBe(2); // NE corner rounded
    expect(solidColour).toHaveBeenCalledWith(true, 7, true);
    expect(applyGlyphMaterial).toHaveBeenCalled();
    expect(applyGlyphMaterial.mock.calls[0][9]).toBeNull();
    wall.wallGeometry.dispose();
  });
});
