import { describe, expect, it } from "vitest";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";

describe("inventory display translations", () => {
  it("translates recognized items while preserving the visible count, enchantment and equipment status", () => {
    expect(translateInventoryItem("a blessed +1 long sword (weapon in hand)", "ja"))
      .toBe("祝福された +1 長い剣（装備中）");
    expect(translateInventoryItem("  29 +0 arrows (in quiver)  ", "ja"))
      .toBe("  +0 矢 ×29（矢筒にセット中）  ");
    expect(translateInventoryItem("an uncursed food ration", "ja"))
      .toBe("呪われていない食料");
    expect(translateInventoryItem("2 potions of healing", "ja"))
      .toBe("回復のポーション ×2");
    expect(translateInventoryItem("a +0 orcish short sword (weapon in hand)", "ja"))
      .toBe("+0 オークの短い剣（装備中）");
    expect(translateInventoryItem("a +2 bullwhip (weapon in right hand)", "ja"))
      .toBe("+2 むち（右手に装備中）");
    expect(translateInventoryItem("an empty uncursed sack", "ja"))
      .toBe("空の呪われていない袋");
    expect(translateInventoryItem("a wand of locking (0:7)", "ja"))
      .toBe("施錠のワンド (0:7)");
    expect(translateInventoryItem("a blessed spellbook of force bolt", "ja"))
      .toBe("祝福された魔法の矢の魔法書");
  });

  it("does not identify an unknown item's randomized appearance", () => {
    expect(translateInventoryItem("a pink potion", "ja")).toBe("桃色のポーション");
    expect(translateInventoryItem("a potion of healing", "ja")).toBe("回復のポーション");
    expect(translateInventoryItem("a scroll labeled ZELGO MER", "ja"))
      .toBe("「ZELGO MER」と書かれた巻物");
    expect(translateInventoryItem("a scroll labeled NR 9", "ja"))
      .toBe("「NR 9」と書かれた巻物");
    expect(translateInventoryItem("2 pink potions", "ja"))
      .toBe("桃色のポーション ×2");
    expect(translateInventoryItem("a pink potion named potion of healing", "ja"))
      .toBe("桃色のポーション（名前：potion of healing）");
    expect(translateInventoryItem("an uncursed wooden ring", "ja"))
      .toBe("呪われていない木製の指輪");
    expect(translateInventoryItem("a hexagonal wand (0:7)", "ja"))
      .toBe("六角形のワンド (0:7)");
    expect(translateInventoryItem("a red spellbook", "ja")).toBe("赤い魔法書");
    expect(translateInventoryItem("a circular amulet", "ja")).toBe("円形のお守り");
    expect(translateInventoryItem("a runed dagger", "ja")).toBe("ルーンの刻まれた短剣");
    expect(translateInventoryItem("a blue gem", "ja")).toBe("青色の宝石");
    expect(translateInventoryItem("2 worthless pieces of blue glass", "ja"))
      .toBe("価値のない青色のガラス片 ×2");
    expect(translateInventoryItem("the Amulet of Yendor", "ja")).toBe("イェンダーの魔除け");
    expect(translateInventoryItem("a cheap plastic imitation of the Amulet of Yendor", "ja"))
      .toBe("イェンダーの魔除けの安っぽいプラスチック製の偽物");
  });

  it("preserves names, status and price while translating recognized descriptions", () => {
    expect(translateInventoryItem("a long sword named Sting", "ja")).toBe("長い剣（名前：Sting）");
    expect(translateInventoryItem("a pink potion called potion of healing", "ja"))
      .toBe("桃色のポーション（呼び名：potion of healing）");
    expect(translateInventoryItem("a long sword (unpaid, 20 zorkmids)", "ja"))
      .toBe("長い剣（未払い、20 ゾークミド）");
    expect(translateInventoryItem("a very rusty long sword", "ja")).toBe("ひどく錆びた長い剣");
    expect(translateInventoryItem("a partly eaten goblin corpse", "ja"))
      .toBe("食べかけのゴブリンの死体");
    expect(translateInventoryItem("a goblin corpse", "ja")).toBe("ゴブリンの死体");
    expect(translateInventoryItem("a newt egg", "ja")).toBe("イモリの卵");
    expect(translateInventoryItem("a goblin corpse named Hachi", "ja"))
      .toBe("ゴブリンの死体（名前：Hachi）");
    expect(translateInventoryItem("a unknown monster corpse", "ja"))
      .toBe("unknown monsterの死体");
    expect(translateInventoryItem("a tin of goblin meat", "ja")).toBe("ゴブリンの肉の缶詰");
    expect(translateInventoryItem("a tin", "ja")).toBe("缶詰");
    expect(translateInventoryItem("a statue of a goblin", "ja")).toBe("ゴブリンの石像");
    expect(translateInventoryItem("a wand of fire named 火 (0:7)", "ja"))
      .toBe("炎のワンド（名前：火） (0:7)");
    expect(translateInventoryItem("a pair of blessed +1 leather gloves (being worn)", "ja"))
      .toBe("祝福された +1 革の手袋 1組（着用中）");
    expect(translateInventoryItem("2 uncursed pairs of low boots", "ja"))
      .toBe("呪われていない短靴 2組");
  });

  it("handles NetHack 5 objects and appearance-only forms without revealing identities", () => {
    expect(translateInventoryItem("a cursed vulgar polearm", "ja")).toBe("呪われたありふれた長柄武器");
    expect(translateInventoryItem("a forked polearm", "ja")).toBe("二股の長柄武器");
    expect(translateInventoryItem("a blessed locked chest", "ja")).toBe("祝福された施錠された宝箱");
    expect(translateInventoryItem("an unblessed long sword", "ja")).toBe("祝福されていない長い剣");
    expect(translateInventoryItem("the blessed +1 Excalibur (weapon in right hand)", "ja"))
      .toBe("祝福された +1 エクスカリバー（右手に装備中）");
    expect(translateInventoryItem("a long sword named Excalibur", "ja"))
      .toBe("長い剣（名前：Excalibur）");
    expect(translateInventoryItem("The Orb of Fate", "ja")).toBe("運命の宝珠");
    expect(translateInventoryItem("a silver bell", "ja")).toBe("銀の鈴");
    expect(translateInventoryItem("the Bell of Opening", "ja")).toBe("開門の鐘");
    expect(translateInventoryItem("a potion of holy water", "ja")).toBe("聖水のポーション");
    expect(translateInventoryItem("a clear potion", "ja")).toBe("透明なポーション");
    expect(translateInventoryItem("a bubbly potion", "ja")).toBe("泡立ったポーション");
    expect(translateInventoryItem("an uncursed amulet of flying (being worn)", "ja"))
      .toBe("呪われていない飛行のお守り（着用中）");
    expect(translateInventoryItem("an amulet of guarding", "ja")).toBe("守護のお守り");
    expect(translateInventoryItem("a perforated amulet", "ja")).toBe("穴の開いたお守り");
    expect(translateInventoryItem("a cubical amulet", "ja")).toBe("立方体のお守り");
    expect(translateInventoryItem("a +0 wooden shield (being worn)", "ja"))
      .toBe("+0 木製の盾（着用中）");
    expect(translateInventoryItem("a shield of shock resistance", "ja")).toBe("電撃耐性の盾");
    expect(translateInventoryItem("a crystal helmet", "ja")).toBe("水晶の兜");
    expect(translateInventoryItem("a checkered spellbook", "ja")).toBe("格子模様の魔法書");
    expect(translateInventoryItem("a redwood wand", "ja")).toBe("セコイア材のワンド");
    expect(translateInventoryItem("a gold dragon scale mail", "ja"))
      .toBe("金色のドラゴンの鱗鎧");
    expect(translateInventoryItem("a gold dragon scales", "ja"))
      .toBe("金色のドラゴンの鱗");
  });

  it("preserves NetHack 5 equipment state and container contents", () => {
    expect(translateInventoryItem("a blessed +1 long sword (weapon in right hand)", "ja"))
      .toBe("祝福された +1 長い剣（右手に装備中）");
    expect(translateInventoryItem("an uncursed leash (attached to Spot)", "ja"))
      .toBe("呪われていないリード（Spotにつながれている）");
    expect(translateInventoryItem("an uncursed bag containing 3 items", "ja"))
      .toBe("呪われていない袋（中身：3枠）");
    expect(translateInventoryItem("a pair of gloves (being doffed)", "ja"))
      .toBe("a pair of gloves (being doffed)");
  });

  it("falls back intact when an item, inscription, status or language is not supported", () => {
    for (const text of ["a rare item", "a rare item named Sting", "a long sword (custom inscription)", "constructor"]) {
      expect(translateInventoryItem(text, "ja")).toBe(text);
    }
    expect(translateInventoryItem("a blessed long sword", "en")).toBe("a blessed long sword");
    expect(translateInventoryCategory("Weapons", "ja")).toBe("武器");
    expect(translateInventoryCategory("Weapons", "en")).toBe("Weapons");
    expect(translateInventoryCategory("Unknown section", "ja")).toBe("Unknown section");
  });
});
