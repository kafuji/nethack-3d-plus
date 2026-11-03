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
});
