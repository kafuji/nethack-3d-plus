import { expect, it } from "vitest";
import { ObservedStatus } from "./observed-status";

it("does not expose status before receiving it in the current session", () => {
  const status = new ObservedStatus();
  expect(status.hasStatus("a")).toBe(false);
  status.observe({ type: "status_update", field: 1, value: "10" }, "a");
  expect(status.hasStatus("a")).toBe(true);
  expect(status.hasStatus("b")).toBe(false);
  status.observe({ type: "automation_scope_sync" }, "b");
  expect(status.hasStatus("b")).toBe(false);
  status.observe({ type: "status_update", field: 1, value: "12" }, "b");
  expect(status.hasStatus("b")).toBe(true);
});
