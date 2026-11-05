// Astral Plane sketch. The last level: three altars, three gods, and the Riders
// closing in. Vast and still rather than triumphant. Everything comes in threes:
// a slow 9/4 (3+3+3), three tolls of a bell and a three-voice canon on the
// Descent theme. The piece returns home to the title's D, and the answer, which
// stops on the unresolved flat second everywhere else in the soundtrack, finally
// resolves to the tonic in its last entry, onto the only D major chord in the game.
//
//   1-2    open fifths, three tolls, first stars
//   3-9    canon: call at half speed in violin, horn, cello; answer at half speed
//          in cello, horn, violin, climbing; the Riders' tread underneath
//   10-11  the violin's answer resolves to D and D major opens under it
//   12     bare fifth and three tolls, to loop

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 9;
const BARS = 12;
const TOTAL_BEATS = BARS * BEATS_PER_BAR;

const VIOLIN_TONIC = 74; // D5
const HORN_TONIC = 62; // D4
const CELLO_TONIC = 50; // D3
const RESOLUTION_BEAT = 84; // the last note of the violin's answer (starting at bar 9)

// The answer with its last note, the flat second, resolved to the tonic.
const resolvedAnswer = [descent.answer[0], [...descent.answer[1].slice(0, -1), [0, descent.answer[1].at(-1)[1]]]];

function padPitches(bar) {
  if (bar < 2) return [50, 57, 64]; // D A E, stacked fifths
  if (bar < 9) return [50, 51, 57]; // the flat second rubs against the tonic
  return [50, 57];
}

function buildTracks() {
  const pad = [];
  const bass = [];
  const drums = [];
  const timp = [];
  const bells = [];
  const stars = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;

    for (const pitch of padPitches(bar)) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 46 });
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 38, vel: 70 });

    // The Riders' tread on 3+3+3, under the canon only.
    if (bar >= 2 && bar < 9) {
      timp.push({ start, dur: 1, pitch: 38, vel: 76 });
      drums.push({ start: start + 3, dur: 0.25, pitch: 36, vel: 54 });
      drums.push({ start: start + 6, dur: 0.25, pitch: 36, vel: 54 });
    }
  }

  // D major arrives with the violin's resolution and holds until the last bar.
  pad.push({ start: RESOLUTION_BEAT, dur: (BARS - 1) * BEATS_PER_BAR - RESOLUTION_BEAT, pitch: 54, vel: 46 });

  // Three tolls at each end of the loop.
  for (const bar of [0, BARS - 1]) {
    for (const beat of [0, 3, 6]) {
      bells.push({ start: bar * BEATS_PER_BAR + beat, dur: 1, pitch: 74, vel: 72 });
    }
  }

  // Stars: isolated high notes at uneven gaps.
  const starPitches = [86, 81, 88, 93, 76, 86];
  const gaps = [5, 7, 4, 8, 6];
  let beat = 8;
  for (let i = 0; beat < TOTAL_BEATS - BEATS_PER_BAR; beat += gaps[i % gaps.length], i++) {
    stars.push({ start: beat, dur: 1, pitch: starPitches[i % starPitches.length], vel: 46 });
  }

  const canon = (motif, tonic, startBar, vel) =>
    realize(motif, { tonic, startBar, beatsPerBar: BEATS_PER_BAR, augment: 2, vel });

  const violin = [...canon(descent.call, VIOLIN_TONIC, 2, 72), ...canon(resolvedAnswer, VIOLIN_TONIC, 8, 76)];
  const horn = [...canon(descent.call, HORN_TONIC, 3, 72), ...canon(descent.answer, HORN_TONIC, 7, 74)];
  const cello = [...canon(descent.call, CELLO_TONIC, 4, 72), ...canon(descent.answer, CELLO_TONIC, 6, 74)];

  return [
    { name: "Violin", voice: "violin", channel: 0, program: 40, notes: violin },
    { name: "Horn", voice: "horn", channel: 1, program: 60, notes: horn, previewGainDb: 1 },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello },
    { name: "Strings", voice: "strings", channel: 3, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 4, program: 43, notes: tie(bass) },
    { name: "Stars", voice: "harp", channel: 5, program: 46, notes: stars, previewGainDb: 14 },
    { name: "Bell", voice: "metal", channel: 6, program: 14, notes: bells, previewGainDb: 6 },
    { name: "Timpani", voice: "timpani", channel: 7, program: 47, notes: timp },
    { name: "Tread", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "astral",
  name: "NetHack 3D Astral Plane (sketch)",
  bpm: 66,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Fifths", bars: [1, 2] },
    { name: "Canon", bars: [3, 9] },
    { name: "Resolution", bars: [10, 11] },
    { name: "Tolls", bars: [12, 12] },
  ],
  key: "D Phrygian, resolving to D major, 9/4",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "vast still celestial music, awe and dread, sacred, dry and close, restrained, not triumphant, instrumental, " +
      "D phrygian resolving to D major, slow 9/4 time in 3+3+3, 66 bpm, three-voice canon of solo violin, french horn " +
      "and cello, sustained string fifths, deep D drone, a tolling bell, sparse high harp notes like stars, soft " +
      "timpani and low drum tread, no build-up, steady dynamics, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the canon, the slow 9/4 and the final resolution.",
      "Turn on Instrumental. The last level of the game, before the gods: immense and quiet, never a victory anthem.",
      "Leitmotif: the title theme in D, as a three-voice canon. Its answer ends on the flat second everywhere else; here the last entry falls to D, onto the only D major chord in the soundtrack.",
      "The piece loops: it starts and ends on a bare D-A fifth with three bell tolls.",
    ],
  },
};
