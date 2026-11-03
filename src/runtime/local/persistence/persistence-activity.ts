/** Track independent persistence transactions so shutdown can wait for all of them. */
export class PersistenceActivity {
  private active = 0;
  private waiters: Array<() => void> = [];

  begin(): () => void {
    this.active++;
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.active--;
      if (this.active === 0) {
        for (const resolve of this.waiters.splice(0)) resolve();
      }
    };
  }

  waitForIdle(): Promise<void> {
    return this.active === 0 ? Promise.resolve() : new Promise(resolve => this.waiters.push(resolve));
  }
}

/** Individual IDB requests can succeed before their containing transaction commits. */
export function watchWriteTransaction(transaction: IDBTransaction, finish: (error: Error | null) => void): void {
  let settled = false;
  const complete = (error: Error | null) => {
    if (settled) return;
    settled = true;
    finish(error);
  };
  transaction.oncomplete = () => complete(null);
  transaction.onabort = () => complete(transaction.error ?? new Error("IndexedDB write transaction aborted"));
}
