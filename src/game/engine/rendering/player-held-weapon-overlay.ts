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

export interface HeldWeaponOverlayImage {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

function createOutlineSilhouette(
  image: HeldWeaponOverlayImage,
  drawWidth: number,
  drawHeight: number,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(drawWidth));
  canvas.height = Math.max(1, Math.round(drawHeight));
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "rgba(8, 8, 12, 0.95)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Fraction of the sprite's shorter side covered by one weapon tile. */
export const PLAYER_HELD_WEAPON_OVERLAY_SCALE = 0.62;

/**
 * Draw held weapons over an already painted player sprite. The main weapon
 * sits on the viewer's right; the off-hand weapon is mirrored on the left so
 * dual-wielded blades read as a pair.
 */
export function drawPlayerHeldWeaponOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  primary: HeldWeaponOverlayImage | null,
  secondary: HeldWeaponOverlayImage | null,
): void {
  const minAxis = Math.max(1, Math.min(width, height));
  const drawWeapon = (image: HeldWeaponOverlayImage, mirrored: boolean) => {
    const fit = (minAxis * PLAYER_HELD_WEAPON_OVERLAY_SCALE) /
      Math.max(1, Math.max(image.width, image.height));
    const drawWidth = image.width * fit;
    const drawHeight = image.height * fit;
    // Keep the weapon inside the sprite bounds so the billboard's grounding
    // and footprint stay identical to the undecorated sprite.
    const outline = Math.max(1, Math.round(minAxis / 40));
    const left = mirrored ? outline : width - drawWidth - outline;
    const top = height - drawHeight - outline;
    const silhouette = createOutlineSilhouette(image, drawWidth, drawHeight);
    context.save();
    if (mirrored) {
      context.translate(left + drawWidth, top);
      context.scale(-1, 1);
    } else {
      context.translate(left, top);
    }
    // A crisp dark rim keeps thin blades readable over busy character art.
    if (silhouette) {
      for (let dy = -outline; dy <= outline; dy += outline) {
        for (let dx = -outline; dx <= outline; dx += outline) {
          if (dx !== 0 || dy !== 0) {
            context.drawImage(silhouette, dx, dy, drawWidth, drawHeight);
          }
        }
      }
    }
    context.drawImage(image.source, 0, 0, drawWidth, drawHeight);
    context.restore();
  };
  if (secondary) {
    drawWeapon(secondary, true);
  }
  if (primary) {
    drawWeapon(primary, false);
  }
}
