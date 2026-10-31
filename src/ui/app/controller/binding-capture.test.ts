import { expect, it } from "vitest";
import { releaseInactiveCaptureBindings } from "./binding-capture";

it("allows an initially held button to be captured after release", () => {
  const blocked = new Set(["button:0", "axis:1:-"]);
  releaseInactiveCaptureBindings(blocked, ["button:0", "axis:1:-"]);
  expect(blocked.has("button:0")).toBe(true);
  releaseInactiveCaptureBindings(blocked, ["axis:1:-"]);
  expect(blocked.has("button:0")).toBe(false);
  releaseInactiveCaptureBindings(blocked, ["button:0", "axis:1:-"]);
  expect(blocked.has("button:0")).toBe(false);
  expect(blocked.has("axis:1:-")).toBe(true);
});
