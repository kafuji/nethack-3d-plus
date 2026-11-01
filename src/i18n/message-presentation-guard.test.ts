import { describe, expect, it } from "vitest";
import { keepsEnglishRun } from "./message-presentation";
import { translateMenuItemText } from "./inventory-text";

describe("keepsEnglishRun", () => {
  it("flags translations that copied an English phrase", () => {
    const original = "The jackal strikes at your displaced image and misses you!";
    expect(keepsEnglishRun(original, "ジャッカルがyour displaced image and misses youに攻撃を仕掛けた！")).toBe(true);
    expect(keepsEnglishRun(original, "ジャッカルはあなたの幻影を攻撃し、はずした！")).toBe(false);
  });

  it("allows short names and option syntax", () => {
    expect(keepsEnglishRun("Hello Agent, welcome!", "こんにちは、Agent！")).toBe(false);
  });
});

describe("menu rows", () => {
  it("uses message translations for non-item menu rows", () => {
    expect(translateMenuItemText("All types", "ja")).toBe("すべての種類");
    expect(translateMenuItemText("Items of unknown Bless/Curse status", "ja")).toBe("祝福・呪いの状態が不明な物");
  });
});
