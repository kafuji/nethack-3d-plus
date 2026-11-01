import { describe, expect, it } from "vitest";
import { translateOracleDocument, translateRumor } from "./oracle-text";
import { translateGameMessage } from "./game-messages";
import { translateGamePrompt } from "./game-prompts";

describe("oracle and rumor text", () => {
  it("translates a major oracle window with its header", () => {
    const lines = [
      "The Oracle meditates for a moment and then intones:",
      "",
      "At times, the gods may favor worthy supplicants with named blades whose",
      "powers echo throughout legend.  Learned wayfarers can reproduce blades of",
      "elven lineage, hated of the orcs, without the need for such intervention.",
    ];
    const translated = translateOracleDocument(lines, "ja");
    expect(translated).toMatch(/^神託師はしばし瞑想し、そして詠唱した：\n\n神は立派な嘆願者に力をもたらさん。\n/);
    expect(translated).not.toMatch(/[A-Za-z]/);
    expect(translateOracleDocument(lines, "en")).toBeNull();
    expect(translateOracleDocument(["The Oracle meditates for a moment and then intones:", "", "Unknown text."], "ja")).toBeNull();
  });

  it("recognizes both the 3.6 and 5.0 wording of the Elbereth oracle", () => {
    const v5 = translateOracleDocument([
      "The name of Elbereth may strike fear into the hearts of thine enemies, if",
      "thou dost write it upon the ground at thy feet.  If thou maintainest the",
      "utmost calm, thy safety will be aided greatly, but beware lest thy clumsy",
      "feet scuff the inscription, cancelling its potence, or thy wayward",
      "sword-arm break the truce.",
    ], "ja");
    expect(v5).toContain("気まぐれな剣を振るう腕");
  });

  it("translates rumors from the Oracle, fortune cookies and engravings", () => {
    expect(translateGameMessage("\"They say that it is easier to kill the Wizard than to make him stand still.\"", "ja"))
      .toMatch(/^「.+」$/);
    expect(translateRumor("A blindfold can be very useful if you're telepathic.")).toBe("テレパシー能力があるなら目隠しが役に立つ。");
    expect(translateGameMessage("They say that healing potions often come in pairs.", "ja")).toBe("回復のポーションはしばしば二本一組で見つかるらしい。");
    expect(translateGameMessage("You read: \"Eels will help you tie your shoes.\".", "ja"))
      .toBe("「ウナギは靴ひもを結ぶのを手伝ってくれる。」と読んだ。");
  });

  it("translates shop credit and sale prompts", () => {
    expect(translateGamePrompt("Will you accept 4 zorkmids in credit for a magic whistle? [ynaq] (y)", "ja"))
      .toBe("魔法の笛の代わりに 4 ゾークミドの預け金を受け取りますか？ [ynaq] (y)");
    expect(translateGamePrompt("Asidonhopo offers only 5 gold pieces for your magic whistle.  Sell it? [ynaq] (y)", "ja"))
      .toBe("Asidonhopoは魔法の笛にたった金貨 5 枚を提示した。売りますか？ [ynaq] (y)");
  });
});
