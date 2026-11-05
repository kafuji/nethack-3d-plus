# Music sketches

Write a piece as data, then turn it into a MIDI file and a rough preview WAV to finish in Suno.

```
node scripts/music-sketch/sketch.mjs title
```

This writes the following files to `music-sketches/<id>/`, which is gitignored:

- `<id>.mid`: one track per part, with General MIDI programs, for a DAW.
- `<id>-preview.wav`: a dry render through FluidSynth and a SoundFont, with slight human timing and velocity. It is only input for Suno.
- `<id>-sheet.html`: a piano roll with sections, bar numbers and note names, and a playhead over the preview.
- `suno-prompt.txt`: the style prompt and notes for Suno.

### Pointing at notes

Open the sheet from its folder, so it finds the preview next to it. Clicking a note or a bar number adds a line such as `13小節目 Brass 3音目 (1拍目, D4): ` to the list below the roll. Write what should change after each line, then paste the list into a request. Clicking an empty spot plays from there, and the buttons above the roll hide tracks.

To hear part of a piece, pass `--bars` and/or `--solo`, which only write `<id>-excerpt.wav`:

```
node scripts/music-sketch/sketch.mjs title --bars 13-20 --solo "Brass,Strings"
```

### Render tools

Previews use FluidSynth and `MuseScore_General.sf2`, found under `~/.nethack-music-sketch/` or through the `MUSIC_SKETCH_FLUIDSYNTH` and `MUSIC_SKETCH_SOUNDFONT` environment variables. Without them, or with `--synth builtin`, the sketch falls back to the built-in voices.

- [FluidSynth releases](https://github.com/FluidSynth/fluidsynth/releases): unzip into `~/.nethack-music-sketch/fluidsynth/`.
- [MuseScore General](https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/): put the `.sf2` in `~/.nethack-music-sketch/`.

Each track is rendered alone and leveled to match its balance in the built-in voices, including `previewGainDb`, so that balance still applies.

## Workflow

1. Add or edit a piece in `pieces/<id>.mjs`. Each piece exports `piece` with `bpm`, `beatsPerBar`, `key`, `tracks` (notes in beats) and `suno` (style and notes). `sections` lists named bar ranges for the sheet. Each track's `program` is the General MIDI sound that FluidSynth plays (use a sustaining one for drones), and its `voice` picks the built-in voice (an optional `previewGainDb` balances it in the preview only): `strings`, `violin`, `horn`, `bass`, `harp`, `guitar`, `lead`, `timpani`, `metal` (struck metal, such as picks or an anvil) or `drums` (General MIDI drum notes on channel 9).
2. Run the command above and listen to the preview WAV.
3. In Suno, upload the preview WAV, choose Cover, turn on Instrumental, and paste the style prompt.
4. Download the MP3 into `music-sketches/<id>/`. To use it in the game, copy it to `public/music/`, register it in `src/audio/music/music-library.ts` (with a `gainDb` trim that brings it to about -24 dB) and pick it for regions in `music-region.ts`, credit it in `public/licenses/music-credits.txt`, and run `node scripts/music-sketch/tag-music.mjs` to set its MP3 tags from the library (Node 22.18 or later). Check that your Suno plan allows this use.

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
- `pieces/gehennom.mjs`: Gehennom, Eb Phrygian (the title's flat second) in 7/4 at 60 BPM. Ritual drums, a tritone under the drone, the ostinato backwards and phasing against the bar, and the call backwards in the low brass.
- `pieces/astral.mjs`: the Astral Plane, back in D in a slow 9/4. A three-voice canon on the theme, with three bell tolls; the answer finally resolves its flat second to the tonic, onto a D major chord.
- `pieces/astral-combat.mjs`: combat on the Astral Plane, 3/4 at 144 BPM. The one openly grand piece: full brass and choir, a canon on the theme, and the resolved answer leading through Bb and C to D major.
- `pieces/ascension.mjs`: an ending sketch that passes through every region's key and rises in D major. Not used in the game: the ascension track is a Suno Cover of `pieces/title.mjs` (Symphony and Metal, fanfare, glorious, epic, dramatic, grand finale).
- `pieces/combat.mjs`: boss fights, D Phrygian at 132 BPM. It starts at full energy on beat one; the call is squeezed into one bar (`augment: 0.5`) as the battle figure, and the brass plays it at full length.
- `pieces/combat-heavy.mjs`: everyday fights, D Phrygian at 100 BPM. Slower and heavier: a stomping beat, a low chugging riff, and the theme at full length in the low brass.
- `pieces/danger.mjs`: danger (low hit points), 112 BPM on a D-Eb-Ab cluster. A heartbeat, a semitone tremble from the ostinato, a cello that creeps up a semitone every two bars, and the call upside down (`invert: true`) in the low brass.

`helpers.mjs` holds small arrangement helpers (`above`, `tie`).

Run the tests with `node --test scripts/music-sketch/midi.test.mjs scripts/music-sketch/id3.test.mjs`.
