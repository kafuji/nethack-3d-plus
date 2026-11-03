# Music sketches

Write a piece as data, then turn it into a MIDI file and a rough preview WAV to finish in Suno.

```
node scripts/music-sketch/sketch.mjs title
```

This writes the following files to `music-sketches/<id>/`, which is gitignored:

- `<id>.mid`: one track per part, with General MIDI programs, for a DAW.
- `<id>-preview.wav`: a rough render from the built-in voices. It only needs to carry the melody, chords and pacing.
- `suno-prompt.txt`: the style prompt and notes for Suno.

## Workflow

1. Add or edit a piece in `pieces/<id>.mjs`. Each piece exports `piece` with `bpm`, `beatsPerBar`, `key`, `tracks` (notes in beats) and `suno` (style and notes). Each track's `voice` picks a preview voice: `strings`, `violin`, `horn`, `bass`, `harp`, `guitar`, `lead`, `timpani` or `drums` (General MIDI drum notes on channel 9).
2. Run the command above and listen to the preview WAV.
3. In Suno, upload the preview WAV, choose Cover, turn on Instrumental, and paste the style prompt.
4. Download the result. To use it in the game, trim it to loop, normalise the loudness, encode it as Ogg in `public/music/`, then register it in `src/audio/music/music-library.ts` and `public/licenses/music-credits.txt`. Check that your Suno plan allows this use.

## Shared leitmotifs

`motifs.mjs` holds themes that several pieces reuse, so the soundtrack returns to the same ideas. Each motif is written as semitones from the tonic with lengths in beats. `realize(motif, { tonic, startBar, augment, invert, octaves })` turns a motif into notes in any key, register or tempo.

`descent` is the main theme, used by `pieces/title.mjs`:

- `call`: D D F Eb D | C Bb A D
- `answer`: D G A Bb | A G F Eb
- `ostinato`: an eighth-note figure around the tonic

Other pieces can reuse it. A battle piece could play it twice as fast (`augment: 0.5`), and a danger piece could play it upside down (`invert: true`) or in a low register.

`helpers.mjs` holds small arrangement helpers (`above`, `tie`).

Run the tests with `node --test scripts/music-sketch/midi.test.mjs`.
