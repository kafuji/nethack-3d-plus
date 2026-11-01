/**
 * Status-effect coloring for the background music: confusion makes pitch and
 * pan wander, hallucination warps the sound with wobble and distortion, and
 * so on. `resolveMusicEffectProfile` is pure (tested); `MusicStatusEffectChain`
 * applies a profile to a WebAudio graph between the music and the speakers.
 */
export type MusicStatusEffect =
  | "confused"
  | "stunned"
  | "hallucinating"
  | "blind"
  | "deaf"
  | "stoning";

export type MusicEffectProfile = {
  /** Random pitch drift range around 1.0 (0 = steady). */
  pitchWander: number;
  /** Random stereo pan range (0..1). */
  panWander: number;
  /** Seconds between new random pitch/pan targets: [min, max]. */
  wanderInterval: readonly [number, number];
  /** Constant playback-rate multiplier (stoning slows the music). */
  rate: number;
  /** Vibrato depth in seconds of delay modulation, and its rate in Hz. */
  vibratoDepth: number;
  vibratoRate: number;
  /** Second, faster wobble layered on the vibrato. */
  wobbleDepth: number;
  wobbleRate: number;
  /** Distortion wet mix (0..1). */
  distortion: number;
  /** Tremolo depth (0..1) and rate (Hz). */
  tremoloDepth: number;
  tremoloRate: number;
  /** Low-pass cutoff in Hz (20000 = open). */
  lowpassHz: number;
  /** Overall level multiplier. */
  level: number;
};

export const neutralMusicEffectProfile: MusicEffectProfile = {
  pitchWander: 0,
  panWander: 0,
  wanderInterval: [1, 1],
  rate: 1,
  vibratoDepth: 0,
  vibratoRate: 0.5,
  wobbleDepth: 0,
  wobbleRate: 5,
  distortion: 0,
  tremoloDepth: 0,
  tremoloRate: 4,
  lowpassHz: 20000,
  level: 1,
};

const effectProfiles: Record<MusicStatusEffect, Partial<MusicEffectProfile>> = {
  // Irregular pitch and pan drift: the music cannot hold a straight line.
  confused: { pitchWander: 0.06, panWander: 0.75, wanderInterval: [0.35, 1.1] },
  // Reeling: wider, faster sways plus a pulsing tremolo.
  stunned: {
    pitchWander: 0.09,
    panWander: 0.9,
    wanderInterval: [0.25, 0.7],
    tremoloDepth: 0.45,
    tremoloRate: 5.5,
  },
  // Everything melts: deep slow vibrato, a faster wobble on top, distortion.
  hallucinating: {
    vibratoDepth: 0.006,
    vibratoRate: 0.7,
    wobbleDepth: 0.0018,
    wobbleRate: 6.3,
    distortion: 0.55,
    pitchWander: 0.03,
    wanderInterval: [0.8, 2],
  },
  blind: { lowpassHz: 1600 },
  // Muffled, as if heard through the body rather than the ears.
  deaf: { lowpassHz: 320, level: 0.35 },
  // The music stiffens: slower and darker as the hero turns to stone.
  stoning: { rate: 0.82, lowpassHz: 1200 },
};

/** Combine the active effects; each parameter takes the strongest value. */
export function resolveMusicEffectProfile(
  effects: Iterable<MusicStatusEffect>,
): MusicEffectProfile {
  const result: MusicEffectProfile = { ...neutralMusicEffectProfile };
  let wanderMin = Infinity;
  let wanderMax = Infinity;
  for (const effect of effects) {
    const profile = effectProfiles[effect];
    if (!profile) continue;
    result.pitchWander = Math.max(result.pitchWander, profile.pitchWander ?? 0);
    result.panWander = Math.max(result.panWander, profile.panWander ?? 0);
    if (profile.wanderInterval) {
      wanderMin = Math.min(wanderMin, profile.wanderInterval[0]);
      wanderMax = Math.min(wanderMax, profile.wanderInterval[1]);
    }
    result.rate = Math.min(result.rate, profile.rate ?? 1);
    if ((profile.vibratoDepth ?? 0) > result.vibratoDepth) {
      result.vibratoDepth = profile.vibratoDepth!;
      result.vibratoRate = profile.vibratoRate ?? result.vibratoRate;
    }
    if ((profile.wobbleDepth ?? 0) > result.wobbleDepth) {
      result.wobbleDepth = profile.wobbleDepth!;
      result.wobbleRate = profile.wobbleRate ?? result.wobbleRate;
    }
    result.distortion = Math.max(result.distortion, profile.distortion ?? 0);
    if ((profile.tremoloDepth ?? 0) > result.tremoloDepth) {
      result.tremoloDepth = profile.tremoloDepth!;
      result.tremoloRate = profile.tremoloRate ?? result.tremoloRate;
    }
    result.lowpassHz = Math.min(result.lowpassHz, profile.lowpassHz ?? 20000);
    result.level = Math.min(result.level, profile.level ?? 1);
  }
  if (Number.isFinite(wanderMin)) result.wanderInterval = [wanderMin, Math.max(wanderMin, wanderMax)];
  return result;
}

/** Soft-clipping curve for the hallucination distortion. */
function distortionCurve(drive: number, samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

const WANDER_TICK_MS = 50;
const RAMP = 0.08;

/**
 * input -> vibrato delay -> (dry + distortion) -> low-pass -> tremolo ->
 * panner -> level -> output. Pitch for file playback is driven separately
 * through `onPlaybackRate` (media element playbackRate).
 */
export class MusicStatusEffectChain {
  readonly input: GainNode;
  private readonly delay: DelayNode;
  private readonly vibratoGain: GainNode;
  private readonly wobbleGain: GainNode;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly tremolo: GainNode;
  private readonly tremoloDepth: GainNode;
  private readonly tremoloLfo: OscillatorNode;
  private readonly vibratoLfo: OscillatorNode;
  private readonly wobbleLfo: OscillatorNode;
  private readonly panner: StereoPannerNode | null;
  private readonly level: GainNode;
  private profile: MusicEffectProfile = neutralMusicEffectProfile;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextWanderAt = 0;
  private pitchTarget = 1;
  private pitchCurrent = 1;
  private panTarget = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    output: AudioNode,
    private readonly onPlaybackRate: ((rate: number) => void) | null = null,
    private readonly random: () => number = Math.random,
  ) {
    this.input = ctx.createGain();
    this.delay = ctx.createDelay(0.1);
    this.delay.delayTime.value = 0.012;
    this.vibratoLfo = ctx.createOscillator();
    this.vibratoGain = ctx.createGain();
    this.vibratoGain.gain.value = 0;
    this.vibratoLfo.connect(this.vibratoGain).connect(this.delay.delayTime);
    this.wobbleLfo = ctx.createOscillator();
    this.wobbleGain = ctx.createGain();
    this.wobbleGain.gain.value = 0;
    this.wobbleLfo.connect(this.wobbleGain).connect(this.delay.delayTime);

    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    const shaper = ctx.createWaveShaper();
    shaper.curve = distortionCurve(5);
    shaper.oversample = "2x";
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = "lowpass";
    this.lowpass.frequency.value = 20000;
    this.input.connect(this.delay);
    this.delay.connect(this.dry).connect(this.lowpass);
    this.delay.connect(shaper).connect(this.wet).connect(this.lowpass);

    this.tremolo = ctx.createGain();
    this.tremoloLfo = ctx.createOscillator();
    this.tremoloDepth = ctx.createGain();
    this.tremoloDepth.gain.value = 0;
    this.tremoloLfo.connect(this.tremoloDepth).connect(this.tremolo.gain);
    this.lowpass.connect(this.tremolo);

    this.panner = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    this.level = ctx.createGain();
    if (this.panner) this.tremolo.connect(this.panner).connect(this.level);
    else this.tremolo.connect(this.level);
    this.level.connect(output);

    const t = ctx.currentTime;
    this.vibratoLfo.start(t);
    this.wobbleLfo.start(t);
    this.tremoloLfo.start(t);
  }

  setEffects(effects: Iterable<MusicStatusEffect>): void {
    this.apply(resolveMusicEffectProfile(effects));
  }

  apply(profile: MusicEffectProfile): void {
    this.profile = profile;
    const t = this.ctx.currentTime;
    const ramp = (param: AudioParam, value: number, time = RAMP) => {
      param.cancelScheduledValues(t);
      param.setTargetAtTime(value, t, time);
    };
    this.vibratoLfo.frequency.setValueAtTime(profile.vibratoRate, t);
    this.wobbleLfo.frequency.setValueAtTime(profile.wobbleRate, t);
    this.tremoloLfo.frequency.setValueAtTime(profile.tremoloRate, t);
    ramp(this.vibratoGain.gain, profile.vibratoDepth, 0.4);
    ramp(this.wobbleGain.gain, profile.wobbleDepth, 0.4);
    ramp(this.wet.gain, profile.distortion * 0.6, 0.4);
    ramp(this.dry.gain, 1 - profile.distortion * 0.45, 0.4);
    // Tremolo oscillates the gain around (1 - depth/2) by +-depth/2.
    ramp(this.tremolo.gain, 1 - profile.tremoloDepth / 2, 0.3);
    ramp(this.tremoloDepth.gain, profile.tremoloDepth / 2, 0.3);
    ramp(this.lowpass.frequency, profile.lowpassHz, 0.5);
    ramp(this.level.gain, profile.level, 0.5);
    const wandering = profile.pitchWander > 0 || profile.panWander > 0;
    if (!wandering) {
      this.pitchTarget = 1;
      this.panTarget = 0;
      if (this.panner) ramp(this.panner.pan, 0, 0.4);
    }
    if (wandering || this.pitchCurrent !== profile.rate || this.timer !== null) this.ensureTimer();
  }

  /** One scheduler step; exposed for tests. */
  tick(nowSec: number): void {
    const p = this.profile;
    if ((p.pitchWander > 0 || p.panWander > 0) && nowSec >= this.nextWanderAt) {
      const [min, max] = p.wanderInterval;
      this.nextWanderAt = nowSec + min + this.random() * Math.max(0, max - min);
      this.pitchTarget = 1 + (this.random() * 2 - 1) * p.pitchWander;
      this.panTarget = (this.random() * 2 - 1) * p.panWander;
      if (this.panner) {
        this.panner.pan.cancelScheduledValues(nowSec);
        this.panner.pan.setTargetAtTime(this.panTarget, nowSec, (min + max) / 6);
      }
    }
    // Glide the playback rate toward its target (media elements cannot be
    // automated, so step it from the timer).
    const target = this.pitchTarget * p.rate;
    this.pitchCurrent += (target - this.pitchCurrent) * 0.18;
    if (Math.abs(target - this.pitchCurrent) < 0.0005) this.pitchCurrent = target;
    this.onPlaybackRate?.(this.pitchCurrent);
    if (p.pitchWander === 0 && p.panWander === 0 && this.pitchCurrent === p.rate) this.stopTimer();
  }

  get currentPlaybackRate(): number {
    return this.pitchCurrent;
  }

  dispose(): void {
    this.stopTimer();
    for (const osc of [this.vibratoLfo, this.wobbleLfo, this.tremoloLfo]) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    this.level.disconnect();
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(this.ctx.currentTime), WANDER_TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
