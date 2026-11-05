import assert from "node:assert/strict";
import { test } from "node:test";
import { readFrames, readTextFrame, setTextFrames } from "./id3.mjs";

const syncsafe = (n) => [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];

function frame(id, body) {
  return Buffer.concat([Buffer.from(id, "latin1"), Buffer.from(syncsafe(body.length)), Buffer.from([0, 0]), body]);
}

function mp3(frames, audio, padding = 0) {
  const body = Buffer.concat([...frames, Buffer.alloc(padding)]);
  return Buffer.concat([Buffer.from("ID3\x04\x00\x00", "latin1"), Buffer.from(syncsafe(body.length)), body, audio]);
}

const audio = Buffer.from([0xff, 0xfb, 1, 2, 3]);
const picture = frame("APIC", Buffer.from([9, 8, 7]));

test("replaces the named text frames and keeps other frames and the audio", () => {
  const original = mp3([frame("TIT2", Buffer.from("\x03title-preview")), picture], audio, 7);
  const tagged = setTextFrames(original, { TIT2: "Labyrinth of DOOM", TALB: "Album" });
  assert.equal(readTextFrame(tagged, "TIT2"), "Labyrinth of DOOM");
  assert.equal(readTextFrame(tagged, "TALB"), "Album");
  const { frames, audioStart } = readFrames(tagged);
  assert.deepEqual(frames.map((f) => f.id), ["TIT2", "TALB", "APIC"]);
  assert.deepEqual(frames[2].raw, picture);
  assert.deepEqual(tagged.subarray(audioStart), audio);
});

test("is repeatable and adds a tag to a file without one", () => {
  const once = setTextFrames(audio, { TIT2: "ファイル" });
  assert.equal(readTextFrame(once, "TIT2"), "ファイル");
  assert.deepEqual(setTextFrames(once, { TIT2: "ファイル" }), once);
  assert.deepEqual(once.subarray(readFrames(once).audioStart), audio);
});

test("refuses tag versions it cannot rewrite safely", () => {
  const older = Buffer.concat([Buffer.from("ID3\x03\x00\x00", "latin1"), Buffer.from(syncsafe(0)), audio]);
  assert.throws(() => setTextFrames(older, { TIT2: "x" }), /ID3v2\.3/);
});
