import { describe, expect, it } from "vitest";
import { keepsEnglishRun, presentGameMessage } from "./message-presentation";
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

describe("assembled source messages", () => {
  it.each([
    ["Kaablamm!  You hear an explosion in the distance!", "ちゅどーん！遠くで爆発音が聞こえた！"],
    ["The flute toots.", "フルートはプーと鳴った。"],
    ["You see a drawbridge coming up!", "跳ね橋が上がってくるのが見えた！"],
    ["A dagger falls from the tree!", "短剣が木から落ちてきた！"],
  ])("translates %s", (english, japanese) => {
    expect(presentGameMessage(english, "ja").text).toBe(japanese);
  });

  it("prefers a later rule when an earlier one leaves English behind", () => {
    // The generic "X misses" rule would read "Somehow, the jackal" as a monster.
    expect(presentGameMessage("Somehow, the jackal misses wildly.", "ja").text)
      .toBe("どういうわけか、ジャッカルの攻撃は大きくはずれた。");
    expect(presentGameMessage("You hit your head on the ceiling.", "ja").text)
      .toBe("あなたは天井に頭をぶつけた。");
  });
});

describe("menu rows", () => {
  it("uses message translations for non-item menu rows", () => {
    expect(translateMenuItemText("All types", "ja")).toBe("すべての種類");
    expect(translateMenuItemText("Items of unknown Bless/Curse status", "ja")).toBe("祝福・呪いの状態が不明な物");
  });
});
