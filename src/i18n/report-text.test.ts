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
