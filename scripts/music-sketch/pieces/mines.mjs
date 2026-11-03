// Gnomish Mines sketch. Same dry, uneasy ambient as the main dungeon, but
// deeper and busier underneath: miners at work somewhere in the dark. A 5/4
// bar makes the Descent ostinato limp (it is 4 beats long, so it stops for a
// beat each bar), and picks strike on cycles that drift against each other.
//
//   1-4    E drone and distant picks
//   5-26   limping ostinato, thuds on 3+2, falling gravel; F rubs (9-12,
//          21-24), tritone Bb (15-18); motif fragments in the low horn and
//          cello at 7, 13 and 23 (the last one stops on the flat second)
//   27-30  thins back to the drone and picks, so the loop point is not audible

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 5;
const BARS = 30;
const TOTAL_BEATS = BARS * BEATS_PER_BAR;
const TONIC = 52; // E3

/** Small deterministic PRNG so the sketch renders the same every time. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inBars = (bar, from, to) => bar >= from && bar < to;

// The 4-beat ostinato plus a beat of silence fills one 5/4 bar.
const limpingOstinato = [[...descent.ostinato[0], [null, 1]]];

function buildTracks() {
  const bass = [];
  const pad = [];
  const riff = [];
  const picks = [];
  const drums = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;

    // Bass: E2 pedal; F2 grinds against it in two places.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 40, vel: 72 });
    if (inBars(bar, 8, 12) || inBars(bar, 20, 24)) bass.push({ start, dur: BEATS_PER_BAR, pitch: 41, vel: 46 });

    // Strings: low open fifth E2-B2, sinking to a tritone (Bb2) in the middle.
    if (bar >= 2) {
      pad.push({ start, dur: BEATS_PER_BAR, pitch: 40, vel: 40 });
      pad.push({ start, dur: BEATS_PER_BAR, pitch: inBars(bar, 14, 18) ? 46 : 47, vel: 40 });
    }

    // Thuds on the 3+2 grouping of the bar.
    if (inBars(bar, 4, 26)) {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 60 });
      drums.push({ start: start + 3, dur: 0.25, pitch: 36, vel: 44 });
    }
  }

  // Guitar: the limping ostinato, a few notes missing, low and muted.
  const keep = random(5);
  for (let bar = 4; bar < 26; bar++) {
    const density = bar < 6 || bar >= 24 ? 0.4 : 0.75;
    for (const note of realize(limpingOstinato, { tonic: TONIC, startBar: bar, beatsPerBar: BEATS_PER_BAR, legato: 0.5 })) {
      if (keep() < density) riff.push({ ...note, vel: 50 + Math.round(keep() * 18) });
    }
  }

  // Picks: a near miner every 2.5 beats, a far one every 3.25, both irregular in force.
  const force = random(3);
  for (let beat = 1; beat < TOTAL_BEATS - 2; beat += 2.5) {
    if (force() < 0.85) picks.push({ start: beat, dur: 0.25, pitch: 88, vel: 54 + Math.round(force() * 20) });
  }
  for (let beat = 2.75; beat < TOTAL_BEATS - 2; beat += 3.25) {
    if (force() < 0.7) picks.push({ start: beat, dur: 0.25, pitch: 83, vel: 30 + Math.round(force() * 12) });
  }

  // Falling gravel: short runs of fading clicks.
  for (const beat of [31.5, 58, 83.25, 109.5, 127]) {
    [0, 0.125, 0.25, 0.5, 0.75].forEach((offset, i) => {
      drums.push({ start: beat + offset, dur: 0.125, pitch: 42, vel: 34 - i * 5 });
    });
  }

  // Leitmotif fragments, slowed down, low and quiet.
  const [callHead, callTail] = descent.call.map((bar) => [bar]);
  const answerTail = [descent.answer[1]];
  const fragment = (motif, startBar, vel) =>
    realize(motif, { tonic: TONIC - 12, startBar, beatsPerBar: BEATS_PER_BAR, augment: 2, vel });
  const horn = [...fragment(callHead, 6, 60), ...fragment(answerTail, 22, 62)];
  const cello = fragment(callTail, 12, 62);

  return [
    { name: "Guitar Ostinato", voice: "guitar", channel: 0, program: 25, notes: riff, previewGainDb: 3 },
    { name: "Picks", voice: "metal", channel: 1, program: 113, notes: picks, previewGainDb: 4 },
    { name: "Low Horn", voice: "horn", channel: 2, program: 60, notes: horn },
    { name: "Cello", voice: "violin", channel: 3, program: 42, notes: cello, previewGainDb: -1 },
    { name: "Strings", voice: "strings", channel: 4, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 5, program: 33, notes: tie(bass) },
    { name: "Percussion", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "mines",
  name: "NetHack 3D Gnomish Mines (sketch)",
  bpm: 80,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  key: "E Phrygian (pedal), 5/4",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark ambient mine soundscape, dry and close, deep underground, uneasy, restless, minimal, no clear melody, " +
      "5/4 time, 80 bpm, E phrygian drone, limping muted acoustic guitar ostinato, metallic pickaxe strikes on rock, " +
      "low thuds, falling gravel, low sustained strings with dissonant rubs, distant low horn, cello fragments, " +
      "no build-up, steady dynamics, instrumental, no vocals, loopable, indie game exploration music",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the 5/4 limp, the drone and the dissonances.",
      "Turn on Instrumental. Same mood as the main dungeon piece, but deeper, with distant mining work.",
      "The leitmotif only surfaces as fragments (E E G F E, D C B E, B A G F) in the low horn and cello.",
      "The piece loops: it starts and ends on the E drone with distant picks.",
    ],
  },
};
