import { afterEach, describe, expect, it } from "vitest";
import { getActiveGlyphCatalogVersion, getGlyphCatalogEntriesForVersion, setActiveGlyphCatalog } from "../../glyphs/registry";
import type { NethackRuntimeVersion } from "../../../runtime/types";
import { isWizardOfYendorGlyph, WizardPresenceTracker } from "./wizard-presence";

async function wizardGlyphs(version: NethackRuntimeVersion) {
  await setActiveGlyphCatalog(version);
  const entries = await getGlyphCatalogEntriesForVersion(version);
  return entries.filter((entry) => isWizardOfYendorGlyph(entry.glyph));
}

describe("isWizardOfYendorGlyph", () => {
  afterEach(async () => {
    await setActiveGlyphCatalog("3.6.7");
  });

  it("finds him seen, tame, sensed and ridden in NetHack 3.6.7", async () => {
    const found = await wizardGlyphs("3.6.7");
    expect(found.map((entry) => entry.kind)).toEqual(["mon", "pet", "detect", "ridden"]);
    expect(new Set(found.map((entry) => entry.asciiChar))).toEqual(new Set(["@"]));
    // The monster just before him (Croesus or a quest leader) is not him.
    expect(isWizardOfYendorGlyph(found[0].glyph - 1)).toBe(false);
  });

  it("finds the same in NetHack 5, whose glyph numbers differ", async () => {
    const found = await wizardGlyphs("5.0");
    expect(getActiveGlyphCatalogVersion()).toBe("5.0");
    expect(new Set(found.map((entry) => entry.kind))).toEqual(new Set(["mon", "pet", "detect", "ridden"]));
    expect(new Set(found.map((entry) => entry.asciiChar))).toEqual(new Set(["@"]));
  });

  it("never matches in SLASH'EM or for non-glyphs", async () => {
    expect(await wizardGlyphs("slashem")).toEqual([]);
    await setActiveGlyphCatalog("3.6.7");
    expect(isWizardOfYendorGlyph(undefined)).toBe(false);
    expect(isWizardOfYendorGlyph(-1)).toBe(false);
  });
});

describe("WizardPresenceTracker", () => {
  const tracker = () => new WizardPresenceTracker((glyph) => glyph === 7);

  it("is present while any cell shows him, including his double", () => {
    const presence = tracker();
    expect(presence.update({ x: 1, y: 1, glyph: 7 })).toBe(true);
    expect(presence.update({ x: 5, y: 2, glyph: 7 })).toBe(false);
    expect(presence.update({ x: 1, y: 1, glyph: 0 })).toBe(false);
    expect(presence.present).toBe(true);
    expect(presence.update({ x: 5, y: 2, glyph: 0 })).toBe(true);
    expect(presence.present).toBe(false);
  });

  it("forgets him when the level changes", () => {
    const presence = tracker();
    presence.update({ x: 1, y: 1, glyph: 7 });
    expect(presence.clear()).toBe(true);
    expect(presence.present).toBe(false);
    expect(presence.clear()).toBe(false);
  });

  it("ignores tiles without a position", () => {
    const presence = tracker();
    expect(presence.update({ glyph: 7 })).toBe(false);
    expect(presence.update(null)).toBe(false);
  });
});
