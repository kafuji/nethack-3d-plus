import { expect, it } from "vitest";
import { observedMenuItems } from "./observed-menu";

it("exposes all menu rows in order with their selection index but no private identity or glyph metadata", () => {
  const rows = observedMenuItems([
    { text: "Weapons", isCategory: true, identifier: 314, glyph: 159 },
    { text: "a - a sword", accelerator: "a", menuIndex: 42, identifier: 271, glyph: 828 },
    { text: "More...", menuIndex: 87, accelerator: ">", selectionInput: "__secret__" },
  ], item => (item as { isCategory?: boolean }).isCategory !== true);
  expect(rows).toEqual([
    { index: 0, menuIndex: null, text: "Weapons", accelerator: null, isCategory: true, isSelectable: false },
    { index: 1, menuIndex: 42, text: "a - a sword", accelerator: "a", isCategory: false, isSelectable: true },
    { index: 2, menuIndex: 87, text: "More...", accelerator: ">", isCategory: false, isSelectable: true },
  ]);
});
