import type { NethackRuntimeVersion } from "../../../runtime/types";
import { getRuntimeSaveCompatTag, getRuntimeSaveDbNames, getRuntimeRootPersistenceDbNames } from "../../../runtime/save-storage";
import { getRuntimeSavePresentationMetadataKey, normalizeStoredSaveInitOptions } from "../../../runtime/save-presentation-metadata";
import { fetchSavedGames, resolveSaveCategory, resolveSaveLogicalName, type SaveGameRecord } from "./saved-games";
import { readSavePresentationMetadataByKey, writeSavePresentationMetadataByKey, savePresentationMetadataStorageKey } from "./save-presentation";

export const MAX_SAVE_ARCHIVE_BYTES = 64 * 1024 * 1024;
export type SaveTransferErrorCode = "invalid" | "incompatible" | "exists";
export class SaveTransferError extends Error {
  constructor(public readonly code: SaveTransferErrorCode) { super(code); }
}

/** File replacement succeeded; retrying blindly could overwrite a newer save. */
export class TrialRestoreMetadataError extends Error {
  readonly filesCommitted = true;
  readonly cause: unknown;
  constructor(cause?: unknown) {
    super("Save files were already restored, but presentation metadata could not be updated. Inspect the saves before retrying.");
    this.name = "TrialRestoreMetadataError";
    this.cause = cause;
  }
}

type SaveArchive = {
  format: "nh3d-save";
  version: 1;
  runtimeVersion: NethackRuntimeVersion;
  compatTag: string;
  dbName: string;
  name: string;
  category: "manual" | "autosave";
  displayName: string;
  playMode: "normal" | "explore" | "debug" | null;
  initOptions: string[];
  files: Array<{ key: string; timestamp: string; contents: string }>;
};

function invalid(): never { throw new SaveTransferError("invalid"); }

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

/** Validate the entire archive before opening any writable database. */
export function parseSaveArchive(text: string, runtimeVersion: NethackRuntimeVersion): SaveArchive {
  if (text.length > MAX_SAVE_ARCHIVE_BYTES) invalid();
  let archive: SaveArchive;
  try { archive = JSON.parse(text); } catch { return invalid(); }
  if (!archive || archive.format !== "nh3d-save" || archive.version !== 1) invalid();
  if (archive.runtimeVersion !== runtimeVersion || archive.compatTag !== getRuntimeSaveCompatTag(runtimeVersion)) {
    throw new SaveTransferError("incompatible");
  }
  const saveDbs = getRuntimeSaveDbNames(runtimeVersion);
  const rootDbs = getRuntimeRootPersistenceDbNames(runtimeVersion);
  if (![...saveDbs, ...rootDbs].includes(archive.dbName) ||
      typeof archive.name !== "string" || !archive.name || archive.name.length > 256 ||
      !["manual", "autosave"].includes(archive.category) ||
      typeof archive.displayName !== "string" || archive.displayName.length > 256 ||
      ![null, "normal", "explore", "debug"].includes(archive.playMode) ||
      !Array.isArray(archive.files) || !archive.files.length || archive.files.length > 1024) invalid();
  const keys = new Set<string>();
  for (const file of archive.files) {
    if (!file || typeof file.key !== "string" || file.key.length > 512 ||
        !/^\/(?:nethack\/)?(?:save\/)?[^/\\\x00-\x1f]+$/.test(file.key) ||
        file.key.split("/").some(part => part === "." || part === "..") || keys.has(file.key)) invalid();
    const filename = file.key.split("/").pop()!;
    // Runtime save and checkpoint files always have the numeric uid prefix.
    // This also excludes config, score, bones and other root-persistence data.
    if (!/^\d+[^/]+/.test(filename) || resolveSaveCategory(filename) !== archive.category ||
        resolveSaveLogicalName(filename, archive.category) !== archive.name) invalid();
    if (saveDbs.includes(archive.dbName)) {
      const prefix = archive.dbName.startsWith("/nethack/") ? "/nethack/save/" : "/save/";
      if (!file.key.startsWith(prefix)) invalid();
    }
    if (typeof file.timestamp !== "string" || !Number.isFinite(Date.parse(file.timestamp)) ||
        typeof file.contents !== "string" || !file.contents.length || file.contents.length % 4 !== 0 ||
        /[^A-Za-z0-9+/]/.test(file.contents.replace(/={1,2}$/, ""))) invalid();
    keys.add(file.key);
  }
  archive.initOptions = normalizeStoredSaveInitOptions(archive.initOptions, runtimeVersion);
  return archive;
}

function openSaveDatabase(name: string, create: boolean): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = create ? indexedDB.open(name, 21) : indexedDB.open(name);
    request.onupgradeneeded = () => {
      if (!create) { request.transaction?.abort(); return; }
      const db = request.result;
      const store = db.objectStoreNames.contains("FILE_DATA")
        ? request.transaction!.objectStore("FILE_DATA") : db.createObjectStore("FILE_DATA");
      if (!store.indexNames.contains("timestamp")) store.createIndex("timestamp", "timestamp", { unique: false });
    };
    let blocked = false;
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error("Save database is busy")); };
  });
}

export async function exportSavedGame(
  save: SaveGameRecord,
  runtimeVersion: NethackRuntimeVersion,
  options?: { requireUnchanged?: boolean },
): Promise<string> {
  // A checkpoint must be exported as one coherent set, never mixed with an
  // older copy of the character in a legacy database.
  const newestFile = [...save.files].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  if (!newestFile) invalid();
  const db = await openSaveDatabase(newestFile.dbName, false);
  let files: SaveArchive["files"];
  try {
    files = await new Promise((resolve, reject) => {
      const transaction = db.transaction("FILE_DATA", "readonly");
      const result: SaveArchive["files"] = [];
      let failure: Error | null = null;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("Save read aborted"));
      transaction.onerror = () => reject(transaction.error);
      for (const file of save.files.filter(file => file.dbName === newestFile.dbName)) {
        const request = transaction.objectStore("FILE_DATA").get(file.key);
        request.onsuccess = () => {
          const value = request.result;
          if (!(value?.contents instanceof Uint8Array) || !value.contents.length) { transaction.abort(); return; }
          if (options?.requireUnchanged && new Date(value.timestamp).getTime() !== file.timestamp.getTime()) {
            failure = new Error("Save files changed while reading; list saves and retry");
            transaction.abort();
            return;
          }
          result.push({ key: file.key, timestamp: new Date(value.timestamp).toISOString(), contents: encodeBytes(value.contents) });
        };
      }
    });
  } finally { db.close(); }
  const text = JSON.stringify({
    format: "nh3d-save", version: 1, runtimeVersion,
    compatTag: getRuntimeSaveCompatTag(runtimeVersion), dbName: newestFile.dbName,
    name: save.name, category: save.category, displayName: save.displayName,
    playMode: save.displayPlayMode, initOptions: save.initOptions ?? [], files,
  } satisfies SaveArchive);
  parseSaveArchive(text, runtimeVersion);
  return text;
}

export async function importSavedGame(
  text: string,
  runtimeVersion: NethackRuntimeVersion,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const archive = parseSaveArchive(text, runtimeVersion);
  const existing = await fetchSavedGames(runtimeVersion);
  if (existing.some(save => save.name === archive.name && save.category === archive.category)) {
    throw new SaveTransferError("exists");
  }
  const records = archive.files.map(file => ({
    key: file.key,
    value: {
      timestamp: new Date(file.timestamp), mode: 0o100666,
      contents: Uint8Array.from(atob(file.contents), char => char.charCodeAt(0)),
    },
  }));
  const db = await openSaveDatabase(archive.dbName, true);
  try {
    // The user may have closed options and started a game while the file or
    // database was being read. Never start a write after leaving this pane.
    signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("FILE_DATA", "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Save import aborted"));
      transaction.onerror = () => reject(transaction.error);
      // add, rather than put, makes collisions abort the whole transaction.
      for (const record of records) transaction.objectStore("FILE_DATA").add(record.value, record.key);
    });
  } finally { db.close(); }
  const metadata = readSavePresentationMetadataByKey();
  metadata[getRuntimeSavePresentationMetadataKey(runtimeVersion, archive.category, archive.name)] = {
    characterName: archive.displayName, playMode: archive.playMode,
    initOptions: archive.initOptions, runtimeVersion, updatedAt: new Date().toISOString(),
  };
  writeSavePresentationMetadataByKey(metadata);
}

/**
 * Replace one character's saves in a single FILE_DATA transaction.
 * Callers MUST first hold the game's origin-wide exclusive lock and wait for
 * the previous worker's persistence drain; this function cannot stop other
 * uncooperative tabs. Cross-database replacement is deliberately rejected.
 */
export async function replaceTrialSaveAtomically(
  text: string,
  runtimeVersion: NethackRuntimeVersion,
  expectedCharacterName: string,
  expectedSaves: readonly SaveGameRecord[],
): Promise<void> {
  const archive = parseSaveArchive(text, runtimeVersion);
  if (archive.name !== expectedCharacterName) throw new Error("Trial save character does not match its slot");
  // Decode every byte before opening any writable database.
  const records = archive.files.map(file => ({
    key: file.key,
    value: { timestamp: new Date(file.timestamp), mode: 0o100666,
      contents: Uint8Array.from(atob(file.contents), char => char.charCodeAt(0)) },
  }));

  // Detect unavailable or malformed metadata before changing save files.
  // The subsequent write can still fail, and is reported separately below.
  const readMetadata = () => {
    if (typeof window === "undefined" || !window.localStorage) throw new Error("Metadata storage unavailable");
    const raw = window.localStorage.getItem(savePresentationMetadataStorageKey);
    if (!raw) return {} as Record<string, unknown>;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid save metadata");
    // Preserve unrelated entries verbatim, including fields from newer clients.
    return parsed as Record<string, unknown>;
  };
  readMetadata();

  const expected = new Map<string, number>();
  for (const save of expectedSaves) {
    if (save.name !== expectedCharacterName) throw new Error("Unexpected character in replacement snapshot");
    for (const file of save.files) {
      if (file.dbName !== archive.dbName) throw new Error("Cannot atomically restore across save databases");
      const timestamp = file.timestamp.getTime();
      if (!Number.isFinite(timestamp) || expected.has(file.key)) throw new Error("Invalid replacement snapshot");
      expected.set(file.key, timestamp);
    }
  }

  const listDatabases = (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }).databases;
  if (typeof listDatabases !== "function") throw new Error("Cannot safely enumerate save databases");
  const databases = await listDatabases.call(indexedDB);
  const compatTag = getRuntimeSaveCompatTag(runtimeVersion);
  const known = new Set([...getRuntimeSaveDbNames(runtimeVersion), ...getRuntimeRootPersistenceDbNames(runtimeVersion)]);
  const otherNames = databases.flatMap(({ name }) => {
    if (typeof name !== "string" || name === archive.dbName) return [];
    const matches = known.has(name) || name === `save-${compatTag}` || name.endsWith(`/save-${compatTag}`) || name === `root-${compatTag}` || name.endsWith(`/root-${compatTag}`);
    return matches ? [name] : [];
  });
  const belongsToCharacter = (key: IDBValidKey): boolean => {
    if (typeof key !== "string") return false;
    const filename = key.split("/").pop() ?? "";
    return /^\d+[^/]+/.test(filename) && resolveSaveLogicalName(filename, resolveSaveCategory(filename)) === expectedCharacterName;
  };
  // All other databases must be readable and contain no files for this name.
  // Opening a nonexistent DB is not necessary: databases() lists existing DBs.
  for (const name of otherNames) {
    const other = await openSaveDatabase(name, false);
    try {
      if (!other.objectStoreNames.contains("FILE_DATA")) throw new Error(`Cannot inspect save database ${name}`);
      await new Promise<void>((resolve, reject) => {
        const tx = other.transaction("FILE_DATA", "readonly");
        const request = tx.objectStore("FILE_DATA").getAllKeys();
        let found = false;
        request.onsuccess = () => { found = request.result.some(belongsToCharacter); };
        tx.oncomplete = () => found ? reject(new Error("Cannot atomically restore across save databases")) : resolve();
        tx.onabort = () => reject(tx.error ?? new Error("Save inspection aborted"));
        tx.onerror = () => reject(tx.error ?? new Error("Save inspection failed"));
      });
    } finally { other.close(); }
  }

  const db = await openSaveDatabase(archive.dbName, true);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("FILE_DATA", "readwrite");
      const store = tx.objectStore("FILE_DATA");
      const keys = store.getAllKeys();
      const values = store.getAll();
      let keysReady = false;
      let valuesReady = false;
      let reason: Error | null = null;
      const verifyAndWrite = () => {
        if (!keysReady || !valuesReady) return;
        try {
          const actual = new Map<string, number>();
          keys.result.forEach((key, index) => {
            if (!belongsToCharacter(key)) return;
            const timestamp = new Date(values.result[index]?.timestamp).getTime();
            if (typeof key !== "string" || !Number.isFinite(timestamp)) throw new Error("Unexpected save record; refresh the save list");
            actual.set(key, timestamp);
          });
          if (actual.size !== expected.size || [...expected].some(([key, timestamp]) => actual.get(key) !== timestamp)) {
            throw new Error("Save files changed; refresh the save list before restoring");
          }
          for (const key of expected.keys()) store.delete(key);
          // add prevents overwriting an unrelated key even if its metadata is malformed.
          for (const record of records) store.add(record.value, record.key);
        } catch (error) {
          reason = error instanceof Error ? error : new Error(String(error));
          tx.abort();
        }
      };
      keys.onsuccess = () => { keysReady = true; verifyAndWrite(); };
      values.onsuccess = () => { valuesReady = true; verifyAndWrite(); };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(reason ?? tx.error ?? new Error("Trial save replacement aborted"));
      tx.onerror = () => { /* onabort carries the final transaction failure */ };
    });
  } finally { db.close(); }

  try {
    // Re-read after the database work so intervening unrelated metadata edits
    // are retained; a failure here is explicitly marked as post-commit.
    const metadata = readMetadata();
    metadata[getRuntimeSavePresentationMetadataKey(runtimeVersion, archive.category, archive.name)] = {
      characterName: archive.displayName, playMode: archive.playMode,
      initOptions: archive.initOptions, runtimeVersion, updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(savePresentationMetadataStorageKey, JSON.stringify(metadata));
  } catch (error) {
    throw new TrialRestoreMetadataError(error);
  }
}
