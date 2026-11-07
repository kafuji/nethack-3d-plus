import { NH5_TILE_KEYS } from "./tile-keys.5.generated";
import {
  parseHiResTileManifest,
  type HiResTileFilter,
  type HiResTileManifestEntry,
} from "./manifest";

export const builtinHiResTilePackManifestUrl =
  "assets/hires/pixelhack-hd/manifest.json";

/** One drawable frame of a high-resolution tile. */
export interface HiResTileFrame {
  readonly key: string;
  readonly source: CanvasImageSource;
  readonly sx: number;
  readonly sy: number;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly filter: HiResTileFilter;
}

interface LoadedTile {
  readonly entry: HiResTileManifestEntry;
  readonly image: HTMLImageElement;
  readonly frameWidth: number;
}

export interface HiResTilePackOptions {
  readonly manifestUrl: string;
  /** Called once the images listed by the manifest have finished loading. */
  readonly onTilesReady: () => void;
  readonly loadImage?: (url: string) => Promise<HTMLImageElement>;
  readonly fetchJson?: (url: string) => Promise<unknown>;
}

const loadConcurrency = 8;

function defaultLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => void image.decode().then(() => resolve(image), reject);
    image.onerror = () => reject(new Error(`Failed to load high-resolution tile: ${url}`));
    image.src = url;
  });
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load high-resolution tile manifest (${response.status}): ${url}`);
  }
  return response.json();
}

function resolveRelativeUrl(baseUrl: string, path: string): string {
  const slash = baseUrl.lastIndexOf("/");
  return `${slash >= 0 ? baseUrl.slice(0, slash + 1) : ""}${path}`;
}

/**
 * A one-file-per-tile pack addressed by NetHack 5 runtime tile index. Tiles
 * the pack does not provide (or that fail to load) return null so callers fall
 * back to the atlas.
 */
export class HiResTilePack {
  private readonly tiles = new Map<string, LoadedTile>();
  private disposed = false;
  label = "";
  ready = false;

  constructor(private readonly options: HiResTilePackOptions) {}

  get manifestUrl(): string {
    return this.options.manifestUrl;
  }

  get loadedTileCount(): number {
    return this.tiles.size;
  }

  async load(): Promise<void> {
    const fetchJson = this.options.fetchJson ?? defaultFetchJson;
    const loadImage = this.options.loadImage ?? defaultLoadImage;
    const manifest = parseHiResTileManifest(await fetchJson(this.options.manifestUrl));
    if (this.disposed) return;
    this.label = manifest.label;
    const knownKeys = new Set(NH5_TILE_KEYS);
    const pending = [...manifest.tiles].filter(([key]) => knownKeys.has(key));
    const worker = async (): Promise<void> => {
      for (let next = pending.shift(); next && !this.disposed; next = pending.shift()) {
        const [key, entry] = next;
        try {
          const image = await loadImage(resolveRelativeUrl(this.options.manifestUrl, entry.file));
          const frameWidth = Math.trunc(image.width / entry.frames);
          if (frameWidth > 0 && image.height > 0) {
            this.tiles.set(key, { entry, image, frameWidth });
          }
        } catch (error) {
          console.warn(`Skipping high-resolution tile ${key}`, error);
        }
      }
    };
    await Promise.all(Array.from({ length: loadConcurrency }, worker));
    if (this.disposed) return;
    this.ready = true;
    this.options.onTilesReady();
  }

  /** The first frame of the tile; animation playback comes later. */
  getTile(runtimeTileIndex: number): HiResTileFrame | null {
    if (!Number.isInteger(runtimeTileIndex) || runtimeTileIndex < 0) return null;
    const key = NH5_TILE_KEYS[runtimeTileIndex];
    const tile = key ? this.tiles.get(key) : undefined;
    if (!key || !tile) return null;
    return {
      key,
      source: tile.image,
      sx: 0,
      sy: 0,
      width: tile.frameWidth,
      height: tile.image.height,
      frames: tile.entry.frames,
      filter: tile.entry.filter,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.tiles.clear();
  }
}
