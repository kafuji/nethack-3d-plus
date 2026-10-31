import { describe, expect, it } from "vitest";
import { translateSkillName, translateSpellName } from "./game-skills";

describe("spell and skill presentation", () => {
  it("translates known names, schools, ranks, and groups", () => {
    expect(translateSpellName("force bolt", "ja")).toBe("魔法の矢");
    expect(translateSkillName("Attack", "ja")).toBe("攻撃");
    expect(translateSkillName("Two Weapon Combat", "ja")).toBe("二刀流");
    expect(translateSkillName("Grand Master", "ja")).toBe("大達人");
    expect(translateSkillName("Weapon Skills", "ja")).toBe("武器技能");
    expect(translateSkillName("Broadsword", "ja")).toBe("幅広の剣");
    expect(translateSkillName("Current skills:", "ja")).toBe("現在の技能：");
  });
  it("retains unknown names and non-Japanese text", () => {
    expect(translateSpellName("unfamiliar spell", "ja")).toBe("unfamiliar spell");
    expect(translateSkillName("constructor", "ja")).toBe("constructor");
    expect(translateSpellName("force bolt", "en")).toBe("force bolt");
  });
});
