import { describe, expect, it } from "vitest";
import { resolveNh3dMessageLogSoundEffectKeys, resolveNh3dBundledBuiltinSoundPath } from "./sound-pack-storage";
import { nh3dSynthSoundKeys, playNh3dSynthSound } from "./status-effect-synth";

describe("event sound triggers", () => {
  it.each([
    ["The gas spore explodes!", "explosion"],
    ["The bolt of fire hits the jackal!", "zap-ray"],
    ["The magic missile bounces!", "zap-ray"],
    ["You wrest one last charge from the worn-out wand.", "wand-fizzle"],
    ["The bottle crashes on the jackal's head and breaks into shards.", "potion-shatter"],
    ["As you read the scroll, it disappears.", "scroll-read"],
    ["A trap door opens up under you!", "trap-triggered"],
    ["An arrow shoots out at you!", "trap-triggered"],
    ["You feel a wrenching sensation.", "teleport"],
    ["You begin praying to Odin.", "prayer"],
    ["\"Hello, Agent!  Welcome to Asidonhopo's general store!\"", "shop-bell"],
  ])("%s -> %s", (message, key) => {
    expect(resolveNh3dMessageLogSoundEffectKeys(message)).toContain(key);
  });

  it("does not fire on unrelated messages", () => {
    for (const message of ["You hit the jackal!", "You see here a scroll labeled FOO.", "The door opens."]) {
      const keys = resolveNh3dMessageLogSoundEffectKeys(message);
      for (const key of ["explosion", "zap-ray", "potion-shatter", "scroll-read", "trap-triggered", "teleport", "shop-bell"]) {
        expect(keys).not.toContain(key);
      }
    }
  });

  it("maps every synth key to a builtin synth source", () => {
    for (const key of nh3dSynthSoundKeys) {
      expect(resolveNh3dBundledBuiltinSoundPath(key)).toBe(`synth:${key}`);
    }
  });

  it("synthesizes every event voice on an offline context", () => {
    if (typeof OfflineAudioContext === "undefined") return; // node test env
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    for (const key of nh3dSynthSoundKeys) {
      expect(playNh3dSynthSound(ctx, key, 0.5)).toBeGreaterThan(0);
    }
  });
});
