/**
 * Short synthesized musical cues played over (or instead of) the background
 * music. Kept in D minor so they sit with the procedural fallback score.
 */
export type MusicStinger = "game-over" | "region-enter";

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function note(
  ctx: BaseAudioContext,
  out: AudioNode,
  midi: number,
  t0: number,
  duration: number,
  peak: number,
  type: OscillatorType = "triangle",
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = midiToHz(midi);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.03);
  gain.gain.setValueAtTime(peak, t0 + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Schedules the stinger on `ctx`; returns its length in seconds. */
export function playMusicStinger(
  ctx: BaseAudioContext,
  destination: AudioNode,
  kind: MusicStinger,
  volume: number,
): number {
  const out = ctx.createGain();
  out.gain.value = Math.max(0, Math.min(1, volume)) * 0.5;
  out.connect(destination);
  const t0 = ctx.currentTime + 0.05;
  let length: number;
  if (kind === "game-over") {
    // Descending minor line over a sustained low D: a short lament.
    note(ctx, out, 38, t0, 3.6, 0.22, "sine");
    note(ctx, out, 50, t0, 3.4, 0.08, "sawtooth");
    [74, 72, 70, 69, 65, 62].forEach((midi, i) => note(ctx, out, midi, t0 + i * 0.42, 0.9, 0.16));
    length = 3.8;
  } else {
    // Rising open fifths: a small fanfare for entering a new branch.
    [[50, 57], [53, 60], [57, 64]].forEach((chord, i) => {
      for (const midi of chord) note(ctx, out, midi + 12, t0 + i * 0.22, 0.7, 0.09);
    });
    length = 1.2;
  }
  setTimeout(() => out.disconnect(), Math.ceil((length + 0.3) * 1000));
  return length;
}
