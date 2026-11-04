import { describe, expect, it } from "vitest";
import {
  buildPlayerHeldWeaponsKey,
  classifyHeldWeaponInventoryText,
  resolvePlayerHeldWeapons,
} from "./player-held-weapon-overlay";

describe("player held weapon overlay", () => {
  it("classifies wield annotations across versions and body parts", () => {
    expect(classifyHeldWeaponInventoryText("a katana (weapon in hand)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("a two-handed sword (weapon in hands)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("a long sword (weapon in claw)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("8 daggers (wielded)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("an aklys (tethered weapon in hand)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("Sting (weapon in hand, flickering)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("a katana (weapon in right hand)")).toBe("primary");
    expect(classifyHeldWeaponInventoryText("a short sword (wielded in other hand)")).toBe("secondary");
    expect(classifyHeldWeaponInventoryText("a short sword (weapon in left hand)")).toBe("secondary");
    expect(classifyHeldWeaponInventoryText("a yumi (alternate weapon; not wielded)")).toBeNull();
    expect(classifyHeldWeaponInventoryText("34 ya (in quiver)")).toBeNull();
    expect(classifyHeldWeaponInventoryText("a pair of gauntlets (being worn)")).toBeNull();
  });

  it("resolves both hands when two-weaponing and ignores the alternate weapon", () => {
    const weapons = resolvePlayerHeldWeapons([
      { text: "Weapons", isCategory: true },
      { text: "a yumi (alternate weapon; not wielded)", tileIndex: 70, glyph: 1070 },
      { text: "a short sword (wielded in other hand)", tileIndex: 12, glyph: 1012 },
      { text: "a katana (weapon in hand)", tileIndex: 20, glyph: 1020 },
    ] as never);
    expect(weapons.primary).toEqual({ tileIndex: 20, sourceGlyph: 1020 });
    expect(weapons.secondary).toEqual({ tileIndex: 12, sourceGlyph: 1012 });
    expect(buildPlayerHeldWeaponsKey(weapons)).toBe("20:1020/12:1012");
  });

  it("produces an empty key when nothing is wielded", () => {
    const weapons = resolvePlayerHeldWeapons([
      { text: "a yumi (alternate weapon; not wielded)", tileIndex: 70 },
    ] as never);
    expect(weapons).toEqual({ primary: null, secondary: null });
    expect(buildPlayerHeldWeaponsKey(weapons)).toBe("");
  });
});
