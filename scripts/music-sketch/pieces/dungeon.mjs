// Main dungeon (Dungeons of Doom) exploration sketch. The calm counterpart of
// the title: same "Descent" leitmotif, a fifth higher in A Phrygian, slower
// and sparser so it can loop for a long time without wearing the player out.
//
//   Intro (1-4)   bass drone, guitar ostinato at half speed
//   A     (5-12)  soft hand percussion; lead guitar: call, rest, answer, rest
//   B     (13-20) percussion thins to a heartbeat; harp arpeggios; cello plays
//                 the answer at half speed, low horn the call at half speed
//   C     (21-28) ostinato at full speed, light groove; lead: call, answer,
//                 horn call (lead rests), call
//   Outro (29-32) drone and slow ostinato again, ends on E major to loop

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 32;

const chordTones = {
  Am: [9, 0, 4],
  Bb: [10, 2, 5],
  Gm: [7, 10, 2],
  F: [5, 9, 0],
  Dm: [2, 5, 9],
  E: [4, 8, 11],
};

const progression = [
  ...["Am", "Am", "Bb", "Am"],
  ...["Am", "F", "Am", "Gm", "Dm", "Bb", "Am", "E"],
  ...["Dm", "Dm", "Am", "Bb", "Am", "Am", "Gm", "E"],
  ...["Am", "F", "Dm", "Bb", "Am", "F", "Am", "F"],
  ...["Am", "Bb", "Am", "E"],
];

function sectionOf(bar) {
  if (bar < 4) return "intro";
  if (bar < 12) return "A";
  if (bar < 20) return "B";
  if (bar < 28) return "C";
  return "outro";
}

const LEAD_TONIC = 69; // A4
const CELLO_TONIC = 57; // A3
const HORN_TONIC = 45; // A2, doubled an octave up
const RIFF_TONIC = 57; // A3

function buildTracks() {
  const pad = [];
  const riff = [];
  const harp = [];
  const bass = [];
  const drums = [];

  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = sectionOf(bar);
    const root = tones[0];

    // Strings: a quiet bed from A onward.
    if (section !== "intro") {
      const vel = { A: 40, B: 52, C: 48, outro: 36 }[section];
      for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 52), vel });
    }

    // Guitar: the Descent ostinato, at half speed except in C. Harp in B instead.
    if (section === "C") {
      riff.push(...realize(descent.ostinato, { tonic: RIFF_TONIC, startBar: bar, vel: 68, legato: 0.9 }));
    } else if (section === "B") {
      const [p0, p1, p2] = tones.map((pc) => above(pc, 57)).sort((a, b) => a - b);
      [p0, p1, p2, p0 + 12, p2 + 12, p0 + 12, p2, p1].forEach((pitch, i) => {
        harp.push({ start: start + i * 0.5, dur: 0.5, pitch, vel: i === 0 ? 64 : 52 });
      });
    } else if (bar % 2 === 0) {
      riff.push(...realize(descent.ostinato, { tonic: RIFF_TONIC, startBar: bar, augment: 2, vel: 70, legato: 0.9 }));
    }

    // Bass: A drone in the intro and outro, whole-note roots elsewhere.
    const drone = section === "intro" || (section === "outro" && bar < BARS - 1);
    bass.push({ start, dur: BEATS_PER_BAR, pitch: drone ? 33 : above(root, 33), vel: 76 });

    // Percussion: hand-drum feel in A and C, a heartbeat kick in B.
    if (section === "A" || section === "C") {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 76 });
      drums.push({ start: start + 2.5, dur: 0.25, pitch: 36, vel: 56 });
      if (section === "C") drums.push({ start: start + 2, dur: 0.25, pitch: 38, vel: 50 });
      const hats = section === "C" ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : [1, 3];
      for (const h of hats) drums.push({ start: start + h, dur: 0.25, pitch: 42, vel: h % 1 ? 22 : 34 });
    } else if (section === "B" && bar % 2 === 0) {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 64 });
      drums.push({ start: start + 0.75, dur: 0.25, pitch: 36, vel: 44 });
    }
  });

  const lead = [
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 4, vel: 88 }),
    ...realize(descent.answer, { tonic: LEAD_TONIC, startBar: 8, vel: 90 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 20, vel: 96 }),
    ...realize(descent.answer, { tonic: LEAD_TONIC, startBar: 22, vel: 96 }),
    ...realize(descent.call, { tonic: LEAD_TONIC, startBar: 26, vel: 92 }),
  ];

  const cello = realize(descent.answer, { tonic: CELLO_TONIC, startBar: 12, augment: 2, vel: 84 });

  const horn = [
    ...realize(descent.call, { tonic: HORN_TONIC, startBar: 16, augment: 2, vel: 76, octaves: [12] }),
    ...realize(descent.call, { tonic: HORN_TONIC, startBar: 24, vel: 84, octaves: [12] }),
  ];

  return [
    { name: "Guitar Ostinato", voice: "guitar", channel: 0, program: 25, notes: riff, previewGainDb: 3 },
    { name: "Lead Guitar", voice: "lead", channel: 1, program: 24, notes: lead, previewGainDb: 3 },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello },
    { name: "Horn", voice: "horn", channel: 3, program: 60, notes: horn, previewGainDb: -2 },
    { name: "Harp", voice: "harp", channel: 4, program: 46, notes: harp, previewGainDb: 8 },
    { name: "Strings", voice: "strings", channel: 5, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 6, program: 33, notes: tie(bass) },
    { name: "Percussion", voice: "drums", channel: 9, program: 0, notes: drums, previewGainDb: 1 },
  ];
}

export const piece = {
  id: "dungeon",
  name: "NetHack 3D Dungeon Theme - Dungeons of Doom (sketch)",
  bpm: 76,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  key: "A Phrygian",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark acoustic dungeon exploration music, sparse frontier folk, ominous but calm, instrumental, A phrygian, " +
      "76 bpm, fingerpicked acoustic guitar ostinato, twangy lead guitar, solo cello, low horn, harp, " +
      "soft hand percussion, deep bass drone, lots of space, understated, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the melody and chords.",
      "Turn on Instrumental. This is background music for long exploration: keep it calm and uncluttered.",
      "Same leitmotif as the title theme, in A (call: A A C Bb A | G F E A).",
      "The piece loops: bar 32 (E major) leads back into bar 1 (A minor).",
      "Structure: drone + slow ostinato (1-4), lead guitar theme with rests (5-12), cello and horn at half speed (13-20), light groove with the full theme (21-28), outro (29-32).",
    ],
  },
};
