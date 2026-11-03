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

1. Add or edit a piece in `pieces/<id>.mjs`. Each piece exports `piece` with `bpm`, `beatsPerBar`, `key`, `tracks` (notes in beats) and `suno` (style and notes). Each track's `voice` picks a preview voice: `strings`, `violin`, `horn`, `bass`, `harp` or `timpani`.
2. Run the command above and listen to the preview WAV.
3. In Suno, upload the preview WAV, choose Cover, turn on Instrumental, and paste the style prompt.
4. Download the result. To use it in the game, trim it to loop, normalise the loudness, encode it as Ogg in `public/music/`, then register it in `src/audio/music/music-library.ts` and `public/licenses/music-credits.txt`. Check that your Suno plan allows this use.

Run the tests with `node --test scripts/music-sketch/midi.test.mjs`.
