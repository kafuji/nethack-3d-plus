import { describe, expect, it } from "vitest";
import { translateIntroStory } from "./intro-story";

function introduction(deity: string, rank: string, deityTitle = "god"): string[] {
  return [
    `It is written in the Book of ${deity}:`,
    "",
    "    After the Creation, the cruel god Moloch rebelled",
    "    against the authority of Marduk the Creator.",
    "    Moloch stole from Marduk the most powerful of all",
    "    the artifacts of the gods, the Amulet of Yendor,",
    "    and he hid it in the dark cavities of Gehennom, the",
    "    Under World, where he now lurks, and bides his time.",
    "",
    `Your ${deityTitle} ${deity} seeks to possess the Amulet, and with it`,
    "to gain deserved ascendance over the other gods.",
    "",
    `You, a newly trained ${rank}, have been heralded`,
    `from birth as the instrument of ${deity}.  You are destined`,
    "to recover the Amulet for your deity, or die in the",
    "attempt.  Your hour of destiny has come.  For the sake",
    `of us all:  Go bravely with ${deity}!`,
  ];
}

describe("NetHack introductory text", () => {
  it("translates the complete wrapped story with a goddess and rank", () => {
    const result = translateIntroStory(introduction("Amaterasu Omikami", "Hatamoto", "goddess"), "ja");
    expect(result).toContain("「天照大神の書」");
    expect(result).toContain("女神天照大神");
    expect(result).toContain("旗本であるあなた");
    expect(result).toContain("イェンダーの魔除け");
    expect(result).not.toContain("Amaterasu Omikami");
  });

  it("supports different line breaks and keeps unknown names intact", () => {
    const lines = introduction("A New God", "A New Rank").join(" ").split(" ");
    const result = translateIntroStory(lines, "ja");
    expect(result).toContain("神A New God");
    expect(result).toContain("A New Rankであるあなた");
  });

  it("does not rewrite changed stories, mismatched deities, or other locales", () => {
    const lines = introduction("Tyr", "Stripling");
    expect(translateIntroStory(lines, "en")).toBeNull();
    expect(translateIntroStory(["A different book contains a prophecy."], "ja")).toBeNull();
    expect(translateIntroStory(lines.map((line) => line.replace("instrument of Tyr", "instrument of Loki")), "ja")).toBeNull();
  });
});
