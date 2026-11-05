// Castle sketch. The fortress at the bottom of the Dungeons of Doom: a moat,
// a drawbridge that opens to a five-note tune, and a garrison behind it.
// Martial and imposing rather than frantic: a slow march with a dry military
// snare, the Descent theme as a fortress fanfare in the brass, and a brass
// chorale in the middle. The gate's bell tune is the call's first five notes;
// the drawbridge answers it with chains and a timpani rumble. G# Phrygian,
// the next step in the chain of fifths (... F# Quest, C# Medusa).
//
//   1-4    bell tune, then the drawbridge: chains and rumble
//   5-12   march: snare cadence, ostinato; horn call, call, answer, answer
//   13-20  chorale: the call and answer at half speed over held brass chords
//   21-28  the garrison: brass call/answer, high strings double the answer
//   29-32  bell tune and drawbridge again, D# major to loop

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 32;
const TONIC = 56; // G#3

const chordTones = {
  "G#m": [8, 11, 3],
  A: [9, 1, 4],
  E: [4, 8, 11],
  "C#m": [1, 4, 8],
  D: [2, 6, 9],
  "D#": [3, 7, 10],
};

const progression = [
  ...["G#m", "G#m", "A", "G#m"],
  ...["G#m", "E", "G#m", "A", "C#m", "A", "G#m", "D"],
  ...["G#m", "A", "E", "G#m", "C#m", "G#m", "G#m", "A"],
  ...["G#m", "E", "C#m", "A", "G#m", "E", "C#m", "A"],
  ...["G#m", "A", "G#m", "D#"],
];

function sectionOf(bar) {
  if (bar < 4) return "gate";
  if (bar < 12) return "march";
  if (bar < 20) return "chorale";
  if (bar < 28) return "garrison";
  return "outro";
}

const gateTune = [descent.call[0]];

function buildTracks() {
  const pad = [];
  const riff = [];
  const bass = [];
  const drums = [];
  const timp = [];
  const lowBrass = [];
  const bells = [];

  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = sectionOf(bar);
    const root = tones[0];
    const marching = section === "march" || section === "garrison";
    const gate = section === "gate" || section === "outro";

    // Bass: G# drone at the gate, half-note roots elsewhere.
    if (gate) {
      bass.push({ start, dur: BEATS_PER_BAR, pitch: bar === BARS - 1 ? above(root, 32) : 32, vel: 74 });
    } else {
      for (const half of [0, 2]) bass.push({ start: start + half, dur: 1.9, pitch: above(root, 32), vel: half ? 76 : 86 });
    }

    // Strings: chords except at the gate.
    if (!gate) for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 51), vel: 50 });

    // Guitar: the Descent ostinato on low G# while marching.
    if (marching) riff.push(...realize(descent.ostinato, { tonic: 44, startBar: bar, vel: 74, legato: 0.8 }));

    // Low brass: held root and fifth through the chorale, the fortress walls.
    if (section === "chorale") {
      const low = above(root, 40);
      for (const pitch of [low, low + 7]) lowBrass.push({ start, dur: 3.9, pitch, vel: 78 });
    }

    // Drums: a march cadence with ghost notes and a roll every fourth bar;
    // in the chorale only the bass drum and timpani mark each chord.
    if (marching) {
      for (const k of [0, 2]) drums.push({ start: start + k, dur: 0.25, pitch: 36, vel: 96 });
      const roll = bar % 4 === 3;
      const hits = roll
        ? [[1, 84], ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [2 + i * 0.25, 46 + i * 6])]
        : [[1, 84], [1.75, 38], [2.5, 48], [3, 88], [3.5, 42], [3.75, 54]];
      for (const [beat, vel] of hits) drums.push({ start: start + beat, dur: 0.2, pitch: 38, vel });
    } else if (section === "chorale") {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 90 });
      timp.push({ start, dur: 1, pitch: above(root, 38), vel: 92 });
      if (bar === 19) {
        for (let i = 0; i < 8; i++) drums.push({ start: start + 2 + i * 0.25, dur: 0.2, pitch: 38, vel: 46 + i * 6 });
      }
    }
    if (marching && bar % 2 === 0) timp.push({ start, dur: 1, pitch: above(root, 38), vel: 84 });
  });

  // The gate: bell tune, then chains and a timpani rumble as the bridge lowers.
  for (const bar of [0, 28]) {
    bells.push(...realize(gateTune, { tonic: TONIC + 24, startBar: bar, vel: 72, legato: 1 }));
    const start = (bar + 1) * BEATS_PER_BAR;
    for (let i = 0; i < 20; i++) {
      bells.push({ start: start + i * 0.5 + (i % 3 === 2 ? 0.25 : 0), dur: 0.25, pitch: i % 2 ? 47 : 44, vel: 34 + (i % 4) * 4 });
    }
    for (let i = 0; i < 24; i++) timp.push({ start: start + 2 + i * 0.25, dur: 0.25, pitch: 44, vel: 58 });
  }

  const brassOctaves = { octaves: [12] };
  const horn = [
    ...realize(descent.call, { tonic: TONIC, startBar: 4, vel: 92, ...brassOctaves }),
    ...realize(descent.call, { tonic: TONIC, startBar: 6, vel: 92, ...brassOctaves }),
    ...realize(descent.answer, { tonic: TONIC, startBar: 8, vel: 94, ...brassOctaves }),
    ...realize(descent.answer, { tonic: TONIC, startBar: 10, vel: 94, ...brassOctaves }),
    ...realize(descent.call, { tonic: TONIC, startBar: 12, augment: 2, vel: 96, ...brassOctaves }),
    ...realize(descent.answer, { tonic: TONIC, startBar: 16, augment: 2, vel: 96, ...brassOctaves }),
    ...realize(descent.call, { tonic: TONIC, startBar: 20, vel: 96, ...brassOctaves }),
    ...realize(descent.answer, { tonic: TONIC, startBar: 22, vel: 96, ...brassOctaves }),
    ...realize(descent.call, { tonic: TONIC, startBar: 24, vel: 96, ...brassOctaves }),
    ...realize(descent.answer, { tonic: TONIC, startBar: 26, vel: 98, ...brassOctaves }),
  ];
  const violins = [
    ...realize(descent.answer, { tonic: TONIC + 24, startBar: 22, vel: 70 }),
    ...realize(descent.answer, { tonic: TONIC + 24, startBar: 26, vel: 72 }),
  ];

  return [
    { name: "Brass", voice: "horn", channel: 0, program: 61, notes: horn, previewGainDb: -2 },
    { name: "Low Brass", voice: "horn", channel: 1, program: 58, notes: lowBrass, previewGainDb: -4 },
    { name: "Violins", voice: "violin", channel: 2, program: 40, notes: violins },
    { name: "Guitar Ostinato", voice: "guitar", channel: 3, program: 25, notes: riff },
    { name: "Strings", voice: "strings", channel: 4, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 5, program: 43, notes: tie(bass) },
    { name: "Bells and Chains", voice: "metal", channel: 6, program: 14, notes: bells, previewGainDb: 8 },
    { name: "Timpani", voice: "timpani", channel: 7, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "castle",
  name: "NetHack 3D Castle (sketch)",
  bpm: 88,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Gate", bars: [1, 4] },
    { name: "March", bars: [5, 12] },
    { name: "Chorale", bars: [13, 20] },
    { name: "Garrison", bars: [21, 28] },
    { name: "Gate", bars: [29, 32] },
  ],
  key: "G# Phrygian",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark martial fortress music, imposing, heavy and dignified, menacing, dry, instrumental, G# phrygian, " +
      "88 bpm slow march, dry military snare cadence, bass drum, low brass fanfare, brass chorale, timpani, " +
      "acoustic guitar ostinato, strings, a five-note bell tune, drawbridge chains, recurring leitmotif, " +
      "restrained, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the march, the brass theme and the bell tune.",
      "Turn on Instrumental. The castle at the bottom of the dungeon: an armed fortress behind a moat, stern rather than heroic.",
      "The gate's bell tune is the title theme's first five notes (G# G# B A G#); the drawbridge answers with chains and a rumble.",
      "Leitmotif: call G# G# B A G# | F# E D# G#, as a fanfare in the brass, then at half speed as a chorale.",
      "The piece loops: bar 32 (D# major) leads back into the bell tune at bar 1.",
    ],
  },
};
