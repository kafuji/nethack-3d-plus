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

1. Add or edit a piece in `pieces/<id>.mjs`. Each piece exports `piece` with `bpm`, `beatsPerBar`, `key`, `tracks` (notes in beats) and `suno` (style and notes). Each track's `voice` picks a preview voice (and an optional `previewGainDb` balances it in the preview only): `strings`, `violin`, `horn`, `bass`, `harp`, `guitar`, `lead`, `timpani`, `metal` (struck metal, such as picks or an anvil) or `drums` (General MIDI drum notes on channel 9).
2. Run the command above and listen to the preview WAV.
3. In Suno, upload the preview WAV, choose Cover, turn on Instrumental, and paste the style prompt.
4. Download the result. To use it in the game, trim it to loop, normalise the loudness, encode it as Ogg in `public/music/`, then register it in `src/audio/music/music-library.ts` and `public/licenses/music-credits.txt`. Check that your Suno plan allows this use.

## Shared leitmotifs

`motifs.mjs` holds themes that several pieces reuse, so the soundtrack returns to the same ideas. Each motif is written as semitones from the tonic with lengths in beats. `realize(motif, { tonic, startBar, augment, invert, octaves })` turns a motif into notes in any key, register or tempo.

`descent` is the main theme:

- `call`: D D F Eb D | C Bb A D
- `answer`: D G A Bb | A G F Eb
- `ostinato`: an eighth-note figure around the tonic

Pieces that use it:

- `pieces/title.mjs`: title screen, D Phrygian, heavy half-time groove.
- `pieces/dungeon.mjs`: main dungeon exploration, dry dark ambient on an A pedal. Only fragments of the theme surface, slowed down, in the low strings and horn.
- `pieces/mines.mjs`: Gnomish Mines, the same ambient on an E pedal in 5/4, so the 4-beat ostinato limps, with distant pick strikes.
- `pieces/combat.mjs`: boss fights, D Phrygian at 132 BPM. It starts at full energy on beat one; the call is squeezed into one bar (`augment: 0.5`) as the battle figure, and the brass plays it at full length.
- `pieces/combat-heavy.mjs`: everyday fights, D Phrygian at 100 BPM. Slower and heavier: a stomping beat, a low chugging riff, and the theme at full length in the low brass.

Other pieces can reuse it. A danger piece, for example, could play it upside down (`invert: true`) or in a low register.

`helpers.mjs` holds small arrangement helpers (`above`, `tie`).

Run the tests with `node --test scripts/music-sketch/midi.test.mjs`.
