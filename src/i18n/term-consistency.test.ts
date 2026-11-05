import { describe, expect, it } from "vitest";
import { translateInventoryItem, translateMenuItemText } from "./inventory-text";
import { translateSpellName } from "./game-skills";
import { GameTextTranslator, type GameTextData } from "../plus/game-text/translator";
import { curatedNames } from "../plus/game-text/curated-names";
import data from "../plus/game-text/data/jnethack.generated.json";

describe("itemized billing menu", () => {
  it.each([
    ["267 Zm, an expensive camera", "267 ゾークミド：高級カメラ"],
    [" 40 Zm, a tin opener", " 40 ゾークミド：缶切り"],
    ["100 Zm, an unpaid sack and its contents", "100 ゾークミド：未払いの袋とその中身"],
    [" 50 Zm, the contents of your bag of holding", " 50 ゾークミド：あなたの保持の袋の中身"],
    ["Used up items:", "使用済みの品："],
  ])("translates %s", (english, japanese) => {
    expect(translateMenuItemText(english, "ja")).toBe(japanese);
  });
});

describe("spell, spellbook and wand names agree", () => {
  it.each([
    ["force bolt", "衝撃"], ["magic missile", "魔法の矢"], ["cone of cold", "冷気の円錐"],
    ["stone to flesh", "石の肉化"], ["detect unseen", "不可視探知"], ["flame sphere", "炎の球"],
  ])("names %s and its spellbook alike", (spell, japanese) => {
    expect(translateSpellName(spell, "ja")).toBe(japanese);
    expect(translateInventoryItem(`spellbook of ${spell}`, "ja")).toBe(`${japanese}の魔法書`);
  });

  it("names the magic missile and striking wands after the spells", () => {
    expect(translateInventoryItem("wand of magic missile", "ja")).toBe("魔法の矢の杖");
    expect(translateInventoryItem("wand of striking", "ja")).toBe("衝撃の杖");
  });
});

describe("JNetHack tier uses the curated names and terms", () => {
  const translator = new GameTextTranslator(data as unknown as GameTextData, curatedNames);

  it.each([
    ["a - a bag of holding", "a - 保持の袋"],
    ["b - an uncursed wand of striking (0:5)", "b - 呪われていない衝撃の杖(0:5)"],
    ["d - a ruby potion", "d - ルビー色のポーション"],
    ["j - a spellbook of force bolt", "j - 衝撃の魔法書"],
  ])("names %s", (english, japanese) => {
    expect(translator.translateItemText(english)).toBe(japanese);
  });

  it.each([
    ["The jackal teleports.", "テレポート"],
    ["You feel an unseen monster!", "モンスター"],
    ["Ulch!  That potion smells terrible!", "ポーション"],
    ["You drop your gloves!", "手袋"],
    ["You undergo a freakish metamorphosis.", "変化"],
    ["There is a teleportation trap here.", "テレポートの罠"],
  ])("words %s with the curated term", (english, term) => {
    expect(translator.translate(english)).toContain(term);
  });
});
