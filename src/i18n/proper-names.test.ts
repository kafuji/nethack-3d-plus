import { describe, expect, it } from "vitest";
import { playerMonsterName, withJapaneseProperNames, withKatakanaNames } from "./proper-names";

describe("generated proper names", () => {
  it("replaces shopkeepers wherever they appear", () => {
    expect(withJapaneseProperNames("Izchakの照明店に入った！")).toBe("イズチャクの照明店に入った！");
    expect(withJapaneseProperNames("Telloc Cyajは興味がなさそうだ。")).toBe("テロック・キャージは興味がなさそうだ。");
  });

  it("spells any orc name built from the game's syllables", () => {
    expect(withKatakanaNames("Uul-ai of Aigorog")).toBe("アイゴルオグのウウル・アイ");
    expect(withKatakanaNames("Thosaithos of Aibaneairuk")).toBe("アイベインアイルクのソスアイソス");
  });

  it("leaves other 'X of Y' names alone", () => {
    expect(withKatakanaNames("Wand of Orcus")).toBe("Wand of Orcus");
    expect(withKatakanaNames("Book of Thoth")).toBe("Book of Thoth");
  });

  it("turns an English possessive left after a name into の", () => {
    expect(withKatakanaNames("Aothog of Aothaiakh's head")).toBe("アオスアイアクのアオスオグ's head");
    expect(withJapaneseProperNames("Izchak's store")).toBe("イズチャクのstore");
  });

  it("does not touch the player's own first name outside a ghost's name", () => {
    expect(withJapaneseProperNames("Tomは強い。")).toBe("Tomは強い。");
    expect(withJapaneseProperNames("Tomの幽霊があなたに触れた！")).toBe("トムの幽霊があなたに触れた！");
  });

  it("keeps a player monster's unknown name as it is", () => {
    expect(playerMonsterName("Mike")).toBe("マイク");
    expect(playerMonsterName("Hachi")).toBe("Hachi");
  });
});
