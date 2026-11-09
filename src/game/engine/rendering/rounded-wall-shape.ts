import * as THREE from "three";

/**
 * Wall blocks whose corners are cut with quarter circles. A corner is cut when
 * a diagonal step past it is allowed (see WallGeometry.computeFpsWallChamferMask),
 * so a lone wall becomes a column, the end of a wall run becomes a half-round
 * cap, and two walls that touch only diagonally show the gap between them.
 *
 * Corner mask bits, as for the FPS chamfer: 1 = NW, 2 = NE, 4 = SE, 8 = SW.
 * World +y is map north. Geometry is centred on the tile like the box wall
 * (z from -height/2 to +height/2) and carries three groups: top cap (0),
 * straight sides (1) and curved corners (2).
 */

export interface RoundedWallShapeOptions {
  readonly tileSize: number;
  readonly wallHeight: number;
  /** Corner radius; half the tile turns a lone wall into a full column. */
  readonly radius: number;
  /** Segments per quarter circle; must be even so each arc splits at its midpoint. */
  readonly arcSegments: number;
  /** Rotate side UVs a quarter turn counter-clockwise (ASCII vertical walls). */
  readonly rotateSideUv?: boolean;
}

type Side = "south" | "east" | "north" | "west";

interface StraightSegment {
  readonly kind: "straight";
  readonly side: Side;
  readonly from: THREE.Vector2;
  readonly to: THREE.Vector2;
}

interface ArcSegment {
  readonly kind: "arc";
  readonly from: THREE.Vector2;
  readonly to: THREE.Vector2;
  /** Position along the quarter arc, 0 at its start and 1 at its end. */
  readonly t0: number;
  readonly t1: number;
}

type ContourSegment = StraightSegment | ArcSegment;

/** Corners in counter-clockwise order with their mask bit and position sign. */
const CORNERS = [
  { bit: 8, sx: -1, sy: -1, startAngle: Math.PI }, // SW: west edge -> south edge
  { bit: 4, sx: 1, sy: -1, startAngle: -Math.PI / 2 }, // SE: south edge -> east edge
  { bit: 2, sx: 1, sy: 1, startAngle: 0 }, // NE: east edge -> north edge
  { bit: 1, sx: -1, sy: 1, startAngle: Math.PI / 2 }, // NW: north edge -> west edge
] as const;

/** The straight edge that leaves each corner (in the same order as CORNERS). */
const EDGE_AFTER_CORNER: readonly Side[] = ["south", "east", "north", "west"];

function clampRadius(options: RoundedWallShapeOptions): number {
  return Math.min(Math.max(options.radius, 0.0001), options.tileSize / 2);
}

function arcSegmentCount(options: RoundedWallShapeOptions): number {
  const segments = Math.max(2, Math.round(options.arcSegments));
  return segments % 2 === 0 ? segments : segments + 1;
}

/** Arc point i of n; rounded so the ends land exactly on the tile edges. */
function arcPoint(
  corner: (typeof CORNERS)[number],
  center: THREE.Vector2,
  radius: number,
  i: number,
  segments: number,
): THREE.Vector2 {
  const angle = corner.startAngle + (Math.PI / 2) * (i / segments);
  const snap = (value: number) => Math.round(value * 1e9) / 1e9;
  return new THREE.Vector2(snap(center.x + radius * Math.cos(angle)), snap(center.y + radius * Math.sin(angle)));
}

function arcCenter(corner: (typeof CORNERS)[number], half: number, radius: number): THREE.Vector2 {
  return new THREE.Vector2(corner.sx * (half - radius), corner.sy * (half - radius));
}

/** The closed outline of the block, counter-clockwise, as straight and curved pieces. */
export function buildRoundedWallContour(
  mask: number,
  options: RoundedWallShapeOptions,
): ContourSegment[] {
  const half = options.tileSize / 2;
  const radius = clampRadius(options);
  const segments = arcSegmentCount(options);
  const corners = CORNERS.map((corner) => {
    const rounded = (mask & corner.bit) !== 0;
    if (!rounded) {
      const point = new THREE.Vector2(corner.sx * half, corner.sy * half);
      return { rounded, start: point, end: point, arc: [] as ArcSegment[] };
    }
    const center = arcCenter(corner, half, radius);
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      points.push(arcPoint(corner, center, radius, i, segments));
    }
    const arc: ArcSegment[] = [];
    for (let i = 0; i < segments; i++) {
      arc.push({ kind: "arc", from: points[i], to: points[i + 1], t0: i / segments, t1: (i + 1) / segments });
    }
    return { rounded, start: points[0], end: points[segments], arc };
  });

  const contour: ContourSegment[] = [];
  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i];
    const next = corners[(i + 1) % corners.length];
    contour.push(...corner.arc);
    if (corner.end.distanceToSquared(next.start) > 1e-10) {
      contour.push({ kind: "straight", side: EDGE_AFTER_CORNER[i], from: corner.end, to: next.start });
    }
  }
  return contour;
}

/**
 * Horizontal texture coordinate on a side face. Straight sides keep the box
 * wall's mapping (the visible part of a full tile face), and each corner arc
 * continues from the side before it to the texture's edge at the arc midpoint,
 * then starts again from the texture's other edge, as two neighbouring faces do.
 */
function sideU(segment: ContourSegment, point: THREE.Vector2, isEnd: boolean, half: number, tileSize: number, radius: number): number {
  if (segment.kind === "straight") {
    switch (segment.side) {
      case "south": return (point.x + half) / tileSize;
      case "east": return (point.y + half) / tileSize;
      case "north": return (half - point.x) / tileSize;
      case "west": return (half - point.y) / tileSize;
    }
  }
  const t = isEnd ? segment.t1 : segment.t0;
  const span = radius / tileSize;
  const firstHalf = t < 0.5 || (t === 0.5 && isEnd);
  return firstHalf ? 1 - span + span * (t / 0.5) : span * ((t - 0.5) / 0.5);
}

export function createRoundedWallGeometry(
  mask: number,
  options: RoundedWallShapeOptions,
): THREE.BufferGeometry {
  const half = options.tileSize / 2;
  const radius = clampRadius(options);
  const halfHeight = options.wallHeight / 2;
  const contour = buildRoundedWallContour(mask, options);

  const caps = { position: [] as number[], normal: [] as number[], uv: [] as number[] };
  const sides = { position: [] as number[], normal: [] as number[], uv: [] as number[] };
  const curves = { position: [] as number[], normal: [] as number[], uv: [] as number[] };

  // Top cap.
  const outline = contour.map((segment) => segment.from);
  const triangles = THREE.ShapeUtils.triangulateShape(outline, []);
  for (const [a, b, c] of triangles) {
    const pa = outline[a], pb = outline[b], pc = outline[c];
    const ccw = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x) > 0;
    for (const p of ccw ? [pa, pb, pc] : [pa, pc, pb]) {
      caps.position.push(p.x, p.y, halfHeight);
      caps.normal.push(0, 0, 1);
      caps.uv.push((p.x + half) / options.tileSize, (p.y + half) / options.tileSize);
    }
  }

  // Sides: one upright quad per contour piece, wound to face outward.
  for (const segment of contour) {
    const target = segment.kind === "arc" ? curves : sides;
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = dy / length;
    const ny = -dx / length;
    const u0 = sideU(segment, segment.from, false, half, options.tileSize, radius);
    const u1 = sideU(segment, segment.to, true, half, options.tileSize, radius);
    const corners: Array<[THREE.Vector2, number, number, number]> = [
      [segment.from, -halfHeight, u0, 0],
      [segment.to, -halfHeight, u1, 0],
      [segment.to, halfHeight, u1, 1],
      [segment.from, -halfHeight, u0, 0],
      [segment.to, halfHeight, u1, 1],
      [segment.from, halfHeight, u0, 1],
    ];
    for (const [p, z, u, v] of corners) {
      target.position.push(p.x, p.y, z);
      target.normal.push(nx, ny, 0);
      if (options.rotateSideUv) {
        target.uv.push(v, 1 - u);
      } else {
        target.uv.push(u, v);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  const position = [...caps.position, ...sides.position, ...curves.position];
  const normal = [...caps.normal, ...sides.normal, ...curves.normal];
  const uv = [...caps.uv, ...sides.uv, ...curves.uv];
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  let start = 0;
  for (const [index, part] of [caps, sides, curves].entries()) {
    const count = part.position.length / 3;
    if (count > 0) geometry.addGroup(start, count, index);
    start += count;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Floor pieces that fill the corners cut away from the block (the area between
 * each arc and the tile corner), with planar UVs across the whole tile.
 */
export function createRoundedWallFloorFillGeometry(
  mask: number,
  options: RoundedWallShapeOptions,
): THREE.ShapeGeometry | null {
  const half = options.tileSize / 2;
  const radius = clampRadius(options);
  const segments = arcSegmentCount(options);
  const shapes: THREE.Shape[] = [];
  for (const corner of CORNERS) {
    if ((mask & corner.bit) === 0) continue;
    const center = arcCenter(corner, half, radius);
    const points = [new THREE.Vector2(corner.sx * half, corner.sy * half)];
    for (let i = 0; i <= segments; i++) {
      points.push(arcPoint(corner, center, radius, i, segments));
    }
    shapes.push(new THREE.Shape(points));
  }
  if (shapes.length === 0) return null;
  const geometry = new THREE.ShapeGeometry(shapes);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    uv.setXY(
      i,
      THREE.MathUtils.clamp((position.getX(i) + half) / options.tileSize, 0, 1),
      THREE.MathUtils.clamp((position.getY(i) + half) / options.tileSize, 0, 1),
    );
  }
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
