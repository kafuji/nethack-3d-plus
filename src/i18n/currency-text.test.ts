import { describe, expect, it } from "vitest";
import { presentGameMessage } from "./message-presentation";
import { translateGamePrompt } from "./game-prompts";
import { translateCurrency } from "./currency-text";

describe("currencies and shop goods", () => {
  it("names hallucinatory currencies", () => {
    expect(translateCurrency("zorkmids")).toBe("ゾークミド");
    expect(translateCurrency("kongbucks")).toBe("コングバック");
    expect(translateCurrency("constructor")).toBeUndefined();
  });
  it("translates shop goods priced in any currency", () => {
    expect(presentGameMessage("You see here a potion of sake (for sale, 75 zorkmids).", "ja").text)
      .toBe("ここには酒のポーション（売り物、75 ゾークミド）がある。");
    expect(presentGameMessage("You see here a potion of sake (for sale, 75 kongbucks).", "ja").text)
      .toBe("ここには酒のポーション（売り物、75 コングバック）がある。");
    expect(translateGamePrompt("Will you accept 4 kongbucks in credit for a magic whistle?", "ja"))
      .toBe("魔法の笛の代わりに 4 コングバックの預け金を受け取りますか？");
  });
  it("translates bottles breaking on heads", () => {
    expect(presentGameMessage("The phial crashes on your head and breaks into shards.", "ja").text)
      .toBe("小瓶があなたの頭に当たって割れ、破片になった。");
    expect(presentGameMessage("The flask crashes on the jackal's head and breaks into shards.", "ja").text)
      .toBe("フラスコがジャッカルの頭に当たって割れ、破片になった。");
  });
});
