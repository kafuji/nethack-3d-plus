import { afterEach, describe, expect, it, vi } from "vitest";
import { getRuntimeSaveCompatTag, getRuntimeSaveDbName } from "../../../runtime/save-storage";
import type { SaveGameRecord } from "./saved-games";
import { replaceTrialSaveAtomically, TrialRestoreMetadataError } from "./save-transfer";

// A transaction-capable fake: requests run asynchronously and writes become
// visible only on complete. Abort or request failure discards all its writes.
type Row = { timestamp: Date; mode: number; contents: Uint8Array };
type Request = { result?: any; onsuccess?: () => void };
class FakeDatabase {
  rows: Map<string, Row>;
  failAdd = false;
  transactions = 0;
  readonly objectStoreNames = { contains: (name: string) => name === "FILE_DATA" };
  constructor(rows: Record<string, Row> = {}) { this.rows = new Map(Object.entries(rows)); }
  close() {}
  transaction(_name: string, mode: IDBTransactionMode) {
    this.transactions++;
    const original = this.rows;
    const working = new Map(original);
    let pending = 0;
    let finished = false;
    const tx: any = { error: null, oncomplete: undefined, onabort: undefined, onerror: undefined };
    const finish = () => queueMicrotask(() => {
      if (finished || pending !== 0) return;
      finished = true;
      if (mode === "readwrite") this.rows = working;
      tx.oncomplete?.();
    });
    tx.abort = () => {
      if (finished) return;
      finished = true;
      queueMicrotask(() => tx.onabort?.());
    };
    const request = (operation: () => unknown): Request => {
      const result: Request = {};
      pending++;
      queueMicrotask(() => {
        if (finished) return;
        try { result.result = operation(); result.onsuccess?.(); }
        catch (error) { tx.error = error; tx.abort(); }
        pending--;
        finish();
      });
      return result;
    };
    const store = {
      getAllKeys: () => request(() => [...working.keys()]),
      getAll: () => request(() => [...working.values()]),
      delete: (key: string) => request(() => { working.delete(key); }),
      add: (value: Row, key: string) => request(() => {
        if (this.failAdd) throw new Error("simulated write failure");
        if (working.has(key)) throw new Error("ConstraintError");
        working.set(key, value);
      }),
    };
    tx.objectStore = () => store;
    return tx;
  }
}

const runtime = "3.6.7" as const;
const dbName = getRuntimeSaveDbName(runtime);
const time = new Date("2026-10-04T12:00:00.000Z");
const row = (byte: number, timestamp = time): Row => ({ timestamp, mode: 0o100666, contents: new Uint8Array([byte]) });
const archive = () => JSON.stringify({
  format: "nh3d-save", version: 1, runtimeVersion: runtime, compatTag: getRuntimeSaveCompatTag(runtime),
  dbName, name: "Test", category: "manual", displayName: "Test", playMode: "normal", initOptions: [],
  files: [{ key: "/save/0Test", timestamp: time.toISOString(), contents: "AQ==" }],
});
function existing(files: Array<{ dbName: string; key: string; timestamp: Date }>): SaveGameRecord[] {
  return [{ key: "manual:Test", name: "Test", displayName: "Test", displayPlayMode: "normal", category: "manual", isResumable: true, timestamp: time, dateFormatted: "", files: files.map(file => ({ ...file, filename: file.key.split("/").pop()! })) }];
}
function setup(databases: Record<string, FakeDatabase>, metadataFailure = false) {
  const stores = new Map(Object.entries(databases));
  vi.stubGlobal("indexedDB", {
    databases: async () => [...stores.keys()].map(name => ({ name })),
    open: (name: string) => {
      const request: any = {};
      queueMicrotask(() => { request.result = stores.get(name); request.onsuccess?.(); });
      return request;
    },
  });
  const localStorage = { getItem: () => null, setItem: () => { if (metadataFailure) throw new Error("quota"); } };
  vi.stubGlobal("window", { localStorage });
}
afterEach(() => vi.unstubAllGlobals());

describe("atomic trial save replacement", () => {
  it("replaces all matching saves in one transaction while preserving other characters", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9), "/save/0Test.0": row(8), "/save/0Other": row(7) });
    setup({ [dbName]: db });
    await replaceTrialSaveAtomically(archive(), runtime, "Test", existing([
      { dbName, key: "/save/0Test", timestamp: time }, { dbName, key: "/save/0Test.0", timestamp: time },
    ]));
    expect(db.transactions).toBe(1);
    expect([...db.rows.keys()].sort()).toEqual(["/save/0Other", "/save/0Test"]);
    expect([...db.rows.get("/save/0Test")!.contents]).toEqual([1]);
    expect([...db.rows.get("/save/0Other")!.contents]).toEqual([7]);
  });

  it("aborts all deletes if the new record cannot be written", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9), "/save/0Other": row(7) });
    db.failAdd = true;
    setup({ [dbName]: db });
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]))).rejects.toThrow("simulated write failure");
    expect([...db.rows.get("/save/0Test")!.contents]).toEqual([9]);
    expect([...db.rows.get("/save/0Other")!.contents]).toEqual([7]);
  });

  it("rejects a character whose existing files span databases without writing", async () => {
    const otherName = `/nethack/save-${getRuntimeSaveCompatTag(runtime)}`;
    const target = new FakeDatabase({ "/save/0Test": row(9) });
    const other = new FakeDatabase({ "/nethack/save/0Test.0": row(8) });
    setup({ [dbName]: target, [otherName]: other });
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName: otherName, key: "/nethack/save/0Test.0", timestamp: time }]))).rejects.toThrow(/across save databases/);
    expect(target.transactions).toBe(0);
    expect([...target.rows.get("/save/0Test")!.contents]).toEqual([9]);
    expect([...other.rows.get("/nethack/save/0Test.0")!.contents]).toEqual([8]);
  });

  it("rejects unexpected same-name files in another database even if absent from the supplied snapshot", async () => {
    const otherName = `/nethack/save-${getRuntimeSaveCompatTag(runtime)}`;
    const target = new FakeDatabase({ "/save/0Test": row(9) });
    setup({ [dbName]: target, [otherName]: new FakeDatabase({ "/nethack/save/0Test.0": row(8) }) });
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]))).rejects.toThrow(/across save databases/);
    expect(target.transactions).toBe(0);
  });

  it("rejects changed timestamps and unexpected collisions without deleting files", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9, new Date(time.getTime() + 1)), "/save/0Other": row(7) });
    setup({ [dbName]: db });
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]))).rejects.toThrow(/changed/);
    expect([...db.rows.get("/save/0Test")!.contents]).toEqual([9]);
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", [])).rejects.toThrow(/changed/);
    expect([...db.rows.get("/save/0Other")!.contents]).toEqual([7]);
  });

  it("distinguishes a post-commit metadata failure and preserves restored data", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9) });
    setup({ [dbName]: db }, true);
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]))).rejects.toMatchObject({ filesCommitted: true, name: "TrialRestoreMetadataError", message: expect.stringMatching(/already restored.*before retrying/) } satisfies Partial<TrialRestoreMetadataError>);
    expect([...db.rows.get("/save/0Test")!.contents]).toEqual([1]);
  });

  it("refuses malformed metadata before changing save files", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9) });
    setup({ [dbName]: db });
    vi.stubGlobal("window", { localStorage: { getItem: () => "[invalid", setItem: () => {} } });
    await expect(replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]))).rejects.toThrow();
    expect(db.transactions).toBe(0);
    expect([...db.rows.get("/save/0Test")!.contents]).toEqual([9]);
  });

  it("preserves unrelated metadata entries and fields verbatim", async () => {
    const db = new FakeDatabase({ "/save/0Test": row(9) });
    setup({ [dbName]: db });
    const unrelated = { characterName: "Other", futureField: { value: 1 } };
    let stored = JSON.stringify({ other: unrelated, unknown: "future format" });
    vi.stubGlobal("window", { localStorage: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } });
    await replaceTrialSaveAtomically(archive(), runtime, "Test", existing([{ dbName, key: "/save/0Test", timestamp: time }]));
    expect(JSON.parse(stored)).toMatchObject({ other: unrelated, unknown: "future format" });
  });
});
