// Rewrites text frames in an MP3's ID3v2.4 tag, no dependencies. Other frames and
// the audio are kept byte for byte.

function readSyncsafe(buffer, offset) {
  return (buffer[offset] << 21) | (buffer[offset + 1] << 14) | (buffer[offset + 2] << 7) | buffer[offset + 3];
}

function writeSyncsafe(value) {
  return Buffer.from([(value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f]);
}

/** Frames of the tag at the start of the file, as { id, raw } with raw including the header. */
export function readFrames(mp3) {
  if (mp3.toString("latin1", 0, 3) !== "ID3") return { frames: [], audioStart: 0 };
  if (mp3[3] !== 4 || mp3[5] !== 0) throw new Error(`Unsupported ID3v2.${mp3[3]} tag (flags ${mp3[5]})`);
  const audioStart = 10 + readSyncsafe(mp3, 6);
  const frames = [];
  let offset = 10;
  while (offset + 10 <= audioStart && mp3[offset] !== 0) {
    const size = readSyncsafe(mp3, offset + 4);
    frames.push({ id: mp3.toString("latin1", offset, offset + 4), raw: mp3.subarray(offset, offset + 10 + size) });
    offset += 10 + size;
  }
  return { frames, audioStart };
}

function textFrame(id, text) {
  const body = Buffer.concat([Buffer.from([3]), Buffer.from(text, "utf8")]); // 3 = UTF-8
  return Buffer.concat([Buffer.from(id, "latin1"), writeSyncsafe(body.length), Buffer.from([0, 0]), body]);
}

/** text: { TIT2: "...", ... }. Replaces those frames and returns the new file. */
export function setTextFrames(mp3, text) {
  const { frames, audioStart } = readFrames(mp3);
  const kept = frames.filter((frame) => !(frame.id in text)).map((frame) => frame.raw);
  const body = Buffer.concat([...Object.entries(text).map(([id, value]) => textFrame(id, value)), ...kept]);
  const header = Buffer.concat([Buffer.from("ID3\x04\x00\x00", "latin1"), writeSyncsafe(body.length)]);
  return Buffer.concat([header, body, mp3.subarray(audioStart)]);
}

export function readTextFrame(mp3, id) {
  const frame = readFrames(mp3).frames.find((candidate) => candidate.id === id);
  return frame ? frame.raw.subarray(11).toString("utf8") : null;
}
