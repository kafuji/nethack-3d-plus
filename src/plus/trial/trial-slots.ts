import type { NethackRuntimeVersion } from "../../runtime/types";
import { deleteSavedGame, fetchSavedGames } from "../../ui/app/startup/saved-games";
import { exportSavedGame, importSavedGame, parseSaveArchive } from "../../ui/app/startup/save-transfer";

/**
 * Trial-and-error slots: copies of real NetHack save archives kept outside the
 * runtime save databases, so restoring a game (which deletes its save file)
 * never consumes the slot. Slots belong to one character, keyed by the same
 * logical save name the runtime uses.
 */
const TRIAL_SLOT_DB_NAME = "nh3d-trial-slots";
const TRIAL_SLOT_STORE = "slots";

/** Slots are numbered 1..TRIAL_SLOT_COUNT. */
export const TRIAL_SLOT_COUNT = 3;

/** Where the character was when saved, so slots can be told apart. */
export type TrialSlotSummary = {
  turn: number | null;
  dlevel: number | null;
};

export type TrialSlotInfo = TrialSlotSummary & {
  displayName: string;
  savedAt: Date;
};

type TrialSlotRecord = TrialSlotSummary & {
  archive: string;
  displayName: string;
  savedAt: string;
};

export type TrialSlotResume = {
  name: string;
  initOptions: string[];
  category: "manual" | "autosave";
};

function slotKeyPrefix(runtimeVersion: NethackRuntimeVersion, characterName: string): string {
  return `${runtimeVersion}:${characterName}:`;
}

function slotKey(runtimeVersion: NethackRuntimeVersion, characterName: string, slot: number): string {
  return `${slotKeyPrefix(runtimeVersion, characterName)}${slot}`;
}

function openTrialSlotDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TRIAL_SLOT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(TRIAL_SLOT_STORE)) {
        request.result.createObjectStore(TRIAL_SLOT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withSlotStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openTrialSlotDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(TRIAL_SLOT_STORE, mode);
      const request = run(transaction.objectStore(TRIAL_SLOT_STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error("Trial slot transaction aborted"));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

async function readSlotRecord(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
  slot: number,
): Promise<TrialSlotRecord | null> {
  const record = await withSlotStore<TrialSlotRecord | undefined>(
    "readonly", store => store.get(slotKey(runtimeVersion, characterName, slot)),
  );
  return record ?? null;
}

/** Every slot of the character, index 0 being slot 1; null for empty slots. */
export async function readTrialSlots(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
): Promise<Array<TrialSlotInfo | null>> {
  const slots: Array<TrialSlotInfo | null> = [];
  for (let slot = 1; slot <= TRIAL_SLOT_COUNT; slot += 1) {
    const record = await readSlotRecord(runtimeVersion, characterName, slot);
    slots.push(record ? {
      displayName: record.displayName,
      savedAt: new Date(record.savedAt),
      turn: record.turn ?? null,
      dlevel: record.dlevel ?? null,
    } : null);
  }
  return slots;
}

/** A new character with a reused name must not inherit the old one's slots. */
export async function clearTrialSlots(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
): Promise<void> {
  const prefix = slotKeyPrefix(runtimeVersion, characterName);
  // Keys are "<prefix><digits>", so the range ends before the next character.
  await withSlotStore("readwrite", store => store.delete(IDBKeyRange.bound(prefix, `${prefix}\uffff`)));
}

async function findNewestManualSave(runtimeVersion: NethackRuntimeVersion) {
  const saves = (await fetchSavedGames(runtimeVersion))
    .filter(save => save.category === "manual" && save.isResumable)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  if (!saves[0]) throw new Error("No manual save found after saving");
  return saves[0];
}

/** Copy the save file NetHack just wrote into a slot; returns how to resume it. */
export async function captureTrialSlot(
  runtimeVersion: NethackRuntimeVersion,
  slot: number,
  summary: TrialSlotSummary,
): Promise<TrialSlotResume> {
  const save = await findNewestManualSave(runtimeVersion);
  const archive = await exportSavedGame(save, runtimeVersion);
  const record: TrialSlotRecord = {
    archive, displayName: save.displayName, savedAt: new Date().toISOString(), ...summary,
  };
  await withSlotStore("readwrite", store => store.put(record, slotKey(runtimeVersion, save.name, slot)));
  return { name: save.name, initOptions: save.initOptions ?? [], category: "manual" };
}

/** The just-saved game, for resuming after a save without touching the slot. */
export async function resolveLatestManualSave(
  runtimeVersion: NethackRuntimeVersion,
): Promise<TrialSlotResume> {
  const save = await findNewestManualSave(runtimeVersion);
  return { name: save.name, initOptions: save.initOptions ?? [], category: "manual" };
}

/**
 * Replace every runtime save of the character with the record's copy. The
 * previous worker must be gone, or its final IDBFS sync would overwrite it.
 */
async function restoreRecord(
  runtimeVersion: NethackRuntimeVersion,
  record: TrialSlotRecord,
): Promise<TrialSlotResume> {
  const archive = parseSaveArchive(record.archive, runtimeVersion);
  // A manual save and checkpoint shards of the same character would make
  // NetHack ask about the "game in progress" instead of restoring this copy.
  for (const save of await fetchSavedGames(runtimeVersion)) {
    if (save.name === archive.name) await deleteSavedGame(save);
  }
  await importSavedGame(record.archive, runtimeVersion);
  return { name: archive.name, initOptions: archive.initOptions, category: archive.category };
}

export async function restoreTrialSlot(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
  slot: number,
): Promise<TrialSlotResume> {
  const record = await readSlotRecord(runtimeVersion, characterName, slot);
  if (!record) throw new Error("Trial slot is empty");
  return restoreRecord(runtimeVersion, record);
}

/*
 * Automatic snapshots. With the `checkpoint` option NetHack writes the game
 * state and level files ("<lock>.<n>" shards) whenever the hero changes level,
 * and the runtime syncs them to IndexedDB shortly after. Copying that shard
 * set is a snapshot of the arrival on each level, taken without restarting
 * the runtime; it is restored through the regular autosave recovery path.
 */
export const AUTO_SNAPSHOT_LIMIT = 5;

export type TrialCharacterSaves = {
  name: string;
  displayName: string;
  slots: Array<TrialSlotInfo | null>;
  snapshots: TrialAutoSnapshotInfo[];
};

/**
 * Every character of this runtime with slots or snapshots, newest save
 * first. Independent of the runtime's own saves, which a death, a quit or
 * a lost autosave can remove while the slots remain.
 */
export async function listTrialCharacters(
  runtimeVersion: NethackRuntimeVersion,
): Promise<TrialCharacterSaves[]> {
  const prefix = `${runtimeVersion}:`;
  const keys = await withSlotStore<IDBValidKey[]>(
    "readonly", store => store.getAllKeys(IDBKeyRange.bound(prefix, `${prefix}￿`)),
  );
  // Keys are "<runtime>:<name>:<slot or auto-time>"; names may contain ':'.
  const names = new Set(
    keys.map(key => String(key)).map(key => key.slice(prefix.length, key.lastIndexOf(":"))),
  );
  const characters: TrialCharacterSaves[] = [];
  for (const name of names) {
    if (!name) continue;
    const [slots, snapshots] = await Promise.all([
      readTrialSlots(runtimeVersion, name),
      readAutoSnapshots(runtimeVersion, name),
    ]);
    const saves = [...slots.filter((slot): slot is TrialSlotInfo => slot !== null), ...snapshots];
    if (!saves.length) continue;
    characters.push({ name, displayName: saves[0].displayName || name, slots, snapshots });
  }
  const newest = (character: TrialCharacterSaves) => Math.max(
    ...character.slots.map(slot => slot?.savedAt.getTime() ?? 0),
    ...character.snapshots.map(snapshot => snapshot.savedAt.getTime()),
  );
  return characters.sort((a, b) => newest(b) - newest(a));
}

const AUTO_SNAPSHOT_KEY_PART = "auto-";

export type TrialAutoSnapshotInfo = TrialSlotInfo & { id: string };

type TrialAutoSnapshotRecord = TrialSlotRecord & { checkpointTime: number };

function autoSnapshotPrefix(runtimeVersion: NethackRuntimeVersion, characterName: string): string {
  return `${slotKeyPrefix(runtimeVersion, characterName)}${AUTO_SNAPSHOT_KEY_PART}`;
}

async function readAutoSnapshotEntries(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
): Promise<Array<{ key: string; record: TrialAutoSnapshotRecord }>> {
  const prefix = autoSnapshotPrefix(runtimeVersion, characterName);
  const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
  const db = await openTrialSlotDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(TRIAL_SLOT_STORE, "readonly");
      const store = transaction.objectStore(TRIAL_SLOT_STORE);
      const keys = store.getAllKeys(range);
      const values = store.getAll(range);
      transaction.oncomplete = () => resolve(
        keys.result
          .map((key, index) => ({ key: String(key), record: values.result[index] as TrialAutoSnapshotRecord }))
          // Keys embed a zero-padded capture time: newest first.
          .sort((a, b) => b.key.localeCompare(a.key)),
      );
      transaction.onabort = () => reject(transaction.error ?? new Error("Trial snapshot read aborted"));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

/** Newest first. */
export async function readAutoSnapshots(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
): Promise<TrialAutoSnapshotInfo[]> {
  return (await readAutoSnapshotEntries(runtimeVersion, characterName)).map(({ key, record }) => ({
    id: key,
    displayName: record.displayName,
    savedAt: new Date(record.savedAt),
    turn: record.turn ?? null,
    dlevel: record.dlevel ?? null,
  }));
}

/**
 * Copy the character's current checkpoint shards into a new snapshot, but only
 * once they are newer than `newerThan` (the previous snapshot's checkpoint
 * time); returns the captured checkpoint time, or null if not synced yet.
 */
export async function captureAutoSnapshot(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
  summary: TrialSlotSummary,
  newerThan: number,
): Promise<number | null> {
  const save = (await fetchSavedGames(runtimeVersion)).find(
    candidate => candidate.category === "autosave" && candidate.name === characterName && candidate.isResumable,
  );
  if (!save || save.timestamp.getTime() <= newerThan) return null;
  const archive = await exportSavedGame(save, runtimeVersion);
  const capturedAt = Date.now();
  const record: TrialAutoSnapshotRecord = {
    archive,
    displayName: save.displayName,
    savedAt: new Date(capturedAt).toISOString(),
    checkpointTime: save.timestamp.getTime(),
    ...summary,
  };
  const key = `${autoSnapshotPrefix(runtimeVersion, characterName)}${String(capturedAt).padStart(15, "0")}`;
  const stale = (await readAutoSnapshotEntries(runtimeVersion, characterName))
    .slice(AUTO_SNAPSHOT_LIMIT - 1)
    .map(entry => entry.key);
  const db = await openTrialSlotDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TRIAL_SLOT_STORE, "readwrite");
      const store = transaction.objectStore(TRIAL_SLOT_STORE);
      store.put(record, key);
      for (const staleKey of stale) store.delete(staleKey);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Trial snapshot write aborted"));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
  return record.checkpointTime;
}

export async function restoreAutoSnapshot(
  runtimeVersion: NethackRuntimeVersion,
  characterName: string,
  id: string,
): Promise<TrialSlotResume> {
  const entry = (await readAutoSnapshotEntries(runtimeVersion, characterName)).find(item => item.key === id);
  if (!entry) throw new Error("Trial snapshot not found");
  return restoreRecord(runtimeVersion, entry.record);
}
