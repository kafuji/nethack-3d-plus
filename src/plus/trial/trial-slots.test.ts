import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureAutoSnapshot,
  captureExistingTrialSlot,
  readCheckpointState,
  resolveLatestManualSave,
  restoreAutoSnapshot,
  restoreTrialSlot,
} from "./trial-slots";

const mocked = vi.hoisted(() => ({
  archive: { name: "Bob", initOptions: [], category: "manual" },
  fetchSavedGames: vi.fn(async () => []),
  deleteSavedGame: vi.fn(async () => {}),
  importSavedGame: vi.fn(async () => {}),
  exportSavedGame: vi.fn(async () => "same-archive"),
  puts: [] as Array<{ value: unknown; key: string }>,
  parseSaveArchive: vi.fn(() => mocked.archive),
}));
vi.mock("../../ui/app/startup/saved-games", () => ({ fetchSavedGames: mocked.fetchSavedGames, deleteSavedGame: mocked.deleteSavedGame }));
vi.mock("../../ui/app/startup/save-transfer", () => ({ exportSavedGame: mocked.exportSavedGame, importSavedGame: mocked.importSavedGame, parseSaveArchive: mocked.parseSaveArchive }));

const snapshotId = "3.6.7:Alice:auto-123";
const record = { archive: "stored-archive", displayName: "Alice", savedAt: "2026-01-01T00:00:00Z", turn: 1, dlevel: 1, checkpointTime: 1 };

beforeEach(() => {
  mocked.archive = { name: "Bob", initOptions: [], category: "manual" };
  vi.clearAllMocks();
  mocked.puts.length = 0;
  mocked.fetchSavedGames.mockReset().mockResolvedValue([]);
  mocked.exportSavedGame.mockReset().mockResolvedValue("same-archive");
  const db = {
    transaction: () => {
      const tx: { objectStore: () => unknown; oncomplete?: () => void } = {
        objectStore: () => ({
          get: () => ({ result: record }),
          put: (value: unknown, key: string) => { mocked.puts.push({ value, key }); return { result: key }; },
          getAllKeys: () => ({ result: [snapshotId] }),
          getAll: () => ({ result: [record] }),
        }),
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
    close: vi.fn(),
  };
  vi.stubGlobal("IDBKeyRange", { bound: () => ({}) });
  vi.stubGlobal("indexedDB", { open: () => {
    const request: { result: typeof db; onsuccess?: () => void } = { result: db };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  } });
});

describe("trial save capture", () => {
  const alice = { key: "manual:Alice", name: "Alice", displayName: "Alice", category: "manual", isResumable: true,
    timestamp: new Date("2026-01-01T00:00:00Z"), initOptions: [], files: [{ dbName: "db", key: "/save/0Alice", timestamp: new Date("2026-01-01T00:00:00Z") }] };
  const bob = { ...alice, key: "manual:Bob", name: "Bob", timestamp: new Date("2027-01-01T00:00:00Z") };
  it("selects only the requested character even when another save is newer", async () => {
    mocked.fetchSavedGames.mockResolvedValue([bob, alice] as never);
    await expect(resolveLatestManualSave("3.6.7", "Alice")).resolves.toMatchObject({ name: "Alice" });
  });
  it("does not overwrite a slot when a save changes between reads", async () => {
    mocked.fetchSavedGames.mockResolvedValue([alice] as never);
    mocked.exportSavedGame.mockResolvedValueOnce("first").mockResolvedValueOnce("changed");
    await expect(captureExistingTrialSlot("3.6.7", "Alice", "manual:Alice", 1, () => {})).rejects.toThrow("contents changed");
    expect(mocked.puts).toHaveLength(0);
    mocked.exportSavedGame.mockResolvedValue("same-archive");
    await captureExistingTrialSlot("3.6.7", "Alice", "manual:Alice", 1, () => {});
    expect(mocked.puts[0].key).toBe("3.6.7:Alice:1");
  });
});
afterEach(() => vi.unstubAllGlobals());

function shardArchive(ledger: number, stateTime: string, levelTime = stateTime) {
  const state = new Uint8Array(new Int32Array([42, ledger]).buffer);
  return JSON.stringify({
    files: [
      { key: "/save/0Alice.0", timestamp: stateTime, contents: btoa(String.fromCharCode(...state)) },
      { key: "/save/0Alice.1", timestamp: levelTime, contents: "AAAA" },
    ],
  });
}

describe("automatic snapshot labels", () => {
  const stateTime = "2026-01-01T00:00:10.000Z";
  const autosave = { key: "autosave:Alice", name: "Alice", displayName: "Alice", category: "autosave", isResumable: true,
    timestamp: new Date(stateTime), initOptions: [], files: [] };

  it("reads the level a checkpoint really holds", () => {
    expect(readCheckpointState(shardArchive(7, stateTime))).toEqual({ ledger: 7, checkpointTime: Date.parse(stateTime) });
  });

  it("rejects shards from the middle of a level change", () => {
    expect(readCheckpointState(shardArchive(7, stateTime, "2026-01-01T00:00:11.000Z"))).toBeNull();
  });

  it("labels a snapshot from the level in its shards, not the latest level change", async () => {
    mocked.fetchSavedGames.mockResolvedValue([autosave] as never);
    mocked.exportSavedGame.mockResolvedValue(shardArchive(2, stateTime));
    const labels = new Map([[2, { turn: 100, dlevel: 2 }], [3, { turn: 120, dlevel: 3 }]]);
    await expect(captureAutoSnapshot("3.6.7", "Alice", ledger => labels.get(ledger) ?? null, 0))
      .resolves.toEqual({ ledger: 2, checkpointTime: Date.parse(stateTime) });
    expect(mocked.puts[0].value).toMatchObject({ turn: 100, dlevel: 2 });
  });

  it("waits while the shards' level has not been seen arriving", async () => {
    mocked.fetchSavedGames.mockResolvedValue([autosave] as never);
    mocked.exportSavedGame.mockResolvedValue(shardArchive(9, stateTime));
    await expect(captureAutoSnapshot("3.6.7", "Alice", () => null, 0)).resolves.toBeNull();
    expect(mocked.puts).toHaveLength(0);
  });

  it("ignores a checkpoint it has already captured", async () => {
    mocked.fetchSavedGames.mockResolvedValue([autosave] as never);
    await expect(captureAutoSnapshot("3.6.7", "Alice", () => ({ turn: 1, dlevel: 1 }), Date.parse(stateTime)))
      .resolves.toBeNull();
    expect(mocked.exportSavedGame).not.toHaveBeenCalled();
  });
});

describe("trial restore character identity", () => {
  it.each([
    ["slot", () => restoreTrialSlot("3.6.7", "Alice", 1)],
    ["snapshot", () => restoreAutoSnapshot("3.6.7", "Alice", snapshotId)],
  ])("rejects a mismatched %s archive before inspecting or changing saves", async (_kind, restore) => {
    await expect(restore()).rejects.toThrow("does not match");
    expect(mocked.fetchSavedGames).not.toHaveBeenCalled();
    expect(mocked.deleteSavedGame).not.toHaveBeenCalled();
    expect(mocked.importSavedGame).not.toHaveBeenCalled();
  });

  it("continues to restore an archive belonging to the requested character", async () => {
    mocked.archive.name = "Alice";
    await expect(restoreTrialSlot("3.6.7", "Alice", 1)).resolves.toMatchObject({ name: "Alice" });
    expect(mocked.importSavedGame).toHaveBeenCalledWith("stored-archive", "3.6.7");
  });
});
