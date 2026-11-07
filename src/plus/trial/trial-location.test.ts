import { describe, expect, it } from "vitest";
import { describeTrialLocation } from "./trial-location";

const depth = (level: number) => `地下${level}階`;
const describeJa = (dlevel: number | null, dungeon?: string | null, branchLevel?: number | null) =>
  describeTrialLocation({ dlevel, dungeon, branchLevel }, depth, "ja");

describe("trial save location labels", () => {
  it("uses the depth alone in the main dungeon and for older records", () => {
    expect(describeJa(3, "Dungeons of Doom", 3)).toBe("地下3階");
    expect(describeJa(3)).toBe("地下3階");
  });

  it("names other branches, whose depth differs from their own level number", () => {
    expect(describeJa(6, "Gnomish Mines", 3)).toBe("ノームの鉱山 地下6階");
    expect(describeJa(5, "Sokoban", 4)).toBe("倉庫番 地下5階");
  });

  it("names the planes instead of giving them a depth", () => {
    expect(describeJa(-1, "Elemental Planes", 5)).toBe("地の界");
    expect(describeJa(-2, "Elemental Planes", 4)).toBe("風の界");
    expect(describeJa(-3, "Elemental Planes", 3)).toBe("火の界");
    expect(describeJa(-4, "Elemental Planes", 2)).toBe("水の界");
    expect(describeJa(-5, "Elemental Planes", 1)).toBe("アストラル界");
    expect(describeJa(-1, "Elemental Planes", null)).toBe("精霊界");
  });

  it("has nothing to show without a location", () => {
    expect(describeJa(null)).toBeNull();
  });
});
