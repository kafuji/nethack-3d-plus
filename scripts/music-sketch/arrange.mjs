// Output-time transforms: slight human timing and velocity, and excerpts. The
// piece files keep the clean written notes, which is what the sheet shows.

/** Small deterministic PRNG so a sketch renders the same every time. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_TIMING_SEC = 0.012;
const MAX_VELOCITY = 6;

/** Notes struck together stay together, so chords and octaves do not flam. */
export function humanize(piece) {
  const maxBeats = (MAX_TIMING_SEC * piece.bpm) / 60;
  return {
    ...piece,
    tracks: piece.tracks.map((track, trackIndex) => {
      const next = random(trackIndex + 1);
      const shifts = new Map();
      return {
        ...track,
        notes: [...track.notes]
          .sort((a, b) => a.start - b.start)
          .map((note) => {
            if (!shifts.has(note.start)) shifts.set(note.start, (next() * 2 - 1) * maxBeats);
            const vel = Math.round(note.vel + (next() * 2 - 1) * MAX_VELOCITY);
            return { ...note, start: Math.max(0, note.start + shifts.get(note.start)), vel: Math.min(127, Math.max(1, vel)) };
          }),
      };
    }),
  };
}

/**
 * Cuts the piece down to bars from..to (1-based, inclusive) and/or named tracks.
 * Notes already sounding at the start of the excerpt are trimmed to fit.
 */
export function excerpt(piece, { bars = null, solo = null } = {}) {
  const from = bars ? (bars[0] - 1) * piece.beatsPerBar : 0;
  const to = bars ? bars[1] * piece.beatsPerBar : Infinity;
  const names = solo?.map((name) => name.toLowerCase());
  const tracks = piece.tracks
    .filter((track) => !names || names.includes(track.name.toLowerCase()))
    .map((track) => ({
      ...track,
      notes: track.notes
        .filter((note) => note.start < to && note.start + note.dur > from)
        .map((note) => {
          const start = Math.max(note.start, from);
          return { ...note, start: start - from, dur: Math.min(note.start + note.dur, to) - start };
        }),
    }));
  if (tracks.length === 0) throw new Error(`No track named ${solo.join(", ")}. Tracks: ${piece.tracks.map((t) => t.name).join(", ")}`);
  return { ...piece, tracks };
}
