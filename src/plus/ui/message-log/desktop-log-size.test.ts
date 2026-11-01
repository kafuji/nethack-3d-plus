import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampDesktopLogExtraSize,
  loadDesktopLogExtraSize,
  saveDesktopLogExtraSize,
} from "./desktop-log-size";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

describe("desktop log extra size", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never shrinks below the default size", () => {
    expect(clampDesktopLogExtraSize({ width: -40, height: 12.6 })).toEqual({
      width: 0,
      height: 13,
    });
    expect(clampDesktopLogExtraSize(null)).toEqual({ width: 0, height: 0 });
    expect(
      clampDesktopLogExtraSize({ width: Number.NaN, height: Infinity }),
    ).toEqual({ width: 0, height: 0 });
  });

  it("round-trips through storage and clears it at the default size", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);

    saveDesktopLogExtraSize({ width: 120, height: 80 });
    expect(loadDesktopLogExtraSize()).toEqual({ width: 120, height: 80 });

    saveDesktopLogExtraSize({ width: 0, height: 0 });
    expect(storage.length).toBe(0);
    expect(loadDesktopLogExtraSize()).toEqual({ width: 0, height: 0 });
  });

  it("ignores corrupt stored values", () => {
    const storage = createMemoryStorage();
    storage.setItem("nh3d-plus.desktopMessageLogExtraSize", "{not json");
    vi.stubGlobal("localStorage", storage);

    expect(loadDesktopLogExtraSize()).toEqual({ width: 0, height: 0 });
  });
});
