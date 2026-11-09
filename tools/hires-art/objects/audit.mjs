// Content checks for the 483 object tiles; does not launch or build the game.
// node tools/hires-art/objects/audit.mjs [--allow-incomplete]
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const pack = resolve(root, 'public/assets/hires/pixelhack-hd');
const source = readFileSync(resolve(root, 'src/game/hires-tiles/tile-keys.5.generated.ts'), 'utf8');
const keys = [...source.matchAll(/"(obj\/[^"\r\n]+)"/g)].map(match => match[1]);
const specs = ['items', 'weapons'].map(name => JSON.parse(readFileSync(resolve(root, `tools/hires-art/objects/${name}.json`), 'utf8')));
const manifest = JSON.parse(readFileSync(resolve(pack, 'manifest.json'), 'utf8'));
const report = { total: keys.length, complete: 0, old: [], missing: [], errors: [], sharedGroups: 0, unassigned: [] };
const assigned = new Map();
for (const spec of specs) for (const item of spec.items) {
  if (!item.derive && (!item.fit?.matchRef || item.outline !== 1.4 || item.relief?.contrast !== 0.2 || item.relief?.contrastRadius !== 0.06)) {
    report.errors.push(`${item.name}: placement / outline / relief settings differ from the manual`);
  }
  const identicalOutputs = new Map();
  for (const output of item.outputs ?? []) {
    const shared = [].concat(output.key);
    const { key: _key, ...transforms } = output;
    const signature = JSON.stringify(transforms);
    identicalOutputs.set(signature, [...(identicalOutputs.get(signature) ?? []), ...shared]);
    for (const key of shared) {
      if (assigned.has(key)) report.errors.push(`${key}: assigned twice`);
      assigned.set(key, item.name);
      if (!keys.includes(key)) report.errors.push(`${key}: unknown tile key`);
    }
  }
  // Separate outputs using the same colour also share their artwork (gems/glass).
  for (const shared of identicalOutputs.values()) {
    if (shared.length > 1) {
      report.sharedGroups++;
      const files = shared.map(key => resolve(pack, `${key}.png`));
      if (files.every(existsSync)) {
        const first = readFileSync(files[0]);
        for (let i = 1; i < files.length; i++) if (!first.equals(readFileSync(files[i]))) report.errors.push(`${item.name}: shared images differ`);
      }
    }
  }
}
for (const key of keys) {
  if (!assigned.has(key)) report.unassigned.push(key);
  const file = resolve(pack, `${key}.png`);
  if (!existsSync(file)) { report.missing.push(key); continue; }
  const png = PNG.sync.read(readFileSync(file));
  if (png.width !== 256 || png.height !== 256) { report.old.push({ key, width: png.width, height: png.height }); continue; }
  let transparent = 0, visible = 0, colour = 0;
  for (let p = 3; p < png.data.length; p += 4) {
    if (png.data[p] === 0) transparent++;
    else { visible++; colour += png.data[p - 3] + png.data[p - 2] + png.data[p - 1]; }
  }
  if (!transparent || !visible) report.errors.push(`${key}: missing transparency or empty icon`);
  if (visible && !colour) report.errors.push(`${key}: entirely black artwork, check tint factors`);
  const entry = manifest.tiles[key];
  if (!entry || entry.width !== 256 || entry.height !== 256 || entry.file !== `${key}.png`) report.errors.push(`${key}: manifest entry missing or out of date`);
  report.complete++;
}
const output = resolve(root, '.hires-tmp/objects/coverage.json');
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, old: report.old.length, missing: report.missing.length }, null, 2));
console.log(`Detailed report: ${output}`);
if (keys.length !== 483 || report.errors.length || report.unassigned.length || (!process.argv.includes('--allow-incomplete') && (report.old.length || report.missing.length))) process.exitCode = 1;
