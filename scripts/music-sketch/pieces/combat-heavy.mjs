// Everyday combat sketch: the heavier, slower sibling of combat.mjs (which
// became the boss-fight piece). It still starts on beat one, but it stomps
// rather than races: a low chugging riff, a straight stomping beat, and the
// low brass stating the Descent theme at full length, with no fast figures.
//
//   A (1-8)    stomp and low chug on a D pedal; low brass: call (1), call (5)
//   B (9-16)   brass with octaves: call, answer, call, answer; timpani
//   C (17-24)  answer at half speed over Gm, call once more, A major to loop

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 24;

const chordTones = {
  Dm: [2, 5, 9],
  Eb: [3, 7, 10],
  Bb: [10, 2, 5],
  Gm: [7, 10, 2],
  A: [9, 1, 4],
};

const progression = [
  ...["Dm", "Bb", "Eb", "Dm", "Dm", "Bb", "Eb", "A"],
  ...["Dm", "Bb", "Gm", "Eb", "Dm", "Bb", "Gm", "A"],
  ...["Gm", "Gm", "Dm", "Eb", "Dm", "Bb", "A", "A"],
];

function sectionOf(bar) {
  return "ABC"[Math.floor(bar / 8)];
}

const BRASS_TONIC = 50; // D3

function buildTracks() {
  const pad = [];
  const riff = [];
  const bass = [];
  const drums = [];
  const timp = [];

  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = sectionOf(bar);
    const root = tones[0];

    // Strings: low chords, entering in B.
    if (section !== "A") {
      for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 45), vel: 56 });
    }

    // Guitar: palm-muted chug on a low D pedal in A, on the chord roots after,
    // with the accents of the Descent ostinato's shape (root, fifth, flat second).
    const low = section === "A" ? 38 : above(root, 38);
    [0, 0, 0, 7, 0, 0, 1, 0].forEach((step, i) => {
      riff.push({ start: start + i * 0.5, dur: 0.3, pitch: low + step, vel: step ? 96 : i % 2 ? 66 : 84 });
    });

    // Bass: quarter notes on the root.
    for (let i = 0; i < 4; i++) bass.push({ start: start + i, dur: 0.9, pitch: above(root, 31), vel: i ? 78 : 92 });

    // Drums: straight stomp, kick doubled on 3, a tom-like snare roll into each section.
    const fill = bar % 8 === 7;
    for (const k of [0, 2, 2.5]) drums.push({ start: start + k, dur: 0.25, pitch: 36, vel: 108 });
    for (const s of fill ? [1] : [1, 3]) drums.push({ start: start + s, dur: 0.25, pitch: 38, vel: 100 });
    for (let i = 0; i < 4; i++) drums.push({ start: start + i, dur: 0.25, pitch: i === 3 && !fill ? 46 : 42, vel: 42 });
    if (fill) {
      for (let i = 0; i < 4; i++) drums.push({ start: start + 2 + i * 0.5, dur: 0.25, pitch: 38, vel: 70 + i * 10 });
    }

    // Timpani: every downbeat from B on, plus beat 3 in C.
    if (section !== "A") timp.push({ start, dur: 1, pitch: above(root, 38), vel: 100 });
    if (section === "C") timp.push({ start: start + 2, dur: 1, pitch: above(root, 38), vel: 86 });
  });

  const brassOctaves = { octaves: [12] };
  const heldRoot = (bar, vel) => {
    const pitch = above(chordTones[progression[bar]][0], 38);
    return [0, 12].map((shift) => ({ start: bar * BEATS_PER_BAR, dur: 3.8, pitch: pitch + shift, vel }));
  };
  const brass = [
    ...realize(descent.call, { tonic: BRASS_TONIC - 12, startBar: 0, vel: 92, ...brassOctaves }),
    ...heldRoot(2, 82),
    ...heldRoot(3, 82),
    ...realize(descent.call, { tonic: BRASS_TONIC - 12, startBar: 4, vel: 92, ...brassOctaves }),
    ...heldRoot(6, 86),
    ...heldRoot(7, 86),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 8, vel: 100, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 10, vel: 100, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 12, vel: 100, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 14, vel: 102, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC - 12, startBar: 16, augment: 2, vel: 104, octaves: [12, 24] }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 20, vel: 102, ...brassOctaves }),
    ...heldRoot(22, 92),
    ...heldRoot(23, 92),
  ];

  return [
    { name: "Guitar Chug", voice: "guitar", channel: 0, program: 30, notes: riff },
    { name: "Brass", voice: "horn", channel: 1, program: 61, notes: brass, previewGainDb: -2 },
    { name: "Strings", voice: "strings", channel: 2, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 3, program: 34, notes: bass, previewGainDb: 2 },
    { name: "Timpani", voice: "timpani", channel: 4, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "combat-heavy",
  name: "NetHack 3D Combat Theme - Heavy (sketch)",
  bpm: 100,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  key: "D Phrygian",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark heavy combat music, dry and gritty, slow and crushing, dignified, tense, instrumental, D phrygian, " +
      "100 bpm, stomping drums, low palm-muted overdriven guitar chug, heavy low brass melody, timpani, " +
      "deep bass, recurring leitmotif, indie game battle soundtrack, starts immediately, no intro, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the riff, the brass theme and the structure.",
      "Turn on Instrumental. Everyday fights: heavy and weighty rather than fast; the faster combat piece is kept for bosses.",
      "Leitmotif: the title theme's call (D D F Eb D | C Bb A D) and answer, at full length in the low brass.",
      "The piece loops: bars 23-24 (A major, drum fill) lead back into bar 1 (D).",
      "Structure: stomp and low brass call (1-8), full brass theme (9-16), slow heavy answer and last call (17-24).",
    ],
  },
};
