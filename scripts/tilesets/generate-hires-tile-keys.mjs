// Builds the stable name key for every NetHack 5 tile index.
//
// High-resolution packs store one file per tile, named by these keys rather
// than by tile number, so a pack survives tile renumbering between NetHack
// releases. The names come from NetHack's own tile sources (win/share/*.txt),
// pinned to the commit the bundled NetHack 5 runtime is built from.
//
// Runtime tile order (see src/game/glyphs/glyph-catalog.5.generated.ts):
//   monsters.txt, objects.txt, other.txt, then one statue per monster tile
//   (excluding the trailing "invisible monster" tile), then filler cells that
//   some atlases (PixelHack) use for their background reference tile.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const SOURCE_DIR = resolve(PROJECT_ROOT, "imported/nethack-5.0/win-share");
const OUTPUT_FILE = resolve(
  PROJECT_ROOT,
  "src/game/hires-tiles/tile-keys.5.generated.ts",
);
const ATLAS_TILE_COUNT = 40 * 58;
const EXPECTED_COUNTS = { monsters: 789, objects: 483, other: 243 };

export function slugifyTileName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s*\/\s*/g, "__")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{3,}/g, "__")
    .replace(/^_+|_+$/g, "");
}

function readTileNames(fileBase) {
  const text = readFileSync(resolve(SOURCE_DIR, `${fileBase}.txt`), "utf8");
  const names = [];
  for (const match of text.matchAll(/^# tile (\d+) \((.*)\)\s*$/gm)) {
    const index = Number.parseInt(match[1], 10);
    if (index !== names.length) {
      throw new Error(`${fileBase}.txt: expected tile ${names.length}, found ${index}`);
    }
    names.push(match[2]);
  }
  if (names.length !== EXPECTED_COUNTS[fileBase]) {
    throw new Error(
      `${fileBase}.txt: expected ${EXPECTED_COUNTS[fileBase]} tiles, found ${names.length}. ` +
        "Update EXPECTED_COUNTS and verify the runtime glyph catalog ranges.",
    );
  }
  return names;
}

export function buildNh5TileKeys() {
  const monsters = readTileNames("monsters");
  const objects = readTileNames("objects");
  const other = readTileNames("other");
  const keys = [];
  const seen = new Map();
  const push = (category, name) => {
    const base = `${category}/${slugifyTileName(name)}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    // Repeated names (lycanthrope animal then human form, same-appearance
    // objects) keep source order. Slugs never contain ".", so the suffix
    // cannot collide with a real name such as "warning_2".
    keys.push(count === 1 ? base : `${base}.${count}`);
  };
  for (const name of monsters) push("mon", name);
  for (const name of objects) push("obj", name);
  for (const name of other) push("other", name);
  const statueMonsters = monsters.filter((name) => !/^invisible monster\b/.test(name));
  for (const name of statueMonsters) push("statue", name);
  while (keys.length < ATLAS_TILE_COUNT) {
    keys.push(`extra/${keys.length}`);
  }
  return keys;
}

function main() {
  const keys = buildNh5TileKeys();
  const body = keys.map((key) => `  ${JSON.stringify(key)},`).join("\n");
  const output = `/* AUTO-GENERATED FILE. DO NOT EDIT. */
/* Run \`npm run hires:tile-keys\` to refresh this file. */
/* Source: NetHack/NetHack win/share/{monsters,objects,other}.txt @ f3fc8537 */

/** Stable file key for each NetHack 5 runtime tile index. */
export const NH5_TILE_KEYS: readonly string[] = [
${body}
];
`;
  writeFileSync(OUTPUT_FILE, output);
  console.log(`Wrote ${keys.length} tile keys to ${OUTPUT_FILE}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
