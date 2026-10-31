import type { NethackRuntimeVersion } from "../runtime/types";

/**
 * Procedurally synthesized status-effect sounds (no audio assets required).
 * Each key is exposed to the sound-pack system as a builtin "synth:<key>"
 * source, so packs can still override it with a user file.
 */
export const nh3dSynthSoundKeys = [
  "status-hungry",
  "status-weak",
  "status-fainting",
  "status-confused",
  "status-stunned",
  "status-blind",
  "status-hallucinating",
  "status-poisoned",
  "status-sick",
  "status-stoning",
  "status-slimed",
  "status-strangled",
  "status-paralyzed",
  "status-recovered",
  // Event sounds (NetHack 3D Plus) for keys upstream left without assets.
  "explosion",
  "zap-ray",
  "wand-fizzle",
  "potion-shatter",
  "scroll-read",
  "trap-triggered",
  "teleport",
  "prayer",
  "shop-bell",
] as const;

export type Nh3dSynthSoundKey = (typeof nh3dSynthSoundKeys)[number];

export const nh3dSynthSoundPathPrefix = "synth:";

export function isNh3dSynthSoundPath(path: unknown): boolean {
  return typeof path === "string" && path.startsWith(nh3dSynthSoundPathPrefix);
}

export function resolveNh3dSynthSoundKeyFromPath(
  path: unknown,
): Nh3dSynthSoundKey | null {
  if (!isNh3dSynthSoundPath(path)) return null;
  const key = String(path).slice(nh3dSynthSoundPathPrefix.length);
  return (nh3dSynthSoundKeys as readonly string[]).includes(key)
    ? (key as Nh3dSynthSoundKey)
    : null;
}

// ---------------------------------------------------------------------------
// Status -> sound key resolution
// ---------------------------------------------------------------------------

type ConditionSoundKey = Exclude<
  Nh3dSynthSoundKey,
  | "status-hungry"
  | "status-weak"
  | "status-fainting"
  | "status-poisoned"
  | "status-recovered"
>;

const conditionSoundMasks367: ReadonlyArray<[number, ConditionSoundKey]> = [
  [0x00000001, "status-stoning"],
  [0x00000002, "status-slimed"],
  [0x00000004, "status-strangled"],
  [0x00000008, "status-sick"],
  [0x00000010, "status-sick"],
  [0x00000020, "status-blind"],
  [0x00000080, "status-stunned"],
  [0x00000100, "status-confused"],
  [0x00000200, "status-hallucinating"],
];

const conditionSoundMasks5: ReadonlyArray<[number, ConditionSoundKey]> = [
  [0x00000002, "status-blind"],
  [0x00000008, "status-confused"],
  [0x00000080, "status-sick"],
  [0x00000400, "status-hallucinating"],
  [0x00008000, "status-paralyzed"],
  [0x00020000, "status-paralyzed"],
  [0x00040000, "status-slimed"],
  [0x00100000, "status-stoning"],
  [0x00200000, "status-strangled"],
  [0x00400000, "status-stunned"],
  [0x01000000, "status-sick"],
  [0x08000000, "status-paralyzed"],
];

const conditionSoundMasksSlashEm: ReadonlyArray<[number, ConditionSoundKey]> = [
  [0x00000002, "status-confused"],
  [0x00000004, "status-sick"],
  [0x00000008, "status-sick"],
  [0x00000010, "status-blind"],
  [0x00000020, "status-stunned"],
  [0x00000040, "status-hallucinating"],
  [0x00000080, "status-slimed"],
];

function resolveConditionSoundMasks(
  runtimeVersion: NethackRuntimeVersion,
): ReadonlyArray<[number, ConditionSoundKey]> {
  return runtimeVersion === "5.0"
    ? conditionSoundMasks5
    : runtimeVersion === "slashem"
      ? conditionSoundMasksSlashEm
      : conditionSoundMasks367;
}

/** Most urgent first; only the top new status is voiced per status update. */
const statusSoundPriority: readonly Nh3dSynthSoundKey[] = [
  "status-stoning",
  "status-slimed",
  "status-strangled",
  "status-sick",
  "status-paralyzed",
  "status-fainting",
  "status-weak",
  "status-blind",
  "status-hallucinating",
  "status-stunned",
  "status-confused",
  "status-hungry",
];

function hungerSeverityRank(hunger: unknown): number {
  const value = String(hunger ?? "").trim().toLowerCase();
  if (value === "hungry") return 1;
  if (value === "weak") return 2;
  if (value === "fainting" || value === "fainted" || value === "starved") return 3;
  return 0;
}

const hungerSoundByRank: Record<number, Nh3dSynthSoundKey> = {
  1: "status-hungry",
  2: "status-weak",
  3: "status-fainting",
};

export type Nh3dStatusSoundSnapshot = {
  hunger: unknown;
  conditionMask: unknown;
  time: unknown;
};

/**
 * Tracks hunger / condition transitions and decides which status sound (if
 * any) should play. The first snapshot (and any new game) only primes state.
 */
export class Nh3dStatusSoundTracker {
  private previousHungerRank: number | null = null;
  private previousMask: number = 0;
  private previousTime: number = 0;

  reset(): void {
    this.previousHungerRank = null;
    this.previousMask = 0;
    this.previousTime = 0;
  }

  update(
    snapshot: Nh3dStatusSoundSnapshot,
    runtimeVersion: NethackRuntimeVersion,
  ): Nh3dSynthSoundKey | null {
    const hungerRank = hungerSeverityRank(snapshot.hunger);
    const rawMask = snapshot.conditionMask;
    const mask =
      typeof rawMask === "number" && Number.isFinite(rawMask)
        ? Math.trunc(rawMask) >>> 0
        : 0;
    const time =
      typeof snapshot.time === "number" && Number.isFinite(snapshot.time)
        ? snapshot.time
        : 0;

    const primed = this.previousHungerRank !== null;
    const newGame = time <= 1 || time < this.previousTime;
    const previousHungerRank = this.previousHungerRank ?? 0;
    const previousMask = this.previousMask;
    this.previousHungerRank = hungerRank;
    this.previousMask = mask;
    this.previousTime = time;
    if (!primed || newGame) {
      return null;
    }

    const gained = new Set<Nh3dSynthSoundKey>();
    let recovered = false;

    if (hungerRank > previousHungerRank) {
      gained.add(hungerSoundByRank[hungerRank]);
    } else if (hungerRank < previousHungerRank && hungerRank === 0) {
      recovered = true;
    }

    const activeKeys = new Set<ConditionSoundKey>();
    const previousKeys = new Set<ConditionSoundKey>();
    for (const [bit, key] of resolveConditionSoundMasks(runtimeVersion)) {
      if (mask & bit) activeKeys.add(key);
      if (previousMask & bit) previousKeys.add(key);
    }
    for (const key of activeKeys) {
      if (!previousKeys.has(key)) gained.add(key);
    }
    for (const key of previousKeys) {
      if (!activeKeys.has(key)) recovered = true;
    }

    for (const key of statusSoundPriority) {
      if (gained.has(key)) return key;
    }
    return recovered ? "status-recovered" : null;
  }
}

// ---------------------------------------------------------------------------
// Synthesis
// ---------------------------------------------------------------------------

const noiseBufferByContext = new WeakMap<BaseAudioContext, AudioBuffer>();

function getNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBufferByContext.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBufferByContext.set(ctx, buffer);
  return buffer;
}

/** Gain node shaped as attack -> hold -> exponential release. */
function envelope(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  peak: number,
  attack: number,
  hold: number,
  release: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  g.connect(out);
  return g;
}

type ToneOptions = {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  glide?: "linear" | "exp";
  t0: number;
  peak: number;
  attack?: number;
  hold?: number;
  release: number;
  detune?: number;
};

function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions): OscillatorNode {
  const attack = o.attack ?? 0.01;
  const hold = o.hold ?? 0;
  const end = o.t0 + attack + hold + o.release;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, o.t0);
  if (o.freqEnd !== undefined) {
    if (o.glide === "linear") osc.frequency.linearRampToValueAtTime(o.freqEnd, end);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), end);
  }
  if (o.detune) osc.detune.value = o.detune;
  osc.connect(envelope(ctx, out, o.t0, o.peak, attack, hold, o.release));
  osc.start(o.t0);
  osc.stop(end + 0.05);
  return osc;
}

function noise(
  ctx: BaseAudioContext,
  t0: number,
  duration: number,
): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + duration + 0.05);
  return src;
}

function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  freq: number,
  q = 1,
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function lfo(
  ctx: BaseAudioContext,
  target: AudioParam,
  rate: number,
  depth: number,
  t0: number,
  duration: number,
  type: OscillatorType = "sine",
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g);
  g.connect(target);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
  return osc;
}

type Voice = (ctx: BaseAudioContext, out: AudioNode, t0: number) => number;

/** Stomach growl: modulated band-passed noise + low buzzing saw. */
function growl(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  center: number,
  duration: number,
  peak: number,
): void {
  const bp = filter(ctx, "bandpass", center, 5);
  lfo(ctx, bp.frequency, 5.5, center * 0.35, t0, duration);
  const am = ctx.createGain();
  am.gain.value = 0.55;
  lfo(ctx, am.gain, 11, 0.45, t0, duration, "triangle");
  noise(ctx, t0, duration).connect(bp);
  bp.connect(am);
  am.connect(envelope(ctx, out, t0, peak * 2.2, 0.12, duration * 0.45, duration * 0.4));

  const lp = filter(ctx, "lowpass", 320, 2);
  lp.connect(out);
  const saw = tone(ctx, lp, {
    type: "sawtooth",
    freq: center * 0.42,
    freqEnd: center * 0.3,
    t0,
    peak: peak * 0.5,
    attack: 0.1,
    hold: duration * 0.4,
    release: duration * 0.45,
  });
  lfo(ctx, saw.frequency, 7, 6, t0, duration);
}

const voices = {
  "status-hungry": (ctx, out, t0) => {
    growl(ctx, out, t0, 190, 0.9, 0.5);
    return 1.0;
  },

  "status-weak": (ctx, out, t0) => {
    growl(ctx, out, t0, 130, 1.2, 0.55);
    tone(ctx, out, {
      type: "triangle",
      freq: 392,
      freqEnd: 165,
      t0: t0 + 0.25,
      peak: 0.12,
      attack: 0.05,
      hold: 0.2,
      release: 0.75,
    });
    return 1.3;
  },

  "status-fainting": (ctx, out, t0) => {
    // Slowing, fading heartbeat.
    const beats = [0, 0.2, 0.85, 1.07, 1.9, 2.15];
    beats.forEach((offset, i) => {
      const fade = 1 - Math.floor(i / 2) * 0.32;
      const strong = i % 2 === 0;
      tone(ctx, out, {
        freq: strong ? 95 : 80,
        freqEnd: 40,
        t0: t0 + offset,
        peak: (strong ? 0.85 : 0.6) * fade,
        attack: 0.008,
        release: 0.22,
      });
    });
    const lp = filter(ctx, "lowpass", 900);
    lp.frequency.setValueAtTime(900, t0);
    lp.frequency.exponentialRampToValueAtTime(150, t0 + 2.4);
    noise(ctx, t0, 2.5).connect(lp);
    lp.connect(envelope(ctx, out, t0, 0.08, 0.6, 0.8, 1.0));
    return 2.5;
  },

  "status-confused": (ctx, out, t0) => {
    // Detuned, wandering wobble.
    for (const detune of [-18, 22]) {
      const osc = tone(ctx, out, {
        type: "triangle",
        freq: 440,
        t0,
        peak: 0.2,
        attack: 0.06,
        hold: 0.6,
        release: 0.45,
        detune,
      });
      osc.frequency.linearRampToValueAtTime(560, t0 + 0.35);
      osc.frequency.linearRampToValueAtTime(330, t0 + 0.75);
      osc.frequency.linearRampToValueAtTime(410, t0 + 1.1);
      lfo(ctx, osc.frequency, 4.5, 28, t0, 1.1);
    }
    return 1.2;
  },

  "status-stunned": (ctx, out, t0) => {
    // Impact thud, then ringing ears.
    tone(ctx, out, { freq: 140, freqEnd: 38, t0, peak: 0.9, attack: 0.004, release: 0.28 });
    const lp = filter(ctx, "lowpass", 1200);
    noise(ctx, t0, 0.2).connect(lp);
    lp.connect(envelope(ctx, out, t0, 0.5, 0.003, 0, 0.16));
    for (const freq of [3150, 3158]) {
      const ring = tone(ctx, out, {
        freq,
        t0: t0 + 0.08,
        peak: 0.1,
        attack: 0.15,
        hold: 0.35,
        release: 0.9,
      });
      ring.frequency.linearRampToValueAtTime(freq * 0.97, t0 + 1.5);
    }
    return 1.55;
  },

  "status-blind": (ctx, out, t0) => {
    // Light closing off: closing low-pass sweep + falling tone.
    const lp = filter(ctx, "lowpass", 7000, 6);
    lp.frequency.setValueAtTime(7000, t0);
    lp.frequency.exponentialRampToValueAtTime(140, t0 + 0.85);
    noise(ctx, t0, 1.0).connect(lp);
    lp.connect(envelope(ctx, out, t0, 0.35, 0.03, 0.55, 0.35));
    tone(ctx, out, {
      freq: 660,
      freqEnd: 82,
      t0,
      peak: 0.22,
      attack: 0.02,
      hold: 0.3,
      release: 0.6,
    });
    tone(ctx, out, { freq: 70, freqEnd: 45, t0: t0 + 0.75, peak: 0.5, attack: 0.01, release: 0.4 });
    return 1.2;
  },

  "status-hallucinating": (ctx, out, t0) => {
    // Psychedelic FM arpeggio.
    const scale = [523, 622, 698, 784, 932, 1047, 1245];
    for (let i = 0; i < 9; i += 1) {
      const start = t0 + i * 0.09;
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const carrier = tone(ctx, out, {
        freq,
        freqEnd: freq * (Math.random() < 0.5 ? 0.75 : 1.35),
        t0: start,
        peak: 0.2,
        attack: 0.01,
        hold: 0.03,
        release: 0.4,
      });
      const mod = ctx.createOscillator();
      mod.frequency.value = freq * 1.5;
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(freq * 2, start);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.05, start + 0.4);
      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      mod.start(start);
      mod.stop(start + 0.5);
      lfo(ctx, carrier.detune, 7, 60, start, 0.45);
    }
    return 1.35;
  },

  "status-poisoned": (ctx, out, t0) => {
    // Sickly bubbling + minor-second sting.
    for (let i = 0; i < 9; i += 1) {
      const start = t0 + Math.random() * 0.6;
      const base = 220 + Math.random() * 260;
      tone(ctx, out, {
        freq: base,
        freqEnd: base * 2.4,
        t0: start,
        peak: 0.16,
        attack: 0.005,
        release: 0.07,
      });
    }
    const lp = filter(ctx, "lowpass", 900, 3);
    lp.connect(out);
    tone(ctx, lp, { type: "square", freq: 233, t0, peak: 0.12, attack: 0.02, hold: 0.25, release: 0.3 });
    tone(ctx, lp, {
      type: "square",
      freq: 220,
      freqEnd: 185,
      t0: t0 + 0.3,
      peak: 0.14,
      attack: 0.02,
      hold: 0.25,
      release: 0.5,
    });
    return 1.1;
  },

  "status-sick": (ctx, out, t0) => {
    // Ominous pulsing minor-second drone.
    const lp = filter(ctx, "lowpass", 520, 4);
    const am = ctx.createGain();
    am.gain.value = 0.5;
    lfo(ctx, am.gain, 2.6, 0.5, t0, 1.5);
    lp.connect(am);
    am.connect(envelope(ctx, out, t0, 1, 0.08, 0.9, 0.5));
    for (const freq of [98, 104]) {
      tone(ctx, lp, { type: "sawtooth", freq, freqEnd: freq * 0.94, t0, peak: 0.3, attack: 0.05, hold: 0.9, release: 0.5 });
    }
    return 1.55;
  },

  "status-stoning": (ctx, out, t0) => {
    // Grinding stone, closing with a hard crack.
    const bp = filter(ctx, "bandpass", 380, 1.2);
    bp.frequency.setValueAtTime(380, t0);
    bp.frequency.linearRampToValueAtTime(160, t0 + 1.0);
    const crackle = ctx.createGain();
    crackle.gain.value = 0.5;
    lfo(ctx, crackle.gain, 23, 0.5, t0, 1.1, "square");
    noise(ctx, t0, 1.1).connect(bp);
    bp.connect(crackle);
    crackle.connect(envelope(ctx, out, t0, 0.45, 0.15, 0.6, 0.3));
    tone(ctx, out, { type: "triangle", freq: 48, freqEnd: 62, t0, peak: 0.4, attack: 0.2, hold: 0.6, release: 0.3 });
    const hp = filter(ctx, "highpass", 1800);
    noise(ctx, t0 + 1.0, 0.1).connect(hp);
    hp.connect(envelope(ctx, out, t0 + 1.0, 0.45, 0.002, 0, 0.09));
    tone(ctx, out, { freq: 180, freqEnd: 50, t0: t0 + 1.0, peak: 0.5, attack: 0.002, release: 0.25 });
    return 1.35;
  },

  "status-slimed": (ctx, out, t0) => {
    // Wet squelch.
    const bp = filter(ctx, "bandpass", 300, 7);
    bp.frequency.setValueAtTime(260, t0);
    bp.frequency.exponentialRampToValueAtTime(1300, t0 + 0.22);
    bp.frequency.exponentialRampToValueAtTime(220, t0 + 0.7);
    noise(ctx, t0, 0.8).connect(bp);
    bp.connect(envelope(ctx, out, t0, 1.4, 0.04, 0.3, 0.4));
    const glide = tone(ctx, out, { freq: 210, freqEnd: 75, t0, peak: 0.3, attack: 0.03, hold: 0.2, release: 0.5 });
    lfo(ctx, glide.frequency, 13, 25, t0, 0.75);
    return 0.85;
  },

  "status-strangled": (ctx, out, t0) => {
    // Tightening, accelerating choke.
    const bp = filter(ctx, "bandpass", 900, 9);
    bp.Q.linearRampToValueAtTime(22, t0 + 1.0);
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const trem = lfo(ctx, am.gain, 4, 0.5, t0, 1.1, "square");
    trem.frequency.linearRampToValueAtTime(15, t0 + 1.0);
    bp.connect(am);
    am.connect(envelope(ctx, out, t0, 3.6, 0.05, 0.7, 0.3));
    tone(ctx, bp, { type: "sawtooth", freq: 210, freqEnd: 320, glide: "linear", t0, peak: 0.8, attack: 0.05, hold: 0.7, release: 0.3 });
    return 1.15;
  },

  "status-paralyzed": (ctx, out, t0) => {
    // Freezing crystalline cluster + ice crack.
    const hp = filter(ctx, "highpass", 3000);
    noise(ctx, t0, 0.06).connect(hp);
    hp.connect(envelope(ctx, out, t0, 0.5, 0.002, 0, 0.05));
    [1760, 2637, 3520, 4230].forEach((freq, i) => {
      tone(ctx, out, {
        freq,
        t0: t0 + i * 0.025,
        peak: 0.09 - i * 0.012,
        attack: 0.003,
        release: 1.3 - i * 0.15,
      });
    });
    tone(ctx, out, { type: "triangle", freq: 110, t0, peak: 0.25, attack: 0.01, hold: 0.4, release: 0.6 });
    return 1.4;
  },

  "status-recovered": (ctx, out, t0) => {
    // Gentle rising chime.
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      tone(ctx, out, { type: "triangle", freq, t0: t0 + i * 0.07, peak: 0.32, attack: 0.008, release: 0.5 });
    });
    return 0.8;
  },
} as Record<Nh3dSynthSoundKey, Voice>;

// ---------------------------------------------------------------------------
// Event voices
// ---------------------------------------------------------------------------

/** Short noise burst through a filter: the basic "impact" building block. */
function burst(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  type: BiquadFilterType,
  freq: number,
  freqEnd: number,
  peak: number,
  duration: number,
  q = 1,
): void {
  const f = filter(ctx, type, freq, q);
  f.frequency.setValueAtTime(freq, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
  noise(ctx, t0, duration).connect(f);
  f.connect(envelope(ctx, out, t0, peak, 0.005, duration * 0.15, duration * 0.85));
}

const eventVoices: Record<
  Exclude<Nh3dSynthSoundKey, `status-${string}`>,
  Voice
> = {
  explosion: (ctx, out, t0) => {
    // Low boom: noise sweeping down plus a sub thump and crackle tail.
    burst(ctx, out, t0, "lowpass", 2400, 90, 1.1, 1.4, 0.8);
    tone(ctx, out, { freq: 70, freqEnd: 28, t0, peak: 0.9, attack: 0.005, hold: 0.08, release: 0.9 });
    for (let i = 0; i < 6; i += 1) {
      burst(ctx, out, t0 + 0.25 + i * 0.13 + Math.random() * 0.05, "bandpass", 1800, 900, 0.12, 0.08, 3);
    }
    return 1.6;
  },

  "zap-ray": (ctx, out, t0) => {
    // Bright rising sweep with a shimmering band of noise.
    tone(ctx, out, { type: "sawtooth", freq: 220, freqEnd: 1760, t0, peak: 0.3, attack: 0.01, hold: 0.15, release: 0.35 });
    tone(ctx, out, { type: "square", freq: 330, freqEnd: 2640, t0: t0 + 0.02, peak: 0.13, attack: 0.01, hold: 0.12, release: 0.3, detune: 9 });
    burst(ctx, out, t0, "bandpass", 3000, 6000, 0.35, 0.45, 4);
    return 0.6;
  },

  "wand-fizzle": (ctx, out, t0) => {
    // A weak spark that dies out.
    burst(ctx, out, t0, "highpass", 4000, 1500, 0.35, 0.25, 0.7);
    tone(ctx, out, { type: "triangle", freq: 660, freqEnd: 180, t0: t0 + 0.04, peak: 0.2, attack: 0.01, release: 0.3 });
    return 0.45;
  },

  "potion-shatter": (ctx, out, t0) => {
    // Glass: sharp high noise plus a few short ringing partials.
    burst(ctx, out, t0, "highpass", 5000, 2500, 0.55, 0.35, 0.9);
    [2350, 3120, 4410, 5230].forEach((freq, i) => {
      tone(ctx, out, { type: "sine", freq, t0: t0 + i * 0.015, peak: 0.08, attack: 0.002, release: 0.25 + i * 0.05 });
    });
    burst(ctx, out, t0 + 0.12, "bandpass", 1200, 600, 0.12, 0.3, 2);
    return 0.65;
  },

  "scroll-read": (ctx, out, t0) => {
    // Paper rustle followed by a soft magical shimmer.
    burst(ctx, out, t0, "bandpass", 2600, 1800, 0.35, 0.3, 1.5);
    burst(ctx, out, t0 + 0.18, "bandpass", 3200, 2200, 0.25, 0.22, 1.5);
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      tone(ctx, out, { type: "triangle", freq, t0: t0 + 0.35 + i * 0.06, peak: 0.18, attack: 0.02, release: 0.6 });
    });
    return 1.1;
  },

  "trap-triggered": (ctx, out, t0) => {
    // Mechanical click, then a low "clunk".
    burst(ctx, out, t0, "highpass", 6000, 3000, 0.5, 0.04, 1);
    burst(ctx, out, t0 + 0.07, "bandpass", 900, 500, 0.35, 0.06, 4);
    tone(ctx, out, { type: "square", freq: 140, freqEnd: 70, t0: t0 + 0.12, peak: 0.18, attack: 0.003, release: 0.18 });
    return 0.4;
  },

  teleport: (ctx, out, t0) => {
    // Warbling upward glide that dissolves into noise.
    const osc = tone(ctx, out, { type: "sine", freq: 300, freqEnd: 2400, t0, peak: 0.22, attack: 0.05, hold: 0.25, release: 0.45 });
    lfo(ctx, osc.frequency, 16, 120, t0, 0.75);
    burst(ctx, out, t0 + 0.3, "highpass", 2000, 8000, 0.15, 0.5, 0.7);
    return 0.9;
  },

  prayer: (ctx, out, t0) => {
    // Slow "choir" chord: detuned triangle pads swelling in and out.
    for (const freq of [261.63, 329.63, 392.0, 523.25]) {
      for (const detune of [-6, 6]) {
        tone(ctx, out, { type: "triangle", freq, t0, peak: 0.06, attack: 0.6, hold: 0.8, release: 1.2, detune });
      }
    }
    return 2.7;
  },

  "shop-bell": (ctx, out, t0) => {
    // Small door bell: two inharmonic strikes.
    for (const [offset, base] of [[0, 1568], [0.16, 1318.5]] as const) {
      [1, 2.76, 5.4].forEach((ratio, i) => {
        tone(ctx, out, { type: "sine", freq: base * ratio, t0: t0 + offset, peak: 0.16 / (i + 1), attack: 0.002, release: 0.9 - i * 0.2 });
      });
    }
    return 1.2;
  },
};
Object.assign(voices, eventVoices);

/** Schedule a synthesized status sound on the given context; returns duration (s). */
export function playNh3dSynthSound(
  ctx: BaseAudioContext,
  key: Nh3dSynthSoundKey,
  volume: number,
  destination: AudioNode = ctx.destination,
): number {
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume)) * 0.7;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 12;
  master.connect(limiter);
  limiter.connect(destination);
  const t0 = ctx.currentTime + 0.02;
  const duration = voices[key](ctx, master, t0);
  const cleanupMs = Math.ceil((duration + 0.3) * 1000);
  setTimeout(() => {
    master.disconnect();
    limiter.disconnect();
  }, cleanupMs);
  return duration;
}

let previewContext: AudioContext | null = null;

/** Preview helper for settings UIs (uses its own lazily created context). */
export async function previewNh3dSynthSound(
  key: Nh3dSynthSoundKey,
  volume: number,
): Promise<void> {
  const globalWithWebkit = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = globalWithWebkit.AudioContext ?? globalWithWebkit.webkitAudioContext;
  if (!Ctor) throw new Error("WebAudio is not supported.");
  previewContext ??= new Ctor();
  if (previewContext.state !== "running") await previewContext.resume();
  const duration = playNh3dSynthSound(previewContext, key, volume);
  await new Promise((resolve) => setTimeout(resolve, duration * 1000));
}
