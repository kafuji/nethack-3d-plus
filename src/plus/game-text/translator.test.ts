import { describe, expect, it } from "vitest";
import data from "./data/jnethack.generated.json";
import { GameTextTranslator, type GameTextData } from "./translator";

const translator = new GameTextTranslator(data as unknown as GameTextData);

describe("GameTextTranslator", () => {
  it.each([
    ["You hit the jackal!", "あなたのジャッカルへの攻撃は命中した！"],
    ["You miss the newt.", "あなたのイモリへの攻撃は外れた．"],
    ["You kill the jackal!", "あなたはジャッカルを倒した！"],
    ["The jackal bites!", "ジャッカルは噛みついた！"],
    ["The grid bug misses!", "グリッドバグの攻撃ははずれた！"],
    ["You see here a dagger.", "ここには短剣がある．"],
    ["You see no objects here.", "ここには何もない．"],
    ["f - an uncursed scroll labeled ZELGO MER.", "f - 呪われていない『へろへろっす』と書かれた巻物．"],
    ["The jackal is killed.", "ジャッカルは死んだ．"],
  ])("translates %s", (english, japanese) => {
    expect(translator.translate(english)).toBe(japanese);
  });

  it.each([
    ["a blessed +1 long sword (weapon in hand)", "祝福された+1 長剣(手に持っている)"],
    ["2 uncursed daggers", "2本の呪われていない短剣"],
    ["an uncursed potion of healing", "呪われていない回復の薬"],
    ["a ruby potion", "ルビー色の薬"],
    ["the jackal corpse", "ジャッカルの死体"],
    ["3 food rations", "3つの食料"],
    ["a wand of digging (0:5)", "穴掘りの杖(0:5)"],
  ])("translates item %s", (english, japanese) => {
    expect(translator.translateItemText(english)).toBe(japanese);
  });

  it("leaves unknown text unchanged", () => {
    expect(translator.translate("Zxqv blorp frobnicates.")).toBe("Zxqv blorp frobnicates.");
  });
});

describe("inventory headers", () => {
  it("translates class headers", () => {
    expect(translator.translateItemText("Weapons")).toBe("武器");
    expect(translator.translateItemText("Comestibles  ('%')")).toBe("食料  ('%')");
  });
});

describe("pet and unidentified gems", () => {
  it("does not repeat あなた for pets", () => {
    expect(translator.translate("You swap places with your kitten.")).toBe("あなたは小猫と場所を入れ替わった．");
  });
  it("translates a bare gem", () => {
    expect(translator.translateItemText("a gem")).toBe("宝石");
  });
});
