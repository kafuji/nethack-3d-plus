// Keep index.ts as this file's only import: it must load as the entry module.
import { expect, it } from "vitest";
import { isGameTextTranslationAvailable } from "./index";

it("loads without a circular import reaching it before it has initialized", () => {
  expect(typeof isGameTextTranslationAvailable()).toBe("boolean");
});
