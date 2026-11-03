import { expect, it } from "vitest";
import { ObservedInventory } from "./observed-inventory";

it("distinguishes unknown from an observed empty inventory and resets per session", () => {
  const state = new ObservedInventory();
  state.observe({ type: "inventory_update", items: [], snapshotAvailable: false }, "session-a");
  expect(state.snapshot()).toEqual({ available: false, revision: 0 });
  state.observe({ type: "inventory_update", items: [], snapshotAvailable: true }, "session-a");
  expect(state.snapshot()).toEqual({ available: true, revision: 1 });
  state.observe({ type: "inventory_update", items: [{ text: "a potion" }], snapshotAvailable: true }, "session-a");
  expect(state.snapshot()).toEqual({ available: true, revision: 2 });
  state.observe({ type: "automation_scope_sync" }, "session-b");
  expect(state.snapshot()).toEqual({ available: false, revision: 0 });
});
