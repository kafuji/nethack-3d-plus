// Title screen sketch: "The Descent" main theme. Ominous at heart, but heavy
// and dignified: a half-time groove under a guitar ostinato, with the
// leitmotif from motifs.mjs passed between lead guitar and brass.
//
//   Intro (1-4)   bass drone and guitar ostinato on D, Phrygian Eb shadow
//   A     (5-12)  drums enter; lead guitar: call, call, answer, call
//   B     (13-20) brass states the theme at half speed, power ostinato, timpani
//   C     (21-28) brass and lead guitar together: call, answer, call, call
//   Outro (29-32) drone returns, a quiet brass call, ends on A to loop

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 32;

const chordTones = {
  Dm: [2, 5, 9],
  Eb: [3, 7, 10],
  Bb: [10, 2, 5],
  Gm: [7, 10, 2],
  A: [9, 1, 4],
};

const progression = [
  ...["Dm", "Eb", "Dm", "Eb"],
  ...["Dm", "Bb", "Dm", "Bb", "Gm", "Eb", "Dm", "Bb"],
  ...["Dm", "Dm", "Bb", "Bb", "Gm", "Gm", "Eb", "Eb"],
  ...["Dm", "Bb", "Gm", "Eb", "Dm", "Bb", "Dm", "Bb"],
  ...["Dm", "Eb", "Dm", "A"],
];

function sectionOf(bar) {
  if (bar < 4) return "intro";
  if (bar < 12) return "A";
  if (bar < 20) return "B";
  if (bar < 28) return "C";
  return "outro";
}

const LEAD_TONIC = 62; // D4
const BRASS_TONIC = 50; // D3, doubled an octave up
const RIFF_TONIC = 50; // D3

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

    // Strings: chords from A onward, swelling into B and C.
    if (section !== "intro") {
      const vel = { A: 48, B: 62, C: 70, outro: 48 }[section];
      for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 50), vel });
    }

    // Guitar: the D ostinato, or a power-chord figure on the root in B and C.
    if (section === "B" || section === "C") {
      const low = above(root, 45);
      [0, 0, 7, 0, 12, 0, 7, 0].forEach((step, i) => {
        riff.push({ start: start + i * 0.5, dur: 0.45, pitch: low + step, vel: i % 2 ? 70 : 88 });
      });
    } else {
      riff.push(...realize(descent.ostinato, { tonic: RIFF_TONIC, startBar: bar, vel: 76, legato: 0.9 }));
    }

    // Bass: D drone in the intro and outro, roots elsewhere (pushed half notes in B/C).
    if (section === "intro" || (section === "outro" && bar < BARS - 1)) {
      bass.push({ start, dur: BEATS_PER_BAR, pitch: 38, vel: 80 });
    } else if (section === "A" || section === "outro") {
      bass.push({ start, dur: BEATS_PER_BAR, pitch: above(root, 33), vel: 80 });
    } else {
      const low = above(root, 33);
      bass.push({ start, dur: 2.5, pitch: low, vel: 90 });
      bass.push({ start: start + 2.5, dur: 1.5, pitch: low, vel: 80 });
    }

    // Drums: half-time groove from A to C, heavier as it goes.
    if (section === "A" || section === "B" || section === "C") {
      const kicks = section === "C" ? [0, 0.75, 2.5, 3.25] : section === "B" ? [0, 0.75, 2.5, 3.5] : [0, 0.75, 2.5];
      for (const k of kicks) drums.push({ start: start + k, dur: 0.25, pitch: 36, vel: 100 });
      drums.push({ start: start + 2, dur: 0.25, pitch: 38, vel: 92 });
      if (section === "C") drums.push({ start: start + 3.75, dur: 0.25, pitch: 38, vel: 40 });
      for (let i = 0; i < 8; i++) {
        const open = section !== "A" && i === 7;
        drums.push({ start: start + i * 0.5, dur: 0.25, pitch: open ? 46 : 42, vel: i % 2 ? 30 : 46 });
      }
      if (bar === 11 || bar === 19 || bar === 27) {
        [3, 3.25, 3.5, 3.75].forEach((b, i) => drums.push({ start: start + b, dur: 0.25, pitch: 38, vel: 60 + i * 12 }));
      }
    }

    // Timpani: on each new harmony in B and C.
    if ((section === "B" || section === "C") && bar % 2 === 0) {
      timp.push({ start, dur: 1, pitch: above(root, 38), vel: section === "C" ? 100 : 86 });
    }
  });

  const lead = [
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 4, vel: 96 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 6, vel: 96 }),
    ...realize(descent.answer, { tonic: LEAD_TONIC, startBar: 8, vel: 100 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 10, vel: 96 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 20, vel: 104 }),
    ...realize(descent.answer, { tonic: LEAD_TONIC, startBar: 22, vel: 104 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 24, vel: 104 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 26, vel: 104 }),
  ];

  const brassOctaves = { octaves: [12] };
  const brass = [
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 12, augment: 2, vel: 92, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 16, augment: 2, vel: 96, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 20, vel: 92, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 22, vel: 96, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 24, vel: 92, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 26, vel: 96, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 28, vel: 64 }),
  ];

  return [
    { name: "Guitar Ostinato", voice: "guitar", channel: 0, program: 25, notes: riff },
    { name: "Lead Guitar", voice: "lead", channel: 1, program: 24, notes: lead },
    { name: "Brass", voice: "horn", channel: 2, program: 61, notes: brass },
    { name: "Strings", voice: "strings", channel: 3, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 4, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "title",
  name: "NetHack 3D Title Theme - The Descent (sketch)",
  bpm: 84,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Intro", bars: [1, 4] },
    { name: "A", bars: [5, 12] },
    { name: "B", bars: [13, 20] },
    { name: "C", bars: [21, 28] },
    { name: "Outro", bars: [29, 32] },
  ],
  key: "D Phrygian",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark acoustic frontier trip-hop, ominous yet majestic, heavy and dignified, instrumental, D phrygian, " +
      "84 bpm half-time groove, gritty acoustic guitar ostinato, twangy lead guitar, deep bass drone, " +
      "low brass, timpani, recurring leitmotif, cinematic indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the melody and chords.",
      "Turn on Instrumental. The recurring theme (call: D D F Eb D | C Bb A D) should stay recognizable.",
      "The piece loops: bar 32 (A major) leads back into bar 1 (D).",
      "Structure: drone + ostinato intro (1-4), lead guitar theme (5-12), slow brass theme (13-20), full theme (21-28), outro (29-32).",
    ],
  },
};
