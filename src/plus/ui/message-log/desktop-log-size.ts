/** Extra size, in CSS px, added on top of the default desktop log size. */
export interface DesktopLogExtraSize {
  readonly width: number;
  readonly height: number;
}

const storageKey = "nh3d-plus.desktopMessageLogExtraSize";
const maxExtraPx = 4000;

const clampAxis = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(maxExtraPx, value)))
    : 0;

/** The default size is the minimum, so extra size never goes below zero. */
export function clampDesktopLogExtraSize(
  size: Partial<DesktopLogExtraSize> | null | undefined,
): DesktopLogExtraSize {
  return {
    width: clampAxis(size?.width),
    height: clampAxis(size?.height),
  };
}

export function loadDesktopLogExtraSize(): DesktopLogExtraSize {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey);
    return clampDesktopLogExtraSize(raw ? JSON.parse(raw) : null);
  } catch {
    return clampDesktopLogExtraSize(null);
  }
}

export function saveDesktopLogExtraSize(size: DesktopLogExtraSize): void {
  try {
    const clamped = clampDesktopLogExtraSize(size);
    if (clamped.width === 0 && clamped.height === 0) {
      globalThis.localStorage?.removeItem(storageKey);
    } else {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(clamped));
    }
  } catch {
    // Storage can be unavailable (private mode, quota); the size just won't persist.
  }
}
