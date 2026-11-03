// Renders a piece to a rough stereo WAV preview with simple built-in voices.
// The preview only has to carry melody, harmony and pacing for Suno's Cover
// feature, so the instruments are deliberately cheap approximations.

const TAU = Math.PI * 2;

const midiToHz = (pitch) => 440 * Math.pow(2, (pitch - 69) / 12);

/** Linear attack, hold, linear release (all in seconds). */
function envelope(t, attack, hold, release) {
  if (t < attack) return t / attack;
  if (t < hold) return 1;
  return Math.max(0, 1 - (t - hold) / release);
}

/** Additive voice: harmonic amplitudes, optional detuned copy and vibrato. */
function additive({ harmonics, attack, release, gain, detuneCents = 0, vibrato = 0 }) {
  return (out, sampleRate, freq, dur, vel) => {
    const length = Math.ceil((dur + release) * sampleRate);
    const copies = detuneCents ? [-detuneCents, detuneCents] : [0];
    const amp = gain * (vel / 127) / copies.length;
    const phases = copies.map(() => harmonics.map(() => Math.random() * TAU));
    for (let i = 0; i < length && i < out.length; i++) {
      const t = i / sampleRate;
      const env = envelope(t, attack, dur, release);
      if (env <= 0 && t > dur) break;
      const vib = vibrato ? 1 + vibrato * Math.sin(TAU * 5.3 * t) * Math.min(1, t / 0.4) : 1;
      let sample = 0;
      copies.forEach((cents, c) => {
        const f = freq * Math.pow(2, cents / 1200) * vib;
        harmonics.forEach((h, n) => {
          if ((n + 1) * f < sampleRate / 2) sample += h * Math.sin(TAU * (n + 1) * f * t + phases[c][n]);
        });
      });
      out[i] += sample * env * amp;
    }
  };
}

/** Karplus-Strong plucked string. */
function plucked({ gain, decay, ring }) {
  return (out, sampleRate, freq, dur, vel) => {
    const period = Math.max(2, Math.round(sampleRate / freq));
    const line = new Float32Array(period).map(() => Math.random() * 2 - 1);
    const length = Math.ceil((dur + ring) * sampleRate);
    const amp = gain * (vel / 127);
    let index = 0;
    for (let i = 0; i < length && i < out.length; i++) {
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
    const length = Math.ceil(2.5 * sampleRate);
    const amp = gain * (vel / 127);
    for (let i = 0; i < length && i < out.length; i++) {
      const t = i / sampleRate;
      const f = freq * (1 + 0.04 * Math.exp(-t * 12));
      const body = Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.5 * t) * Math.exp(-t * 3);
      const thump = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.6;
      out[i] += (body * Math.exp(-t * 1.6) + thump) * amp;
    }
  };
}

const voices = {
  strings: { render: additive({ harmonics: [1, 0.5, 0.33, 0.22, 0.15, 0.1, 0.07], attack: 0.7, release: 1.2, gain: 0.07, detuneCents: 6, vibrato: 0.002 }), pan: -0.2 },
  violin: { render: additive({ harmonics: [1, 0.6, 0.4, 0.3, 0.2, 0.14, 0.1, 0.07], attack: 0.12, release: 0.5, gain: 0.17, detuneCents: 4, vibrato: 0.004 }), pan: 0.15 },
  horn: { render: additive({ harmonics: [1, 0.45, 0.2, 0.09, 0.04], attack: 0.1, release: 0.4, gain: 0.16, vibrato: 0.002 }), pan: -0.1 },
  bass: { render: additive({ harmonics: [1, 0.5, 0.25, 0.12], attack: 0.12, release: 0.6, gain: 0.11 }), pan: 0 },
  harp: { render: plucked({ gain: 0.22, decay: 0.997, ring: 1.5 }), pan: 0.3 },
  timpani: { render: timpani({ gain: 0.3 }), pan: 0 },
};

/** Small Schroeder reverb (parallel combs into series allpasses), per channel. */
function reverb(input, sampleRate, offset) {
  const scale = sampleRate / 44100;
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round((d + offset) * scale));
  const allpasses = [225, 556].map((d) => Math.round((d + offset) * scale));
  const wet = new Float32Array(input.length);
  for (const delay of combs) {
    const buffer = new Float32Array(delay);
    let index = 0;
    let lowpass = 0;
    for (let i = 0; i < input.length; i++) {
      const value = buffer[index];
      lowpass = value * 0.7 + lowpass * 0.3;
      buffer[index] = input[i] + lowpass * 0.8;
      wet[i] += value / combs.length;
      index = (index + 1) % delay;
    }
  }
  for (const delay of allpasses) {
    const buffer = new Float32Array(delay);
    let index = 0;
    for (let i = 0; i < wet.length; i++) {
      const delayed = buffer[index];
      const value = wet[i];
      buffer[index] = value + delayed * 0.5;
      wet[i] = delayed - value * 0.5;
      index = (index + 1) % delay;
    }
  }
  return wet;
}

export function renderPreview(piece, { sampleRate = 44100, tailSec = 3, reverbMix = 0.3 } = {}) {
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
      voice.render(dry.subarray(startSample), sampleRate, midiToHz(note.pitch), note.dur * secondsPerBeat, note.vel);
    }
    const leftGain = Math.cos(((voice.pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((voice.pan + 1) * Math.PI) / 4);
    for (let i = 0; i < length; i++) {
      left[i] += dry[i] * leftGain;
      right[i] += dry[i] * rightGain;
    }
  }
  const wetLeft = reverb(left, sampleRate, 0);
  const wetRight = reverb(right, sampleRate, 23);
  let peak = 0;
  for (let i = 0; i < length; i++) {
    left[i] = left[i] * (1 - reverbMix) + wetLeft[i] * reverbMix;
    right[i] = right[i] * (1 - reverbMix) + wetRight[i] * reverbMix;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const normalize = peak > 0 ? 0.89 / peak : 1; // about -1 dBFS
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
