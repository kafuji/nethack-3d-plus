// Leitmotifs shared between pieces. A motif is a list of bars; each bar is a
// list of [semitones from the tonic, beats] (null = rest). Pieces realize them
// in their own key, register and tempo, and can vary them (augmentation,
// diminution, inversion) so the soundtrack keeps returning to the same idea.

/**
 * "The Descent": the main theme. Phrygian D (the flat second gives the
 * menace); the call sinks to the dominant and leaps back home, the answer
 * climbs with dignity and stops on the unresolved flat second.
 */
export const descent = {
  call: [
    [[0, 1], [0, 0.5], [3, 0.5], [1, 1], [0, 1]],
    [[-2, 0.75], [-4, 0.75], [-5, 0.5], [0, 2]],
  ],
  answer: [
    [[0, 1], [5, 1], [7, 1.5], [8, 0.5]],
    [[7, 1], [5, 0.5], [3, 0.5], [1, 2]],
  ],
  // Eighth-note ostinato around the tonic, usable under any section.
  ostinato: [[[0, 0.5], [0, 0.5], [7, 0.5], [0, 0.5], [1, 0.5], [0, 0.5], [-2, 0.5], [-5, 0.5]]],
};

/**
 * Turns motif bars into notes.
 *   tonic:    MIDI pitch for offset 0
 *   startBar: bar index where the motif begins
 *   augment:  rhythm scale (2 = twice as slow, 0.5 = twice as fast)
 *   invert:   mirror intervals around the tonic
 *   octaves:  extra octave doublings, e.g. [-12] for weight
 *   legato:   fraction of each note's length that sounds
 */
export function realize(motif, { tonic, startBar, beatsPerBar = 4, vel = 90, augment = 1, invert = false, octaves = [], legato = 0.95 }) {
  const notes = [];
  let beat = startBar * beatsPerBar;
  for (const bar of motif) {
    for (const [offset, beats] of bar) {
      const dur = beats * augment;
      if (offset !== null) {
        const pitch = tonic + (invert ? -offset : offset);
        for (const shift of [0, ...octaves]) {
          notes.push({ start: beat, dur: dur * legato, pitch: pitch + shift, vel });
        }
      }
      beat += dur;
    }
  }
  return notes;
}

/** Number of bars a motif occupies after augmentation. */
export function motifBars(motif, augment = 1, beatsPerBar = 4) {
  const beats = motif.flat().reduce((sum, [, b]) => sum + b, 0);
  return (beats * augment) / beatsPerBar;
}
