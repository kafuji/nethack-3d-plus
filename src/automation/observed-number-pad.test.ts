import { describe, expect, it } from "vitest";
import { ObservedNumberPad } from "./observed-number-pad";

describe("automation direction mode evidence", () => {
  it("trusts an explicit option for a new game, but never assumes one for a restored save", () => {
    const mode = new ObservedNumberPad();
    mode.reset("random", true);
    expect(mode.snapshot()).toEqual({ enabled: true, source: "startup-options" });
    mode.reset("create", false);
    expect(mode.snapshot()).toEqual({ enabled: false, source: "startup-options" });
    mode.reset("create", null);
    expect(mode.snapshot().enabled).toBeNull();
    mode.reset("resume", true);
    expect(mode.snapshot()).toEqual({ enabled: null, source: "unknown" });
  });

  it("does not trust callbacks before the restored player position", () => {
    const mode = new ObservedNumberPad();
    mode.reset("resume", false);
    mode.observeRuntimeCallback(true);
    expect(mode.snapshot().enabled).toBeNull();
    mode.observePosition();
    mode.observeRuntimeCallback(false);
    expect(mode.snapshot()).toEqual({ enabled: false, source: "runtime-callback" });
  });

  it("recognizes only a consumed number-pad option response", () => {
    const mode = new ObservedNumberPad();
    mode.reset("resume", null);
    mode.observeConsumedOptionAnswer(false, "1");
    mode.observeConsumedOptionAnswer(true, "Escape");
    expect(mode.snapshot().enabled).toBeNull();
    mode.observeConsumedOptionAnswer(true, "0");
    expect(mode.snapshot()).toEqual({ enabled: false, source: "answered-option" });
    mode.observeConsumedOptionAnswer(true, "2");
    expect(mode.snapshot().enabled).toBe(true);
  });

  it("invalidates an older assumption if human input changes the UI mode", () => {
    const mode = new ObservedNumberPad();
    mode.reset("random", true);
    mode.invalidateIfChanged(true);
    expect(mode.snapshot().enabled).toBe(true);
    mode.invalidateIfChanged(false);
    expect(mode.snapshot()).toEqual({ enabled: null, source: "unknown" });
    mode.invalidateIfChanged(true);
    expect(mode.snapshot().enabled).toBeNull();
  });
});
