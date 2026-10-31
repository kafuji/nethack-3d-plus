import { describe, expect, it } from "vitest";
import { translateTileContextAction, translateTileContextTitle } from "./tile-context";

describe("tile context display", () => {
  it("translates known action labels while leaving routing untouched", () => {
    expect(translateTileContextAction("ascend", "quick", "Ascend (<)", "ja")).toBe("上る (<)");
    expect(translateTileContextAction("pickup", "quick", "Pick Up", "ja")).toBe("拾う");
    expect(translateTileContextAction("pickup", "debug", "Debug", "ja")).toBe("Debug");
    expect(translateTileContextAction("pickup", "quick", "Pick Up", "en")).toBe("Pick Up");
  });
  it("translates fallback and recognized look titles without guessing unknown details", () => {
    expect(translateTileContextTitle("Target: door (scanning...)", "ja")).toBe("対象: ドア（調査中...）");
    expect(translateTileContextTitle(": staircase down", "ja")).toBe(": 下り階段");
    expect(translateTileContextTitle(": a doorway", "ja")).toBe(": 戸口");
    expect(translateTileContextTitle("You see here a goblin corpse.", "ja")).toBe("ここにゴブリンの死体がある。");
    expect(translateTileContextTitle("+ - closed door", "ja")).toBe("+ - 閉じたドア");
    expect(translateTileContextTitle(": a goblin | : unknown named object", "ja")).toBe(": ゴブリン | : unknown named object");
    expect(translateTileContextTitle("Target: door", "en")).toBe("Target: door");
    expect(translateTileContextTitle(": peaceful goblin", "ja")).toBe(": peaceful goblin");
  });
  it("translates NetHack 5 glyph and item descriptions without identifying unknown items", () => {
    expect(translateTileContextTitle(") a weapon (a long sword)", "ja")).toBe(") 武器（長い剣）");
    expect(translateTileContextTitle("! a potion (a pink potion)", "ja")).toBe("! ポーション（桃色のポーション）");
    expect(translateTileContextTitle("! a potion (a pink potion named Fire)", "ja")).toBe("! ポーション（桃色のポーション（名前：Fire））");
    expect(translateTileContextTitle("! a potion (a mystery potion)", "ja")).toBe("! ポーション（a mystery potion）");
    expect(translateTileContextTitle("? an unknown category (a long sword)", "ja")).toBe("? an unknown category (a long sword)");
    expect(translateTileContextTitle("You see here a pink potion.", "ja")).toBe("ここに桃色のポーションがある。");
    expect(translateTileContextTitle(") a weapon (a long sword)", "en")).toBe(") a weapon (a long sword)");
  });
});
