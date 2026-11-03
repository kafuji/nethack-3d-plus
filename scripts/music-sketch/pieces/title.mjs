// Title screen sketch: dark fantasy main theme in D minor.
//
//   A  (bars 1-8)   harp arpeggios over string pads, bass enters at bar 5
//   B  (bars 9-16)  French horn states the theme
//   A' (bars 17-24) violins take a higher variation, timpani, fuller texture
//
// Bar 24 ends on A7 so the piece loops back into bar 1.

const BEATS_PER_BAR = 4;

// Chord tones as pitch classes (0 = C); root first.
const chordTones = {
  Dm: [2, 5, 9],
  Bb: [10, 2, 5],
  Gm: [7, 10, 2],
  A: [9, 1, 4],
  A7: [9, 1, 4, 7],
  F: [5, 9, 0],
  C: [0, 4, 7],
};

const sectionA = ["Dm", "Bb", "Gm", "A", "Dm", "F", "C", "A7"];
const sectionB = ["Bb", "F", "Gm", "Dm", "Bb", "C", "Dm", "A"];
const progression = [...sectionA, ...sectionB, ...sectionA];

// Melodies: one array per bar of [pitch, beats]; null pitch = rest.
const hornTheme = [
  [[74, 2], [72, 1], [70, 1]],
  [[69, 3], [65, 1]],
  [[67, 1.5], [69, 0.5], [70, 1], [74, 1]],
  [[69, 4]],
  [[77, 2], [76, 1], [74, 1]],
  [[76, 2], [72, 1], [67, 1]],
  [[77, 1.5], [76, 0.5], [74, 1], [69, 1]],
  [[73, 2], [69, 2]],
];

const violinVariation = [
  [[74, 1], [77, 1], [81, 2]],
  [[79, 1], [77, 1], [74, 2]],
  [[70, 1], [74, 1], [79, 2]],
  [[76, 3], [73, 1]],
  [[77, 2], [81, 2]],
  [[84, 2], [81, 1], [77, 1]],
  [[79, 2], [76, 1], [72, 1]],
  [[73, 2], [76, 1], [79, 1]],
];

/** Lowest pitch >= floor with the given pitch class. */
function above(pitchClass, floor) {
  return floor + ((pitchClass - floor) % 12 + 12) % 12;
}

function melodyNotes(bars, firstBar, vel) {
  const notes = [];
  bars.forEach((bar, index) => {
    let beat = (firstBar + index) * BEATS_PER_BAR;
    for (const [pitch, dur] of bar) {
      if (pitch !== null) notes.push({ start: beat, dur: dur * 0.95, pitch, vel });
      beat += dur;
    }
  });
  return notes;
}

function buildTracks() {
  const pad = [];
  const harp = [];
  const bass = [];
  const timp = [];
  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = bar < 8 ? "A" : bar < 16 ? "B" : "A'";
    const loud = section === "A'";

    // String pad: each chord tone voiced in the F3..E4 window.
    for (const pc of tones.slice(0, 3)) {
      pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 53), vel: loud ? 80 : section === "B" ? 66 : 56 });
    }
    if (tones[3] !== undefined) pad.push({ start, dur: BEATS_PER_BAR, pitch: above(tones[3], 53), vel: 60 });

    // Harp: rising and falling eighth-note arpeggio from the root.
    const root = above(tones[0], 50);
    const third = above(tones[1], root);
    const fifth = above(tones[2], root);
    const pattern = [root, fifth, root + 12, third + 12, fifth + 12, third + 12, root + 12, fifth];
    pattern.forEach((pitch, step) => {
      harp.push({ start: start + step * 0.5, dur: 0.5, pitch, vel: step === 0 ? 84 : 66 });
    });

    // Bass: silent for the first four bars, then whole notes, then half notes.
    if (bar >= 4) {
      const low = above(tones[0], 33);
      if (section === "A") {
        bass.push({ start, dur: BEATS_PER_BAR, pitch: low, vel: 72 });
      } else {
        bass.push({ start, dur: 2, pitch: low, vel: 84 });
        bass.push({ start: start + 2, dur: 2, pitch: section === "A'" ? low + 7 : low, vel: 76 });
      }
    }

    // Timpani: downbeats in A', plus a pickup into A' and the loop point.
    if (loud && bar % 2 === 0) timp.push({ start, dur: 1, pitch: above(tones[0], 38), vel: 96 });
    if (bar === 15 || bar === 23) {
      timp.push({ start: start + 3, dur: 0.5, pitch: 45, vel: 80 });
      timp.push({ start: start + 3.5, dur: 0.5, pitch: 45, vel: 100 });
    }
  });

  return [
    { name: "Strings", voice: "strings", channel: 0, program: 48, notes: pad },
    { name: "Harp", voice: "harp", channel: 1, program: 46, notes: harp },
    { name: "French Horn", voice: "horn", channel: 2, program: 60, notes: melodyNotes(hornTheme, 8, 92) },
    { name: "Violins", voice: "violin", channel: 3, program: 40, notes: melodyNotes(violinVariation, 16, 96) },
    { name: "Contrabass", voice: "bass", channel: 4, program: 43, notes: bass },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
  ];
}

export const piece = {
  id: "title",
  name: "NetHack 3D Title Theme (sketch)",
  bpm: 72,
  beatsPerBar: BEATS_PER_BAR,
  key: "D minor",
  tracks: buildTracks(),
  suno: {
    style:
      "dark fantasy orchestral main title theme, instrumental, D minor, 72 bpm, solemn string pads, " +
      "harp arpeggios, noble French horn melody, soaring violins, timpani, mysterious dungeon atmosphere, " +
      "cinematic, loopable, no vocals",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the melody and chords.",
      "Turn on Instrumental. The piece loops: bar 24 (A7) leads back into bar 1 (D minor).",
      "Structure: quiet harp intro (bars 1-8), horn theme (9-16), fuller violin variation (17-24).",
    ],
  },
};
