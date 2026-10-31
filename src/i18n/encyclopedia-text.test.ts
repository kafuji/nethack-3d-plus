import { describe, expect, it } from "vitest";
import { encyclopediaHash, translateEncyclopediaEntry } from "./encyclopedia-text";

describe("encyclopedia translations", () => {
  const weapon = [
    "A weapon is a device for making your enemy change his mind.",
    "        [ The Vor Game, by Lois McMaster Bujold ]",
  ];

  it("replaces a recognized data.base entry regardless of wrapping", () => {
    expect(translateEncyclopediaEntry(weapon, "ja")).toBe(
      "武器とは、敵に考えを改めさせるための道具である。\n  ［ ロイス・マクマスター・ビジョルド『ヴォル・ゲーム』］",
    );
    expect(encyclopediaHash(["A weapon is a device", "for making your enemy change his mind.  ", "", "\t[ The Vor Game, by Lois McMaster Bujold ]"]))
      .toBe(encyclopediaHash(weapon));
    expect(translateEncyclopediaEntry(["Not invented yet."], "ja")).toBe("まだ発明されていない。");
  });

  it("leaves unknown text and English locale alone", () => {
    expect(translateEncyclopediaEntry(["Some other text."], "ja")).toBeNull();
    expect(translateEncyclopediaEntry(weapon, "en")).toBeNull();
  });
});
