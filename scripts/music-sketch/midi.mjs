// Minimal Standard MIDI File (format 1) writer, no dependencies.

function vlq(value) {
  const bytes = [value & 0x7f];
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32BE(data.length, 4);
  return Buffer.concat([header, Buffer.from(data)]);
}

function textEvent(type, text) {
  const bytes = [...Buffer.from(text, "utf8")];
  return [0xff, type, ...vlq(bytes.length), ...bytes];
}

/** events: [{ tick, order, bytes }] -> track chunk with delta times. */
function trackChunk(events) {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const data = [];
  let last = 0;
  for (const event of sorted) {
    data.push(...vlq(event.tick - last), ...event.bytes);
    last = event.tick;
  }
  data.push(0x00, 0xff, 0x2f, 0x00);
  return chunk("MTrk", data);
}

/**
 * piece: { name, bpm, beatsPerBar, tracks: [{ name, channel, program, notes: [{ start, dur, pitch, vel }] }] }
 * Times are in beats (quarter notes). tailBeats keeps the file running after the
 * last note, so a renderer does not cut off the ring.
 */
export function writeMidi(piece, ppq = 480, { tailBeats = 0 } = {}) {
  const microsPerBeat = Math.round(60_000_000 / piece.bpm);
  const lastBeat = Math.max(0, ...piece.tracks.flatMap((track) => track.notes.map((n) => n.start + n.dur)));
  const conductor = trackChunk([
    { tick: 0, order: 0, bytes: textEvent(0x03, piece.name) },
    {
      tick: 0,
      order: 1,
      bytes: [0xff, 0x51, 0x03, (microsPerBeat >> 16) & 0xff, (microsPerBeat >> 8) & 0xff, microsPerBeat & 0xff],
    },
    { tick: 0, order: 2, bytes: [0xff, 0x58, 0x04, piece.beatsPerBar ?? 4, 2, 24, 8] },
    ...(tailBeats > 0 ? [{ tick: Math.round((lastBeat + tailBeats) * ppq), order: 3, bytes: textEvent(0x06, "end") }] : []),
  ]);
  const toTick = (beats) => Math.round(beats * ppq);
  const tracks = piece.tracks.map((track) => {
    const channel = track.channel & 0x0f;
    const events = [
      { tick: 0, order: 0, bytes: textEvent(0x03, track.name) },
      { tick: 0, order: 1, bytes: [0xc0 | channel, track.program & 0x7f] },
    ];
    for (const note of track.notes) {
      const on = toTick(note.start);
      const off = Math.max(on + 1, toTick(note.start + note.dur));
      // Note-offs sort before note-ons on the same tick so repeated pitches retrigger.
      events.push({ tick: on, order: 3, bytes: [0x90 | channel, note.pitch, note.vel] });
      events.push({ tick: off, order: 2, bytes: [0x80 | channel, note.pitch, 0] });
    }
    return trackChunk(events);
  });
  const header = Buffer.alloc(6);
  header.writeUInt16BE(1, 0);
  header.writeUInt16BE(tracks.length + 1, 2);
  header.writeUInt16BE(ppq, 4);
  return Buffer.concat([chunk("MThd", header), conductor, ...tracks]);
}
