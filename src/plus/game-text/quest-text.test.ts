import { describe, expect, it } from "vitest";
import { GameTextTranslator, type GameTextData } from "./translator";
import data from "./data/jnethack.generated.json";
import { questSynopses } from "./quest-synopses";

const translator = new GameTextTranslator(data as unknown as GameTextData);

// Samurai values for the quest.lua substitution codes.
const samurai: Readonly<Record<string, string>> = {
  p: "Kafujinho", c: "Samurai", r: "Hatamoto", R: "Ryoshu", s: "brother", S: "son", l: "Lord Sato", i: "the Shogun's Castle",
  o: "the Tsurugi of Muramasa", O: "the Tsurugi", n: "Ashikaga Takauji", g: "roshi", G: "god", H: "the Castle of the Taro Clan",
  a: "lawful", A: "Lawful", d: "Amaterasu Omikami", D: "Amaterasu Omikami", C: "chaotic", N: "neutral", L: "lawful", x: "see",
  Z: "The Dungeons of Doom",
};

/** Expand quest codes the way questpgr.c convert_line() does. */
function fill(text: string): string {
  const pronouns: Record<string, string> = { h: "he", H: "He", i: "him", I: "Him", j: "his", J: "His" };
  return text.replace(/%([A-Za-z])([A-Za-z]?)/g, (_token, code: string, letter: string) => {
    const value = samurai[code] ?? "";
    if (letter === "a") return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
    if (letter === "A") return `${/^[aeiou]/i.test(value) ? "An" : "A"} ${value}`;
    if (letter === "C") return value[0]!.toUpperCase() + value.slice(1);
    if (letter === "s" || letter === "S") return `${value}'s`;
    if (letter === "p" || letter === "P") return `${value}s`;
    if (letter === "t") return value.replace(/^the /i, "");
    if (letter && pronouns[letter] && "dlno".includes(code)) return pronouns[letter]!;
    return value + letter;
  });
}

describe("quest texts", () => {
  it("matches texts with lowercase code modifiers such as %Ra", () => {
    const lines = [
      "\"Kafujinho-san, you have learned well and honored your family.",
      "I require the skills of a Ryoshu in order to defeat Ashikaga Takauji.",
      "Go and seek out teachers.  Learn what they have learned.  When you",
      "are ready, return to me.\"",
    ];
    const japanese = translator.translateQuestDocument(lines)?.join("");
    expect(japanese).toContain("足利尊氏");
    expect(japanese).toContain("領主");
    expect(japanese!.replace(/Kafujinho/g, "")).not.toMatch(/[A-Za-z]{2,}/);
  });

  it("translates every JNetHack quest text for the Samurai without leftover codes", () => {
    for (const [english] of (data as unknown as GameTextData).questTexts ?? []) {
      if (english.startsWith("[")) continue;
      const japanese = translator.translateQuestDocument(fill(english).split("\n"));
      expect(japanese, english.slice(0, 60)).not.toBeNull();
      expect(japanese!.join(""), english.slice(0, 60)).not.toMatch(/%[A-Za-z]/);
    }
  });

  it("splits a pronoun code from the name before it", () => {
    const text = "As soon as Lord Sato sees the Tsurugi of Muramasa he summons his\nroshis.";
    const japanese = translator.translateQuestDocument(text.split("\n"));
    expect(japanese?.join("") ?? "").not.toMatch(/the |Tsurugi/);
  });

  it("translates the message-history synopsis of each quest text", () => {
    for (const [english] of questSynopses) {
      const line = `[${fill(english)}]`;
      const japanese = translator.translate(line);
      expect(japanese, line).toMatch(/^\[.*\]$/);
      expect(japanese.replace(/Kafujinho/g, ""), line).not.toMatch(/[A-Za-z]{2,}/);
    }
    expect(translator.translate("[\"I require a Ryoshu to defeat Ashikaga Takauji.  Return when you are ready.\"]"))
      .toBe("[「足利尊氏を倒すには領主の力が必要だ。準備ができたら戻ってこい。」]");
  });

  it("names quest artifacts and the Ranger the way the curated tables do", () => {
    const japanese = translator.translate("[You feel the power of the Longbow of Diana flowing through your hands.]");
    expect(japanese).toBe("[ディアナの長弓の力が両手に流れ込むのを感じる。]");
  });
});
