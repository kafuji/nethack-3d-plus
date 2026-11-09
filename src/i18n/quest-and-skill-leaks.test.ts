import { describe, expect, it } from "vitest";
import { presentGameMessage } from "./message-presentation";
import { translateInventoryItem } from "./inventory-text";
import { translateSkillLegendLine } from "./game-skills";
import { translateMonsterName } from "./game-monsters";
import { questLines } from "./quest-lines";

const ja = (message: string): string => presentGameMessage(message, "ja").text;

const leakedMessages: ReadonlyArray<readonly [string, string]> = [
  ["A monster appears from nowhere!", "モンスターがどこからともなく現われた！"],
  ["Monsters appear around your displaced image!", "あなたの幻影のまわりにモンスターたちが現われた！"],
  ["Your skill in long sword is limited by being basic with two weapons.", "ロングソードの技能は、二刀流が基本であるため制限されている。"],
  ["Your two weapon skill is limited by being unskilled with knife.", "二刀流の技能は、ナイフが未熟練であるため制限されている。"],
  ["Your two weapon skill was also limited by having no skill with knife.", "二刀流の技能は、ナイフが技能なしであるため同様に制限されていた。"],
  ["You can enhance skills with long sword and also with two weapons.", "ロングソードと二刀流の技能を上げられる。"],
  ["You feel aggravated at the kunoichi.", "くノ一にいらだちを覚えた。"],
  ["For some reason, the kunoichi's presence is known to you.", "なぜかくノ一の存在に気づいた。"],
  ["You learn the \"clairvoyance\" spell.", "「透視」の呪文を習得した。"],
  ["You add the \"clairvoyance\" spell to your repertoire, as 'g'.", "「透視」の呪文を習得した（'g'）。"],
  ["Your knowledge of \"sleep\" is keener.", "「睡眠」の知識が深まった。"],
  ["Lord Sato hands the Bell of Opening back to you.", "佐藤卿は開門の鐘をあなたに手渡した。"],
  ["Lord Sato tosses the Tsurugi of Muramasa back to you.", "佐藤卿は村正の剣をあなたに投げ返した。"],
  ["Lord Sato catches the tsurugi named the Tsurugi of Muramasa.", "佐藤卿は剣（名前：村正の剣）をつかまえた。"],
  ["You have a little trouble removing h - a tsurugi named the Tsurugi of Muramasa.", "h - 剣（名前：村正の剣）を取り出すのに少し苦労した。"],
  ["You have already gone as far south as possible.", "これ以上南へは進めない。"],
  ["The jackal's dagger is disintegrated!", "ジャッカルのダガーは分解された！"],
  ["You pierce the jackal's stomach wall!", "ジャッカルの胃の壁を突き破った！"],
];

describe("messages that used to stay in English", () => {
  it.each(leakedMessages)("translates %s", (english, japanese) => {
    expect(ja(english)).toBe(japanese);
  });

  it("does not take an article alone as a message argument", () => {
    expect(ja("The dagger glows blue for a moment.")).toBe("ダガーは一瞬青色に輝いた。");
  });

  it("keeps a player's label but translates an artifact's name", () => {
    expect(translateInventoryItem("a tsurugi named the Tsurugi of Muramasa", "ja")).toBe("剣（名前：村正の剣）");
    expect(translateInventoryItem("a pink potion named potion of healing", "ja")).toBe("桃色のポーション（名前：potion of healing）");
  });

  it("names a player monster by its rank", () => {
    expect(translateMonsterName("the kunoichi", "ja")).toBe("くノ一");
    expect(translateMonsterName("the unknown thing", "ja")).toBe("the unknown thing");
  });

  it("translates the #enhance legend", () => {
    expect(translateSkillLegendLine('Skills flagged by "*" may be enhanced when you\'re more experienced.', "ja"))
      .toBe("「*」の付いた技能は、もっと経験を積めば上げられる。");
    expect(translateSkillLegendLine('(Skill flagged by "#" cannot be enhanced any further.)', "ja"))
      .toBe("「#」の付いた技能は、これ以上上げられない。");
    expect(translateSkillLegendLine("Something else.", "ja")).toBe("Something else.");
  });
});

describe("quest encourage and discourage lines", () => {
  const values: Readonly<Record<string, string>> = {
    p: "Kafujinho", c: "Samurai", r: "Hatamoto", R: "Ryoshu", s: "brother", S: "son", l: "Lord Sato",
    i: "the Shogun's Castle", o: "the Tsurugi of Muramasa", n: "Ashikaga Takauji", g: "roshi", H: "the Castle of the Taro Clan",
    a: "lawful", d: "Amaterasu Omikami", D: "Amaterasu Omikami",
  };
  const pronouns: Readonly<Record<string, string>> = { h: "he", H: "He", i: "him", I: "Him", j: "his", J: "His" };
  // questpgr.c convert_line(), reduced to what these lines use.
  const fill = (text: string): string => text.replace(/%([A-Za-z])([A-Za-z]?)/g, (_token, code: string, letter: string) => {
    const value = values[code] ?? "";
    if (letter && pronouns[letter] && "dlno".includes(code)) return pronouns[letter]!;
    if (letter === "a") return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
    if (letter === "A") return `${/^[aeiou]/i.test(value) ? "An" : "A"} ${value}`;
    if (letter === "C") return value[0]!.toUpperCase() + value.slice(1);
    if (letter === "s" || letter === "S") return `${value}'s`;
    if (letter === "p" || letter === "P") return `${value}s`;
    if (letter === "t") return value.replace(/^the /i, "");
    return value + letter;
  });

  it("has no duplicate lines", () => {
    expect(new Set(questLines.map(([english]) => english)).size).toBe(questLines.length);
  });

  it.each(questLines.map(([english]) => [english]))("translates %s", (english) => {
    const line = fill(english);
    const japanese = ja(line);
    expect(japanese, line).toMatch(/^「.*」$/);
    expect(japanese.replace(/Kafujinho/g, ""), line).not.toMatch(/[A-Za-z]{2,}|%[A-Za-z]/);
  });

  it("uses the same text in the message history's brackets", () => {
    expect(ja('["You are indeed a worthy Ryoshu, but now you must be a worthy samurai."]'))
      .toBe("[「お前はまさしく領主にふさわしい。だが今こそ、侍にふさわしくあらねばならぬ。」]");
  });
});
