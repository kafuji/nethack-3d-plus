import { afterEach, describe, expect, it } from "vitest";
import { RuntimeGlobalSnapshots } from "./global-snapshots";

const toInt = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

function snapshotsWithGlobals(globals: Record<string, unknown>): RuntimeGlobalSnapshots {
  (globalThis as any).nethackGlobal = { globals };
  return new RuntimeGlobalSnapshots({ memory: { normalizeRuntimeInteger: toInt } } as any);
}

const dungeons = [
  { dname: "The Dungeons of Doom", ledger_start: 0, depth_start: 1 },
  { dname: "Gehennom", ledger_start: 27, depth_start: 28 },
];

describe("RuntimeGlobalSnapshots level identity", () => {
  afterEach(() => {
    delete (globalThis as any).nethackGlobal;
  });

  it("derives the Dungeons of Doom level count from the next ledger start", () => {
    const identity = snapshotsWithGlobals({
      u: { uz: { dnum: 0, dlevel: 27 } },
      dungeons,
      dungeon_topology: { d_mines_dnum: 2 },
    }).resolveRuntimeLevelIdentity();
    expect(identity?.mainDungeonLevelCount).toBe(27);
    expect(identity?.specialLevel).toBeNull();
  });

  it("matches exported Medusa and Castle levels exactly", () => {
    const topology = {
      d_medusa_level: { dnum: 0, dlevel: 24 },
      d_stronghold_level: { dnum: 0, dlevel: 27 },
    };
    const at = (dlevel: number) =>
      snapshotsWithGlobals({ u: { uz: { dnum: 0, dlevel } }, dungeons, dungeon_topology: topology })
        .resolveRuntimeLevelIdentity()?.specialLevel;
    expect(at(24)).toBe("medusa");
    expect(at(27)).toBe("castle");
    expect(at(25)).toBeNull();
  });

  it("leaves the count unknown when only one dungeon is exported", () => {
    const identity = snapshotsWithGlobals({
      u: { uz: { dnum: 0, dlevel: 3 } },
      dungeons: [dungeons[0]],
    }).resolveRuntimeLevelIdentity();
    expect(identity?.mainDungeonLevelCount).toBeNull();
  });
});
