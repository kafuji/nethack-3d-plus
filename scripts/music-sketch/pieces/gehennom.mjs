// Gehennom sketch. The underworld below the Castle: endless mazes, heat and
// demons. The heaviest of the exploration pieces, still dry and flat in
// dynamics. Eb Phrygian: the chain of fifths has come round to Eb, the flat
// second of the title's D, so the motif's menacing note is now the ground
// itself. Everything runs backwards or out of joint:
//   - a slow 7/4 (2+2+3) ritual pulse;
//   - the Descent ostinato in retrograde, an 8-eighth loop phasing against
//     the 14-eighth bar, so it only lines up every four bars, like a maze;
//   - the call played backwards in the low horn, a tritone (A) under the drone,
//     and ember crackle throughout.
//
//   1-2    drone and embers
//   3-14   ritual drums and phasing ostinato; horn call at half speed (4),
//          the call backwards at half speed (8), cello answer (11)
//   15-16  drums stop, drone and embers again to loop

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 7;
const BARS = 16;
const TOTAL_BEATS = BARS * BEATS_PER_BAR;
const TONIC = 51; // Eb3

/** Small deterministic PRNG so the sketch renders the same every time. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The motif played backwards: same notes and lengths, in reverse order. */
const retrograde = (motif) => [[...motif.flat()].reverse()];

const inBars = (bar, from, to) => bar >= from && bar < to;

function buildTracks() {
  const bass = [];
  const pad = [];
  const riff = [];
  const drums = [];
  const timp = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;

    // Bass: Eb1 and Eb2 drone; the tritone A grinds in the middle.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 27, vel: 66 });
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 39, vel: 60 });
    if (inBars(bar, 6, 10)) bass.push({ start, dur: BEATS_PER_BAR, pitch: 33, vel: 50 });

    // Strings: a low Eb-Fb-Bb cluster from bar 3.
    if (bar >= 2) for (const pitch of [51, 52, 58]) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 40 });

    // Ritual drums on 2+2+3, timpani on the long group.
    if (inBars(bar, 2, 14)) {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 90 });
      drums.push({ start: start + 2, dur: 0.25, pitch: 36, vel: 66 });
      drums.push({ start: start + 4, dur: 0.25, pitch: 36, vel: 80 });
      drums.push({ start: start + 5.5, dur: 0.25, pitch: 38, vel: 44 });
      timp.push({ start: start + 4, dur: 2, pitch: 39, vel: 82 });
    }
  }

  // Guitar: the ostinato in retrograde, looping every 8 eighths across 14-eighth bars.
  const backwards = retrograde(descent.ostinato);
  for (let beat = 2 * BEATS_PER_BAR; beat < 14 * BEATS_PER_BAR; beat += 4) {
    riff.push(...realize(backwards, { tonic: TONIC - 12, startBar: 0, vel: 70, legato: 0.7 }).map((n) => ({ ...n, start: n.start + beat })));
  }

  // Embers: sparse, random crackle all the way through.
  const ember = random(13);
  for (let beat = 0.25; beat < TOTAL_BEATS - 0.5; beat += 0.25) {
    if (ember() < 0.18) drums.push({ start: beat, dur: 0.1, pitch: 42, vel: 10 + Math.round(ember() * 16) });
  }

  const horn = [
    ...realize(descent.call, { tonic: TONIC - 12, startBar: 3, beatsPerBar: BEATS_PER_BAR, augment: 2, vel: 74, octaves: [12] }),
    ...realize(retrograde(descent.call), { tonic: TONIC - 12, startBar: 7, beatsPerBar: BEATS_PER_BAR, augment: 2, vel: 76, octaves: [12] }),
  ];
  const cello = realize(descent.answer, { tonic: TONIC - 12, startBar: 10, beatsPerBar: BEATS_PER_BAR, augment: 1.5, vel: 72 });

  return [
    { name: "Guitar Retrograde", voice: "guitar", channel: 0, program: 30, notes: riff, previewGainDb: 2 },
    { name: "Low Horn", voice: "horn", channel: 1, program: 58, notes: horn, previewGainDb: -4 },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello },
    { name: "Strings", voice: "strings", channel: 3, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 4, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
    { name: "Drums and Embers", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "gehennom",
  name: "NetHack 3D Gehennom (sketch)",
  bpm: 60,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Embers", bars: [1, 2] },
    { name: "Ritual", bars: [3, 14] },
    { name: "Embers", bars: [15, 16] },
  ],
  key: "Eb Phrygian, 7/4",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "infernal dark ambient, the underworld, oppressive heat, dread, dry and close, heavy, instrumental, " +
      "Eb phrygian, 7/4 time, 60 bpm, slow ritual drums in 2+2+3, low distorted guitar ostinato that never lines up, " +
      "deep tritone drone, low brass dirge, cello, dissonant low string cluster, crackling embers, " +
      "no build-up, steady dynamics, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the 7/4 pulse, the drone and the dissonance.",
      "Turn on Instrumental. Gehennom, the endless mazes of hell: heavier and hotter than the upper dungeon, never a climax.",
      "Leitmotif: the title theme's call in the low brass (Eb Eb Gb Fb Eb | Db Cb Bb Eb), then played backwards; the guitar plays the ostinato backwards.",
      "The piece loops: it starts and ends on the drone and embers alone.",
    ],
  },
};
