import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimePersistence } from "./startup-persistence";

type Request = { result?: unknown; onsuccess?: () => void; onerror?: () => void };
type Transaction = { oncomplete?: () => void; onabort?: () => void; error: Error | null; objectStore: () => unknown; abort: () => void };

function harness() {
  const syncCalls: Array<{ populate: boolean; done: (error: Error | null) => void }> = [];
  const openRequests: Request[] = [];
  const transactions: Array<{ transaction: Transaction; keys: Request }> = [];
  const db = {
    close: vi.fn(),
    transaction: () => {
      const keys: Request = { result: [] };
      const transaction: Transaction = {
        error: null,
        objectStore: () => ({ getAllKeys: () => keys, put: vi.fn(), delete: vi.fn() }),
        abort: () => { transaction.onabort?.(); },
      };
      transactions.push({ transaction, keys });
      return transaction;
    },
  };
  vi.stubGlobal("indexedDB", { open: () => { const request: Request = { result: db }; openRequests.push(request); return request; } });
  const fs = {
    filesystems: { IDBFS: {} },
    cwd: () => "/",
    mount: vi.fn(),
    readdir: () => [],
    analyzePath: () => ({ exists: false }),
    close: vi.fn(),
    syncfs: (populate: boolean, done: (error: Error | null) => void) => { syncCalls.push({ populate, done }); },
  };
  const mod: any = { FS: fs, addRunDependency: vi.fn(), removeRunDependency: vi.fn() };
  const cleanup = vi.fn(() => 0);
  new RuntimePersistence({ checkpoints: {
    cleanupStaleCheckpointShardsBeforeStartup: cleanup,
    cleanupStaleTemporaryRuntimeLocksBeforeStartup: cleanup,
    removeStaleRecoverableSaveArtifactsBeforeAutosaveResume: cleanup,
  } }).installRuntimeStartupPersistence(mod, "3.6.7", true, () => {}, () => []);
  return { mod, fs, syncCalls, openRequests, transactions };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("runtime persistence drain", () => {
  it("waits for prior root commit, queued IDBFS sync, and final root commit; blocks new writes", async () => {
    vi.useFakeTimers();
    const h = harness();
    expect(h.syncCalls[0].populate).toBe(true);
    h.syncCalls[0].done(null);
    h.mod.__nh3dFlushRootPersistence("manual", () => {});
    h.openRequests[0].onsuccess?.();
    await Promise.resolve();
    h.transactions[0].keys.onsuccess?.();
    h.fs.close({ path: "/save/checkpoint.1" }); // A scheduled checkpoint is cancelled on shutdown.
    let settled = false;
    const drain = h.mod.__nh3dDrainPersistence().then(() => { settled = true; });
    expect(h.mod.__nh3dDrainPersistence()).toBe(h.mod.__nh3dDrainPersistence());
    const rejectedSync = vi.fn();
    h.mod.FS.syncfs(false, rejectedSync);
    await vi.runAllTicks();
    expect(rejectedSync.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(h.syncCalls).toHaveLength(1);
    expect(settled).toBe(false);

    h.transactions[0].transaction.oncomplete?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.syncCalls).toHaveLength(2);
    expect(h.syncCalls[1].populate).toBe(false);
    h.syncCalls[1].done(null);
    h.openRequests[1].onsuccess?.();
    await Promise.resolve();
    h.transactions[1].keys.onsuccess?.();
    await Promise.resolve();
    expect(settled).toBe(false);
    h.transactions[1].transaction.oncomplete?.();
    await drain;
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.syncCalls).toHaveLength(2);
  });

  it("rejects shutdown when the final root write transaction aborts", async () => {
    const h = harness();
    h.syncCalls[0].done(null);
    const drain = h.mod.__nh3dDrainPersistence();
    await Promise.resolve();
    h.syncCalls[1].done(null);
    h.openRequests[0].onsuccess?.();
    await Promise.resolve();
    h.transactions[0].keys.onsuccess?.();
    h.transactions[0].transaction.error = new Error("transaction failed");
    h.transactions[0].transaction.onabort?.();
    await expect(drain).rejects.toThrow("transaction failed");
  });
});
