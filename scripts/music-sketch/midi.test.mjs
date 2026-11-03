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

for (const sketch of [piece, dungeon, mines, combat, combatHeavy, danger, sokoban]) {
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
