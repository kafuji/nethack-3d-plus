import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimePersistence } from "./startup-persistence";

type Request = { result?: unknown; onsuccess?: () => void; onerror?: () => void };
type Transaction = { oncomplete?: () => void; onabort?: () => void; error: Error | null; objectStore: () => unknown; abort: () => void };

function harness() {
  const syncCalls: Array<{ populate: boolean; done: (error: Error | null) => void }> = [];
  const openRequests: Request[] = [];
  const transactions: Array<{ transaction: Transaction; keys: Request; values: Request }> = [];
  const db = {
    close: vi.fn(),
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const keys: Request = { result: [] };
      const values: Request = { result: [] };
      const transaction: Transaction = {
        error: null,
        objectStore: () => ({ getAllKeys: () => keys, getAll: () => values, put: vi.fn(), delete: vi.fn() }),
        abort: () => { transaction.onabort?.(); },
      };
      transactions.push({ transaction, keys, values });
      return transaction;
    },
  };
  vi.stubGlobal("indexedDB", { open: () => { const request: Request = { result: db }; openRequests.push(request); return request; } });
  const fs = {
    filesystems: { IDBFS: {} },
    cwd: () => "/",
    mount: vi.fn(),
    readdir: vi.fn((): string[] => []),
    stat: vi.fn(() => ({ mode: 1, mtime: new Date() })),
    isFile: vi.fn(() => true),
    readFile: vi.fn(() => new Uint8Array([1])),
    writeFile: vi.fn(),
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
  const hydrate = async (keys: unknown[] = [], values: unknown[] = [], reset = true) => {
    const completed = new Promise<Error | null>(resolve => mod.__nh3dHydrateRootPersistence(resolve));
    openRequests[0].onsuccess?.();
    await Promise.resolve();
    transactions[0].keys.result = keys;
    transactions[0].values.result = values;
    transactions[0].keys.onsuccess?.();
    transactions[0].values.onsuccess?.();
    const result = await completed;
    if (reset) { openRequests.length = 0; transactions.length = 0; }
    return result;
  };
  return { mod, fs, syncCalls, openRequests, transactions, hydrate };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("runtime persistence drain", () => {
  it("does not write a root snapshot before hydration or after any root file fails to restore", async () => {
    const h = harness();
    const beforeHydration = vi.fn();
    h.mod.__nh3dFlushRootPersistence("postRun", beforeHydration);
    expect(beforeHydration).not.toHaveBeenCalled();
    expect(h.openRequests).toHaveLength(0);

    h.fs.writeFile.mockImplementation(() => { throw new Error("restore failed"); });
    const error = await h.hydrate(["/record"], [{ mode: 1, contents: new Uint8Array([9]) }]);
    expect(error?.message).toBe("restore failed");
    expect(beforeHydration).toHaveBeenCalledWith(error);
    const afterFailure = vi.fn();
    h.mod.__nh3dFlushRootPersistence("later", afterFailure);
    expect(afterFailure.mock.calls[0][0]).toBe(error);
    expect(h.openRequests).toHaveLength(0);
    expect(h.transactions).toHaveLength(0);
  });

  it("completes a pre-hydration flush only after the hydrated snapshot commits", async () => {
    const h = harness();
    const done = vi.fn();
    h.mod.__nh3dFlushRootPersistence("postRun", done);
    await h.hydrate([], [], false);
    expect(done).not.toHaveBeenCalled();
    expect(h.openRequests).toHaveLength(2);
    h.openRequests[1].onsuccess?.();
    await Promise.resolve();
    h.transactions[1].keys.onsuccess?.();
    expect(done).not.toHaveBeenCalled();
    h.transactions[1].transaction.oncomplete?.();
    expect(done).toHaveBeenCalledWith(null);
  });

  it("preserves the root database if an existing file cannot be decoded", async () => {
    const h = harness();
    const error = await h.hydrate(["/record"], [{ mode: 1, contents: "invalid" }]);
    expect(error?.message).toMatch(/Cannot decode/);
    h.mod.__nh3dFlushRootPersistence("later", () => {});
    expect(h.openRequests).toHaveLength(0);
  });

  it("waits for prior root commit, queued IDBFS sync, and final root commit; blocks new writes", async () => {
    vi.useFakeTimers();
    const h = harness();
    await h.hydrate();
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
    await h.hydrate();
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

  it.each(["readdir", "stat", "readFile"] as const)("does not open a destructive transaction when root %s fails", async method => {
    const h = harness();
    await h.hydrate();
    h.syncCalls[0].done(null);
    h.fs.readdir.mockReturnValue(["record"]);
    h.fs[method].mockImplementation(() => { throw new Error("root snapshot failed"); });
    const drain = h.mod.__nh3dDrainPersistence();
    const rejection = expect(drain).rejects.toThrow("root snapshot failed");
    await Promise.resolve();
    h.syncCalls[1].done(null);
    await rejection;
    expect(h.openRequests).toHaveLength(0);
  });

  it("reports an earlier failed root write even if the final snapshot commits", async () => {
    const h = harness();
    await h.hydrate();
    h.syncCalls[0].done(null);
    h.mod.__nh3dFlushRootPersistence("earlier", () => {});
    h.openRequests[0].onsuccess?.();
    await Promise.resolve();
    h.transactions[0].keys.onsuccess?.();
    h.transactions[0].transaction.error = new Error("earlier write failed");
    h.transactions[0].transaction.onabort?.();
    const drain = h.mod.__nh3dDrainPersistence();
    const rejection = expect(drain).rejects.toThrow("earlier write failed");
    await Promise.resolve();
    h.syncCalls[1].done(null);
    h.openRequests[1].onsuccess?.();
    await Promise.resolve();
    h.transactions[1].keys.onsuccess?.();
    h.transactions[1].transaction.oncomplete?.();
    await rejection;
  });

  it("reports an earlier IDBFS failure even when the final sync succeeds", async () => {
    const h = harness();
    await h.hydrate();
    h.syncCalls[0].done(null);
    h.mod.FS.syncfs(false, () => {});
    h.syncCalls[1].done(new Error("earlier sync failed"));
    const drain = h.mod.__nh3dDrainPersistence();
    const rejection = expect(drain).rejects.toThrow("earlier sync failed");
    await Promise.resolve();
    h.syncCalls[2].done(null);
    h.openRequests[0].onsuccess?.();
    await Promise.resolve();
    h.transactions[0].keys.onsuccess?.();
    h.transactions[0].transaction.oncomplete?.();
    await rejection;
  });
});
