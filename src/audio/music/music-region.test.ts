import { describe, expect, it } from "vitest";
import {
  MEDUSA_MIN_WATER_TILES,
  couldBeMedusaLevel,
  regionTrackPreferences,
  resolveMusicRegion,
  resolveMusicSpecialLevel,
} from "./music-region";
import { defaultMusicLibrary } from "./music-library";

describe("resolveMusicRegion", () => {
  it.each([
    ["Dungeons of Doom", "dungeon"],
    ["The Dungeons of Doom", "dungeon"],
    ["The Gnomish Mines", "mines"],
    ["Gnomish Mines", "mines"],
    ["Sokoban", "sokoban"],
    ["The Quest", "quest"],
    ["Fort Ludios", "ludios"],
    ["Gehennom", "gehennom"],
    ["Vlad's Tower", "gehennom"],
    ["The Elemental Planes", "endgame"],
    ["Astral Plane", "endgame"],
    ["", "dungeon"],
  ])("%s -> %s", (name, region) => {
    expect(resolveMusicRegion(name)).toBe(region);
  });

  it("prefers a special level over the branch name", () => {
    expect(resolveMusicRegion("The Dungeons of Doom", "medusa")).toBe("medusa");
    expect(resolveMusicRegion("The Dungeons of Doom", "castle")).toBe("castle");
    expect(resolveMusicRegion("The Dungeons of Doom", null)).toBe("dungeon");
  });

  it("gives Medusa and the Castle their own tracks", () => {
    expect(regionTrackPreferences.medusa.calm).toEqual(["medusa"]);
    expect(regionTrackPreferences.castle.calm).toEqual(["castle"]);
    expect(regionTrackPreferences.castle.combat).toEqual(["combat-boss"]);
  });

  it("only refers to bundled tracks", () => {
    const ids = new Set(Object.values(defaultMusicLibrary).flat().map((track) => track.id));
    for (const preference of Object.values(regionTrackPreferences)) {
      for (const list of Object.values(preference)) {
        for (const id of list ?? []) expect(ids.has(id)).toBe(true);
      }
    }
  });
});

describe("resolveMusicSpecialLevel", () => {
  const doom = { dnum: 0, mainDungeonLevelCount: 27 };
  const water = MEDUSA_MIN_WATER_TILES;

  it("trusts an exact special level from the runtime", () => {
    expect(resolveMusicSpecialLevel({ dnum: 0, dlevel: 21, specialLevel: "medusa" })).toBe("medusa");
    expect(resolveMusicSpecialLevel({ dnum: 0, dlevel: 25, specialLevel: "castle" })).toBe("castle");
  });

  it("finds the Castle at the bottom of the Dungeons of Doom", () => {
    expect(resolveMusicSpecialLevel({ ...doom, dlevel: 27 })).toBe("castle");
    expect(resolveMusicSpecialLevel({ ...doom, dlevel: 26 })).toBeNull();
    // Gehennom's first level is not the Castle even with the same dlevel.
    expect(resolveMusicSpecialLevel({ ...doom, dnum: 1, dlevel: 27 })).toBeNull();
  });

  it("finds Medusa's level among the four above the Castle once open water is seen", () => {
    for (const dlevel of [23, 24, 25, 26]) {
      expect(couldBeMedusaLevel({ ...doom, dlevel })).toBe(true);
      expect(resolveMusicSpecialLevel({ ...doom, dlevel, knownWaterTiles: water })).toBe("medusa");
      expect(resolveMusicSpecialLevel({ ...doom, dlevel, knownWaterTiles: water - 1 })).toBeNull();
    }
    expect(couldBeMedusaLevel({ ...doom, dlevel: 22 })).toBe(false);
    expect(resolveMusicSpecialLevel({ ...doom, dlevel: 22, knownWaterTiles: 500 })).toBeNull();
    expect(resolveMusicSpecialLevel({ ...doom, dnum: 2, dlevel: 25, knownWaterTiles: 500 })).toBeNull();
  });

  it("falls back to none without the level count", () => {
    expect(resolveMusicSpecialLevel({ dnum: 0, dlevel: 27, mainDungeonLevelCount: null })).toBeNull();
    expect(resolveMusicSpecialLevel({ dnum: 0, dlevel: 25, knownWaterTiles: 500 })).toBeNull();
    expect(resolveMusicSpecialLevel(null)).toBeNull();
  });
});
