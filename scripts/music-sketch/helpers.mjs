// Small arrangement helpers shared by pieces.

/** Lowest pitch >= floor with the given pitch class. */
export function above(pitchClass, floor) {
  return floor + ((pitchClass - floor) % 12 + 12) % 12;
}

/** Ties notes that continue at the same pitch into one long note (for drones). */
export function tie(notes) {
  const tied = [];
  for (const note of [...notes].sort((a, b) => a.start - b.start)) {
    const held = tied.find((n) => n.pitch === note.pitch && Math.abs(n.start + n.dur - note.start) < 1e-6);
    if (held) held.dur += note.dur;
    else tied.push({ ...note });
  }
  return tied;
}

/** End of the last note, in beats. */
export function pieceEndBeat(piece) {
  return Math.max(...piece.tracks.flatMap((track) => track.notes.map((n) => n.start + n.dur)));
}
