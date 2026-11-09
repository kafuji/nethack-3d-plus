import type { NethackMenuItem } from "../../ui-types";

/** Hand slot of a wielded inventory item, as seen from the player sprite. */
export type PlayerHeldWeaponSlot = "primary" | "secondary";

export interface PlayerHeldWeaponTile {
  readonly tileIndex: number;
  readonly sourceGlyph: number | null;
}

export interface PlayerHeldWeapons {
  readonly primary: PlayerHeldWeaponTile | null;
  readonly secondary: PlayerHeldWeaponTile | null;
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

/**
 * Classify one inventory annotation, e.g. "weapon in hand", "wielded in other
 * claw", "weapon in left hand". Alternate/quivered weapons are not held.
 */
export function classifyHeldWeaponAnnotation(
  annotation: string,
): PlayerHeldWeaponSlot | null {
  // "(weapon in hand, flickering)" style suffixes describe the same item.
  const text = annotation.split(",")[0].trim().toLowerCase();
  if (
    text === "off-hand weapon" ||
    /^(?:weapon|wielded) in (?:other|left) \S+$/.test(text)
  ) {
    return "secondary";
  }
  if (
    text === "wielded" ||
    /^(?:tethered )?weapon in (?:right )?\S+$/.test(text) ||
    /^wielded in right \S+$/.test(text)
  ) {
    return "primary";
  }
  return null;
}

export function classifyHeldWeaponInventoryText(
  text: string,
): PlayerHeldWeaponSlot | null {
  for (const match of text.matchAll(/\(([^()]*)\)/g)) {
    for (const part of match[1].split(";")) {
      const slot = classifyHeldWeaponAnnotation(part);
      if (slot) {
        return slot;
      }
    }
  }
  return null;
}

/** Find the wielded item(s) in an inventory snapshot. */
export function resolvePlayerHeldWeapons(
  inventory: readonly NethackMenuItem[],
): PlayerHeldWeapons {
  let primary: PlayerHeldWeaponTile | null = null;
  let secondary: PlayerHeldWeaponTile | null = null;
  for (const item of inventory) {
    if (!item || typeof item !== "object" || item.isCategory) {
      continue;
    }
    const slot = classifyHeldWeaponInventoryText(String(item.text ?? ""));
    if (!slot) {
      continue;
    }
    const tileIndex = toNonNegativeInteger(item.tileIndex);
    const sourceGlyph = toNonNegativeInteger(item.glyph);
    if (tileIndex === null && sourceGlyph === null) {
      continue;
    }
    const tile = { tileIndex: tileIndex ?? -1, sourceGlyph };
    if (slot === "primary" && !primary) {
      primary = tile;
    } else if (slot === "secondary" && !secondary) {
      secondary = tile;
    }
  }
  return { primary, secondary };
}

export function buildPlayerHeldWeaponsKey(weapons: PlayerHeldWeapons): string {
  const part = (tile: PlayerHeldWeaponTile | null): string =>
    tile ? `${tile.tileIndex}:${tile.sourceGlyph ?? -1}` : "-";
  return weapons.primary || weapons.secondary
    ? `${part(weapons.primary)}/${part(weapons.secondary)}`
    : "";
}

export interface WeaponImageSource {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface OutlinedWeaponCanvas {
  readonly canvas: HTMLCanvasElement;
  /** Transparent margin added on each side, as a fraction of the result. */
  readonly paddingU: number;
  readonly paddingV: number;
}

/**
 * Copy a weapon tile onto a slightly larger canvas with a crisp dark rim, so
 * thin blades stay readable over busy character art. Small tiles are
 * upscaled with nearest-neighbour first so the rim stays thin.
 */
export function createOutlinedWeaponCanvas(
  image: WeaponImageSource,
): OutlinedWeaponCanvas | null {
  if (typeof document === "undefined") {
    return null;
  }
  const scale = Math.max(1, Math.ceil(64 / Math.max(1, Math.min(image.width, image.height))));
  const width = image.width * scale;
  const height = image.height * scale;
  const outline = Math.max(1, Math.round(Math.min(width, height) / 40));
  const silhouette = document.createElement("canvas");
  silhouette.width = width;
  silhouette.height = height;
  const silhouetteContext = silhouette.getContext("2d");
  const canvas = document.createElement("canvas");
  canvas.width = width + outline * 2;
  canvas.height = height + outline * 2;
  const context = canvas.getContext("2d");
  if (!silhouetteContext || !context) {
    return null;
  }
  silhouetteContext.imageSmoothingEnabled = false;
  silhouetteContext.drawImage(image.source, 0, 0, width, height);
  silhouetteContext.globalCompositeOperation = "source-in";
  silhouetteContext.fillStyle = "rgba(8, 8, 12, 0.95)";
  silhouetteContext.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx !== 0 || dy !== 0) {
        context.drawImage(silhouette, outline + dx * outline, outline + dy * outline);
      }
    }
  }
  context.drawImage(image.source, outline, outline, width, height);
  return {
    canvas,
    paddingU: outline / canvas.width,
    paddingV: outline / canvas.height,
  };
}
