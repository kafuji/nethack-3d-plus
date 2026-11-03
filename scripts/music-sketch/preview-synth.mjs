// Renders a piece to a rough stereo WAV preview with simple built-in voices.
// The preview only has to carry melody, harmony and pacing for Suno's Cover
// feature, so it is rendered dry: steady pitch, no detune, vibrato or reverb.

const TAU = Math.PI * 2;

const midiToHz = (pitch) => 440 * Math.pow(2, (pitch - 69) / 12);

/** Linear attack, hold, linear release (all in seconds). */
function envelope(t, attack, hold, release) {
  if (t < attack) return t / attack;
  if (t < hold) return 1;
  return Math.max(0, 1 - (t - hold) / release);
}

/** Additive voice: a fixed set of harmonic amplitudes. */
function additive({ harmonics, attack, release, gain }) {
  return (out, sampleRate, freq, dur, vel) => {
    const length = Math.min(out.length, Math.ceil((dur + release) * sampleRate));
    const amp = gain * (vel / 127);
    const partials = harmonics
      .map((h, n) => ({ h, step: (TAU * (n + 1) * freq) / sampleRate }))
      .filter(({ step }) => step < Math.PI);
    for (let i = 0; i < length; i++) {
      const env = envelope(i / sampleRate, attack, dur, release);
      let sample = 0;
      for (const { h, step } of partials) sample += h * Math.sin(step * i);
      out[i] += sample * env * amp;
    }
  };
}

/** Karplus-Strong plucked string. */
function plucked({ gain, decay, ring }) {
  return (out, sampleRate, freq, dur, vel) => {
    const period = Math.max(2, Math.round(sampleRate / freq));
    const line = new Float32Array(period).map(() => Math.random() * 2 - 1);
    const length = Math.min(out.length, Math.ceil((dur + ring) * sampleRate));
    const amp = gain * (vel / 127);
    let index = 0;
    for (let i = 0; i < length; i++) {
      const next = (index + 1) % period;
      const value = line[index];
      line[index] = decay * 0.5 * (value + line[next]);
      out[i] += value * amp * Math.min(1, i / 40);
      index = next;
    }
  };
}

function timpani({ gain }) {
  return (out, sampleRate, freq, dur, vel) => {
    const length = Math.min(out.length, Math.ceil(2.5 * sampleRate));
    const amp = gain * (vel / 127);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const body = Math.sin(TAU * freq * t) + 0.4 * Math.sin(TAU * freq * 1.5 * t) * Math.exp(-t * 3);
      out[i] += body * Math.exp(-t * 2.2) * Math.min(1, i / 80) * amp;
    }
  };
}

/** General MIDI drum notes: 36 kick, 38 snare, 42 closed hat, 46 open hat. */
function drums({ gain }) {
  return (out, sampleRate, freq, dur, vel, pitch) => {
    const amp = gain * (vel / 127);
    const kind = pitch === 36 ? "kick" : pitch === 38 ? "snare" : "hat";
    const seconds = kind === "kick" ? 0.6 : kind === "snare" ? 0.3 : pitch === 46 ? 0.35 : 0.08;
    const length = Math.min(out.length, Math.ceil(seconds * sampleRate));
    let phase = 0;
    let previousNoise = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample;
      if (kind === "kick") {
        phase += (TAU * (45 + 80 * Math.exp(-t * 30))) / sampleRate;
        sample = Math.sin(phase) * Math.exp(-t * 7);
      } else if (kind === "snare") {
        sample = (0.6 * (Math.random() * 2 - 1) + 0.5 * Math.sin(TAU * 185 * t)) * Math.exp(-t * 18);
      } else {
        const noise = Math.random() * 2 - 1;
        sample = (noise - previousNoise) * 0.35 * Math.exp(-t * (pitch === 46 ? 9 : 45));
        previousNoise = noise;
      }
      out[i] += sample * Math.min(1, i / 20) * amp;
    }
  };
}

const voices = {
  guitar: { render: plucked({ gain: 0.3, decay: 0.993, ring: 0.6 }), pan: 0.25 },
  lead: { render: plucked({ gain: 0.8, decay: 0.996, ring: 0.9 }), pan: -0.25 },
  drums: { render: drums({ gain: 0.3 }), pan: 0 },
  strings: { render: additive({ harmonics: [1, 0.5, 0.33, 0.22, 0.15, 0.1, 0.07], attack: 0.7, release: 1.2, gain: 0.07 }), pan: -0.2 },
  violin: { render: additive({ harmonics: [1, 0.6, 0.4, 0.3, 0.2, 0.14, 0.1, 0.07], attack: 0.3, release: 0.6, gain: 0.12 }), pan: 0.15 },
  horn: { render: additive({ harmonics: [1, 0.45, 0.2, 0.09, 0.04], attack: 0.12, release: 0.4, gain: 0.12 }), pan: -0.1 },
  bass: { render: additive({ harmonics: [1, 0.5, 0.25, 0.12], attack: 0.2, release: 0.8, gain: 0.08 }), pan: 0 },
  harp: { render: plucked({ gain: 0.22, decay: 0.997, ring: 1.5 }), pan: 0.3 },
  timpani: { render: timpani({ gain: 0.3 }), pan: 0 },
};

export function renderPreview(piece, { sampleRate = 44100, tailSec = 2, normalize: autoGain = true } = {}) {
  const secondsPerBeat = 60 / piece.bpm;
  const end = Math.max(...piece.tracks.flatMap((track) => track.notes.map((n) => n.start + n.dur)));
  const length = Math.ceil((end * secondsPerBeat + tailSec) * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const track of piece.tracks) {
    const voice = voices[track.voice];
    if (!voice) throw new Error(`Unknown preview voice '${track.voice}' on track '${track.name}'`);
    const dry = new Float32Array(length);
    for (const note of track.notes) {
      const startSample = Math.round(note.start * secondsPerBeat * sampleRate);
      voice.render(dry.subarray(startSample), sampleRate, midiToHz(note.pitch), note.dur * secondsPerBeat, note.vel, note.pitch);
    }
    const leftGain = Math.cos(((voice.pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((voice.pan + 1) * Math.PI) / 4);
    for (let i = 0; i < length; i++) {
      left[i] += dry[i] * leftGain;
      right[i] += dry[i] * rightGain;
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const normalize = autoGain && peak > 0 ? 0.89 / peak : 1; // about -1 dBFS
  for (let i = 0; i < length; i++) {
    left[i] *= normalize;
    right[i] *= normalize;
  }
  return { sampleRate, channels: [left, right] };
}

/** 16-bit PCM WAV. */
export function encodeWav({ sampleRate, channels }) {
  const frames = channels[0].length;
  const blockAlign = channels.length * 2;
  const buffer = Buffer.alloc(44 + frames * blockAlign);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + frames * blockAlign, 4);
  buffer.write("WAVEfmt ", 8, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(frames * blockAlign, 40);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (const channel of channels) {
      const value = Math.max(-1, Math.min(1, channel[i]));
      buffer.writeInt16LE(Math.round(value * 32767), offset);
      offset += 2;
    }
  }
  return buffer;
}
