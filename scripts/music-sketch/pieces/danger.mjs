// Danger sketch: plays when things go badly (low hit points and the like).
// Dry and claustrophobic rather than loud: a racing heartbeat, a nervous
// semitone tremble taken from the Descent ostinato (the tonic and its flat
// second), a cluster that never resolves, and a cello line that creeps up a
// semitone every two bars, so the pressure keeps rising until the loop drops
// it back down. The brass plays the call upside down.
//
//   1-24   heartbeat and ticks from beat one; tremble on D-Eb, moving to the
//          tritone (G#-A) at 9-12 and 17-20; inverted call at 5 and 21,
//          the call at half speed at 13; cello rises D3 to C#4

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 24;

const inBars = (bar, from, to) => bar >= from && bar < to;

function buildTracks() {
  const pad = [];
  const tremble = [];
  const cello = [];
  const bass = [];
  const drums = [];
  const timp = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;
    const tritone = inBars(bar, 8, 12) || inBars(bar, 16, 20);

    // Strings: D-Eb-Ab cluster, or the tritone side of it.
    for (const pitch of tritone ? [50, 56, 57] : [50, 51, 56]) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 46 });

    // Bass: D pedal throughout.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 38, vel: 74 });

    // Tremble: sixteenths between a note and the semitone above, accented in
    // uneven groups (3+3+3+3+4) so it never sits on the beat.
    const [low, high] = tritone ? [68, 69] : [62, 63];
    const accents = new Set([0, 3, 6, 9, 12]);
    for (let i = 0; i < 16; i++) {
      tremble.push({ start: start + i * 0.25, dur: 0.22, pitch: i % 2 ? high : low, vel: accents.has(i) ? 72 : 46 });
    }

    // Cello: one semitone higher every two bars.
    if (bar % 2 === 0) cello.push({ start, dur: 2 * BEATS_PER_BAR, pitch: 50 + bar / 2, vel: 70 });

    // Heartbeat on every beat (lub-dub), clock ticks on the sixteenths.
    for (let beat = 0; beat < 4; beat++) {
      drums.push({ start: start + beat, dur: 0.25, pitch: 36, vel: 84 });
      drums.push({ start: start + beat + 0.375, dur: 0.25, pitch: 36, vel: 58 });
    }
    for (let i = 0; i < 16; i++) drums.push({ start: start + i * 0.25, dur: 0.125, pitch: 42, vel: i % 4 ? 18 : 28 });

    // Timpani: a single blow every four bars.
    if (bar % 4 === 0) timp.push({ start, dur: 1, pitch: 38, vel: 96 });
  }

  const brass = [
    ...realize(descent.call, { tonic: 50, startBar: 4, invert: true, vel: 88, octaves: [-12] }),
    ...realize(descent.call, { tonic: 50, startBar: 12, augment: 2, vel: 90, octaves: [-12] }),
    ...realize(descent.call, { tonic: 50, startBar: 20, invert: true, vel: 92, octaves: [-12] }),
  ];

  return [
    { name: "Tremble", voice: "guitar", channel: 0, program: 25, notes: tremble, previewGainDb: 3 },
    { name: "Brass", voice: "horn", channel: 1, program: 61, notes: brass, previewGainDb: -3 },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello },
    { name: "Strings", voice: "strings", channel: 3, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 4, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
    { name: "Heartbeat", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "danger",
  name: "NetHack 3D Danger Theme (sketch)",
  bpm: 112,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Pulse", bars: [1, 4] },
    { name: "Inverted call", bars: [5, 12] },
    { name: "Half-speed call", bars: [13, 20] },
    { name: "Inverted call", bars: [21, 24] },
  ],
  key: "D (cluster on D-Eb-Ab)",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark tense danger music, dry and claustrophobic, panic, dread, instrumental, 112 bpm, racing heartbeat drum, " +
      "ticking clock, nervous trembling plucked guitar on a semitone, dissonant string cluster, slowly rising cello, " +
      "low brass, single timpani blows, D drone, no melody, no climax, steady intensity, indie game soundtrack, " +
      "starts immediately, no intro, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the heartbeat, the tremble and the dissonant cluster.",
      "Turn on Instrumental. It plays when the player is about to die: tense and urgent, but not a battle anthem.",
      "Leitmotif: the title theme's call played upside down (D D B C# D | E F# G D) in the low brass, and at half speed once.",
      "The piece loops: the cello's slow rise drops back to D3 at bar 1.",
    ],
  },
};
