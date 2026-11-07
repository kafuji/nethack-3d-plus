/**
 * High-resolution tile packs keep one image per tile, named by the stable tile
 * key from tile-keys.5.generated.ts, plus a manifest.json written by
 * `npm run hires:manifest`. Any tile missing from a pack falls back to the
 * selected atlas, so a pack can be filled in piece by piece and at any
 * resolution.
 */

export const hiResTileManifestFormat = 1;

export type HiResTileFilter = "linear" | "nearest";
export type HiResTileLoop = "loop" | "pingpong" | "once";

export interface HiResTileManifestEntry {
  /** Path relative to the manifest. */
  readonly file: string;
  /** Size of one frame. */
  readonly width: number;
  readonly height: number;
  /** Frames laid out left to right in one horizontal strip. */
  readonly frames: number;
  readonly fps: number;
  readonly loop: HiResTileLoop;
  readonly filter: HiResTileFilter;
}

export interface HiResTileManifest {
  readonly label: string;
  readonly layout: "5.0";
  readonly tiles: ReadonlyMap<string, HiResTileManifestEntry>;
}

function positiveInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function parseFilter(value: unknown, fallback: HiResTileFilter): HiResTileFilter {
  return value === "nearest" || value === "linear" ? value : fallback;
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(path) &&
    !path.split("/").includes("..")
  );
}

/** Validates an untrusted manifest; malformed entries are dropped. */
export function parseHiResTileManifest(raw: unknown): HiResTileManifest {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (source.format !== hiResTileManifestFormat) {
    throw new Error(`Unsupported high-resolution tile manifest format: ${String(source.format)}`);
  }
  if (source.layout !== "5.0") {
    throw new Error(`Unsupported high-resolution tile layout: ${String(source.layout)}`);
  }
  const defaultFilter = parseFilter(source.filter, "linear");
  const tiles = new Map<string, HiResTileManifestEntry>();
  const rawTiles = source.tiles && typeof source.tiles === "object"
    ? (source.tiles as Record<string, unknown>)
    : {};
  for (const [key, rawEntry] of Object.entries(rawTiles)) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const file = typeof entry.file === "string" ? entry.file.trim() : "";
    if (!isSafeRelativePath(file)) continue;
    const loop = entry.loop === "pingpong" || entry.loop === "once" ? entry.loop : "loop";
    tiles.set(key, {
      file,
      width: positiveInteger(entry.width, 0),
      height: positiveInteger(entry.height, 0),
      frames: positiveInteger(entry.frames, 1),
      fps: Math.max(0, Number(entry.fps) || 0),
      loop,
      filter: parseFilter(entry.filter, defaultFilter),
    });
  }
  return {
    label: typeof source.label === "string" ? source.label : "High-resolution tiles",
    layout: "5.0",
    tiles,
  };
}
