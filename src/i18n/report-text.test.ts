import { describe, expect, it } from "vitest";
import { translateReportLine } from "./report-text";

describe("NetHack 5 information reports", () => {
  it("translates conducts without reversing their negation or losing counts", () => {
    expect(translateReportLine("Voluntary challenges:", "ja")).toBe("自主的な挑戦：");
    expect(translateReportLine(" You have been an atheist.", "ja")).toBe(" 無神論を貫きました。");
    expect(translateReportLine(" You have never genocided any monsters.", "ja")).toBe(" モンスターの種族を抹殺したことはありません。");
    expect(translateReportLine(" You have genocided 2 types of monsters.", "ja")).toBe(" 2種類のモンスターを抹殺しました。");
    expect(translateReportLine(" You have used 2 wishes (both for artifacts).", "ja")).toBe(" 願いを2回使いました（両方はアーティファクトを願った）。");
    expect(translateReportLine(" You have not violated any of the special Sokoban rules.", "ja")).toBe(" 倉庫番の特別ルールに一度も違反していません。");
    expect(translateReportLine(" You violated the special Sokoban rules twice.", "ja")).toBe(" 倉庫番の特別ルールに2回違反しました。");
  });
  it("translates overview headings while preserving player annotations", () => {
    expect(translateReportLine("The Dungeons of Doom: levels 1 to 3", "ja")).toBe("運命の大迷宮： 1階から3階");
    expect(translateReportLine('   Level 3: "My place" <- You are here.', "ja"))
      .toBe('   3階： "My place" ← 現在地。');
    expect(translateReportLine("      Stairs down to The Gnomish Mines.", "ja"))
      .toBe("      ノームの鉱山への下り階段。");
    expect(translateReportLine("      A temple and an altar to Amaterasu Omikami, some fountains.", "ja"))
      .toBe("      寺院が1つ、祭壇（Amaterasu Omikamiに捧げられた）が1つ、泉がいくつか。");
    expect(translateReportLine(" You have never changed form.", "en")).toBe(" You have never changed form.");
  });
  it("translates overview location markers, shops and resting places", () => {
    expect(translateReportLine("   Level 3: <- You were here.", "ja")).toBe("   3階： ← ここにいました。");
    expect(translateReportLine("      A tool shop.", "ja")).toBe("      道具屋が1つ。");
    expect(translateReportLine("         you, killed by a fox.", "ja")).toBe("         あなた（キツネに殺された）。");
  });
});

describe("end of game reports", () => {
  it("translates the vanquished and genocided lists", () => {
    expect(translateReportLine("  2 gnome leaders", "ja")).toBe("  ノームの指導者 ×2");
    expect(translateReportLine("  a little dog", "ja")).toBe("  子犬");
    expect(translateReportLine("  2 dwarves", "ja")).toBe("  ドワーフ ×2");
    expect(translateReportLine("the Oracle (twice)", "ja")).toBe("神託者 ×2");
    expect(translateReportLine("Medusa", "ja")).toBe("メデューサ");
    expect(translateReportLine("Dog or other canine", "ja")).toBe("犬またはその他のイヌ科の動物");
    expect(translateReportLine(" gnomes (extinct)", "ja")).toBe(" ノーム（絶滅）");
    // A pet's or player's name is not a monster plural.
    expect(translateReportLine("  Fido", "ja")).toBe("  Fido");
  });
  it("translates hallucinated and disguised killers in the overview", () => {
    expect(translateReportLine("         you, killed by a hallucinogen-distorted werejackal.", "ja"))
      .toBe("         あなた（幻覚で歪んだウェアジャッカルに殺された）。");
    expect(translateReportLine("you, killed by a chameleon imitating a jackal.", "ja"))
      .toBe("あなた（ジャッカルに化けたカメレオンに殺された）。");
  });
  it("translates the final summary window", () => {
    expect(translateReportLine("Sayonara Kafujinho the Ronin...", "ja")).toBe("さらば、浪人のKafujinho……");
    expect(translateReportLine("You died in The Dungeons of Doom on dungeon level 2 with 1234 points,", "ja"))
      .toBe("あなたは運命の大迷宮の地下2階で死んだ（1234ポイント）、");
    expect(translateReportLine("and 1 piece of gold, after 1 move.", "ja")).toBe("1枚の金貨を持って、1歩動いた。");
    expect(translateReportLine("You were level 4 with a maximum of 40 hit points when you died.", "ja"))
      .toBe("死んだときのレベルは4、最大HPは40だった。");
    expect(translateReportLine("You and your little dog", "ja")).toBe("あなたとあなたの子犬は");
    expect(translateReportLine("escaped from the dungeon with 123 points,", "ja")).toBe("ダンジョンから脱出した（123ポイント）、");
    expect(translateReportLine("       2 rubies (worth 7000 zorkmids),", "ja")).toBe("       2個のルビー（7000ゾークミド相当）、");
    expect(translateReportLine("Kafujinho, lawful male human Samurai", "ja")).toBe("Kafujinho、秩序の男性の人間の侍");
  });
  it("translates chronicle events and leaves wishes verbatim", () => {
    expect(translateReportLine("Major events:", "ja")).toBe("主な出来事：");
    expect(translateReportLine("    1: Kafujinho the lawful human Samurai entered the dungeon", "ja"))
      .toBe("    1：秩序の人間の侍のKafujinhoがダンジョンに入った");
    expect(translateReportLine("  250: attained the rank of Ronin (level 3)", "ja")).toBe("  250：浪人の称号を得た（レベル3）");
    expect(translateReportLine("  320: entered the Gnomish Mines", "ja")).toBe("  320：ノームの鉱山に入った");
    expect(translateReportLine("  500: wished for 2 blessed scrolls of genocide", "ja")).toBe("  500：願った：2 blessed scrolls of genocide");
  });
});
