import { describe, expect, it } from "vitest";
import { acquireSaveStorageLease, saveStorageLockName } from "./save-storage-lease";

function lockProvider() {
  let busy = false;
  const request = async (name: string, options: LockOptions, callback: (lock: Lock | null) => Promise<void>) => {
    expect(name).toBe(saveStorageLockName);
    expect(options).toEqual({ mode: "exclusive", ifAvailable: true });
    if (busy) return callback(null);
    busy = true;
    try { await callback({ name, mode: "exclusive" } as Lock); }
    finally { busy = false; }
  };
  return { request } as unknown as Pick<LockManager, "request">;
}

describe("save-storage lease", () => {
  it("excludes another tab until explicitly released", async () => {
    const locks = lockProvider();
    const first = await acquireSaveStorageLease(locks);
    await expect(acquireSaveStorageLease(locks)).rejects.toThrow(/another game tab/);
    await first.release();
    const next = await acquireSaveStorageLease(locks);
    expect(next.released).toBe(false);
    await next.release();
    await next.release();
    expect(next.released).toBe(true);
  });
  it("fails closed when Web Locks is unavailable", async () => {
    await expect(acquireSaveStorageLease({} as Pick<LockManager, "request">)).rejects.toThrow(/does not support/);
  });
  it("reports a lock request failure after acquisition when releasing", async () => {
    let rejectRequest!: (error: Error) => void;
    const locks = {
      request: (_name: string, _options: LockOptions, callback: (lock: Lock | null) => Promise<void>) => {
        void callback({ name: saveStorageLockName, mode: "exclusive" } as Lock);
        return new Promise<void>((_resolve, reject) => { rejectRequest = reject; });
      },
    } as unknown as Pick<LockManager, "request">;
    const lease = await acquireSaveStorageLease(locks);
    rejectRequest(new Error("lock provider failed"));
    await expect(lease.release()).rejects.toThrow("lock provider failed");
  });
  it("reports a lock request failure before acquisition", async () => {
    const locks = { request: () => Promise.reject(new Error("lock request failed")) } as unknown as Pick<LockManager, "request">;
    await expect(acquireSaveStorageLease(locks)).rejects.toThrow("lock request failed");
  });
});
