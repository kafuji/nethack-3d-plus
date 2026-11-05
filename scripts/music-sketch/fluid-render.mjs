// Renders a piece through FluidSynth and a General MIDI SoundFont. Each track is
// rendered alone, leveled to match the balance tuned with the built-in voices
// (including previewGainDb), panned and mixed here. Dry: reverb and chorus are off.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { writeMidi } from "./midi.mjs";
import { renderPreview, voicePan } from "./preview-synth.mjs";

const SAMPLE_RATE = 44100;
const TAIL_SEC = 3;

function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      const found = findFile(path, name);
      if (found) return found;
    } else if (entry.toLowerCase() === name) {
      return path;
    }
  }
  return null;
}

/** { fluidsynth, soundfont } from the env vars or ~/.nethack-music-sketch, or null. */
export function findFluidTools() {
  const toolsDir = join(homedir(), ".nethack-music-sketch");
  const fluidsynth = process.env.MUSIC_SKETCH_FLUIDSYNTH ?? findFile(join(toolsDir, "fluidsynth"), "fluidsynth.exe") ?? findFile(join(toolsDir, "fluidsynth"), "fluidsynth");
  const soundfont = process.env.MUSIC_SKETCH_SOUNDFONT ?? findFile(toolsDir, "musescore_general.sf2");
  return fluidsynth && soundfont ? { fluidsynth, soundfont } : null;
}

/** Reads a 16-bit PCM stereo WAV into two float channels. */
function readWav(buffer) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      const frames = Math.floor(size / 4);
      const left = new Float32Array(frames);
      const right = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        left[i] = buffer.readInt16LE(offset + 8 + i * 4) / 32768;
        right[i] = buffer.readInt16LE(offset + 10 + i * 4) / 32768;
      }
      return [left, right];
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("No data chunk in the FluidSynth output");
}

/** Mean power over the samples that are actually sounding, so rests do not count. */
function activePower(left, right) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < left.length; i++) {
    const value = (left[i] + right[i]) / 2;
    if (Math.abs(value) > 1e-4) {
      sum += value * value;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function renderStem(tools, piece, track, dir, index) {
  const midiPath = join(dir, `${index}.mid`);
  const wavPath = join(dir, `${index}.wav`);
  const tailBeats = (TAIL_SEC * piece.bpm) / 60;
  writeFileSync(midiPath, writeMidi({ ...piece, tracks: [track] }, 480, { tailBeats }));
  const result = spawnSync(
    tools.fluidsynth,
    ["-n", "-i", "-q", "-R", "0", "-C", "0", "-g", "0.3", "-r", String(SAMPLE_RATE), "-O", "s16", "-T", "wav", "-F", wavPath, tools.soundfont, midiPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !existsSync(wavPath)) {
    throw new Error(`FluidSynth failed on track '${track.name}': ${result.error?.message ?? result.stderr}`);
  }
  return readWav(readFileSync(wavPath));
}

export function renderFluid(piece, tools, { balanceFrom = piece } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "music-sketch-"));
  try {
    const tracks = piece.tracks.filter((track) => track.notes.length > 0);
    const stems = tracks.map((track, index) => {
      const [left, right] = renderStem(tools, piece, track, dir, index);
      // Level against the built-in voices over the whole piece, so a short excerpt keeps the same balance.
      const reference = balanceFrom.tracks.find((t) => t.name === track.name) ?? track;
      const referenceAudio = renderPreview({ ...balanceFrom, tracks: [reference] }, { normalize: false });
      const fullStem = balanceFrom === piece ? [left, right] : renderStem(tools, balanceFrom, reference, dir, `${index}-full`);
      const target = activePower(...referenceAudio.channels);
      const current = activePower(...fullStem);
      return { track, left, right, gain: current > 0 ? Math.sqrt(target / current) : 1 };
    });
    const length = Math.max(...stems.map((stem) => stem.left.length));
    const left = new Float32Array(length);
    const right = new Float32Array(length);
    for (const stem of stems) {
      const pan = voicePan(stem.track.voice);
      const leftGain = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * stem.gain;
      const rightGain = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * stem.gain;
      for (let i = 0; i < stem.left.length; i++) {
        left[i] += stem.left[i] * leftGain;
        right[i] += stem.right[i] * rightGain;
      }
    }
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const normalize = peak > 0 ? 0.89 / peak : 1; // about -1 dBFS
    for (let i = 0; i < length; i++) {
      left[i] *= normalize;
      right[i] *= normalize;
    }
    return { sampleRate: SAMPLE_RATE, channels: [left, right] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
