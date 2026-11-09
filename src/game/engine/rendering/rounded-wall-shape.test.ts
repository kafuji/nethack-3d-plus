import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  buildRoundedWallContour,
  createRoundedWallFloorFillGeometry,
  createRoundedWallGeometry,
  type RoundedWallShapeOptions,
} from "./rounded-wall-shape";
import { WallGeometry, type WallGeometryDependencies } from "./wall-geometry";
import { isDoorlessDoorwayCmapGlyph, isDoorwayCmapGlyph } from "../../glyphs/behavior";

const OPTIONS: RoundedWallShapeOptions = { tileSize: 1, wallHeight: 1, radius: 0.5, arcSegments: 12 };
const CORNER_AREA = 0.25 - Math.PI * 0.25 / 4; // tile corner minus a quarter disk of r = 0.5

function capArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  const cap = geometry.groups.find((group) => group.materialIndex === 0)!;
  let area = 0;
  for (let i = cap.start; i < cap.start + cap.count; i += 3) {
    const ax = position.getX(i), ay = position.getY(i);
    const bx = position.getX(i + 1), by = position.getY(i + 1);
    const cx = position.getX(i + 2), cy = position.getY(i + 2);
    area += ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
  }
  return area;
}

function shapeArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  let area = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    area += Math.abs(
      (position.getX(b) - position.getX(a)) * (position.getY(c) - position.getY(a)) -
        (position.getY(b) - position.getY(a)) * (position.getX(c) - position.getX(a)),
    ) / 2;
  }
  return area;
}

describe("rounded wall shapes", () => {
  it("keeps an uncut wall a full square block with straight sides only", () => {
    const geometry = createRoundedWallGeometry(0, OPTIONS);
    expect(capArea(geometry)).toBeCloseTo(1, 6);
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    geometry.dispose();
  });

  it("turns a wall with every corner cut into a column", () => {
    const contour = buildRoundedWallContour(15, OPTIONS);
    expect(contour.every((segment) => segment.kind === "arc")).toBe(true);
    const geometry = createRoundedWallGeometry(15, OPTIONS);
    // A 48-gon inscribed in the unit-diameter circle.
    expect(capArea(geometry)).toBeCloseTo((48 / 2) * 0.25 * Math.sin((2 * Math.PI) / 48), 6);
    expect(capArea(geometry)).toBeCloseTo(Math.PI / 4, 2);
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 2]);
    geometry.dispose();
  });

  it("gives a wall end a half-round cap and fills exactly the cut-away floor", () => {
    const mask = 2 | 4; // NE + SE: the run ends to the east
    const wall = createRoundedWallGeometry(mask, OPTIONS);
    const fill = createRoundedWallFloorFillGeometry(mask, OPTIONS)!;
    // The arcs are polygons, so the cap is a little smaller than the true curve.
    expect(capArea(wall)).toBeCloseTo(1 - 2 * CORNER_AREA, 2);
    expect(capArea(wall) + shapeArea(fill)).toBeCloseTo(1, 6);
    expect(createRoundedWallFloorFillGeometry(0, OPTIONS)).toBeNull();
    wall.dispose();
    fill.dispose();
  });

  it("winds every side outward and keeps texture coordinates continuous around corners", () => {
    for (const mask of [1, 3, 5, 9, 15]) {
      const geometry = createRoundedWallGeometry(mask, OPTIONS);
      const position = geometry.getAttribute("position");
      const uv = geometry.getAttribute("uv");
      const cap = geometry.groups[0];
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = cap.count; i < position.count; i += 3) {
        a.fromBufferAttribute(position, i);
        b.fromBufferAttribute(position, i + 1);
        c.fromBufferAttribute(position, i + 2);
        const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
        const centre = a.clone().add(b).add(c).divideScalar(3);
        expect(normal.x * centre.x + normal.y * centre.y).toBeGreaterThan(0);
      }
      // Bottom-edge vertices that share a position share a u (apart from the
      // deliberate seam at each arc midpoint, where u wraps from 1 to 0).
      const uByPoint = new Map<string, number[]>();
      for (let i = cap.count; i < position.count; i++) {
        if (position.getZ(i) > 0) continue;
        const key = `${position.getX(i).toFixed(6)},${position.getY(i).toFixed(6)}`;
        uByPoint.set(key, [...(uByPoint.get(key) ?? []), uv.getX(i)]);
      }
      for (const values of uByPoint.values()) {
        const distinct = [...new Set(values.map((value) => value.toFixed(6)))].map(Number);
        if (distinct.length > 1) {
          expect(distinct.sort()).toEqual([0, 1]);
        }
      }
      geometry.dispose();
    }
  });
});

function findGlyph(predicate: (glyph: number) => boolean): number {
  for (let glyph = 0; glyph < 20000; glyph++) if (predicate(glyph)) return glyph;
  throw new Error("glyph not found");
}

describe("diagonal passability for wall corners", () => {
  const doorlessGlyph = findGlyph(isDoorlessDoorwayCmapGlyph);
  const doorGlyph = findGlyph((glyph) => isDoorwayCmapGlyph(glyph) && !isDoorlessDoorwayCmapGlyph(glyph));

  function fixture(roundedWalls: boolean) {
    const tileMap = new Map<string, THREE.Mesh>();
    const wall = new WallGeometry({
      darkCorridorInference: { getKnownTerrainSnapshotForInferenceAtKey: () => null },
      engineState: { clientOptions: { roundedWalls } },
      tileRendering: { tileMap },
      tilesetAssets: { shouldUseVultureTiles: () => false },
    } as unknown as WallGeometryDependencies);
    const put = (x: number, y: number, userData: Record<string, unknown>) => {
      const mesh = new THREE.Mesh();
      mesh.userData = { tileX: x, tileY: y, ...userData };
      tileMap.set(`${x},${y}`, mesh);
    };
    return { wall, put };
  }

  it("rounds corners between open ground, but not toward doors or unknown cells", () => {
    const { wall, put } = fixture(true);
    put(5, 5, { isWall: true, materialKind: "wall" });
    put(6, 5, { isWall: false, materialKind: "floor" }); // east
    put(5, 4, { isWall: false, materialKind: "floor" }); // north
    put(4, 5, { isWall: true, materialKind: "door", sourceGlyph: doorGlyph }); // west: closed door
    put(5, 6, { isWall: false, materialKind: "door", sourceGlyph: doorlessGlyph }); // south: empty doorway
    // NE: floor + floor; SE: floor + empty doorway; SW/NW touch the door.
    expect(wall.computeFpsWallChamferMask(5, 5)).toBe(2 | 4);
    expect(wall.isPassableTileForFpsDiagonal(9, 9)).toBe(false);
    wall.wallGeometry.dispose();
  });

  it("keeps the classic chamfer's treatment of every doorway as open ground", () => {
    const { wall, put } = fixture(false);
    put(4, 5, { isWall: true, materialKind: "door", sourceGlyph: doorGlyph });
    expect(wall.isPassableTileForFpsDiagonal(4, 5)).toBe(true);
    expect(wall.resolveDoorwayKindForFpsChamfer(4, 5)).toBe("door");
    wall.wallGeometry.dispose();
  });
});
