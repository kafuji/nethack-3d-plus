import { describe, expect, it } from "vitest";
import { translateGameLocation } from "./game-location";

describe("game location presentation", () => {
  it("translates known branches while retaining the level", () => {
    expect(translateGameLocation("Dungeons of Doom 1", "ja")).toBe("運命の大迷宮 1");
    expect(translateGameLocation("The Gnomish Mines 4", "ja")).toBe("ノームの鉱山 4");
    expect(translateGameLocation("The Dungeons of Doom, level 1", "ja")).toBe("運命の大迷宮 1");
    expect(translateGameLocation("Tutorial 1", "ja")).toBe("チュートリアル 1");
    expect(translateGameLocation("Sokoban", "ja")).toBe("倉庫番");
  });

  it("leaves unknown locations and other locales unchanged", () => {
    expect(translateGameLocation("Dungeons of Doom 1", "en")).toBe("Dungeons of Doom 1");
    expect(translateGameLocation("Unknown 3", "ja")).toBe("Unknown 3");
    expect(translateGameLocation("constructor", "ja")).toBe("constructor");
  });
});
