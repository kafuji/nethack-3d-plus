// Astral Plane combat sketch. The last battle, in front of the gods, and the one
// place the soundtrack is allowed to be grand: full brass, a choir and a driving
// 3/4 that keeps astral.mjs's threes and its D. It starts on beat one like the
// other combat pieces. The answer resolves its flat second here too, this time
// leading through Bb and C to a blazing D major before the loop.
//
//   A (1-16)   tutti from beat one; brass: call, answer, call, answer (stretched
//              into 3/4 with augment 1.5); tolls at the start
//   B (17-32)  the choir and strings take a three-voice canon, high to low on the
//              call and low to high on the answer, over the ostinato
//   C (33-44)  brass and violins: call, then the resolved answer; Bb, C, D major
//   D (45-48)  the turn back: Bb, Eb, A major and a drum roll into bar 1

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 3;
const BARS = 48;

const chordTones = {
  Dm: [2, 5, 9],
  D: [2, 6, 9],
  Eb: [3, 7, 10],
  Bb: [10, 2, 5],
  Gm: [7, 10, 2],
  C: [0, 4, 7],
  A: [9, 1, 4],
};

const callChords = ["Dm", "Eb", "Bb", "Dm"];
const answerChords = ["Gm", "Dm", "Dm", "Eb"];
const canonChords = ["Dm", "Dm", "Eb", "Eb", "Gm", "Gm", "Eb", "Eb"];
const progression = [
  ...callChords, ...answerChords, ...callChords, ...answerChords,
  ...canonChords, ...canonChords,
  ...callChords, ...["Gm", "Dm", "Dm", "Bb"], ...["Bb", "C", "D", "D"],
  ...["Bb", "Eb", "A", "A"],
];

function sectionOf(bar) {
  return bar < 16 ? "A" : bar < 32 ? "B" : bar < 44 ? "C" : "D";
}

const BRASS_TONIC = 50; // D3

// The ostinato's first six notes fill one bar of 3/4.
const ostinatoBar = [descent.ostinato[0].slice(0, 6)];

// The answer with its last note, the flat second, resolved to the tonic.
const resolvedAnswer = [descent.answer[0], [...descent.answer[1].slice(0, -1), [0, descent.answer[1].at(-1)[1]]]];

function buildTracks() {
  const pad = [];
  const riff = [];
  const bass = [];
  const drums = [];
  const timp = [];
  const bells = [];
  const fanfare = [];

  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = sectionOf(bar);
    const root = tones[0];
    const lowRoot = above(root, 33);

    for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 55), vel: section === "B" ? 56 : 62 });

    // Ostinato: on the D pedal, except on the root once the harmony opens up in C and D.
    const tonic = section === "A" || section === "B" ? 50 : above(root, 45);
    riff.push(...realize(ostinatoBar, { tonic, startBar: bar, beatsPerBar: BEATS_PER_BAR, vel: 80, legato: 0.8 }));

    for (let i = 0; i < 3; i++) bass.push({ start: start + i, dur: 0.9, pitch: lowRoot, vel: i ? 80 : 92 });

    // Drums: kick on 1 and the and of 2, snare on 3, hats on the beats; a roll
    // closes each eight bars, and a crash opens every fourth bar.
    const roll = bar % 8 === 7;
    drums.push({ start, dur: 0.25, pitch: 36, vel: 104 });
    drums.push({ start: start + 1.5, dur: 0.25, pitch: 36, vel: 90 });
    if (!roll) drums.push({ start: start + 2, dur: 0.25, pitch: 38, vel: 92 });
    for (let i = 0; i < 3; i++) drums.push({ start: start + i, dur: 0.25, pitch: 42, vel: 40 });
    if (roll) {
      for (let i = 0; i < 4; i++) drums.push({ start: start + 2 + i * 0.25, dur: 0.2, pitch: 38, vel: 62 + i * 12 });
    }
    if (bar % 4 === 0) drums.push({ start, dur: 0.25, pitch: 46, vel: 72 });

    // Timpani: every other downbeat, every downbeat from C on.
    if (section === "C" || section === "D" || bar % 2 === 0) {
      timp.push({ start, dur: 1, pitch: above(root, 38), vel: 96 });
    }

    // Fanfare: the final Bb and C as brass stabs, then D major held.
    if (bar === 40 || bar === 41) {
      for (const [beat, dur] of [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]]) {
        for (const pc of tones) fanfare.push({ start: start + beat, dur: dur * 0.9, pitch: above(pc, 62), vel: 100 });
      }
    }
    if (bar === 42) {
      for (const pc of tones) fanfare.push({ start, dur: 2 * BEATS_PER_BAR - 0.2, pitch: above(pc, 62), vel: 104 });
    }
  });

  // Three bell tolls open each of the first three sections.
  for (const bar of [0, 16, 32]) {
    for (let i = 0; i < 3; i++) bells.push({ start: bar * BEATS_PER_BAR + i, dur: 1, pitch: 74, vel: 76 });
  }

  const stretched = (motif, tonic, startBar, vel, octaves = []) =>
    realize(motif, { tonic, startBar, beatsPerBar: BEATS_PER_BAR, augment: 1.5, vel, octaves });

  const brassOctaves = [12];
  const brass = [
    ...stretched(descent.call, BRASS_TONIC, 0, 100, brassOctaves),
    ...stretched(descent.answer, BRASS_TONIC, 4, 100, brassOctaves),
    ...stretched(descent.call, BRASS_TONIC, 8, 102, brassOctaves),
    ...stretched(descent.answer, BRASS_TONIC, 12, 102, brassOctaves),
    ...stretched(descent.call, BRASS_TONIC, 32, 106, brassOctaves),
    ...stretched(resolvedAnswer, BRASS_TONIC, 36, 106, brassOctaves),
  ];
  const violins = [
    ...stretched(descent.call, 74, 16, 88),
    ...stretched(descent.answer, 74, 28, 92),
    ...stretched(descent.call, 74, 32, 92),
    ...stretched(resolvedAnswer, 74, 36, 94),
  ];
  const choir = [
    ...stretched(descent.call, 62, 18, 84),
    ...stretched(descent.answer, 62, 26, 88),
  ];
  const cellos = [
    ...stretched(descent.call, 50, 20, 88),
    ...stretched(descent.answer, 50, 24, 90),
  ];

  return [
    { name: "Brass", voice: "horn", channel: 0, program: 61, notes: brass, previewGainDb: -2 },
    { name: "Brass Fanfare", voice: "horn", channel: 1, program: 56, notes: fanfare, previewGainDb: -4 },
    { name: "Violins", voice: "violin", channel: 2, program: 48, notes: violins },
    { name: "Choir", voice: "violin", channel: 3, program: 52, notes: choir },
    { name: "Cellos", voice: "violin", channel: 4, program: 42, notes: cellos },
    { name: "Ostinato", voice: "guitar", channel: 5, program: 44, notes: riff },
    { name: "Strings", voice: "strings", channel: 6, program: 49, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 7, program: 43, notes: bass, previewGainDb: 2 },
    { name: "Bell", voice: "metal", channel: 8, program: 14, notes: bells, previewGainDb: 6 },
    { name: "Timpani", voice: "timpani", channel: 10, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "astral-combat",
  name: "NetHack 3D Astral Plane Combat (sketch)",
  bpm: 144,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  key: "D Phrygian, resolving to D major, 3/4",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "epic orchestral final battle, grand and majestic, celestial, sacred, overwhelming, dark yet glorious, " +
      "instrumental with wordless choir, D phrygian resolving to D major, 3/4 time, 144 bpm, full brass section, " +
      "soaring violins, wordless choir, driving string ostinato, thundering timpani and war drums, tolling bell, " +
      "recurring leitmotif, video game final battle soundtrack, starts immediately, no intro, no lyrics, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the 3/4 drive, the theme and the D major climax.",
      "Turn on Instrumental (a wordless choir is welcome). Unlike the dry dungeon pieces, this one should be big: the last fight before the gods.",
      "Leitmotif: the title theme stretched into 3/4 (call: D D F Eb D | C Bb A D). The middle section is a three-voice canon on it.",
      "The climax: the answer resolves to D, then Bb, C and a held D major.",
      "The piece loops: bars 47-48 (A major, drum roll) lead back into bar 1 (D).",
    ],
  },
};
