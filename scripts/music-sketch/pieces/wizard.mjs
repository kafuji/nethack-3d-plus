// Wizard of Yendor sketch: panic while he is about. Fast 7/8 that keeps tripping,
// on a sinister organ and harpsichord, with two of his tricks written in:
//   - Double Trouble: the theme is played by two organs a semitone apart, the
//     second an eighth behind, like his double chasing him.
//   - Teleport: everything cuts out for a bar, a run shoots upward, and the music
//     lands a tritone or a step away, with no warning.
// The ostinato loses its last note to fit the bar, and starts on beat one.
//
//   A (1-8)    D: tripping riff, harpsichord spits the call
//   B (9-16)   Eb: Double Trouble on the call
//   17         teleport
//   C (18-25)  G#: harpsichord again, the answer upside down in the brass
//   26         teleport
//   D (27-34)  E: Double Trouble on the answer, brass under it
//   E (35-38)  climbs F, F#, G, then A major and a drum roll back into bar 1
//
// Times are in eighth notes: 7 per bar, so bpm counts eighths.

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 7;
const BARS = 38;
const TELEPORT_BARS = new Set([16, 25]);

/** Semitones above D for each bar. */
function offsetAt(bar) {
  if (bar < 16) return bar < 8 ? 0 : 1;
  if (bar < 25) return 6;
  if (bar < 34) return 2;
  return [3, 4, 5, 7][bar - 34];
}

// The ostinato without its last note: seven eighths, one per beat.
const trippingRiff = [descent.ostinato[0].slice(0, 7)];

const delayed = (beats, notes) => notes.map((note) => ({ ...note, start: note.start + beats }));

function buildTracks() {
  const riff = [];
  const harpsichord = [];
  const pad = [];
  const choir = [];
  const bass = [];
  const drums = [];
  const timp = [];
  const bell = [];
  const organ = [];
  const double = [];
  const brass = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;

    if (TELEPORT_BARS.has(bar)) {
      for (let i = 0; i < 14; i++) harpsichord.push({ start: start + i * 0.5, dur: 0.45, pitch: 62 + offsetAt(bar + 1) + i * 2, vel: 70 + i });
      for (const pitch of [86, 87]) choir.push({ start, dur: BEATS_PER_BAR, pitch, vel: 66 });
      bell.push({ start, dur: 1, pitch: 86, vel: 80 });
      continue;
    }

    const offset = offsetAt(bar);
    const dominant = bar === BARS - 1;
    riff.push(...realize(trippingRiff, { tonic: 50 + offset, startBar: bar, beatsPerBar: BEATS_PER_BAR, augment: 2, vel: 88, legato: 0.7 }));

    // Strings: the tonic, its flat second and its tritone, all at once.
    const padPitches = dominant ? [57, 61, 64] : [50, 51, 56].map((pitch) => pitch + offset);
    for (const pitch of padPitches) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 60 });

    // Bass on the 2+2+3 grouping.
    for (const [beat, dur] of [[0, 1.8], [2, 1.8], [4, 2.8]]) {
      bass.push({ start: start + beat, dur, pitch: 38 + offset, vel: beat ? 84 : 98 });
    }

    // Drums: kick and snare trade on the groups, with an eighth-note hat throughout.
    for (const beat of [0, 4]) drums.push({ start: start + beat, dur: 0.5, pitch: 36, vel: 108 });
    drums.push({ start: start + 3, dur: 0.5, pitch: 36, vel: 84 });
    for (const beat of [2, 5]) drums.push({ start: start + beat, dur: 0.5, pitch: 38, vel: 96 });
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) drums.push({ start: start + beat, dur: 0.5, pitch: 42, vel: beat % 2 ? 40 : 58 });
    if (dominant) {
      for (let i = 0; i < 8; i++) drums.push({ start: start + 3 + i * 0.5, dur: 0.4, pitch: 38, vel: 66 + i * 8 });
    }
    if (bar % 2 === 0) timp.push({ start, dur: 1, pitch: 38 + offset, vel: 96 });
  }

  // The harpsichord spits the call in the outer sections and the climb.
  const spat = (startBar, tonic, vel) =>
    realize(descent.call, { tonic, startBar, beatsPerBar: BEATS_PER_BAR, vel, legato: 0.8 });
  for (const bar of [0, 2, 4, 6]) harpsichord.push(...spat(bar, 74, 84));
  for (const bar of [17, 19, 21, 23]) harpsichord.push(...spat(bar, 68, 88));
  for (const bar of [34, 35, 36]) harpsichord.push(...spat(bar, 74 + offsetAt(bar), 92));

  // Double Trouble: the same line a semitone up and an eighth late.
  const doubled = (motif, startBar, tonic, vel) => {
    const options = { startBar, beatsPerBar: BEATS_PER_BAR, augment: 2, vel };
    organ.push(...realize(motif, { tonic, ...options }));
    double.push(...delayed(1, realize(motif, { tonic: tonic + 1, ...options })));
  };
  doubled(descent.call, 8, 63, 92);
  doubled(descent.call, 12, 63, 94);
  doubled(descent.answer, 26, 64, 94);
  doubled(descent.answer, 30, 64, 96);

  const lowBrass = { beatsPerBar: BEATS_PER_BAR, augment: 2, octaves: [12] };
  brass.push(...realize(descent.answer, { tonic: 44, startBar: 17, invert: true, vel: 100, ...lowBrass }));
  brass.push(...realize(descent.answer, { tonic: 44, startBar: 21, invert: true, vel: 102, ...lowBrass }));
  brass.push(...realize(descent.call, { tonic: 40, startBar: 26, vel: 96, ...lowBrass }));
  brass.push(...realize(descent.call, { tonic: 40, startBar: 30, vel: 98, ...lowBrass }));
  for (let bar = 34; bar < BARS; bar++) {
    for (const shift of [0, 12]) {
      brass.push({ start: bar * BEATS_PER_BAR, dur: BEATS_PER_BAR - 0.3, pitch: 38 + offsetAt(bar) + shift, vel: 104 });
    }
  }

  return [
    { name: "Riff", voice: "guitar", channel: 0, program: 30, notes: riff },
    { name: "Harpsichord", voice: "harp", channel: 1, program: 6, notes: harpsichord, previewGainDb: 6 },
    { name: "Organ", voice: "horn", channel: 2, program: 19, notes: organ, previewGainDb: -2 },
    { name: "Organ Double", voice: "horn", channel: 3, program: 19, notes: double, previewGainDb: -2 },
    { name: "Brass", voice: "horn", channel: 4, program: 61, notes: brass, previewGainDb: -4 },
    { name: "Strings", voice: "strings", channel: 5, program: 48, notes: tie(pad) },
    { name: "Choir", voice: "strings", channel: 6, program: 52, notes: choir, previewGainDb: 2 },
    { name: "Bass", voice: "bass", channel: 7, program: 34, notes: bass, previewGainDb: 2 },
    { name: "Bell", voice: "metal", channel: 8, program: 14, notes: bell, previewGainDb: 6 },
    { name: "Timpani", voice: "timpani", channel: 10, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "wizard",
  name: "NetHack 3D Wizard of Yendor (sketch)",
  bpm: 320, // eighth notes; 160 quarter notes a minute
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "A", bars: [1, 8] },
    { name: "B Double", bars: [9, 16] },
    { name: "Teleport", bars: [17, 17] },
    { name: "C", bars: [18, 25] },
    { name: "Teleport", bars: [26, 26] },
    { name: "D Double", bars: [27, 34] },
    { name: "E climb", bars: [35, 38] },
  ],
  key: "D, Eb, G#, E Phrygian, 7/8",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "frantic panic battle music, sinister evil sorcerer, unhinged, relentless, dark, instrumental, fast 7/8 time, " +
      "160 bpm, tripping overdriven guitar riff, demonic pipe organ, frenetic harpsichord, dissonant strings, low " +
      "brass, pounding drums and timpani, sudden stops and abrupt key changes, wordless choir shrieks, recurring " +
      "leitmotif, video game boss soundtrack, starts immediately, no intro, no lyrics, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the 7/8 stumble, the sudden cuts and the key jumps.",
      "Turn on Instrumental. The Wizard of Yendor has come for the Amulet: pure panic, more unhinged than heroic.",
      "Double Trouble: two organs play the title theme a semitone apart, the second an eighth behind.",
      "Teleport: at bars 17 and 26 everything cuts for a bar, a run shoots up, and the music lands in a new key.",
      "The piece loops: bar 38 (A major, drum roll) leads back into bar 1 (D).",
    ],
  },
};
