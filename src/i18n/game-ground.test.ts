import { describe, expect, it } from "vitest";
import { translateGroundObject } from "./game-ground";

describe("ground description presentation", () => {
  it("translates visible features without inventing hidden information", () => {
    expect(translateGroundObject("a doorway", "ja")).toBe("戸口");
    expect(translateGroundObject("an open door", "ja")).toBe("開いたドア");
    expect(translateGroundObject("a staircase down", "ja")).toBe("下り階段");
    expect(translateGroundObject("a staircase down to level 3", "ja")).toBe("3階へ下りる階段");
    expect(translateGroundObject("a fountain named Hachi", "ja")).toBe("a fountain named Hachi");
    expect(translateGroundObject("a doorway", "en")).toBe("a doorway");
  });
  it("also handles visible items and preserves unidentified appearance", () => {
    expect(translateGroundObject("a goblin corpse", "ja")).toBe("ゴブリンの死体");
    expect(translateGroundObject("a pink potion", "ja")).toBe("桃色のポーション");
    expect(translateGroundObject("a strange item", "ja")).toBe("a strange item");
  });
});
