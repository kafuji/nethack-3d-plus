// Quest sketch. The role's own trial: from the quest leader's home to the
// nemesis's lair. Solemn and fateful, a slow 3/4 processional, and the most
// openly melodic of the exploration pieces: the Descent theme is stated whole,
// stretched into the triple metre (augment 1.5). A summons (the answer's
// rising first three notes) calls from far off. F# Phrygian, the next step
// in the chain of fifths (D title, A dungeon, E mines, B Sokoban).
//
//   1-4    F# drone and the distant summons
//   5-20   processional drum; horn: call, answer; strings: call; cello: answer
//   21-28  the lair: a C pedal a tritone away, the theme low in the horn
//   29-36  the summons over the drone again, thinning to loop

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 3;
const BARS = 36;
const TONIC = 54; // F#3

const chordTones = {
  "F#m": [6, 9, 1],
  G: [7, 11, 2],
  E: [4, 8, 11],
  Bm: [11, 2, 6],
  C: [0, 4, 7],
};

const callChords = ["F#m", "G", "E", "F#m"];
const answerChords = ["Bm", "F#m", "Bm", "G"];
const progression = [
  ...["F#m", "F#m", "G", "F#m"],
  ...callChords, ...answerChords, ...callChords, ...answerChords,
  ...["C", "C", "F#m", "F#m", "C", "C", "G", "G"],
  ...["F#m", "F#m", "G", "F#m", "F#m", "F#m", "G", "F#m"],
];

function sectionOf(bar) {
  if (bar < 4) return "intro";
  if (bar < 20) return "theme";
  if (bar < 28) return "lair";
  return "outro";
}

// The answer's rising first three notes, one bar of 3/4.
const summons = [descent.answer[0].slice(0, 3).map(([offset]) => [offset, 1])];

function buildTracks() {
  const pad = [];
  const guitar = [];
  const bass = [];
  const drums = [];
  const timp = [];

  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = sectionOf(bar);
    const root = tones[0];
    const lair = section === "lair";

    // Bass: F# drone at the ends, roots in the theme, C pedal in the lair.
    const bassPitch = section === "intro" || section === "outro" ? 42 : lair ? 36 : above(root, 35);
    bass.push({ start, dur: BEATS_PER_BAR, pitch: bassPitch, vel: 74 });

    // Strings: chords from the theme on, low and close in the lair.
    if (section !== "intro") {
      for (const pc of tones) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, lair ? 45 : 54), vel: 46 });
    }

    // Guitar: a slow rolled chord on each downbeat, root-fifth-tenth.
    if (section === "theme" || lair) {
      const low = above(root, 42);
      [low, low + 7, above(tones[1], low + 12)].forEach((pitch, i) => {
        guitar.push({ start: start + i * 0.5, dur: 2.4 - i * 0.5, pitch, vel: i ? 52 : 62 });
      });
    }

    // Processional drum: a low beat on 1, a softer one on 3; doubled in the lair.
    if (section === "theme" || lair) {
      drums.push({ start, dur: 0.25, pitch: 36, vel: 76 });
      drums.push({ start: start + 2, dur: 0.25, pitch: 36, vel: 52 });
      if (lair) drums.push({ start: start + 2.5, dur: 0.25, pitch: 36, vel: 46 });
      drums.push({ start: start + 1, dur: 0.125, pitch: 42, vel: 22 });
    }
    if ((section === "theme" && bar % 4 === 0) || (lair && bar % 2 === 0)) {
      timp.push({ start, dur: 1, pitch: above(root, 38), vel: lair ? 90 : 78 });
    }
  });

  const stretched = (motif, tonic, startBar, vel, octaves = []) =>
    realize(motif, { tonic, startBar, beatsPerBar: BEATS_PER_BAR, augment: 1.5, vel, octaves });

  const horn = [
    ...realize(summons, { tonic: TONIC, startBar: 1, beatsPerBar: BEATS_PER_BAR, vel: 58 }),
    ...stretched(descent.call, TONIC, 4, 80),
    ...stretched(descent.answer, TONIC, 8, 82),
    ...stretched(descent.call, TONIC - 12, 20, 84, [12]),
    ...stretched(descent.answer, TONIC - 12, 24, 84, [12]),
    ...realize(summons, { tonic: TONIC, startBar: 29, beatsPerBar: BEATS_PER_BAR, vel: 58 }),
    ...realize(summons, { tonic: TONIC, startBar: 33, beatsPerBar: BEATS_PER_BAR, vel: 52 }),
  ];
  const violin = stretched(descent.call, TONIC + 12, 12, 74);
  const cello = stretched(descent.answer, TONIC - 12, 16, 80);

  return [
    { name: "Horn", voice: "horn", channel: 0, program: 60, notes: horn, previewGainDb: -2 },
    { name: "Violins", voice: "violin", channel: 1, program: 40, notes: violin },
    { name: "Cello", voice: "violin", channel: 2, program: 42, notes: cello, previewGainDb: -1 },
    { name: "Guitar", voice: "guitar", channel: 3, program: 25, notes: guitar, previewGainDb: 5 },
    { name: "Strings", voice: "strings", channel: 4, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 5, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 6, program: 47, notes: timp },
    { name: "Drum", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "quest",
  name: "NetHack 3D Quest (sketch)",
  bpm: 72,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Summons", bars: [1, 4] },
    { name: "Theme", bars: [5, 20] },
    { name: "Lair", bars: [21, 28] },
    { name: "Summons", bars: [29, 36] },
  ],
  key: "F# Phrygian, 3/4",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "solemn fateful quest music, dry and close, dark, dignified, a sacred trial, instrumental, F# phrygian, " +
      "3/4 time, 72 bpm, slow processional drum, rolled acoustic guitar chords, noble french horn melody, " +
      "violins and cello, low strings, timpani, deep drone, distant horn summons, ominous tritone section, " +
      "restrained, steady dynamics, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the 3/4 processional and the melody.",
      "Turn on Instrumental. The player's own quest: solemn and dignified, still dark, never triumphant.",
      "The title theme is stated whole here, stretched into 3/4 (call: F# F# A G F# | E D C# F#). The three-note summons is the answer's opening (F# B C#).",
      "The piece loops: it starts and ends on the F# drone with the distant summons.",
      "Structure: summons (1-4), the theme in horn, violins and cello (5-20), the dark lair over a C pedal (21-28), summons again (29-36).",
    ],
  },
};
