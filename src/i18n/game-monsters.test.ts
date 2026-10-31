import { describe, expect, it } from "vitest";
import { translateMonsterName } from "./game-monsters";
import { translateGameMessage } from "./game-messages";
import { translateGamePrompt } from "./game-prompts";

describe("monster names in game text", () => {
  it("translates known unmodified names in combat and questions", () => {
    expect(translateMonsterName("The jackal", "ja")).toBe("ジャッカル");
    expect(translateGameMessage("The jackal bites!", "ja")).toBe("ジャッカルが噛みついた！");
    expect(translateGameMessage("You hit the goblin.", "ja")).toBe("ゴブリンに攻撃が命中した。");
    expect(translateGamePrompt("Really attack the goblin? [yn] (n)", "ja"))
      .toBe("ゴブリンを本当に攻撃しますか？ [yn] (n)");
  });

  it("does not drop disposition, custom names, or unknown modifiers", () => {
    expect(translateMonsterName("the peaceful goblin", "ja")).toBe("友好的なゴブリン");
    expect(translateMonsterName("the tame dog", "ja")).toBe("飼いならされた犬");
    expect(translateMonsterName("the invisible goblin", "ja")).toBe("透明なゴブリン");
    expect(translateMonsterName("your invisible dog", "ja")).toBe("あなたの透明な犬");
    for (const name of ["the goblin called Alice", "jackal", "Fido", "the hallucinated lizard", "constructor"]) {
      expect(translateMonsterName(name, "ja")).toBe(name);
    }
    expect(translateGamePrompt("Really attack the peaceful goblin? [yn] (n)", "ja"))
      .toBe("友好的なゴブリンを本当に攻撃しますか？ [yn] (n)");
    expect(translateMonsterName("The jackal", "en")).toBe("The jackal");
  });
});
