import assert from "node:assert/strict";
import { test } from "node:test";
import { writeMidi } from "./midi.mjs";
import { piece } from "./pieces/title.mjs";

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

test("title sketch fills 24 bars of 4/4", () => {
  const end = Math.max(...piece.tracks.flatMap((track) => track.notes.map((n) => n.start + n.dur)));
  assert.ok(end > 23 * 4 && end <= 24 * 4, `ends at beat ${end}`);
});
