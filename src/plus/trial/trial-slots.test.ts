import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreAutoSnapshot, restoreTrialSlot } from "./trial-slots";

const mocked = vi.hoisted(() => ({
  archive: { name: "Bob", initOptions: [], category: "manual" },
  fetchSavedGames: vi.fn(async () => []),
  deleteSavedGame: vi.fn(async () => {}),
  importSavedGame: vi.fn(async () => {}),
  parseSaveArchive: vi.fn(() => mocked.archive),
}));
vi.mock("../../ui/app/startup/saved-games", () => ({ fetchSavedGames: mocked.fetchSavedGames, deleteSavedGame: mocked.deleteSavedGame }));
vi.mock("../../ui/app/startup/save-transfer", () => ({ exportSavedGame: vi.fn(), importSavedGame: mocked.importSavedGame, parseSaveArchive: mocked.parseSaveArchive }));

const snapshotId = "3.6.7:Alice:auto-123";
const record = { archive: "stored-archive", displayName: "Alice", savedAt: "2026-01-01T00:00:00Z", turn: 1, dlevel: 1, checkpointTime: 1 };

beforeEach(() => {
  mocked.archive = { name: "Bob", initOptions: [], category: "manual" };
  vi.clearAllMocks();
  const db = {
    transaction: () => {
      const tx: { objectStore: () => unknown; oncomplete?: () => void } = {
        objectStore: () => ({
          get: () => ({ result: record }),
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
