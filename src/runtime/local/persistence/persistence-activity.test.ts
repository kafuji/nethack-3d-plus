import { describe, expect, it, vi } from "vitest";
import { PersistenceActivity, watchWriteTransaction } from "./persistence-activity";

describe("persistence shutdown activity", () => {
  it("waits until every independent root write has finished", async () => {
    const activity = new PersistenceActivity();
    const first = activity.begin();
    const second = activity.begin();
    const idle = vi.fn();
    const promise = activity.waitForIdle().then(idle);
    first();
    first(); // duplicate completion must not release another transaction
    await Promise.resolve();
    expect(idle).not.toHaveBeenCalled();
    second();
    await promise;
    expect(idle).toHaveBeenCalledOnce();
  });

  it("does not report an IDB write as successful until its transaction commits", () => {
    const transaction = { oncomplete: null, onabort: null, error: null } as unknown as IDBTransaction;
    const finish = vi.fn();
    watchWriteTransaction(transaction, finish);
    // Request success is deliberately not transaction completion.
    expect(finish).not.toHaveBeenCalled();
    transaction.oncomplete?.call(transaction, {} as Event);
    transaction.onabort?.call(transaction, {} as Event);
    expect(finish).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledWith(null);
  });

  it("reports an aborted transaction as failure", () => {
    const transaction = { oncomplete: null, onabort: null, error: new DOMException("disk failed", "AbortError") } as unknown as IDBTransaction;
    const finish = vi.fn();
    watchWriteTransaction(transaction, finish);
    transaction.onabort?.call(transaction, {} as Event);
    expect(finish.mock.calls[0][0]).toBe(transaction.error);
  });
});
