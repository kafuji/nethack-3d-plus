import { describe, expect, it } from "vitest";
import { lookupImportedJapaneseMessage } from "./imported-messages";

describe("unreviewed imported message suggestions", () => {
  it("uses exact English keys and does not match substrings or prototypes", () => {
    expect(lookupImportedJapaneseMessage("It's a wall.")).toBe("壁だ。");
    expect(lookupImportedJapaneseMessage("It's a wall. More text")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("constructor")).toBeUndefined();
  });

  it("excludes known misleading, key-bearing, numerical and negation cases", () => {
    expect(lookupImportedJapaneseMessage("Do you want your possessions identified?")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("Move around with 4 2 8 6")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("Pick up items with ','")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("What pit?")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("What would you like to identify first?")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("They say that zapping yourself with a wand of undead turning is stupid.")).toBeUndefined();
    expect(lookupImportedJapaneseMessage("The boor may expect unprofitable transactions.")).toBeUndefined();
  });
});
