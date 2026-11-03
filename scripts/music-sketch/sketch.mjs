// Usage: node scripts/music-sketch/sketch.mjs <piece-id>
// Writes music-sketches/<piece-id>/{<id>.mid, <id>-preview.wav, suno-prompt.txt}.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeMidi } from "./midi.mjs";
import { encodeWav, renderPreview } from "./preview-synth.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../..");

function sunoPrompt(piece) {
  const bars = Math.ceil(
    Math.max(...piece.tracks.flatMap((track) => track.notes.map((n) => n.start + n.dur))) / piece.beatsPerBar,
  );
  const seconds = (bars * piece.beatsPerBar * 60) / piece.bpm;
  return [
    `${piece.name}`,
    `${piece.key}, ${piece.bpm} BPM, ${bars} bars (~${Math.round(seconds)} s)`,
    "",
    "Style prompt:",
    piece.suno.style,
    "",
    ...piece.suno.notes.map((line) => `- ${line}`),
    "",
  ].join("\n");
}

async function main() {
  const id = process.argv[2];
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    console.error("Usage: node scripts/music-sketch/sketch.mjs <piece-id>  (see scripts/music-sketch/pieces/)");
    process.exit(1);
  }
  const { piece } = await import(pathToFileURL(resolve(scriptDir, "pieces", `${id}.mjs`)).href);
  const outDir = resolve(projectRoot, "music-sketches", piece.id);
  mkdirSync(outDir, { recursive: true });

  const outputs = {
    [`${piece.id}.mid`]: writeMidi(piece),
    [`${piece.id}-preview.wav`]: encodeWav(renderPreview(piece)),
    "suno-prompt.txt": sunoPrompt(piece),
  };
  for (const [name, data] of Object.entries(outputs)) {
    writeFileSync(resolve(outDir, name), data);
    console.log(`wrote ${relative(projectRoot, resolve(outDir, name))}`);
  }
}

await main();
