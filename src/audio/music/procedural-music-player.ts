import type { MusicMood } from "./music-director";

/**
 * Anything that can play mood-based background music. The procedural player
 * below is a placeholder; a file/stem based player can implement the same
 * interface later without touching the director or engine wiring.
 */
export interface BackgroundMusicPlayer {
  setMood(mood: MusicMood | null): void;
  setVolume(volume: number): void;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  dispose(): void;
}

type Chord = readonly number[]; // MIDI notes, lowest = root

type MoodScore = {
  bpm: number;
  progression: readonly Chord[];
  fadeInSec: number;
  fadeOutSec: number;
  scheduleStep: (voice: MoodVoice, step: number, time: number) => void;
};

type MoodVoice = {
  mood: MusicMood;
  bus: GainNode;
  step: number;
  nextStepTime: number;
  stopAtTime: number | null;
  rng: () => number;
  melodyNote: number;
};

const LOOKAHEAD_SEC = 0.15;
const SCHEDULER_INTERVAL_MS = 30;
const STEPS_PER_BAR = 16;

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// D minor family, everything shares the D tonic so crossfades stay in key.
const DM: Chord = [50, 53, 57]; // D F A
const BB: Chord = [46, 50, 53]; // Bb D F
const F: Chord = [53, 57, 60]; // F A C
const C: Chord = [48, 52, 55]; // C E G
const A: Chord = [45, 49, 52]; // A C# E
const EB: Chord = [51, 55, 58]; // Eb G Bb
const CSDIM: Chord = [49, 52, 55]; // C# E G
const D_DORIAN = [62, 64, 65, 67, 69, 71, 72, 74];

export class ProceduralMusicPlayer implements BackgroundMusicPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices: MoodVoice[] = [];
  private currentMood: MusicMood | null = null;
  private volume = 0.5;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private seed = 1;
  private disposed = false;
  private readonly scores: Record<MusicMood, MoodScore>;

  constructor() {
    this.scores = {
      calm: {
        bpm: 68,
        progression: [DM, BB, F, C],
        fadeInSec: 1.2,
        fadeOutSec: 1.2,
        scheduleStep: (v, s, t) => this.scheduleCalmStep(v, s, t),
      },
      combat: {
        bpm: 132,
        progression: [DM, DM, BB, A],
        fadeInSec: 0.3,
        fadeOutSec: 1,
        scheduleStep: (v, s, t) => this.scheduleCombatStep(v, s, t),
      },
      danger: {
        bpm: 150,
        progression: [DM, EB, DM, CSDIM],
        fadeInSec: 0.25,
        fadeOutSec: 1.2,
        scheduleStep: (v, s, t) => this.scheduleDangerStep(v, s, t),
      },
    };
  }

  setMood(mood: MusicMood | null): void {
    if (this.disposed || mood === this.currentMood) {
      return;
    }
    this.currentMood = mood;
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const now = context.currentTime;
    const nextScore = mood ? this.scores[mood] : null;
    for (const voice of this.voices) {
      if (voice.stopAtTime !== null) continue;
      const fadeOut = nextScore
        ? Math.min(this.scores[voice.mood].fadeOutSec, nextScore.fadeInSec * 2)
        : this.scores[voice.mood].fadeOutSec;
      voice.bus.gain.cancelScheduledValues(now);
      voice.bus.gain.setValueAtTime(voice.bus.gain.value, now);
      voice.bus.gain.linearRampToValueAtTime(0, now + fadeOut);
      voice.stopAtTime = now + fadeOut;
    }
    if (mood && nextScore) {
      const bus = context.createGain();
      bus.gain.setValueAtTime(0, now);
      bus.gain.linearRampToValueAtTime(1, now + nextScore.fadeInSec);
      bus.connect(this.master);
      if (this.reverbSend) bus.connect(this.reverbSend);
      this.seed += 1;
      this.voices.push({
        mood,
        bus,
        step: 0,
        nextStepTime: now + 0.05,
        stopAtTime: null,
        rng: createRng(this.seed * 7919),
        melodyNote: 3,
      });
    }
    this.ensureScheduler();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.resolveMasterGain(), now, 0.1);
    }
  }

  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context && context.state !== "running") {
      try {
        await context.resume();
      } catch {
        // Needs a user gesture on some platforms; retried on next gesture.
      }
    }
  }

  async suspend(): Promise<void> {
    if (this.context && this.context.state === "running") {
      try {
        await this.context.suspend();
      } catch {
        // ignore
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.voices = [];
    const context = this.context;
    this.context = null;
    this.master = null;
    this.reverbSend = null;
    if (context) void context.close().catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // Audio graph

  private resolveMasterGain(): number {
    // Perceptual curve; the synth voices are already mixed fairly quietly.
    return Math.pow(this.volume, 1.5) * 1.2;
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.context) return this.context;
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return null;
    try {
      const context = new Ctor();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 3;
      compressor.connect(context.destination);
      const master = context.createGain();
      master.gain.value = this.resolveMasterGain();
      master.connect(compressor);
      const convolver = context.createConvolver();
      convolver.buffer = this.createImpulse(context, 2.8, 2.5);
      const reverbSend = context.createGain();
      reverbSend.gain.value = 0.35;
      reverbSend.connect(convolver);
      convolver.connect(master);
      this.context = context;
      this.master = master;
      this.reverbSend = reverbSend;
      this.noiseBuffer = this.createNoise(context);
      return context;
    } catch (error) {
      console.warn("[NetHack 3D] Unable to create WebAudio context for background music.", error);
      return null;
    }
  }

  private createImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    const rng = createRng(42);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (rng() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  private createNoise(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    const rng = createRng(7);
    for (let i = 0; i < data.length; i += 1) data[i] = rng() * 2 - 1;
    return buffer;
  }

  private ensureScheduler(): void {
    if (this.schedulerTimer !== null) return;
    this.schedulerTimer = setInterval(() => this.tick(), SCHEDULER_INTERVAL_MS);
  }

  private tick(): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    this.voices = this.voices.filter((voice) => {
      if (voice.stopAtTime !== null && now >= voice.stopAtTime) {
        voice.bus.disconnect();
        return false;
      }
      return true;
    });
    if (this.voices.length === 0) {
      if (this.schedulerTimer !== null) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      return;
    }
    if (context.state !== "running") return;
    for (const voice of this.voices) {
      const score = this.scores[voice.mood];
      const stepSec = 60 / score.bpm / 4;
      // After a long stall (tab hidden), skip ahead instead of bursting notes.
      if (voice.nextStepTime < now - 0.25) voice.nextStepTime = now + 0.02;
      while (voice.nextStepTime < now + LOOKAHEAD_SEC) {
        if (voice.stopAtTime === null || voice.nextStepTime < voice.stopAtTime) {
          score.scheduleStep(voice, voice.step, voice.nextStepTime);
        }
        voice.step += 1;
        voice.nextStepTime += stepSec;
      }
    }
  }

  private chordAt(voice: MoodVoice, step: number): Chord {
    const progression = this.scores[voice.mood].progression;
    const bar = Math.floor(step / STEPS_PER_BAR) % progression.length;
    return progression[bar];
  }

  private barSec(voice: MoodVoice): number {
    return (60 / this.scores[voice.mood].bpm) * 4;
  }

  // ---------------------------------------------------------------------------
  // Instruments

  private tone(
    dest: AudioNode,
    time: number,
    note: number,
    duration: number,
    options: {
      type?: OscillatorType;
      gain?: number;
      attack?: number;
      release?: number;
      cutoff?: number;
      detune?: number;
      tremoloHz?: number;
    } = {},
  ): void {
    const context = this.context;
    if (!context) return;
    const {
      type = "triangle",
      gain = 0.1,
      attack = 0.01,
      release = 0.2,
      cutoff = 4000,
      detune = 0,
      tremoloHz = 0,
    } = options;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(midiToHz(note), time);
    osc.detune.setValueAtTime(detune, time);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, time);
    const amp = context.createGain();
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(gain, time + attack);
    amp.gain.setValueAtTime(gain, time + Math.max(attack, duration));
    amp.gain.linearRampToValueAtTime(0, time + Math.max(attack, duration) + release);
    osc.connect(filter);
    filter.connect(amp);
    let lfo: OscillatorNode | null = null;
    if (tremoloHz > 0) {
      const trem = context.createGain();
      trem.gain.value = 0.5;
      lfo = context.createOscillator();
      lfo.frequency.value = tremoloHz;
      const depth = context.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth);
      depth.connect(trem.gain);
      amp.connect(trem);
      trem.connect(dest);
      lfo.start(time);
    } else {
      amp.connect(dest);
    }
    const end = time + Math.max(attack, duration) + release + 0.05;
    osc.start(time);
    osc.stop(end);
    lfo?.stop(end);
    osc.onended = () => {
      osc.disconnect();
      amp.disconnect();
      lfo?.disconnect();
    };
  }

  private bell(dest: AudioNode, time: number, note: number, gain: number): void {
    this.tone(dest, time, note, 0.02, { type: "sine", gain, attack: 0.005, release: 2.2 });
    this.tone(dest, time, note + 19, 0.01, { type: "sine", gain: gain * 0.25, attack: 0.005, release: 0.9 });
  }

  private kick(dest: AudioNode, time: number, gain: number): void {
    const context = this.context;
    if (!context) return;
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.14);
    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    osc.connect(amp);
    amp.connect(dest);
    osc.start(time);
    osc.stop(time + 0.4);
    osc.onended = () => {
      osc.disconnect();
      amp.disconnect();
    };
  }

  private noise(
    dest: AudioNode,
    time: number,
    gain: number,
    decay: number,
    filterType: BiquadFilterType,
    frequency: number,
  ): void {
    const context = this.context;
    if (!context || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    source.start(time, Math.random() * 0.5);
    source.stop(time + decay + 0.05);
    source.onended = () => {
      source.disconnect();
      amp.disconnect();
    };
  }

  // ---------------------------------------------------------------------------
  // Scores

  /** Slow, airy exploration: pad, gentle arpeggio, sparse bell melody. */
  private scheduleCalmStep(voice: MoodVoice, step: number, time: number): void {
    const dest = voice.bus;
    const chord = this.chordAt(voice, step);
    const inBar = step % STEPS_PER_BAR;
    const bar = this.barSec(voice);
    if (inBar === 0) {
      for (const note of chord) {
        this.tone(dest, time, note + 12, bar * 0.9, {
          type: "sawtooth", gain: 0.034, attack: 1.2, release: 1.8, cutoff: 1100, detune: -6,
        });
        this.tone(dest, time, note + 12, bar * 0.9, {
          type: "sawtooth", gain: 0.034, attack: 1.2, release: 1.8, cutoff: 1100, detune: 7,
        });
      }
      this.tone(dest, time, chord[0] - 12, bar * 0.95, {
        type: "triangle", gain: 0.07, attack: 0.4, release: 1.2, cutoff: 500,
      });
    }
    if (inBar % 2 === 0 && voice.rng() < 0.8) {
      const arp = [chord[0], chord[1], chord[2], chord[0] + 12];
      const note = arp[(inBar / 2) % arp.length] + 12;
      this.tone(dest, time, note, 0.05, {
        type: "triangle", gain: 0.06, attack: 0.005, release: 0.6, cutoff: 2500,
      });
    }
    if ((inBar === 0 || inBar === 6 || inBar === 10) && voice.rng() < 0.45) {
      voice.melodyNote = Math.max(
        0,
        Math.min(D_DORIAN.length - 1, voice.melodyNote + Math.round((voice.rng() - 0.5) * 4)),
      );
      this.bell(dest, time, D_DORIAN[voice.melodyNote] + 12, 0.07);
    }
  }

  /** Driving battle loop: drums, 8th-note bass, 16th ostinato. */
  private scheduleCombatStep(voice: MoodVoice, step: number, time: number): void {
    const dest = voice.bus;
    const chord = this.chordAt(voice, step);
    const inBar = step % STEPS_PER_BAR;
    const lastBarOfCycle = Math.floor(step / STEPS_PER_BAR) % 4 === 3;
    if (inBar % 4 === 0 || (inBar === 10 && voice.rng() < 0.5)) {
      this.kick(dest, time, 0.55);
    }
    if (inBar === 4 || inBar === 12 || (lastBarOfCycle && inBar >= 13)) {
      this.noise(dest, time, 0.22, 0.16, "bandpass", 1800);
    }
    if (inBar % 2 === 1 || voice.rng() < 0.25) {
      this.noise(dest, time, inBar % 4 === 2 ? 0.06 : 0.035, 0.04, "highpass", 7000);
    }
    if (inBar % 2 === 0) {
      const octave = inBar % 8 === 6 ? 12 : 0;
      this.tone(dest, time, chord[0] - 12 + octave, 0.1, {
        type: "sawtooth", gain: 0.11, attack: 0.005, release: 0.08, cutoff: 600,
      });
    }
    const ostinato = [0, 2, 1, 2, 0, 2, 1, 3];
    const index = ostinato[inBar % ostinato.length];
    const note = index === 3 ? chord[0] + 12 : chord[index];
    this.tone(dest, time, note + 12, 0.04, {
      type: "square", gain: 0.022, attack: 0.003, release: 0.07, cutoff: 2200,
    });
    if (inBar === 0) {
      for (const n of chord) {
        this.tone(dest, time, n + 12, 0.25, {
          type: "sawtooth", gain: 0.03, attack: 0.01, release: 0.4, cutoff: 1800,
        });
      }
    }
  }

  /** Tense pinch: low drone, heartbeat, tremolo strings, stray tritone bells. */
  private scheduleDangerStep(voice: MoodVoice, step: number, time: number): void {
    const dest = voice.bus;
    const chord = this.chordAt(voice, step);
    const inBar = step % STEPS_PER_BAR;
    const bar = this.barSec(voice);
    if (inBar === 0) {
      this.tone(dest, time, 38, bar, {
        type: "sawtooth", gain: 0.07, attack: 0.3, release: 0.6, cutoff: 260,
      });
      this.tone(dest, time, 45, bar, {
        type: "sawtooth", gain: 0.04, attack: 0.3, release: 0.6, cutoff: 260, detune: 8,
      });
      for (const n of chord) {
        this.tone(dest, time, n + 24, bar * 0.95, {
          type: "sawtooth", gain: 0.018, attack: 0.25, release: 0.5, cutoff: 3200, tremoloHz: 11,
        });
      }
    }
    // Heartbeat: lub-dub twice a bar.
    if (inBar === 0 || inBar === 8) this.kick(dest, time, 0.6);
    if (inBar === 2 || inBar === 10) this.kick(dest, time, 0.35);
    if (inBar % 4 === 2 && voice.rng() < 0.6) {
      this.noise(dest, time, 0.03, 0.05, "highpass", 6000);
    }
    if ((inBar === 6 || inBar === 14) && voice.rng() < 0.35) {
      this.bell(dest, time, voice.rng() < 0.5 ? 80 : 74, 0.035); // G#5 / D5 tritone
    }
    const lastBarOfCycle = Math.floor(step / STEPS_PER_BAR) % 4 === 3;
    if (lastBarOfCycle && inBar === 8) {
      this.noise(dest, time, 0.05, bar / 2, "bandpass", 900);
    }
  }
}
