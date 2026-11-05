// Usage: node scripts/music-sketch/sketch.mjs <piece-id> [--bars 13-20] [--solo "Brass,Cello"] [--synth builtin]
// Writes music-sketches/<piece-id>/{<id>.mid, <id>-preview.wav, <id>-sheet.html, suno-prompt.txt}.
// With --bars or --solo it only writes <id>-excerpt.wav, to audition part of a piece.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeMidi } from "./midi.mjs";
import { encodeWav, renderPreview } from "./preview-synth.mjs";
import { findFluidTools, renderFluid } from "./fluid-render.mjs";
import { excerpt, humanize } from "./arrange.mjs";
import { renderSheet } from "./sheet.mjs";

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

function parseArgs(argv) {
  const args = { id: argv[0], bars: null, solo: null, synth: null };
  for (let i = 1; i < argv.length; i += 2) {
    const value = argv[i + 1];
    if (argv[i] === "--bars" && /^\d+-\d+$/.test(value ?? "")) args.bars = value.split("-").map(Number);
    else if (argv[i] === "--solo" && value) args.solo = value.split(",").map((name) => name.trim());
    else if (argv[i] === "--synth" && value === "builtin") args.synth = value;
    else {
      console.error(`Unknown option '${argv[i]} ${value ?? ""}'`);
      process.exit(1);
    }
  }
  return args;
}

function renderAudio(piece, { synth, balanceFrom }) {
  const tools = synth === "builtin" ? null : findFluidTools();
  if (tools) return renderFluid(piece, tools, { balanceFrom });
  if (synth !== "builtin") console.warn("FluidSynth or the SoundFont was not found, so using the built-in voices (see README).");
  return renderPreview(piece);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.id || !/^[a-z0-9-]+$/.test(args.id)) {
    console.error("Usage: node scripts/music-sketch/sketch.mjs <piece-id> [--bars 13-20] [--solo \"Brass,Cello\"] [--synth builtin]  (see scripts/music-sketch/pieces/)");
    process.exit(1);
  }
  const { piece } = await import(pathToFileURL(resolve(scriptDir, "pieces", `${args.id}.mjs`)).href);
  const outDir = resolve(projectRoot, "music-sketches", piece.id);
  mkdirSync(outDir, { recursive: true });
  const played = humanize(piece);

  const outputs = {};
  if (args.bars || args.solo) {
    const part = excerpt(played, { bars: args.bars, solo: args.solo });
    outputs[`${piece.id}-excerpt.wav`] = encodeWav(renderAudio(part, { synth: args.synth, balanceFrom: played }));
  } else {
    outputs[`${piece.id}.mid`] = writeMidi(played);
    outputs[`${piece.id}-preview.wav`] = encodeWav(renderAudio(played, { synth: args.synth, balanceFrom: played }));
    outputs[`${piece.id}-sheet.html`] = renderSheet(piece, `${piece.id}-preview.wav`);
    outputs["suno-prompt.txt"] = sunoPrompt(piece);
  }
  for (const [name, data] of Object.entries(outputs)) {
    writeFileSync(resolve(outDir, name), data);
    console.log(`wrote ${relative(projectRoot, resolve(outDir, name))}`);
  }
}

await main();
