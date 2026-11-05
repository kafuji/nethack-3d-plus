// Main dungeon (Dungeons of Doom) exploration sketch. Dry, dark ambient: no
// clear melody, no build-up. An A pedal with semitone and tritone rubs, the
// Descent ostinato broken into fragments, and pieces of the leitmotif surfacing
// in the low strings and horn. Layers come and go on overlapping cycles that
// do not line up with the bar, so it never settles into a groove.
//
//   1-4    drone alone, then the open fifth and the first drips
//   5-28   broken ostinato, irregular thuds and clicks; Bb rubs (9-12,
//          25-28), tritone Eb (13-16, 29-32); motif fragments at 9, 15,
//          21 and 27 (the last one stops on the unresolved flat second)
//   29-32  thins back to the drone, so the loop point is not audible

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 32;
const TOTAL_BEATS = BARS * BEATS_PER_BAR;

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

function buildTracks() {
  const bass = [];
  const pad = [];
  const riff = [];
  const drips = [];
  const drums = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;

    // Bass: A1 pedal throughout; Bb1 creeps in beside it and beats against it.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 33, vel: 70 });
    if (inBars(bar, 8, 12) || inBars(bar, 24, 28)) bass.push({ start, dur: BEATS_PER_BAR, pitch: 34, vel: 48 });

    // Strings: open fifth A2-E3; the fifth sinks to a tritone, a flat ninth hovers above.
    if (bar >= 2) {
      const fifth = inBars(bar, 12, 16) || inBars(bar, 28, 32) ? 51 : 52;
      pad.push({ start, dur: BEATS_PER_BAR, pitch: 45, vel: 44 });
      pad.push({ start, dur: BEATS_PER_BAR, pitch: fifth, vel: 42 });
      if (inBars(bar, 16, 20)) pad.push({ start, dur: BEATS_PER_BAR, pitch: 58, vel: 34 });
    }
  }

  // Guitar: the Descent ostinato with about half its notes missing.
  const keep = random(7);
  for (let bar = 4; bar < 28; bar++) {
    const density = bar < 6 || bar >= 26 ? 0.3 : 0.55;
    for (const note of realize(descent.ostinato, { tonic: 57, startBar: bar, legato: 0.6 })) {
      if (keep() < density) riff.push({ ...note, vel: 48 + Math.round(keep() * 16) });
    }
  }

  // Drips: isolated high notes at uneven gaps (3 to 7 half-beats apart).
  const drip = random(11);
  const dripPitches = [70, 76, 81, 75, 69, 82];
  for (let beat = 9.5; beat < TOTAL_BEATS - 10; beat += 1.5 + Math.floor(drip() * 5) * 0.5) {
    if (drip() < 0.6) drips.push({ start: beat, dur: 0.5, pitch: dripPitches[Math.floor(drip() * dripPitches.length)], vel: 40 + Math.round(drip() * 12) });
  }

  // Percussion: a low thud every 7 beats and dry clicks every 3 half-beats,
  // cycles that cut across the bar line.
  for (let beat = 16; beat < 112; beat += 7) drums.push({ start: beat, dur: 0.25, pitch: 36, vel: 58 });
  for (let beat = 18.5; beat < 110; beat += 1.5) {
    drums.push({ start: beat, dur: 0.25, pitch: 42, vel: Math.round(beat * 2) % 3 === 0 ? 30 : 20 });
  }
  for (const beat of [43.5, 77, 101.5]) drums.push({ start: beat, dur: 0.25, pitch: 46, vel: 26 });

  // Leitmotif fragments: only half-phrases, slowed down, low and quiet.
  const [callHead, callTail] = descent.call.map((bar) => [bar]);
  const answerTail = [descent.answer[1]];
  const cello = [
    ...realize(callHead, { tonic: 45, startBar: 8, augment: 2, vel: 62 }),
    ...realize(callHead, { tonic: 45, startBar: 20, augment: 2, vel: 62 }),
    ...realize(answerTail, { tonic: 45, startBar: 26, augment: 2, vel: 64 }),
  ];
  const horn = realize(callTail, { tonic: 45, startBar: 14, augment: 2, vel: 58 });

  return [
    { name: "Guitar Fragments", voice: "guitar", channel: 0, program: 25, notes: riff, previewGainDb: 5 },
    { name: "Drips", voice: "harp", channel: 1, program: 46, notes: drips, previewGainDb: 10 },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello, previewGainDb: -1 },
    { name: "Low Horn", voice: "horn", channel: 3, program: 60, notes: horn, previewGainDb: 1 },
    { name: "Strings", voice: "strings", channel: 4, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 5, program: 43, notes: tie(bass) },
    { name: "Percussion", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "dungeon",
  name: "NetHack 3D Dungeon Theme - Dungeons of Doom (sketch)",
  bpm: 66,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Drone", bars: [1, 4] },
    { name: "Fragments", bars: [5, 28] },
    { name: "Thinning", bars: [29, 32] },
  ],
  key: "A Phrygian (pedal)",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark ambient dungeon soundscape, dry and close, tense, uneasy, restless, minimal, no clear melody, " +
      "A phrygian drone, 66 bpm, sparse broken acoustic guitar fragments, low sustained strings with dissonant " +
      "semitone rubs, solo cello fragments, distant low horn, dry percussion clicks and low thuds, irregular, " +
      "no build-up, steady dynamics, instrumental, no vocals, loopable, indie game exploration music",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the drone and dissonances.",
      "Turn on Instrumental. Background for long exploration: dry, tense and flat in dynamics, never a climax.",
      "The leitmotif only surfaces as fragments (A A C Bb A, G F E A, E D C Bb) in the low strings and horn.",
      "The piece loops: it starts and ends on the bare A drone.",
    ],
  },
};
