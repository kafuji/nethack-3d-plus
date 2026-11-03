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
4. Download the MP3 into `music-sketches/<id>/`. To use it in the game, copy it to `public/music/`, register it in `src/audio/music/music-library.ts` (with a `gainDb` trim that brings it to about -24 dB) and pick it for regions in `music-region.ts`, then credit it in `public/licenses/music-credits.txt`. Check that your Suno plan allows this use.

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
- `pieces/sokoban.mjs`: Sokoban, B Phrygian at 92 BPM. The call's notes form an eight-note harp cell; every two bars one note is pushed a square, scrambling it and then solving it again by the loop point.
- `pieces/quest.mjs`: the Quest, F# Phrygian in 3/4 at 72 BPM. A solemn processional where the theme is stated whole, stretched into triple time (`augment: 1.5`), with a distant summons built from the answer's first three notes.
- `pieces/medusa.mjs`: Medusa's Island, C# Phrygian in a slow 6/8 (counted in eighths). Harp waves under a cold violin; twice the music is petrified, stopping dead around one held note until a crack sets the water moving again.
- `pieces/castle.mjs`: the Castle, G# Phrygian at 88 BPM. A slow march with a military snare; the theme as a brass fanfare and a half-speed chorale, framed by a five-note bell tune at the gate (the call's opening) and the drawbridge's chains.
- `pieces/combat.mjs`: boss fights, D Phrygian at 132 BPM. It starts at full energy on beat one; the call is squeezed into one bar (`augment: 0.5`) as the battle figure, and the brass plays it at full length.
- `pieces/combat-heavy.mjs`: everyday fights, D Phrygian at 100 BPM. Slower and heavier: a stomping beat, a low chugging riff, and the theme at full length in the low brass.
- `pieces/danger.mjs`: danger (low hit points), 112 BPM on a D-Eb-Ab cluster. A heartbeat, a semitone tremble from the ostinato, a cello that creeps up a semitone every two bars, and the call upside down (`invert: true`) in the low brass.

`helpers.mjs` holds small arrangement helpers (`above`, `tie`).

Run the tests with `node --test scripts/music-sketch/midi.test.mjs`.
