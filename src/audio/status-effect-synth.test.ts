import { describe, expect, it } from "vitest";
import {
  Nh3dStatusSoundTracker,
  resolveNh3dSynthSoundKeyFromPath,
} from "./status-effect-synth";
import {
  nh3dSoundEffectDefinitions,
  resolveNh3dBundledBuiltinSoundPath,
  resolveNh3dMessageLogSoundEffectKeys,
} from "./sound-pack-storage";

const snap = (hunger: string, conditionMask: number, time: number) => ({
  hunger,
  conditionMask,
  time,
});

describe("Nh3dStatusSoundTracker", () => {
  it("primes on first snapshot and on a new game without playing", () => {
    const t = new Nh3dStatusSoundTracker();
    expect(t.update(snap("Hungry", 0x20, 500), "3.6.7")).toBeNull();
    expect(t.update(snap("Not Hungry", 0, 1), "3.6.7")).toBeNull();
  });

  it("plays hunger escalation and recovery", () => {
    const t = new Nh3dStatusSoundTracker();
    t.update(snap("Not Hungry", 0, 100), "3.6.7");
    expect(t.update(snap("Hungry", 0, 101), "3.6.7")).toBe("status-hungry");
    expect(t.update(snap("Weak", 0, 102), "3.6.7")).toBe("status-weak");
    expect(t.update(snap("Fainting", 0, 103), "3.6.7")).toBe("status-fainting");
    expect(t.update(snap("Fainting", 0, 104), "3.6.7")).toBeNull();
    expect(t.update(snap("Not Hungry", 0, 105), "3.6.7")).toBe("status-recovered");
  });

  it("maps condition bits per runtime and prioritizes danger", () => {
    const t = new Nh3dStatusSoundTracker();
    t.update(snap("Not Hungry", 0, 100), "5.0");
    // 5.0: blind (0x2) + stoning (0x100000) at once -> stoning wins
    expect(t.update(snap("Not Hungry", 0x100002, 101), "5.0")).toBe("status-stoning");
    expect(t.update(snap("Not Hungry", 0x2, 102), "5.0")).toBe("status-recovered");
    const s = new Nh3dStatusSoundTracker();
    s.update(snap("Not Hungry", 0, 100), "slashem");
    expect(s.update(snap("Not Hungry", 0x40, 101), "slashem")).toBe("status-hallucinating");
  });
});

describe("status sound registration", () => {
  it("registers every synth key as a builtin synth path", () => {
    const keys = nh3dSoundEffectDefinitions.map((d) => d.key).filter((k) => k.startsWith("status-"));
    expect(keys.length).toBe(14);
    for (const key of keys) {
      expect(resolveNh3dSynthSoundKeyFromPath(resolveNh3dBundledBuiltinSoundPath(key))).toBe(key);
    }
  });

  it("detects poison messages", () => {
    expect(resolveNh3dMessageLogSoundEffectKeys("The dart was poisoned!")).toContain("status-poisoned");
    expect(resolveNh3dMessageLogSoundEffectKeys("Ecch - that must have been poisonous!")).toContain("status-poisoned");
    expect(resolveNh3dMessageLogSoundEffectKeys("The poison doesn't seem to affect you.")).not.toContain("status-poisoned");
  });
});
