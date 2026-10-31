import { describe, expect, it } from "vitest";
import { translateStartupCharacterOption } from "./startup-character";

describe("startup character option labels", () => {
  it("translates role, race, gender and alignment without changing unknown values", () => {
    expect(translateStartupCharacterOption("Wizard", "ja")).toBe("魔法使い");
    expect(translateStartupCharacterOption("dwarf", "ja")).toBe("ドワーフ");
    expect(translateStartupCharacterOption("female", "ja")).toBe("女性");
    expect(translateStartupCharacterOption("chaotic", "ja")).toBe("混沌");
    expect(translateStartupCharacterOption("Other role", "ja")).toBe("Other role");
    expect(translateStartupCharacterOption("Wizard", "en")).toBe("Wizard");
  });
});
