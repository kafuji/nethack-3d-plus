// Tools for one-file-per-tile high-resolution tile packs.
//
//   node scripts/tilesets/hires-pack.mjs split [options]
//     Cuts an NH5-layout atlas (PixelHack by default) into one PNG per tile,
//     named by its stable tile key, upscaled with nearest-neighbour. Sprite
//     tiles (monsters, objects, statues, traps, zaps, explosions, warnings) get
//     a real alpha channel; terrain tiles stay opaque. Use the output as a
//     starting point for redrawn tiles.
//       --atlas <png>     source atlas (default public/assets/5.0/PixelHack.png)
//       --out <dir>       output directory (default .hires-tmp/pixelhack-split)
//       --scale <n>       integer upscale factor (default 4)
//       --only <prefix>   comma-separated key prefixes, e.g. mon/giant_ant,other/fountain
//       --bg-tile <n>     background reference tile index (default 2304)
//       --chroma <hex>    extra solid background colour (default 83aba2)
//
//   node scripts/tilesets/hires-pack.mjs manifest [packDir]
//     Scans a pack directory (default public/assets/hires/pixelhack-hd) and
//     rewrites its manifest.json. Each <key>.png / <key>.webp file becomes an
//     entry; a horizontal strip whose width is a whole multiple (>= 2) of its
//     height is treated as animation frames. Per-tile settings already in the
//     manifest (fps, loop, filter) are kept.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const TILE_KEYS_FILE = resolve(
  PROJECT_ROOT,
  "src/game/hires-tiles/tile-keys.5.generated.ts",
);
const DEFAULT_PACK_DIR = resolve(PROJECT_ROOT, "public/assets/hires/pixelhack-hd");
const ATLAS_COLUMNS = 40;
const MANIFEST_FORMAT = 1;

function loadTileKeys() {
  const text = readFileSync(TILE_KEYS_FILE, "utf8");
  return [...text.matchAll(/^ {2}"(.*)",$/gm)].map((match) => match[1]);
}

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      positional.push(arg);
    }
  }
  return { options, positional };
}

const SPRITE_OTHER_PATTERN =
  /^other\/(.*_trap|squeaky_board|land_mine|pit|spiked_pit|hole|trap_door|level_teleporter|magic_portal|web|anti_magic_field|vibrating_square|trapped_door|trapped_chest|.*_zap_\d+_\d+|explosion_.*|warning_\d+)$/;

/** Tiles drawn over something else (billboards, floor decals) need alpha. */
export function isSpriteTileKey(key) {
  return /^(mon|obj|statue)\//.test(key) || SPRITE_OTHER_PATTERN.test(key);
}

function parseHexColor(hex) {
  const match = String(hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Invalid colour: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function split({ options }) {
  const atlasPath = resolve(PROJECT_ROOT, options.atlas ?? "public/assets/5.0/PixelHack.png");
  const outDir = resolve(PROJECT_ROOT, options.out ?? ".hires-tmp/pixelhack-split");
  const scale = Number.parseInt(options.scale ?? "4", 10);
  if (!Number.isInteger(scale) || scale < 1 || scale > 16) {
    throw new Error("--scale must be an integer from 1 to 16");
  }
  const bgTile = Number.parseInt(options["bg-tile"] ?? "2304", 10);
  const chroma = parseHexColor(options.chroma ?? "83aba2");
  const prefixes = options.only ? String(options.only).split(",").map((p) => p.trim()).filter(Boolean) : null;

  const atlas = PNG.sync.read(readFileSync(atlasPath));
  const tileSize = Math.trunc(atlas.width / ATLAS_COLUMNS);
  const rows = Math.trunc(atlas.height / tileSize);
  const keys = loadTileKeys();
  if (ATLAS_COLUMNS * rows < keys.length) {
    throw new Error(`Atlas has ${ATLAS_COLUMNS * rows} cells, expected ${keys.length}`);
  }

  const pixelOffset = (tileIndex, x, y) => {
    const ax = (tileIndex % ATLAS_COLUMNS) * tileSize + x;
    const ay = Math.floor(tileIndex / ATLAS_COLUMNS) * tileSize + y;
    return (ay * atlas.width + ax) * 4;
  };

  let written = 0;
  keys.forEach((key, tileIndex) => {
    if (prefixes && !prefixes.some((prefix) => key.startsWith(prefix))) return;
    if (key.startsWith("extra/")) return;
    const removeBackground = isSpriteTileKey(key);
    const out = new PNG({ width: tileSize * scale, height: tileSize * scale });
    for (let y = 0; y < tileSize; y += 1) {
      for (let x = 0; x < tileSize; x += 1) {
        const src = pixelOffset(tileIndex, x, y);
        const bg = pixelOffset(bgTile, x, y);
        const r = atlas.data[src];
        const g = atlas.data[src + 1];
        const b = atlas.data[src + 2];
        let a = atlas.data[src + 3];
        if (removeBackground) {
          const matchesBgTile =
            r === atlas.data[bg] && g === atlas.data[bg + 1] && b === atlas.data[bg + 2];
          const matchesChroma = r === chroma[0] && g === chroma[1] && b === chroma[2];
          if (matchesBgTile || matchesChroma) a = 0;
        }
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const dst = (((y * scale + dy) * out.width) + (x * scale + dx)) * 4;
            out.data[dst] = a === 0 ? 0 : r;
            out.data[dst + 1] = a === 0 ? 0 : g;
            out.data[dst + 2] = a === 0 ? 0 : b;
            out.data[dst + 3] = a;
          }
        }
      }
    }
    const file = join(outDir, `${key}.png`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, PNG.sync.write(out));
    written += 1;
  });
  console.log(`Wrote ${written} tiles (${tileSize * scale}px) to ${outDir}`);
}

function readImageSize(file) {
  const data = readFileSync(file);
  if (data.length >= 24 && data.readUInt32BE(0) === 0x89504e47) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (data.length >= 30 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    const chunk = data.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
    }
    if (chunk === "VP8L") {
      const bits = data.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8 ") {
      return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
    }
  }
  throw new Error(`Unsupported image (use PNG or WebP): ${file}`);
}

function listImageFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listImageFiles(full));
    else if (/\.(png|webp)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

function manifest({ positional }) {
  const packDir = positional[0] ? resolve(PROJECT_ROOT, positional[0]) : DEFAULT_PACK_DIR;
  const manifestPath = join(packDir, "manifest.json");
  const previous = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
  const knownKeys = new Set(loadTileKeys());
  const tiles = {};
  const unknown = [];
  for (const file of listImageFiles(packDir).sort()) {
    const relativePath = relative(packDir, file).split(sep).join("/");
    const key = relativePath.replace(/\.(png|webp)$/i, "");
    if (!knownKeys.has(key)) {
      unknown.push(relativePath);
      continue;
    }
    if (tiles[key]) {
      throw new Error(`Both PNG and WebP exist for ${key}`);
    }
    const { width, height } = readImageSize(file);
    const stripFrames = width >= height * 2 && width % height === 0 ? width / height : 1;
    const kept = previous.tiles?.[key] ?? {};
    const entry = { file: relativePath, width: width / stripFrames, height, frames: stripFrames };
    for (const field of ["fps", "loop", "filter"]) {
      if (kept[field] !== undefined) entry[field] = kept[field];
    }
    if (entry.frames > 1 && entry.fps === undefined) entry.fps = 8;
    tiles[key] = entry;
  }
  const output = {
    format: MANIFEST_FORMAT,
    label: previous.label ?? "PixelHack HD (prototype)",
    layout: "5.0",
    filter: previous.filter ?? "linear",
    tiles,
  };
  writeFileSync(manifestPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(tiles).length} tiles to ${manifestPath}`);
  if (unknown.length > 0) {
    console.warn(`Ignored ${unknown.length} files whose names are not tile keys:`);
    for (const path of unknown) console.warn(`  ${path}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
if (command === "split") split(args);
else if (command === "manifest") manifest(args);
else {
  console.error("Usage: hires-pack.mjs split [--scale 4] [--only mon/] | manifest [packDir]");
  process.exit(1);
}
