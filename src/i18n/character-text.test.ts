import { describe, expect, it } from "vitest";
import { translateCharacterBadge, translateCharacterFieldLabel, translateCharacterFieldValue, translateCharacterLine, translateCharacterSectionTitle } from "./character-text";

describe("character information presentation", () => {
  it("translates actual background and core statistics without losing values", () => {
    expect(translateCharacterLine("You are an Evoker, a level 1 male human Wizard.", "ja"))
      .toBe("あなたは召喚術師、レベル1の男性の人間の魔法使いです。");
    expect(translateCharacterLine("You are neutral, on a mission for Thoth", "ja"))
      .toBe("属性は中立で、トートの使命を受けています。");
    expect(translateCharacterLine("who is opposed by Ptah (lawful) and Anhur (chaotic).", "ja"))
      .toBe("敵対する神はプタハ（秩序）とアンフル（混沌）です。");
    expect(translateCharacterLine("You are in the Dungeons of Doom, on level 1.", "ja"))
      .toBe("現在地：運命の大迷宮 1");
    expect(translateCharacterLine("You entered the dungeon 3 turns ago.", "ja"))
      .toBe("3ターン前にダンジョンに入りました。");
    expect(translateCharacterLine("You have all 12 hit points.", "ja")).toBe("HP：12 / 12。");
    expect(translateCharacterLine("You have 3 out of 8 energy points (spell power).", "ja"))
      .toBe("魔力：3 / 8。");
    expect(translateCharacterLine("Your armor class is -2.", "ja")).toBe("アーマークラス（AC）：-2。");
    expect(translateCharacterLine("You are neutral, currently on a mission for Thoth", "ja"))
      .toBe("現在の属性は中立で、トートの使命を受けています。");
    expect(translateCharacterLine("Autopickup is on for '$' plus thrown, with exceptions.", "ja"))
      .toBe("自動拾得：オン（対象 '$'、投げた物も含む、例外あり）。");
  });

  it("translates status and skills after parsing without inventing negations", () => {
    expect(translateCharacterLine("You are right-handed.", "ja")).toBe("右利きです。");
    expect(translateCharacterLine("You aren't hungry.", "ja")).toBe("空腹ではありません。");
    expect(translateCharacterLine("Total elapsed playing time is 4 seconds.", "ja")).toBe("合計プレイ時間：4秒。");
    expect(translateCharacterLine("Total elapsed playing time is 1 minute and 3 seconds.", "ja")).toBe("合計プレイ時間：1分3秒。");
    expect(translateCharacterLine("You are unencumbered.", "ja")).toBe("荷物による負担はありません。");
    expect(translateCharacterLine("You are turning to stone.", "ja")).toBe("石化しつつあります。");
    expect(translateCharacterLine("You are wielding a quarterstaff.", "ja")).toBe("杖を手に持っています。");
    expect(translateCharacterLine("You have basic skill with quarterstaff.", "ja"))
      .toBe("杖の技能：基本。");
    expect(translateCharacterLine("You have expert skill with quarterstaff.", "ja"))
      .toBe("杖の技能：専門家。");
    expect(translateCharacterLine("You are not poison resistant.", "ja"))
      .toBe("You are not poison resistant.");
    expect(translateCharacterLine("You are fire resistant (from an unknown source).", "ja"))
      .toBe("You are fire resistant (from an unknown source).");
  });

  it("translates the indented NetHack 5 enlightenment window in the screenshot", () => {
    expect(translateCharacterSectionTitle("Kafujinho the Samurai's attributes:", "ja"))
      .toBe("Kafujinho（侍）の能力：");
    const raw = ["Status:", "  You aren't hungry.", "  You are unencumbered.",
      "  You are wielding a long sword.", "  You have basic skill with long sword.",
      "Attributes:", "  You are fervently aligned.", "  You are warded.", "  You are fast.",
      "  You can't safely pray.", "Miscellaneous:", "  Total elapsed playing time is 7 seconds."];
    expect(raw.map((line) => translateCharacterLine(line, "ja"))).toEqual([
      "状態：", "  空腹ではありません。", "  荷物による負担はありません。",
      "  長い剣を手に持っています。", "  長い剣の技能：基本。",
      "特性：", "  属性に強く忠実です。", "  装備による特殊攻撃への防護があります（MC：1）。", "  素早く動けます。",
      "  今は安全に祈ることができません。", "その他：", "  合計プレイ時間：7秒。",
    ]);
    expect(translateCharacterLine(raw.join("\n"), "ja")).toContain("\n  空腹ではありません。\n");
    expect(translateCharacterLine("  You are skilled in long sword and can enhance that.", "ja"))
      .toBe("  長い剣の技能：熟練（上達可能）。");
    expect(translateCharacterLine("  You can't safely pray.  ", "en"))
      .toBe("  You can't safely pray.  ");
    expect(translateCharacterLine("  You were warded.", "ja")).toBe("  装備による特殊攻撃への防護がありました（MC：1）。");
    expect(translateCharacterLine("  You couldn't safely pray.", "ja")).toBe("  そのときは安全に祈ることができませんでした。");
    expect(translateCharacterLine("  Total elapsed playing time was 1 hour, 2 minutes and 3 seconds.", "ja"))
      .toBe("  合計プレイ時間：1時間2分3秒。");
  });

  it("keeps player names, unknown field values and other locales unchanged", () => {
    expect(translateCharacterFieldLabel("Alignment", "ja")).toBe("属性");
    expect(translateCharacterSectionTitle("Miscellaneous", "ja")).toBe("その他");
    expect(translateCharacterSectionTitle("Overview", "ja")).toBe("概要");
    expect(translateCharacterSectionTitle("Unknown", "ja")).toBe("Unknown");
    expect(translateCharacterFieldValue("Alignment", "lawful", "ja")).toBe("秩序");
    expect(translateCharacterFieldValue("Name", "Wizard", "ja")).toBe("Wizard");
    expect(translateCharacterFieldValue("Role", "Some new role", "ja")).toBe("Some new role");
    expect(translateCharacterBadge("Current", "ja")).toBe("現在");
    expect(translateCharacterLine("You are unencumbered.", "en")).toBe("You are unencumbered.");
    expect(translateCharacterLine("constructor", "ja")).toBe("constructor");
  });
});
