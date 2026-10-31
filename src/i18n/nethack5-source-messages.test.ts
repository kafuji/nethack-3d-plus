import { describe, expect, it } from "vitest";
import entries from "./data/nethack5-source-ja.json";
import { translateGameMessage } from "./game-messages";
import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { translateNethack5SourceMessage } from "./nethack5-source-messages";

describe("NetHack 5 source message translations", () => {
  it("translates exact messages and fills recognized arguments", () => {
    expect(translateGameMessage("You find a hidden door.", "ja")).toBe("隠し扉を見つけた。");
    expect(translateGameMessage("The iron ball falls on your head.", "ja")).toBe("鉄球があなたの頭に落ちてきた。");
    expect(translateGameMessage("You owe Asidonhopo 23 zorkmids.", "ja")).toBe("Asidonhopoに23 ゾークミドの借りがある。");
    expect(translateGameMessage("Your leash chokes your little dog to death!", "ja")).toBe("リードであなたの子犬を絞め殺してしまった！");
    expect(translateGameMessage("Welcome back to experience level 4.", "ja")).toBe("経験レベルが4になった。");
    expect(translateGameMessage("You are already wearing a leather cloak!", "ja")).toBe("すでに革のクロークを身に着けている！");
  });

  it("keeps unknown names and rejects mixed prose", () => {
    expect(translateGameMessage("You summon Fido!", "ja")).toBe("Fidoを呼び寄せた！");
    expect(translateNethack5SourceMessage("You see a jackal lurking nearby.")).toBeUndefined();
    expect(translateGameMessage("You can't reach the bottom of the pit.", "ja")).toBe("落とし穴の底に手が届かない。");
    expect(translateGameMessage("You find a hidden door.", "en")).toBe("You find a hidden door.");
  });

  it("uses only placeholders that exist in the source format", () => {
    const conversion = /%(?:\d+\$)?[-+ #0]*\d*(?:\.\d+)?(?:ll|l|h|z)?[sdiucfoxXp]/g;
    for (const [format, translation] of Object.entries(entries as Record<string, string>)) {
      const count = (format.replace(/%%/g, "").match(conversion) ?? []).length;
      for (const [, index] of translation.matchAll(/\{(\d+)\}/g)) {
        expect(Number(index), format).toBeGreaterThanOrEqual(1);
        expect(Number(index), format).toBeLessThanOrEqual(count);
      }
      expect(translation, format).not.toBe(format);
    }
  });

  it("names every NetHack 5 monster and the remaining object names", () => {
    for (const name of ["Medusa", "Vlad the Impaler", "shimmering dragon", "vampire lord", "Wizard of Yendor"]) {
      expect(translateMonsterName(`the ${name}`, "ja")).not.toBe(`the ${name}`);
    }
    expect(translateInventoryItem("a boulder", "ja")).toBe("大岩");
    expect(translateInventoryItem("an unlabeled scroll", "ja")).toBe("ラベルのない巻物");
    expect(translateInventoryItem("a canvas spellbook", "ja")).toBe("キャンバス地の魔法書");
  });
});
