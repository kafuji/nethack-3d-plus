import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureExistingTrialSlot, resolveLatestManualSave, restoreAutoSnapshot, restoreTrialSlot } from "./trial-slots";

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
