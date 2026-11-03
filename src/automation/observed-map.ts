import type { RuntimeEvent } from "../runtime";
import type { RuntimeObservationScope } from "../runtime/protocol/types";
import { classifyTileBehavior } from "../game/glyphs/behavior";

/** Only the character and color displayed by NetHack, never underlying glyph identities. */
export type ObservedMapCellKind = "floor" | "wall" | "door_open" | "door_closed" | "stairs_up" | "stairs_down" | "fountain" | "water" | "trap" | "feature" | "item" | "creature" | "effect" | "unknown";
export type ObservedMapCell = { x: number; y: number; char: string | null; color: number | null; kind: ObservedMapCellKind };

/** Classify only the already-displayed glyph, never underlay or entity identity. */
function observedKind(tile: Record<string, unknown>, char: string | null, color: number | null): ObservedMapCellKind {
  if (!Number.isSafeInteger(tile.glyph) || (tile.glyph as number) < 0) return "unknown";
  const behavior = classifyTileBehavior({
    glyph: tile.glyph as number,
    runtimeChar: char,
    runtimeColor: color,
    runtimeSymidx: typeof tile.symidx === "number" ? tile.symidx : null,
    runtimeTileIndex: typeof tile.tileIndex === "number" ? tile.tileIndex : null,
  });
  switch (behavior.resolved.kind) {
    case "mon": case "pet": case "ridden": case "detect": case "invis": return "creature";
    case "obj": case "body": case "statue": return "item";
    case "warning": case "zap": case "explode": case "swallow": return "effect";
    case "cmap":
      switch (behavior.materialKind) {
        case "floor": case "dark": return "floor";
        case "wall": case "dark_wall": return "wall";
        case "door": return behavior.isWall ? "door_closed" : "door_open";
        case "stairs_up": case "stairs_down": case "fountain": case "water": case "trap": case "feature": return behavior.materialKind;
        default: return "unknown";
      }
    default: return "unknown";
  }
}
export type ObservedMapSnapshot = {
  levelGeneration: number | null;
  presentationGeneration: number | null;
  revision: number;
  cells: ObservedMapCell[];
};

/** An event-ordered view of what the map window has shown. This is not WASM world state. */
export class ObservedMap {
  private sessionId: string | null = null;
  private levelGeneration: number | null = null;
  private presentationGeneration: number | null = null;
  private revision = 0;
  private cells = new Map<string, ObservedMapCell>();

  observe(event: RuntimeEvent, sessionId: string, scope: RuntimeObservationScope): void {
    if (this.sessionId !== sessionId) {
      this.sessionId = sessionId;
      this.levelGeneration = null;
      this.presentationGeneration = null;
      this.cells.clear();
      this.revision++;
    }
    if (this.levelGeneration !== null && this.levelGeneration !== scope.levelGeneration) {
      this.cells.clear();
      this.revision++;
    }
    this.levelGeneration = scope.levelGeneration;
    this.presentationGeneration = scope.presentationGeneration;
    if (event.type === "clear_scene") {
      // A presentation reset is not necessarily a physical level change.
      // Wait for the subsequent redraw instead of retaining stale occupants.
      this.cells.clear();
      this.revision++;
    } else if (event.type === "map_glyph") {
      this.observeCell(event);
    } else if (event.type === "map_glyph_batch" && Array.isArray(event.tiles)) {
      for (const tile of event.tiles) this.observeCell(tile);
    }
  }

  private observeCell(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const tile = value as Record<string, unknown>;
    if (!Number.isSafeInteger(tile.x) || !Number.isSafeInteger(tile.y) || (tile.x as number) < 0 || (tile.y as number) < 0) return;
    const x = tile.x as number;
    const y = tile.y as number;
    const key = `${x},${y}`;
    if (tile.isRuntimeUndiscoveredClear === true) {
      if (this.cells.delete(key)) this.revision++;
      return;
    }
    const char = typeof tile.char === "string" && tile.char.length ? tile.char : null;
    const color = typeof tile.color === "number" && Number.isFinite(tile.color) ? tile.color : null;
    const kind = observedKind(tile, char, color);
    const previous = this.cells.get(key);
    if (previous && previous.char === char && previous.color === color && previous.kind === kind) return;
    this.cells.set(key, { x, y, char, color, kind });
    this.revision++;
  }

  snapshot(): ObservedMapSnapshot {
    return {
      levelGeneration: this.levelGeneration,
      presentationGeneration: this.presentationGeneration,
      revision: this.revision,
      cells: Array.from(this.cells.values(), cell => ({ ...cell })).sort((a, b) => a.y - b.y || a.x - b.x),
    };
  }

}
