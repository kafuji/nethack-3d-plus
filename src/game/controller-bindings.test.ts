import { describe, expect, it } from "vitest";
import { defaultNh3dControllerBindings, normalizeNh3dControllerBindings } from "./controller-bindings";

describe("controller binding normalization", () => {
  it("preserves explicitly cleared slots through repeated normalization", () => {
    const bindings = normalizeNh3dControllerBindings({ confirm: [null, null] });
    expect(bindings.confirm).toEqual([null, null]);
    expect(normalizeNh3dControllerBindings(bindings).confirm).toEqual([null, null]);
  });

  it("uses defaults for missing or malformed bindings", () => {
    const bindings = normalizeNh3dControllerBindings({ confirm: [undefined, "invalid"] });
    expect(bindings.confirm).toEqual(defaultNh3dControllerBindings.confirm);
    expect(bindings.search).toEqual(defaultNh3dControllerBindings.search);
  });
});
