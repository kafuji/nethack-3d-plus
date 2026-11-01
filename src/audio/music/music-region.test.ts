import { describe, expect, it } from "vitest";
import { regionTrackPreferences, resolveMusicRegion } from "./music-region";
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

  it("only refers to bundled tracks", () => {
    const ids = new Set(Object.values(defaultMusicLibrary).flat().map((track) => track.id));
    for (const preference of Object.values(regionTrackPreferences)) {
      for (const list of Object.values(preference)) {
        for (const id of list ?? []) expect(ids.has(id)).toBe(true);
      }
    }
  });
});
