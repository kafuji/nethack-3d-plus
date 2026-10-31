import { describe, expect, it } from "vitest";
import { translateScoreCharacterLine, translateScoreEventLabel, translateScoreText, translateScoreTimelineMeta } from "./score-i18n";

describe("score display localization", () => {
  it("translates headings, sort labels and numbers without changing the score record", () => {
    expect(translateScoreText("Top Scores", "ja")).toBe("冒険の記録");
    expect(translateScoreText("Armor class", "ja")).toBe("アーマークラス");
    expect(translateScoreText("Turns 1,000-1,234", "ja")).toBe("ターン 1,000〜1,234");
    expect(translateScoreText("12,345 points", "ja")).toBe("12,345 点");
    expect(translateScoreText("+2 more", "ja")).toBe("ほか 2 件");
  });

  it("translates known role fields but preserves unknown or user-provided text", () => {
    expect(translateScoreCharacterLine("Rogue / Orc / Female / Chaotic", "ja"))
      .toBe("盗賊 / オーク / 女性 / 混沌");
    expect(translateScoreCharacterLine("Unknown role / Human", "ja"))
      .toBe("Unknown role / 人間");
    expect(translateScoreText("Killed by a monster named Kana", "ja"))
      .toBe("Killed by a monster named Kana");
    expect(translateScoreText("constructor", "ja")).toBe("constructor");
    expect(translateScoreText("Top Scores", "fr")).toBe("Top Scores");
    expect(translateScoreEventLabel("Enemy defeated", "ja")).toBe("敵を倒した");
    expect(translateScoreEventLabel("Wizard", "ja")).toBe("Wizard");
  });

  it("translates numeric timeline metadata without dropping unknown details", () => {
    expect(translateScoreTimelineMeta("+10 gold / purse 25", "ja")).toBe("金貨 +10 / 所持金 25");
    expect(translateScoreTimelineMeta("+1 level / level 2 / custom detail", "ja"))
      .toBe("レベル +1 / レベル 2 / custom detail");
    expect(translateScoreTimelineMeta("+10 gold / purse 25", "en")).toBe("+10 gold / purse 25");
  });
});
