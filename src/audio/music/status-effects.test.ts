import { describe, expect, it } from "vitest";
import { neutralMusicEffectProfile, resolveMusicEffectProfile } from "./status-effects";

describe("resolveMusicEffectProfile", () => {
  it("is neutral without effects", () => {
    expect(resolveMusicEffectProfile([])).toEqual(neutralMusicEffectProfile);
  });

  it("makes confusion wander in pitch and pan", () => {
    const profile = resolveMusicEffectProfile(["confused"]);
    expect(profile.pitchWander).toBeGreaterThan(0);
    expect(profile.panWander).toBeGreaterThan(0);
    expect(profile.distortion).toBe(0);
  });

  it("warps hallucination with vibrato, wobble and distortion", () => {
    const profile = resolveMusicEffectProfile(["hallucinating"]);
    expect(profile.vibratoDepth).toBeGreaterThan(0);
    expect(profile.wobbleDepth).toBeGreaterThan(0);
    expect(profile.distortion).toBeGreaterThan(0.3);
  });

  it("combines effects by taking the strongest value of each", () => {
    const profile = resolveMusicEffectProfile(["confused", "stunned", "deaf", "stoning"]);
    expect(profile.panWander).toBe(resolveMusicEffectProfile(["stunned"]).panWander);
    expect(profile.tremoloDepth).toBeGreaterThan(0);
    expect(profile.lowpassHz).toBe(320);
    expect(profile.level).toBeLessThan(1);
    expect(profile.rate).toBeLessThan(1);
    expect(profile.wanderInterval[0]).toBeLessThanOrEqual(0.25);
  });
});
