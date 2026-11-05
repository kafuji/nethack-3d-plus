// Not used in the game: the ascension track is a Suno Cover of title.mjs instead.
// Kept for its ideas. An ending sketch that plays once and does not loop. The
// whole adventure in memory: the Descent theme passes through every region in
// the order the game met them, each in its own key and with a trace of its own
// texture, growing steadily. Gehennom's Eb then falls a semitone to D, the flat
// second finally resolving on the scale of the whole soundtrack, and the theme
// is heard for the first time in the major, ending on a sacred plagal Amen.
//
//   1-4    title: guitar ostinato, lead guitar          D
//   5-8    dungeon: broken ostinato, drips, cello       A
//   9-12   mines: picks and thuds, low horn             E
//   13-16  Sokoban: harp cell, ticks, cello             B
//   17-20  Quest: processional drum, rolled guitar, horn F#
//   21-24  Medusa: harp waves, cold violin              C#
//   25-28  Castle: snare cadence, brass in octaves      G#
//   29-32  Gehennom: ritual drums, tritone, embers, the call backwards  Eb
//   33-36  Astral Plane: three tolls, three-voice canon on D, the Eb rubbing
//   37-46  the theme risen in D major at half speed: brass, violins, choir;
//          the answer resolves, then Bb, C, D
//   47-48  G to D, the Amen: choir and three last tolls

import { descent, realize } from "../motifs.mjs";
import { above, tie } from "../helpers.mjs";

const BEATS_PER_BAR = 4;
const BARS = 48;

// The theme in the major. Its answer ends on the tonic instead of the flat second.
const risen = {
  call: [
    [[0, 1], [0, 0.5], [4, 0.5], [2, 1], [0, 1]],
    [[-1, 0.75], [-3, 0.75], [-5, 0.5], [0, 2]],
  ],
  answer: [
    [[0, 1], [5, 1], [7, 1.5], [9, 0.5]],
    [[7, 1], [5, 0.5], [4, 0.5], [0, 2]],
  ],
};

// One entry per region, in the order the game met them.
const memories = ["title", "dungeon", "mines", "sokoban", "quest", "medusa", "castle", "gehennom"];
const memoryTonics = { title: 2, dungeon: 9, mines: 4, sokoban: 11, quest: 6, medusa: 1, castle: 8, gehennom: 3 };

const minor = (root) => [root, (root + 3) % 12, (root + 7) % 12];
const major = (root) => [root, (root + 4) % 12, (root + 7) % 12];

/** The title's i, bVI, iv, bII under each call and answer, in any key. */
function memoryChord(tonic, barInSection) {
  return [minor(tonic), major((tonic + 8) % 12), minor((tonic + 5) % 12), major((tonic + 1) % 12)][barInSection];
}

const finaleChords = [
  major(2), major(7), major(9), major(2), // risen call
  major(7), major(2), major(2), major(10), // risen answer
  major(0), major(2), // C, D
  major(7), major(2), // the Amen
];

const retrograde = (motif) => [[...motif.flat()].reverse()];

function buildTracks() {
  const lead = [];
  const guitar = [];
  const harp = [];
  const violin = [];
  const cello = [];
  const horn = [];
  const brass = [];
  const pad = [];
  const choir = [];
  const bass = [];
  const metal = [];
  const timp = [];
  const drums = [];

  const theme = (track, tonic, startBar, vel, options = {}) => {
    track.push(...realize(descent.call, { tonic, startBar, vel, ...options }));
    track.push(...realize(descent.answer, { tonic, startBar: startBar + 2, vel, ...options }));
  };

  memories.forEach((region, section) => {
    const first = section * 4;
    const tonic = memoryTonics[region];
    // Each memory is a little stronger than the one before.
    const lift = section * 3;

    for (let i = 0; i < 4; i++) {
      const bar = first + i;
      const start = bar * BEATS_PER_BAR;
      const chord = memoryChord(tonic, i);
      const padPitches = region === "gehennom" ? [51, 52, 58] : chord.map((pc) => above(pc, 52));
      for (const pitch of padPitches) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 44 + lift });
      bass.push({ start, dur: BEATS_PER_BAR, pitch: above(region === "gehennom" ? tonic : chord[0], 33), vel: 70 + lift });
      if (region === "gehennom") bass.push({ start, dur: BEATS_PER_BAR, pitch: 33, vel: 60 });

      if (region === "title") {
        guitar.push(...realize(descent.ostinato, { tonic: 50, startBar: bar, vel: 70, legato: 0.9 }));
      } else if (region === "dungeon") {
        realize(descent.ostinato, { tonic: 57, startBar: bar, vel: 58, legato: 0.6 })
          .filter((_, n) => n % 3 !== 2)
          .forEach((note) => guitar.push(note));
        harp.push({ start: start + 1.5 + i, dur: 0.5, pitch: [81, 76, 82, 75][i], vel: 56 });
      } else if (region === "mines") {
        for (const beat of [0, 2.5]) metal.push({ start: start + beat + 0.5, dur: 0.25, pitch: 88, vel: 70 });
        for (const beat of [0, 3]) drums.push({ start: start + beat, dur: 0.25, pitch: 36, vel: 72 });
      } else if (region === "sokoban") {
        // The cell, with one note pushed a square each bar.
        const cell = descent.call.flat().slice(0, 8).map(([offset]) => offset);
        if (i > 0) [cell[i], cell[i + 1]] = [cell[i + 1], cell[i]];
        cell.forEach((offset, n) => harp.push({ start: start + n * 0.5, dur: 0.45, pitch: 71 + offset, vel: 70 }));
        for (let beat = 0; beat < 4; beat++) drums.push({ start: start + beat, dur: 0.125, pitch: 42, vel: 34 });
      } else if (region === "quest") {
        chord.forEach((pc, n) => guitar.push({ start: start + n * 0.5, dur: 2.4, pitch: above(pc, 54), vel: 72 }));
        for (const [beat, vel] of [[0, 86], [2, 62]]) drums.push({ start: start + beat, dur: 0.25, pitch: 36, vel });
        if (i % 2 === 0) timp.push({ start, dur: 1, pitch: above(tonic, 38), vel: 80 });
      } else if (region === "medusa") {
        const up = [above(chord[0], 49), above(chord[2], 56), above(chord[0], 61), above(chord[1], 64)];
        [...up, ...[...up].reverse()].forEach((pitch, n) => {
          harp.push({ start: start + n * 0.5, dur: 0.5, pitch, vel: 60 + (n < 4 ? n : 7 - n) * 5 });
        });
        drums.push({ start, dur: 0.5, pitch: 36, vel: 66 });
      } else if (region === "castle") {
        guitar.push(...realize(descent.ostinato, { tonic: 44, startBar: bar, vel: 82, legato: 0.8 }));
        for (const beat of [0, 2]) drums.push({ start: start + beat, dur: 0.25, pitch: 36, vel: 100 });
        for (const [beat, vel] of [[1, 90], [1.75, 44], [2.5, 54], [3, 94], [3.5, 48], [3.75, 60]]) {
          drums.push({ start: start + beat, dur: 0.2, pitch: 38, vel });
        }
        timp.push({ start, dur: 1, pitch: above(chord[0], 38), vel: 92 });
      } else if (region === "gehennom") {
        for (const [beat, vel] of [[0, 110], [2, 90], [3, 100]]) drums.push({ start: start + beat, dur: 0.25, pitch: 36, vel });
        drums.push({ start: start + 2.5, dur: 0.25, pitch: 38, vel: 70 });
        timp.push({ start, dur: 2, pitch: 39, vel: 104 });
        for (const beat of [0.75, 1.25, 1.75, 3.25, 3.75]) drums.push({ start: start + beat, dur: 0.1, pitch: 42, vel: 24 + i * 3 });
      }
    }
  });

  theme(lead, 62, 0, 84);
  theme(cello, 57, 4, 74);
  theme(horn, 52, 8, 78);
  theme(cello, 59, 12, 80);
  theme(horn, 54, 16, 84);
  theme(violin, 73, 20, 84);
  theme(brass, 56, 24, 94, { octaves: [12] });
  brass.push(...realize(retrograde(descent.call), { tonic: 39, startBar: 28, vel: 104, octaves: [12] }));
  brass.push(...realize(descent.answer, { tonic: 39, startBar: 30, vel: 106, octaves: [12] }));

  // The Astral Plane: three tolls and a canon over the D-Eb rub.
  for (let bar = 32; bar < 36; bar++) {
    for (const pitch of [50, 51, 57]) pad.push({ start: bar * BEATS_PER_BAR, dur: BEATS_PER_BAR, pitch, vel: 72 });
    bass.push({ start: bar * BEATS_PER_BAR, dur: BEATS_PER_BAR, pitch: 38, vel: 90 });
    timp.push({ start: bar * BEATS_PER_BAR, dur: 1, pitch: 38, vel: 94 });
    drums.push({ start: bar * BEATS_PER_BAR + 2, dur: 0.25, pitch: 36, vel: 80 });
  }
  for (const beat of [0, 1, 2]) metal.push({ start: 32 * BEATS_PER_BAR + beat, dur: 1, pitch: 74, vel: 84 });
  violin.push(...realize(descent.call, { tonic: 74, startBar: 32, vel: 90 }));
  horn.push(...realize(descent.call, { tonic: 62, startBar: 33, vel: 92 }));
  cello.push(...realize(descent.call, { tonic: 50, startBar: 34, vel: 92 }));

  // The finale: the theme risen in D major at half speed.
  finaleChords.forEach((chord, i) => {
    const bar = 36 + i;
    const start = bar * BEATS_PER_BAR;
    for (const pc of chord) {
      pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 55), vel: 78 });
      choir.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 69), vel: 86 });
    }
    bass.push({ start, dur: BEATS_PER_BAR, pitch: above(chord[0], 33), vel: 94 });
    if (bar < 46) {
      timp.push({ start, dur: 1, pitch: above(chord[0], 38), vel: 104 });
      drums.push({ start, dur: 0.25, pitch: 36, vel: 104 });
      if (bar % 2 === 0) drums.push({ start, dur: 0.25, pitch: 46, vel: 70 });
    }
  });
  for (const pc of major(0)) brass.push({ start: 44 * BEATS_PER_BAR, dur: 3.8, pitch: above(pc, 55), vel: 108 });
  for (const pc of major(2)) brass.push({ start: 45 * BEATS_PER_BAR, dur: 3.8, pitch: above(pc, 55), vel: 110 });
  brass.push(...realize(risen.call, { tonic: 50, startBar: 36, augment: 2, vel: 104, octaves: [12] }));
  brass.push(...realize(risen.answer, { tonic: 50, startBar: 40, augment: 2, vel: 108, octaves: [12] }));
  violin.push(...realize(risen.call, { tonic: 74, startBar: 36, augment: 2, vel: 94 }));
  violin.push(...realize(risen.answer, { tonic: 74, startBar: 40, augment: 2, vel: 98 }));

  // The Amen: three last tolls, and the violins hold the tonic above the choir.
  for (const beat of [0, 1.5, 3]) metal.push({ start: 47 * BEATS_PER_BAR + beat, dur: 1, pitch: 74, vel: 84 });
  violin.push({ start: 46 * BEATS_PER_BAR, dur: 2 * BEATS_PER_BAR, pitch: 86, vel: 90 });

  return [
    { name: "Lead Guitar", voice: "lead", channel: 0, program: 24, notes: lead },
    { name: "Guitar", voice: "guitar", channel: 1, program: 25, notes: guitar, previewGainDb: 3 },
    { name: "Harp", voice: "harp", channel: 2, program: 46, notes: harp, previewGainDb: 8 },
    { name: "Violins", voice: "violin", channel: 3, program: 48, notes: violin },
    { name: "Cello", voice: "violin", channel: 4, program: 42, notes: cello },
    { name: "Horn", voice: "horn", channel: 5, program: 60, notes: horn },
    { name: "Brass", voice: "horn", channel: 6, program: 61, notes: brass, previewGainDb: -3 },
    { name: "Strings", voice: "strings", channel: 7, program: 48, notes: tie(pad) },
    { name: "Choir", voice: "strings", channel: 8, program: 52, notes: tie(choir) },
    { name: "Bass", voice: "bass", channel: 10, program: 43, notes: tie(bass) },
    { name: "Bells and Picks", voice: "metal", channel: 11, program: 14, notes: metal, previewGainDb: 6 },
    { name: "Timpani", voice: "timpani", channel: 12, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "ascension",
  name: "NetHack 3D Ascension (sketch)",
  bpm: 76,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Title", bars: [1, 4] },
    { name: "Dungeon", bars: [5, 8] },
    { name: "Mines", bars: [9, 12] },
    { name: "Sokoban", bars: [13, 16] },
    { name: "Quest", bars: [17, 20] },
    { name: "Medusa", bars: [21, 24] },
    { name: "Castle", bars: [25, 28] },
    { name: "Gehennom", bars: [29, 32] },
    { name: "Astral", bars: [33, 36] },
    { name: "Finale", bars: [37, 46] },
    { name: "Amen", bars: [47, 48] },
  ],
  key: "through every region's key, ending in D major",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dramatic cinematic ending theme, a journey remembered, starts small and intimate, grows steadily through " +
      "changing keys, dark passage, then a sacred, majestic, glorious finale in D major, instrumental with wordless " +
      "choir, 76 bpm, acoustic guitar, solo cello and violin, harp, french horn, full brass, timpani, tolling bells, " +
      "recurring leitmotif, final hymn-like Amen cadence, video game ending soundtrack, no lyrics, ends on a held chord",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the key changes, the theme and the major-key finale.",
      "Turn on Instrumental (a wordless choir is welcome). It plays once after ascending and does not loop, so a real ending matters.",
      "The title theme passes through every region in turn: D, A, E, B, F#, C#, G#, Eb, with a trace of each region's sound.",
      "Bar 37: the theme appears in D major for the first time (D D F# E D | C# B A D). The last two bars are a plagal G to D Amen.",
    ],
  },
};
