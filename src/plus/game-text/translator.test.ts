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

describe("features and monster fights", () => {
  it.each([
    ["There is a doorway here.", "ここには出入口がある．"],
    ["There is a staircase up out of the dungeon here.", "ここにはダンジョンの外への上り階段がある．"],
    ["There is a staircase down to the Gnomish Mines here.", "ここにはノームの鉱山への下り階段がある．"],
    ["The little dog bites the jackal.", "仔犬はジャッカルに噛みついた．"],
  ])("translates %s", (english, japanese) => {
    expect(translator.translate(english)).toBe(japanese);
  });
  it("translates status line locations", () => {
    expect(translator.translateLocation("Dungeons of Doom 3")).toBe("運命の大迷宮 3");
  });
});

describe("status line", () => {
  it("translates the player title and status words", () => {
    expect(translator.translatePlayerTitle("Tester the Plunderess")).toBe("Tester 盗賊");
    expect(translator.translateStatusWord("Hungry")).toBe("ぺこぺこ");
  });
});

describe("quest texts", () => {
  it("translates the legacy intro window", () => {
    const lines = [
      "It is written in the Book of Odin:",
      "",
      "    After the Creation, the cruel god Moloch rebelled",
      "    against the authority of Marduk the Creator.",
      "    Moloch stole from Marduk the most powerful of all",
      "    the artifacts of the gods, the Amulet of Yendor,",
      "    and he hid it in the dark cavities of Gehennom, the",
      "    Under World, where he now lurks, and bides his time.",
      "",
      "Your god Odin seeks to possess the Amulet, and with it",
      "to gain deserved ascendance over the other gods.",
      "",
      "You, a newly trained Stripling, have been heralded",
      "from birth as the instrument of Odin.  You are destined",
      "to recover the Amulet for your deity, or die in the",
      "attempt.  Your hour of destiny has come.  For the sake",
      "of us all:  Go bravely with Odin!",
    ];
    const result = translator.translateWindow(lines).join("\n");
    expect(result).toContain("これは，オーディンの書に述べられているものである．");
    expect(result).toContain("見習い");
  });
});

describe("end of game disclosure", () => {
  it("translates attribute and question lines", () => {
    expect(translator.translate("You were confused.")).toBe("あなたは混乱状態であった．");
    expect(translator.translate("You are poison resistant.")).toBe("あなたは毒への耐性をもっている．");
    expect(translator.translate("Do you want your possessions identified?")).toBe("持ち物を識別しますか？");
  });
});

describe("frequent runtime messages", () => {
  it.each([
    ["What do you want to eat? [fg or ?*]", "どれを食べますか？[fg or ?*]"],
    ["Hello, Tester!  Welcome to Asidonhopo's general store!", "「こんにちはTester！Asidonhopoの雑貨屋にようこそ！」"],
    ["You have a little trouble lifting a boulder.", "岩を持ったら少しふらついた．"],
    ["You finish eating the food ration.", "あなたは食料を食べ終えた．"],
    ["This door is locked.", "この扉には鍵が掛かっている．"],
    ["Your kitten eats a fox corpse.", "小猫は狐の死体を食べた．"],
  ])("translates %s", (english, japanese) => {
    expect(translator.translate(english)).toBe(japanese);
  });
});

describe("end-of-game disclosure and message tables", () => {
  it.each([
    ["You were a Rhizotomist, a level 1 male human Healer.", "あなたはレベル1の男性の人間の治療師の薬草採集者であった．"],
    ["You had all 13 hit points.", "あなたは13ヒットポイント(最大:13)をもっていた．"],
    ["You were guarded.", "あなたは護られていた．"],
    ["You weren't hungry.", "あなたは空腹でない状態であった．"],
    ["You used no wishes.", "あなたは願い事をしなかった．"],
    ["Your limbs are getting oozy.", "手足が溶けはじめた．"],
  ])("translates %s", (english, japanese) => {
    expect(translator.translate(english)).toBe(japanese);
  });
});
