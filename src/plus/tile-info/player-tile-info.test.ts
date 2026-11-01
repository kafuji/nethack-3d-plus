import { describe, expect, it } from "vitest";
import { itemMatchKey, PlayerTileInfoTracker, type PlayerTileInfo } from "./player-tile-info";
import type { PlayerTileTerrainId } from "./terrain-names";

function createTracker(terrain: Record<string, PlayerTileTerrainId> = {}) {
  const published: PlayerTileInfo[] = [];
  const tracker = new PlayerTileInfoTracker(
    (x, y) => terrain[`${x},${y}`] ?? null,
    (info) => published.push(info),
  );
  return { tracker, published };
}

describe("PlayerTileInfoTracker", () => {
  it("ignores messages until the hero's position is known", () => {
    const { tracker, published } = createTracker();
    tracker.captureMessage("You see here a dagger.");
    expect(published).toHaveLength(0);
  });

  it("names remembered terrain and resets on a new square", () => {
    const { tracker } = createTracker({ "1,1": "stairsDown", "2,1": "room" });
    tracker.setPosition(1, 1);
    tracker.captureMessage("There is a staircase down here.");
    tracker.captureMessage("You see here a dagger.");
    expect(tracker.snapshot).toMatchObject({
      active: true,
      terrainId: "stairsDown",
      featureText: "a staircase down",
      items: ["a dagger"],
    });
    tracker.setPosition(2, 1);
    expect(tracker.snapshot).toMatchObject({ terrainId: "room", featureText: null, items: [] });
  });

  it("reads look_here() windows with a feature and several objects", () => {
    const { tracker } = createTracker();
    tracker.setPosition(3, 3);
    tracker.captureInfoMenuLines([
      "There is a fountain here.",
      "",
      "Things that are here:",
      "a dagger",
      "2 uncursed food rations",
      "",
    ]);
    expect(tracker.snapshot.featureText).toBe("a fountain");
    expect(tracker.snapshot.items).toEqual(["a dagger", "2 uncursed food rations"]);
  });

  it("accepts the list header as the window title", () => {
    const { tracker } = createTracker();
    tracker.setPosition(3, 3);
    tracker.captureInfoMenuLines(["a dagger", "a lichen corpse"], "Things that you feel here:");
    expect(tracker.snapshot.items).toEqual(["a dagger", "a lichen corpse"]);
  });

  it("ignores unrelated info windows", () => {
    const { tracker } = createTracker();
    tracker.setPosition(3, 3);
    tracker.captureMessage("You see here a dagger.");
    tracker.captureInfoMenuLines(["It is written in the Book of Mars:"], "NetHack Message");
    expect(tracker.snapshot.items).toEqual(["a dagger"]);
  });

  it("summarizes large piles and clears them when nothing is left", () => {
    const { tracker } = createTracker();
    tracker.setPosition(0, 0);
    tracker.captureMessage("There are several other objects here.");
    expect(tracker.snapshot.pileSummary).toBe("several");
    tracker.setRuntimeObjectPresence(0, 0, false);
    expect(tracker.snapshot.pileSummary).toBeNull();
  });

  it("tracks drops and pickups on the current square", () => {
    const { tracker } = createTracker();
    tracker.setPosition(0, 0);
    tracker.captureMessage("You drop a +1 dagger.\nYou drop 3 uncursed arrows.");
    expect(tracker.snapshot.items).toEqual(["3 uncursed arrows", "a +1 dagger"]);
    tracker.captureMessage("c - 15 uncursed arrows (in quiver).");
    expect(tracker.snapshot.items).toEqual(["a +1 dagger"]);
    tracker.captureMessage("q - a wand of wishing.");
    expect(tracker.snapshot.itemsMayBeStale).toBe(true);
  });

  it("flags objects the runtime reports but no message named", () => {
    const { tracker } = createTracker();
    tracker.setPosition(4, 4);
    tracker.setRuntimeObjectPresence(5, 5, true);
    expect(tracker.snapshot.hasUnnamedObjects).toBe(false);
    tracker.setRuntimeObjectPresence(4, 4, true);
    expect(tracker.snapshot.hasUnnamedObjects).toBe(true);
    tracker.captureMessage("You see here a ring.");
    expect(tracker.snapshot.hasUnnamedObjects).toBe(false);
  });

  it("keeps engravings and does not treat questions as features", () => {
    const { tracker } = createTracker();
    tracker.setPosition(1, 2);
    tracker.captureMessage('You read: "Elbereth".');
    tracker.captureMessage("There is a newt corpse here; eat it? [ynq] (n)");
    expect(tracker.snapshot.engraving).toBe("Elbereth");
    expect(tracker.snapshot.featureText).toBeNull();
  });

  it("publishes only real changes", () => {
    const { tracker, published } = createTracker({ "1,1": "room" });
    tracker.setPosition(1, 1);
    tracker.setPosition(1, 1);
    tracker.refreshTerrain();
    expect(published).toHaveLength(1);
  });
});

describe("itemMatchKey", () => {
  it("matches floor and inventory names across counts and notes", () => {
    expect(itemMatchKey("2 uncursed arrows")).toBe(itemMatchKey("12 uncursed arrows (in quiver)"));
    expect(itemMatchKey("a scroll labeled FOO")).toBe(itemMatchKey("2 scrolls labeled FOO"));
    expect(itemMatchKey("a dagger")).not.toBe(itemMatchKey("an elven dagger"));
  });
});
