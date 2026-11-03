// Combat sketch. Back in the title's D Phrygian, but driving: it starts on the
// first beat (fights start without warning), stays dark and dry rather than
// epic, and loops in under a minute. The Descent call is compressed into one
// bar (augment 0.5) as the battle figure; the brass states it at full length.
//
//   A (1-8)    pedal ostinato and drums from beat one; the lead guitar spits
//              the compressed call (1, 3, 5) and the compressed answer (7)
//   B (9-16)   power riff on the roots; brass: call, answer, call, answer
//   C (17-24)  half-time, low D-Eb rub; brass call an octave down, timpani
//   D (25-32)  brass and lead together; compressed call again before the fill,
//              ending on A so it falls straight back into bar 1

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
  ...["Dm", "Eb", "Dm", "Eb", "Dm", "Eb", "Bb", "A"],
  ...["Dm", "Bb", "Gm", "Eb", "Dm", "Bb", "Gm", "A"],
  ...["Dm", "Dm", "Eb", "Eb", "Bb", "Bb", "A", "A"],
  ...["Dm", "Bb", "Gm", "Eb", "Dm", "Bb", "Gm", "A"],
];

function sectionOf(bar) {
  return "ABCD"[Math.floor(bar / 8)];
}

const LEAD_TONIC = 62; // D4
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

    // Strings: chords, or the low D-Eb rub in the half-time section.
    const padPitches = section === "C" ? [38, 39, above(root, 50)] : tones.map((pc) => above(pc, 50));
    for (const pitch of padPitches) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: section === "C" ? 58 : 54 });

    // Guitar: Descent ostinato on a D pedal in A, power riff on the roots in B and D,
    // palm-muted root quarters in C.
    const low = above(root, 45);
    if (section === "A") {
      riff.push(...realize(descent.ostinato, { tonic: 50, startBar: bar, vel: 84, legato: 0.8 }));
    } else if (section === "C") {
      for (let i = 0; i < 4; i++) riff.push({ start: start + i, dur: 0.3, pitch: low, vel: i ? 70 : 86 });
    } else {
      [0, 0, 7, 0, 12, 0, 7, 10].forEach((step, i) => {
        riff.push({ start: start + i * 0.5, dur: 0.4, pitch: low + step, vel: i % 2 ? 72 : 90 });
      });
    }

    // Bass: driving eighths on the root, held notes in C.
    const bassRoot = above(root, 33);
    if (section === "C") {
      bass.push({ start, dur: BEATS_PER_BAR, pitch: bassRoot, vel: 88 });
    } else {
      for (let i = 0; i < 8; i++) bass.push({ start: start + i * 0.5, dur: 0.45, pitch: bassRoot, vel: i % 2 ? 72 : 88 });
    }

    // Drums: straight driving beat, half-time in C, a snare fill into each section.
    const fill = bar % 8 === 7;
    if (section === "C") {
      for (const k of [0, 2.75]) drums.push({ start: start + k, dur: 0.25, pitch: 36, vel: 104 });
      drums.push({ start: start + 2, dur: 0.25, pitch: 38, vel: 96 });
      for (let i = 0; i < 4; i++) drums.push({ start: start + i, dur: 0.25, pitch: 42, vel: 44 });
    } else {
      for (const k of [0, 1.5, 2.5]) drums.push({ start: start + k, dur: 0.25, pitch: 36, vel: 100 });
      for (const s of fill ? [1] : [1, 3]) drums.push({ start: start + s, dur: 0.25, pitch: 38, vel: 94 });
      for (let i = 0; i < (fill ? 4 : 8); i++) drums.push({ start: start + i * 0.5, dur: 0.25, pitch: 42, vel: i % 2 ? 36 : 54 });
    }
    if (fill) {
      for (let i = 0; i < 8; i++) drums.push({ start: start + 2 + i * 0.25, dur: 0.25, pitch: 38, vel: 56 + i * 7 });
    }

    // Timpani: every downbeat in C, every other one elsewhere.
    if (section === "C" || bar % 2 === 0) timp.push({ start, dur: 1, pitch: above(root, 38), vel: section === "C" ? 104 : 88 });
  });

  // The battle figure: the whole call (or answer) squeezed into one bar.
  const battle = (motif, startBar, vel) => realize(motif, { tonic: LEAD_TONIC, startBar, augment: 0.5, vel, legato: 0.85 });
  const lead = [
    ...battle(descent.call, 0, 104),
    ...battle(descent.call, 2, 104),
    ...battle(descent.call, 4, 104),
    ...battle(descent.answer, 6, 106),
    ...realize(descent.call, { tonic: LEAD_TONIC + 12, startBar: 24, vel: 100 }),
    ...realize(descent.answer, { tonic: LEAD_TONIC + 12, startBar: 26, vel: 100 }),
    ...battle(descent.call, 28, 106),
    ...battle(descent.call, 29, 106),
    ...battle(descent.answer, 30, 108),
  ];

  const brassOctaves = { octaves: [12] };
  // Held roots in two octaves, for weight under the lead guitar.
  const heldRoots = (fromBar, toBar, vel) =>
    progression.slice(fromBar, toBar).flatMap((name, i) => {
      const pitch = above(chordTones[name][0], 38);
      const start = (fromBar + i) * BEATS_PER_BAR;
      return [0, 12].map((shift) => ({ start, dur: 3.8, pitch: pitch + shift, vel }));
    });
  const brass = [
    ...heldRoots(0, 8, 80),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 8, vel: 98, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 10, vel: 98, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 12, vel: 98, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 14, vel: 100, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC - 12, startBar: 16, augment: 2, vel: 100, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC - 12, startBar: 20, augment: 2, vel: 100, ...brassOctaves }),
    ...realize(descent.call, { tonic: BRASS_TONIC, startBar: 24, vel: 100, ...brassOctaves }),
    ...realize(descent.answer, { tonic: BRASS_TONIC, startBar: 26, vel: 100, ...brassOctaves }),
    ...heldRoots(28, 32, 90),
  ];

  return [
    { name: "Guitar Riff", voice: "guitar", channel: 0, program: 30, notes: riff, previewGainDb: 1 },
    { name: "Lead Guitar", voice: "lead", channel: 1, program: 29, notes: lead, previewGainDb: -2 },
    { name: "Brass", voice: "horn", channel: 2, program: 61, notes: brass, previewGainDb: -2 },
    { name: "Strings", voice: "strings", channel: 3, program: 48, notes: tie(pad) },
    { name: "Bass", voice: "bass", channel: 4, program: 34, notes: bass, previewGainDb: 2 },
    { name: "Timpani", voice: "timpani", channel: 5, program: 47, notes: timp },
    { name: "Drums", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "combat",
  name: "NetHack 3D Combat Theme (sketch)",
  bpm: 132,
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  key: "D Phrygian",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark driving combat music, dry and gritty, tense and aggressive but not epic, instrumental, D phrygian, " +
      "132 bpm, overdriven acoustic and electric guitar riffs, fast twangy lead guitar figure, low brass, " +
      "pounding drums and timpani, driving bass, half-time breakdown, recurring leitmotif, indie game battle " +
      "soundtrack, starts immediately, no intro, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the riffs, the leitmotif and the structure.",
      "Turn on Instrumental. It must start at full energy on the first beat: fights begin without warning.",
      "Leitmotif: the title theme's call (D D F Eb D | C Bb A D), squeezed into one fast bar on lead guitar and played at full length by the brass.",
      "The piece loops: bar 32 (A major, drum fill) leads back into bar 1 (D).",
      "Structure: driving riff with the fast figure (1-8), brass theme (9-16), half-time breakdown (17-24), everything together (25-32).",
    ],
  },
};
