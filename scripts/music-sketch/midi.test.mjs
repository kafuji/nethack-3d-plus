import assert from "node:assert/strict";
import { test } from "node:test";
import { writeMidi } from "./midi.mjs";
import { pieceEndBeat } from "./helpers.mjs";
import { descent, motifBars, realize } from "./motifs.mjs";
import { piece } from "./pieces/title.mjs";
import { piece as dungeon } from "./pieces/dungeon.mjs";
import { piece as mines } from "./pieces/mines.mjs";
import { piece as combat } from "./pieces/combat.mjs";
import { piece as combatHeavy } from "./pieces/combat-heavy.mjs";
import { piece as danger } from "./pieces/danger.mjs";
import { piece as sokoban } from "./pieces/sokoban.mjs";
import { piece as quest } from "./pieces/quest.mjs";
import { piece as medusa } from "./pieces/medusa.mjs";
import { piece as castle } from "./pieces/castle.mjs";
import { piece as gehennom } from "./pieces/gehennom.mjs";
import { piece as astral } from "./pieces/astral.mjs";
import { piece as astralCombat } from "./pieces/astral-combat.mjs";
import { piece as ascension } from "./pieces/ascension.mjs";
import { piece as wizard } from "./pieces/wizard.mjs";
import { excerpt, humanize } from "./arrange.mjs";
import { pitchName, sheetNotes } from "./sheet.mjs";

test("writes a format 1 file with a conductor track plus one track per part", () => {
  const midi = writeMidi(piece);
  assert.equal(midi.toString("ascii", 0, 4), "MThd");
  assert.equal(midi.readUInt16BE(8), 1);
  assert.equal(midi.readUInt16BE(10), piece.tracks.length + 1);
  let offset = 14;
  let chunks = 0;
  while (offset < midi.length) {
    assert.equal(midi.toString("ascii", offset, offset + 4), "MTrk");
    offset += 8 + midi.readUInt32BE(offset + 4);
    chunks += 1;
  }
  assert.equal(offset, midi.length);
  assert.equal(chunks, piece.tracks.length + 1);
});

test("encodes the tempo from bpm", () => {
  const midi = writeMidi({ name: "t", bpm: 120, tracks: [] });
  const tempo = midi.indexOf(Buffer.from([0xff, 0x51, 0x03]));
  assert.ok(tempo > 0);
  assert.equal(midi.readUIntBE(tempo + 3, 3), 500000);
});

for (const sketch of [piece, dungeon, mines, combat, combatHeavy, danger, sokoban, quest, medusa, castle, gehennom, astral, astralCombat, ascension, wizard]) {
  test(`${sketch.id} sketch fills its declared number of bars`, () => {
    const end = pieceEndBeat(sketch);
    const barBeats = sketch.beatsPerBar;
    assert.ok(end > (sketch.bars - 1) * barBeats && end <= sketch.bars * barBeats, `ends at beat ${end}`);
  });
}

test("realize places, augments, inverts and doubles a motif", () => {
  const motif = [[[0, 1], [null, 1], [3, 2]]];
  assert.deepEqual(
    realize(motif, { tonic: 60, startBar: 2, legato: 1 }).map((n) => [n.start, n.dur, n.pitch]),
    [[8, 1, 60], [10, 2, 63]],
  );
  assert.deepEqual(
    realize(motif, { tonic: 60, startBar: 0, augment: 2, invert: true, octaves: [12], legato: 1 }).map((n) => [n.start, n.dur, n.pitch]),
    [[0, 2, 60], [0, 2, 72], [4, 4, 57], [4, 4, 69]],
  );
  assert.equal(motifBars(descent.call), 2);
  assert.equal(motifBars(descent.answer, 2), 4);
});

test("every piece's sections stay inside its bars, in order", () => {
  for (const sketch of [piece, dungeon, mines, combat, combatHeavy, danger, sokoban, quest, medusa, castle, gehennom, astral, astralCombat, ascension, wizard]) {
    let next = 1;
    for (const section of sketch.sections) {
      assert.equal(section.bars[0], next, `${sketch.id} ${section.name}`);
      assert.ok(section.bars[1] >= section.bars[0]);
      next = section.bars[1] + 1;
    }
    assert.equal(next, sketch.bars + 1, sketch.id);
  }
});

test("tailBeats keeps the MIDI file running after the last note", () => {
  const short = { name: "t", bpm: 120, tracks: [{ name: "a", channel: 0, program: 0, notes: [{ start: 0, dur: 1, pitch: 60, vel: 90 }] }] };
  assert.equal(writeMidi(short).indexOf(Buffer.from([0xff, 0x06])), -1);
  assert.ok(writeMidi(short, 480, { tailBeats: 4 }).indexOf(Buffer.from([0xff, 0x06])) > 0);
});

test("humanize keeps chords together and is repeatable", () => {
  const chord = { bpm: 120, tracks: [{ name: "a", notes: [60, 64, 67].map((pitch) => ({ start: 4, dur: 1, pitch, vel: 90 })) }] };
  const played = humanize(chord);
  assert.equal(new Set(played.tracks[0].notes.map((n) => n.start)).size, 1);
  assert.deepEqual(humanize(chord), played);
  assert.deepEqual(chord.tracks[0].notes[0], { start: 4, dur: 1, pitch: 60, vel: 90 });
});

test("excerpt cuts bars and tracks and trims notes to fit", () => {
  const notes = [{ start: 2, dur: 8, pitch: 60, vel: 90 }, { start: 20, dur: 1, pitch: 62, vel: 90 }];
  const full = { beatsPerBar: 4, tracks: [{ name: "Brass", notes }, { name: "Cello", notes }] };
  const part = excerpt(full, { bars: [2, 2], solo: ["brass"] });
  assert.equal(part.tracks.length, 1);
  assert.deepEqual(part.tracks[0].notes, [{ start: 0, dur: 4, pitch: 60, vel: 90 }]);
  assert.throws(() => excerpt(full, { solo: ["Tuba"] }), /Tuba/);
});

test("sheet notes carry the bar, beat, position and name people refer to", () => {
  const notes = [{ start: 5.5, dur: 1, pitch: 62, vel: 90 }, { start: 4, dur: 1, pitch: 60, vel: 90 }, { start: 4, dur: 1, pitch: 72, vel: 90 }];
  const [sheet] = sheetNotes({ beatsPerBar: 4, tracks: [{ name: "a", notes }] });
  assert.deepEqual(sheet.map((n) => [n.bar, n.beat, n.index, n.name]), [[2, 1, 1, "C5"], [2, 1, 2, "C4"], [2, 2.5, 3, "D4"]]);
  assert.equal(pitchName(61), "C#4");
});
