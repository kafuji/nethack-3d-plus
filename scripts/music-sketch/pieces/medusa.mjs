// Medusa's Island sketch. Dark water and a gaze that turns things to stone.
// Slow 6/8 waves (harp arpeggios that rise and fall, with a second, out-of-
// step ripple on guitar) under a cold violin. Twice the music is "petrified":
// the waves stop dead and only one held note and the drone remain, until a
// crack lets the water move again. C# Phrygian, the next step in the chain
// of fifths (D title, A dungeon, E mines, B Sokoban, F# Quest).
//
//   1-4    waves on the C# drone
//   5-12   violin call, then low horn answer (both at dotted-quarter pace)
//   13-14  petrified: the waves stop, a high G# hangs over the drone
//   15-24  crack; waves again; violin and cello call, horn answer
//   25-26  petrified on the answer's last note, the flat second D
//   27-32  crack; waves only, thinning to loop
//
// Times are in eighth notes: 6 per bar, so bpm counts eighths.

import { descent, realize } from "../motifs.mjs";
import { tie } from "../helpers.mjs";

const BEATS_PER_BAR = 6;
const BARS = 32;
const TONIC = 61; // C#4

const frozenBars = new Set([12, 13, 24, 25]);
const cracks = [14, 26];

// One wave: up through C# G# C# D G# C#, and back down, over two bars.
const waveUp = [37, 44, 49, 50, 56, 61];
const wave = [...waveUp, ...[...waveUp].reverse()];

function buildTracks() {
  const harp = [];
  const ripple = [];
  const pad = [];
  const bass = [];
  const drums = [];
  const timp = [];
  const stone = [];

  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * BEATS_PER_BAR;
    const frozen = frozenBars.has(bar);

    // Bass: C# drone, never stops; D grinds against it in the second half.
    bass.push({ start, dur: BEATS_PER_BAR, pitch: 37, vel: 70 });
    if (bar >= 16 && bar < 24) bass.push({ start, dur: BEATS_PER_BAR, pitch: 38, vel: 42 });
    if (frozen) continue;

    // Harp: the two-bar wave, louder at its crest.
    for (let i = 0; i < 6; i++) {
      const step = (bar % 2) * 6 + i;
      const crest = 6 - Math.abs(step - 5.5);
      harp.push({ start: start + i, dur: Math.min(1.8, 6 - i), pitch: wave[step], vel: 40 + Math.round(crest * 4) });
    }

    // Strings: the gaze, a cold C#-D-G# cluster, from bar 5 on.
    if (bar >= 4 && bar < 28) {
      for (const pitch of [61, 62, 68]) pad.push({ start, dur: BEATS_PER_BAR, pitch, vel: 36 });
    }

    // Tide: a soft thud on each bar, spray on the second dotted quarter.
    if (bar >= 2 && bar < 30) {
      drums.push({ start, dur: 0.5, pitch: 36, vel: 50 });
      if (bar % 2) drums.push({ start: start + 3, dur: 0.5, pitch: 46, vel: 18 });
    }
  }

  // Guitar ripple: every five eighths, out of step with the bar.
  for (let beat = 1; beat < BARS * BEATS_PER_BAR - 6; beat += 5) {
    if (frozenBars.has(Math.floor(beat / BEATS_PER_BAR))) continue;
    ripple.push({ start: beat, dur: 1.5, pitch: [68, 73, 74][Math.floor(beat / 5) % 3], vel: 56 });
  }

  // Cracks: the stone breaks and the water moves again.
  for (const bar of cracks) {
    const start = bar * BEATS_PER_BAR;
    stone.push({ start, dur: 1, pitch: 61, vel: 70 }, { start: start + 0.5, dur: 1, pitch: 56, vel: 48 });
    timp.push({ start, dur: 2, pitch: 37, vel: 84 });
  }

  // The theme at dotted-quarter pace (augment 3 in eighths): four bars per half.
  const slow = (motif, tonic, startBar, vel, octaves = []) =>
    realize(motif, { tonic, startBar, beatsPerBar: BEATS_PER_BAR, augment: 3, vel, octaves });
  const violin = [
    ...slow(descent.call, TONIC + 12, 4, 70),
    { start: 12 * BEATS_PER_BAR, dur: 2 * BEATS_PER_BAR, pitch: 80, vel: 60 }, // the petrified G#
    ...slow(descent.call, TONIC, 16, 72),
  ];
  const cello = slow(descent.call, TONIC - 24, 16, 72);
  const horn = [
    ...slow(descent.answer, TONIC - 12, 8, 70),
    ...slow(descent.answer, TONIC - 12, 20, 70),
    // The answer's last note, the flat second, held through the second freeze.
    { start: 24 * BEATS_PER_BAR, dur: 2 * BEATS_PER_BAR, pitch: TONIC - 11, vel: 62 },
  ];

  return [
    { name: "Harp Waves", voice: "harp", channel: 0, program: 46, notes: harp, previewGainDb: 6 },
    { name: "Guitar Ripple", voice: "guitar", channel: 1, program: 25, notes: ripple, previewGainDb: 10 },
    { name: "Violin", voice: "violin", channel: 2, program: 40, notes: violin },
    { name: "Cello", voice: "violin", channel: 3, program: 42, notes: cello, previewGainDb: -1 },
    { name: "Horn", voice: "horn", channel: 4, program: 60, notes: horn },
    { name: "Strings", voice: "strings", channel: 5, program: 48, notes: tie(pad) },
    { name: "Bass Drone", voice: "bass", channel: 6, program: 43, notes: tie(bass) },
    { name: "Stone", voice: "metal", channel: 7, program: 113, notes: stone, previewGainDb: 5 },
    { name: "Timpani", voice: "timpani", channel: 8, program: 47, notes: timp },
    { name: "Tide", voice: "drums", channel: 9, program: 0, notes: drums },
  ];
}

export const piece = {
  id: "medusa",
  name: "NetHack 3D Medusa's Island (sketch)",
  bpm: 150, // eighth notes; 50 dotted quarters a minute
  beatsPerBar: BEATS_PER_BAR,
  bars: BARS,
  sections: [
    { name: "Waves", bars: [1, 4] },
    { name: "Theme", bars: [5, 12] },
    { name: "Petrified", bars: [13, 14] },
    { name: "Theme", bars: [15, 24] },
    { name: "Petrified", bars: [25, 26] },
    { name: "Waves", bars: [27, 32] },
  ],
  key: "C# Phrygian, 6/8",
  tracks: buildTracks(),
  suno: {
    // Suno rejects artist names, so the style is described instead.
    style:
      "dark still water, eerie island of stone, dry and cold, uneasy, minimal, instrumental, C# phrygian, " +
      "slow 6/8 swaying, 50 bpm, rising and falling harp arpeggios like waves, sparse guitar ripples, " +
      "cold solo violin, low horn, cello, dissonant string cluster, deep drone, sudden frozen silences, " +
      "stone cracking, no build-up, steady dynamics, indie game soundtrack, no vocals, loopable",
    notes: [
      "Upload the preview WAV and use Cover so Suno keeps the waves, the melody and the two frozen pauses.",
      "Turn on Instrumental. Medusa's gaze turns things to stone: twice the music stops dead except for one held note, then a crack sets the water moving again.",
      "The title theme at a slow dotted-quarter pace (call: C# C# E D C# | B A G# C#), on a cold high violin and a low horn.",
      "The piece loops: it starts and ends with the waves alone on the C# drone.",
    ],
  },
};
