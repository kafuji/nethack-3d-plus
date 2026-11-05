import { describe, expect, it } from "vitest";
import { presentGameMessage } from "../../i18n/message-presentation";
import { translateInventoryItem } from "../../i18n/inventory-text";
import { createWikiNameIndex } from "./wiki-name-source";
import { WikiNameIndex, type WikiTextSegment } from "./wiki-names";

const stub = new WikiNameIndex({
  monsters: ["giant ant", "newt", "dog", "Sting bearer"],
  items: ["arrow", "arrows", "ruby", "Sting", "long sword", "helmet", "potion of healing"],
  appearances: ["helmet", "plumed helmet", "lamp", "potion", "ring"],
  displayNames: (name) => ({ "giant ant": ["巨大アリ", "巨大蟻"], ruby: ["ルビー"], dog: ["犬"] })[name] ?? [],
});

function links(segments: readonly WikiTextSegment[]): [string, string][] {
  return segments.filter((segment) => segment.article).map((segment) => [segment.text, segment.article!]);
}

describe("wiki name recognition in English text", () => {
  it("links names with article-cased titles and keeps the whole text", () => {
    const segments = stub.segments("You kill the giant ant!", "You kill the giant ant!");
    expect(links(segments)).toEqual([["giant ant", "Giant ant"]]);
    expect(segments.map((segment) => segment.text).join("")).toBe("You kill the giant ant!");
  });

  it("links a plural to its singular article", () => {
    expect(links(stub.segments("2 arrows", "2 arrows"))).toEqual([["arrows", "Arrow"]]);
  });

  it("does not join words across punctuation", () => {
    expect(links(stub.segments("A giant, ant", "A giant, ant"))).toEqual([]);
  });

  it("matches a capitalized name only exactly", () => {
    expect(links(stub.segments("The bee stings!", "The bee stings!"))).toEqual([]);
    expect(links(stub.segments("You wield Sting.", "You wield Sting."))).toEqual([["Sting", "Sting"]]);
    expect(links(stub.segments("Newt bites!", "Newt bites!"))).toEqual([["Newt", "Newt"]]);
  });

  it("handles possessives", () => {
    expect(links(stub.segments("The newt's bite", "The newt's bite"))).toEqual([["newt", "Newt"]]);
  });
});

describe("unidentified items stay spoiler-free", () => {
  it("links only the visible class of an appearance", () => {
    expect(links(stub.segments("a ruby ring", "a ruby ring"))).toEqual([["ring", "Ring"]]);
    expect(links(stub.segments("a pink potion", "a pink potion"))).toEqual([["potion", "Potion"]]);
    expect(links(stub.segments("a scroll labeled ZELGO MER", "a scroll labeled ZELGO MER"))).toEqual([["scroll", "Scroll"]]);
  });

  it("still links the identified forms", () => {
    expect(links(stub.segments("a ruby", "a ruby"))).toEqual([["ruby", "Ruby"]]);
    expect(links(stub.segments("a potion of healing", "a potion of healing"))).toEqual([["potion of healing", "Potion of healing"]]);
  });

  it("does not link appearances, which can reveal the item", () => {
    expect(links(stub.segments("a plumed helmet", "a plumed helmet"))).toEqual([]);
    expect(links(stub.segments("a helmet", "a helmet"))).toEqual([]);
    expect(links(stub.segments("a lamp", "a lamp"))).toEqual([]);
  });
});

describe("locating names in translated text", () => {
  it("accepts any spelling of a name", () => {
    expect(links(stub.segments("You kill the giant ant!", "巨大蟻を倒した！"))).toEqual([["巨大蟻", "Giant ant"]]);
    expect(links(stub.segments("You kill the giant ant!", "巨大アリを倒した！"))).toEqual([["巨大アリ", "Giant ant"]]);
  });

  it("links nothing the original text did not name", () => {
    expect(links(stub.segments("You feel lonely.", "犬がいなくて寂しい。"))).toEqual([]);
  });

  it("leaves the sentence plain when the translation hides the name", () => {
    const segments = stub.segments("You kill the giant ant!", "敵を倒した！");
    expect(segments).toEqual([{ text: "敵を倒した！" }]);
  });

  it("links every occurrence", () => {
    expect(links(stub.segments("The dog bites the dog.", "犬が犬を噛んだ。"))).toEqual([["犬", "Dog"], ["犬", "Dog"]]);
  });
});

describe("the game's dictionaries", () => {
  const index = createWikiNameIndex();

  it("finds a monster in a presented Japanese message", () => {
    const message = "You kill the newt!";
    const { text } = presentGameMessage(message, "ja");
    expect(links(index.segments(message, text))).toEqual([["イモリ", "Newt"]]);
  });

  it("finds a monster inside an item name", () => {
    const item = "a newt corpse";
    expect(links(index.segments(item, translateInventoryItem(item, "ja"))).map(([, article]) => article)).toContain("Newt");
  });

  it("links an identified item in inventory text", () => {
    const item = "an uncursed potion of healing";
    expect(links(index.segments(item, translateInventoryItem(item, "ja")))).toEqual([["回復のポーション", "Potion of healing"]]);
  });

  it("links a randomized potion only to its class", () => {
    const item = "a ruby potion";
    expect(links(index.segments(item, translateInventoryItem(item, "ja")))).toEqual([["ポーション", "Potion"]]);
  });

  it("does not link a randomized armor appearance", () => {
    const item = "a pair of combat boots";
    expect(links(index.segments(item, item))).toEqual([]);
  });

  it("works on untranslated English text", () => {
    const message = "You see here a long sword.";
    expect(links(index.segments(message, message))).toEqual([["long sword", "Long sword"]]);
  });
});
