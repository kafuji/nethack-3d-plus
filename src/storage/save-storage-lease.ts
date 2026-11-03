/**
 * Cooperative exclusion for all game sessions and save mutations in the same
 * storage partition. A lease must be retained until the worker has drained its
 * persistence queues; old, non-cooperating application versions cannot be
 * detected by Web Locks.
 */
export const saveStorageLockName = "nethack-3d:save-storage:v1";

export interface SaveStorageLease {
  readonly released: boolean;
  release(): Promise<void>;
}

type LockProvider = Pick<LockManager, "request">;

export async function acquireSaveStorageLease(
  locks: LockProvider | undefined = typeof navigator === "undefined" ? undefined : navigator.locks,
): Promise<SaveStorageLease> {
  if (!locks || typeof locks.request !== "function") {
    throw new Error("This browser does not support save-storage locking. Close other game tabs and use a supported browser.");
  }

  let resolveAcquired!: (lease: SaveStorageLease) => void;
  let rejectAcquired!: (error: Error) => void;
  const acquired = new Promise<SaveStorageLease>((resolve, reject) => {
    resolveAcquired = resolve;
    rejectAcquired = reject;
  });
  let releaseLock!: () => void;
  const held = new Promise<void>(resolve => { releaseLock = resolve; });
  let released = false;
  let completion: Promise<unknown> = Promise.resolve();
  const lease: SaveStorageLease = {
    get released() { return released; },
    async release() {
      if (released) { await completion; return; }
      released = true;
      releaseLock();
      await completion;
    },
  };
  try {
    completion = locks.request(saveStorageLockName, { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) {
        rejectAcquired(new Error("Save storage is in use by another game tab. Close it before starting or changing saves."));
        return;
      }
      resolveAcquired(lease);
      await held;
    }).catch(error => rejectAcquired(error instanceof Error ? error : new Error(String(error))));
  } catch (error) {
    rejectAcquired(error instanceof Error ? error : new Error(String(error)));
  }
  return acquired;
}
