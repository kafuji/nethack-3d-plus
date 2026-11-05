// Sokoban sketch. A puzzle: still dry and quietly uneasy, but methodical
// instead of menacing. The Descent call's notes form an eight-note cell on the
// harp, and every two bars one note is "pushed" a square (swapped with its
// neighbour), with a boulder rumble. Seven pushes scramble the cell, one hits
// a wall, and seven undo the first ones, so the cell is solved again just as
// the piece loops. B Phrygian continues the chain of fifths (D title, A
// dungeon, E mines).
//
//   1-4    the cell alone on a B pedal
//   5-28   tresillo guitar and ticks; pushes every two bars; horn call at
//          half speed (9-12), cello answer at half speed (21-24)
//   29-32  thins back to the cell, solved

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 32;
const TONIC = 59; // B3

const chordTones = {
  B: [11, 6],
  C: [0, 7],
  G: [7, 2],
};

const progression = [
  ...Array(8).fill("B"),
  ...Array(4).fill("C"),
  ...Array(4).fill("B"),
  ...Array(4).fill("G"),
  ...Array(4).fill("C"),
  ...Array(8).fill("B"),
];

// The call without its final leap home: eight pitches, one per eighth note.
const solvedCell = descent.call.flat().slice(0, 8).map(([offset]) => offset);

// Swap positions (i, i + 1). null is the push that hits a wall.
const scramble = [2, 5, 3, 1, 6, 4, 0];
const pushes = [...scramble, null, ...[...scramble].reverse()];

function cellAt(pushCount) {
  const cell = [...solvedCell];
  for (const i of pushes.slice(0, pushCount)) {
    if (i !== null) [cell[i], cell[i + 1]] = [cell[i + 1], cell[i]];
  }
  return cell;
}

function buildTracks() {
  const harp = [];
  const guitar = [];
  const pad = [];
  const bass = [];
  const drums = [];
  const timp = [];

  progression.forEach((name, bar) => {
    const start = bar * BEATS_PER_BAR;
    const [root, fifth] = chordTones[name];
    const inner = bar >= 4 && bar < 28;

    // Harp: the cell, rebuilt after each push (pushes land on even bars from bar 3).
    const pushCount = Math.min(pushes.length, Math.max(0, Math.floor(bar / 2)));
    cellAt(pushCount).forEach((offset, i) => {
      harp.push({ start: start + i * 0.5, dur: 0.45, pitch: TONIC + offset, vel: i === 0 ? 64 : 54 });
    });

    // Push: a scrape, then the boulder rolling one square.
    if (bar >= 2 && bar % 2 === 0) {
      drums.push({ start: start - 0.5, dur: 0.25, pitch: 46, vel: 30 });
      drums.push({ start, dur: 0.25, pitch: 36, vel: 70 });
      timp.push({ start, dur: 1, pitch: above(root, 35), vel: 72 });
    }

    // Bass: pedal, following the bare fifths.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: above(root, 35), vel: 70 });

    if (inner) {
      // Guitar: tresillo (3+3+2 eighths) on the root, the flat second on the last hit.
      [0, 1.5, 3].forEach((beat, i) => {
        const pitch = above(root, 47) + (i === 2 && bar % 4 === 3 ? 1 : 0);
        guitar.push({ start: start + beat, dur: 0.6, pitch, vel: i ? 56 : 66 });
      });
      // Ticks on the beat.
      for (let beat = 0; beat < 4; beat++) drums.push({ start: start + beat, dur: 0.125, pitch: 42, vel: beat ? 20 : 30 });
    }

    // Strings: bare fifths from bar 9 to 28.
    if (bar >= 8 && bar < 28) {
      for (const pc of [root, fifth]) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 47), vel: 40 });
    }
  });

  const horn = realize(descent.call, { tonic: TONIC - 12, startBar: 8, augment: 2, vel: 62 });
  const cello = realize(descent.answer, { tonic: TONIC - 12, startBar: 20, augment: 2, vel: 64 });

  return [
    { name: "Harp Cell", voice: "harp", channel: 0, program: 46, notes: harp, previewGainDb: 8 },
    { name: "Guitar", voice: "guitar", channel: 1, program: 25, notes: guitar, previewGainDb: 4 },
    { name: "Horn", voice: "horn", channel: 2, program: 60, notes: horn, previewGainDb: -2 },
    { name: "Cello", voice: "violin", channel: 3, program: 42, notes: cello, previewGainDb: -2 },
    { name: "Strings", voice: "strings", channel: 4, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 5, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 6, program: 47, notes: timp },
    { name: "Percussion", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "sokoban",
  name: "NetHack 3D Sokoban (sketch)",
  bpm: 92,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Cell", bars: [1, 4] },
    { name: "Pushes", bars: [5, 28] },
    { name: "Solved", bars: [29, 32] },
  ],
  key: "B Phrygian (pedal)",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dry minimal puzzle music, methodical, thoughtful, quietly uneasy, dark but not threatening, instrumental, " +
      "B phrygian, 92 bpm, repeating plucked harp pattern that slowly rearranges, tresillo acoustic guitar, " +
      "soft clock ticks, low boulder rumbles, bare string fifths, distant low horn, cello, no build-up, " +
      "steady dynamics, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the harp pattern and how it changes.",
      "Turn on Instrumental. Background for a boulder-pushing puzzle: focused and calm, with a hint of unease.",
      "The harp cell is the title theme's call (B B D C B A G F#); every two bars one note swaps places with its neighbour, with a low rumble.",
      "The piece loops: the cell is back in its original order by bar 31.",
    ],
  },
};
