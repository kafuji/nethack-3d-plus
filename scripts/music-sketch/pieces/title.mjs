// Title screen sketch: an uneasy, ominous theme in E minor.
//
//   A  (bars 1-8)   low string drone on E; chords slide by half step and
//                   tritone (Fm, Cm, Bbm) over it; a sparse music-box motif
//   B  (bars 9-16)  a low horn sings a chromatic lament over a descending bass
//   A' (bars 17-24) the drone returns with a thin high violin line rubbing in
//                   minor seconds and a muffled heartbeat on the timpani
//
// Bar 24 ends on B7 so the piece loops back into bar 1.

const BEATS_PER_BAR = 4;

// Chord tones as pitch classes (0 = C); root first.
const chordTones = {
  Em: [4, 7, 11],
  Fm: [5, 8, 0],
  Cm: [0, 3, 7],
  Bbm: [10, 1, 5],
  B7: [11, 3, 6, 9],
  Am: [9, 0, 4],
  Abm: [8, 11, 3],
};

const sectionA = ["Em", "Em", "Fm", "Em", "Cm", "Cm", "Bbm", "B7"];
const sectionB = ["Em", "Am", "Fm", "Em", "Cm", "Abm", "Fm", "B7"];
const progression = [...sectionA, ...sectionB, ...sectionA];

// Bass per bar: E pedal under the first half of A, roots elsewhere.
const bassA = [40, 40, 40, 40, 36, 36, 34, 35];
const bassB = [40, 33, 41, 40, 36, 32, 29, 35];
const bassLine = [...bassA, ...bassB, ...bassA];

// Melodies: one array per bar of [pitch, beats]; null pitch = rest.
const musicBoxMotif = [
  [[null, 1], [83, 0.5], [84, 0.5], [83, 1], [77, 1]],
  [[76, 3], [null, 1]],
];

const hornLament = [
  [[64, 2], [67, 1], [66, 1]],
  [[64, 3], [null, 1]],
  [[65, 2], [68, 1], [67, 1]],
  [[64, 4]],
  [[63, 2], [67, 1], [70, 1]],
  [[71, 2], [70, 1], [68, 1]],
  [[68, 1.5], [67, 0.5], [65, 2]],
  [[63, 2], [66, 1], [69, 1]],
];

// Long, quiet high tones a half step apart.
const violinRub = [
  [[83, 8]], [], [[84, 8]], [],
  [[82, 8]], [], [[83, 4]], [[87, 4]],
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

/** Ties notes that continue at the same pitch into one long note (for drones). */
function tie(notes) {
  const tied = [];
  for (const note of [...notes].sort((a, b) => a.start - b.start)) {
    const held = tied.find((n) => n.pitch === note.pitch && Math.abs(n.start + n.dur - note.start) < 1e-6);
    if (held) held.dur += note.dur;
    else tied.push({ ...note });
  }
  return tied;
}

function buildTracks() {
  const pad = [];
  const bass = [];
  const timp = [];
  progression.forEach((name, bar) => {
    const tones = chordTones[name];
    const start = bar * BEATS_PER_BAR;
    const section = bar < 8 ? "A" : bar < 16 ? "B" : "A'";

    // Low, close-voiced string chords in the B2..A#3 window.
    for (const pc of tones) {
      pad.push({ start, dur: BEATS_PER_BAR, pitch: above(pc, 47), vel: section === "B" ? 58 : 50 });
    }

    // Contrabass holds each bar.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: bassLine[bar], vel: 76 });

    // Muffled heartbeat (lub-dub) in A', and one soft hit before the loop point.
    if (section === "A'") {
      timp.push({ start, dur: 0.5, pitch: 40, vel: 70 });
      timp.push({ start: start + 0.5, dur: 0.5, pitch: 40, vel: 50 });
    }
    if (bar === 7) timp.push({ start: start + 3, dur: 1, pitch: 35, vel: 60 });
  });

  // Music box: the motif in bars 1-2 and 5-6, then once more in A'.
  const musicBox = [0, 4, 18].flatMap((bar) => melodyNotes(musicBoxMotif, bar, 60));

  return [
    { name: "Low Strings", voice: "strings", channel: 0, program: 48, notes: tie(pad) },
    { name: "Music Box", voice: "harp", channel: 1, program: 10, notes: musicBox },
    { name: "French Horn", voice: "horn", channel: 2, program: 60, notes: melodyNotes(hornLament, 8, 84) },
    { name: "Violin", voice: "violin", channel: 3, program: 40, notes: melodyNotes(violinRub, 16, 46) },
    { name: "Contrabass", voice: "bass", channel: 4, program: 43, notes: tie(bass) },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
  ];
}

export const piece = {
  id: "title",
  name: "NetHack 3D Title Theme (sketch)",
  bpm: 60,
  beatsPerBar: BEATS_PER_BAR,
  key: "E minor",
  tracks: buildTracks(),
  suno: {
    style:
      "dark ambient orchestral, ominous, unsettling, instrumental, E minor, 60 bpm, low string drone, " +
      "dissonant chromatic harmony, sparse music box motif, mournful low French horn, faint heartbeat timpani, " +
      "eerie dungeon, suspense, minimal, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the melody and chords.",
      "Turn on Instrumental. Keep it restrained: no big crescendo or epic climax.",
      "The piece loops: bar 24 (B7) leads back into bar 1 (E minor).",
      "Structure: drone and music box (bars 1-8), horn lament (9-16), drone with high violin and heartbeat (17-24).",
    ],
  },
};
