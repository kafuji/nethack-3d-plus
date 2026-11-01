import { create } from "zustand";
import type { PlayerTileTerrainId } from "./terrain-names";

/** What the HUD knows about the square the hero stands on. Text stays in NetHack's English. */
export interface PlayerTileInfo {
  active: boolean;
  /** Feature as NetHack described it ("a staircase down", "an altar to Anhur (chaotic)"). */
  featureText: string | null;
  /** Feature read from the remembered map symbol when NetHack has not described it. */
  terrainId: PlayerTileTerrainId | null;
  items: string[];
  /** "a few", "several" or "many" when NetHack summarized a pile instead of listing it. */
  pileSummary: string | null;
  /** The runtime reports an object here that no message has named. */
  hasUnnamedObjects: boolean;
  /** A pickup or other change may have left the list out of date. */
  itemsMayBeStale: boolean;
  engraving: string | null;
}

export const emptyPlayerTileInfo: PlayerTileInfo = {
  active: false,
  featureText: null,
  terrainId: null,
  items: [],
  pileSummary: null,
  hasUnnamedObjects: false,
  itemsMayBeStale: false,
  engraving: null,
};

export const usePlayerTileInfoStore = create<{ info: PlayerTileInfo }>(() => ({
  info: emptyPlayerTileInfo,
}));

const featurePattern = /^There is (.+) here\.$/;
const pilePattern = /^There (?:are|is) (a few|several|many)(?: other)? objects here\.$/;
const singleItemPattern = /^You (?:see|feel) here (.+)\.$/;
const noObjectsPattern = /^You (?:see|feel) no objects here\.$/;
const listHeaderPattern = /^(?:Other things|Things) that (?:are|you feel) here:$/;
const engravingPattern = /^You read: "(.*)"\.$/;
const dropPattern = /^You drop (.+)\.$/;
const pickupPattern = /^[a-zA-Z$#] - (.+)\.$/;

/** Compare floor and inventory names loosely: ignore counts, articles, plurals and status notes. */
export function itemMatchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^(?:a|an|the|\d+)\s+/, "")
    .split(/\s+/)
    .map((word) => word.replace(/(?:es|s)$/, ""))
    .join(" ")
    .trim();
}

/** Follow look_here(), pickup, drop and engraving messages for the hero's square. */
export class PlayerTileInfoTracker {
  private position: { x: number; y: number } | null = null;
  private info: PlayerTileInfo = emptyPlayerTileInfo;

  constructor(
    private readonly resolveTerrain: (x: number, y: number) => PlayerTileTerrainId | null,
    private readonly publish: (info: PlayerTileInfo) => void = (info) =>
      usePlayerTileInfoStore.setState({ info }),
  ) {}

  get snapshot(): PlayerTileInfo {
    return this.info;
  }

  reset(): void {
    this.position = null;
    this.update(emptyPlayerTileInfo);
  }

  setPosition(x: number, y: number): void {
    if (this.position && this.position.x === x && this.position.y === y) {
      this.refreshTerrain();
      return;
    }
    this.position = { x, y };
    // look_here() runs after the hero is redrawn, so a new square starts empty.
    this.update({ ...emptyPlayerTileInfo, active: true, terrainId: this.resolveTerrain(x, y) });
  }

  refreshTerrain(): void {
    if (!this.position) return;
    const terrainId = this.resolveTerrain(this.position.x, this.position.y);
    if (terrainId !== this.info.terrainId) this.update({ ...this.info, terrainId });
  }

  /** Runtime top-object probe for the hero's square: null glyph means nothing is there. */
  setRuntimeObjectPresence(x: number, y: number, present: boolean): void {
    if (!this.position || this.position.x !== x || this.position.y !== y) return;
    if (!present) {
      this.update({ ...this.info, items: [], pileSummary: null, hasUnnamedObjects: false, itemsMayBeStale: false });
      return;
    }
    const hasUnnamedObjects = this.info.items.length === 0 && this.info.pileSummary === null;
    if (hasUnnamedObjects !== this.info.hasUnnamedObjects) this.update({ ...this.info, hasUnnamedObjects });
  }

  captureMessage(text: string): void {
    if (!this.position || typeof text !== "string") return;
    for (const rawLine of text.split("\n")) this.captureLine(rawLine.trim());
  }

  captureInfoMenuLines(lines: readonly string[], title = ""): void {
    if (!this.position) return;
    const trimmed = lines.map((line) => String(line ?? "").trim());
    // The header is usually a line, but a window port may lift it into the title.
    const headerIndex = trimmed.findIndex((line) => listHeaderPattern.test(line));
    if (headerIndex < 0 && !listHeaderPattern.test(title.trim())) return;
    for (const line of trimmed.slice(0, Math.max(headerIndex, 0))) {
      const feature = featurePattern.exec(line);
      if (feature) this.update({ ...this.info, featureText: feature[1] });
    }
    const items = trimmed.slice(headerIndex + 1).filter((line) => line.length > 0);
    this.setItems(items);
  }

  private captureLine(line: string): void {
    if (!line) return;
    let match: RegExpExecArray | null;
    if ((match = singleItemPattern.exec(line))) {
      this.setItems([match[1]]);
    } else if (noObjectsPattern.test(line)) {
      this.setItems([]);
    } else if ((match = pilePattern.exec(line))) {
      this.update({ ...this.info, items: [], pileSummary: match[1], hasUnnamedObjects: false, itemsMayBeStale: false });
    } else if ((match = featurePattern.exec(line))) {
      this.update({ ...this.info, featureText: match[1] });
    } else if ((match = engravingPattern.exec(line))) {
      this.update({ ...this.info, engraving: match[1] });
    } else if ((match = dropPattern.exec(line))) {
      if (this.info.pileSummary === null) {
        this.update({ ...this.info, items: [match[1], ...this.info.items], hasUnnamedObjects: false });
      }
    } else if ((match = pickupPattern.exec(line))) {
      this.removePickedUpItem(match[1]);
    }
  }

  private removePickedUpItem(name: string): void {
    if (this.info.items.length === 0) return;
    const key = itemMatchKey(name);
    const index = this.info.items.findIndex((item) => itemMatchKey(item) === key);
    if (index < 0) {
      this.update({ ...this.info, itemsMayBeStale: true });
      return;
    }
    const items = this.info.items.filter((_, itemIndex) => itemIndex !== index);
    this.update({ ...this.info, items });
  }

  private setItems(items: string[]): void {
    this.update({ ...this.info, items, pileSummary: null, hasUnnamedObjects: false, itemsMayBeStale: false });
  }

  private update(next: PlayerTileInfo): void {
    const previous = this.info;
    this.info = next;
    if (
      previous.active !== next.active ||
      previous.featureText !== next.featureText ||
      previous.terrainId !== next.terrainId ||
      previous.pileSummary !== next.pileSummary ||
      previous.hasUnnamedObjects !== next.hasUnnamedObjects ||
      previous.itemsMayBeStale !== next.itemsMayBeStale ||
      previous.engraving !== next.engraving ||
      previous.items.length !== next.items.length ||
      previous.items.some((item, index) => item !== next.items[index])
    ) {
      this.publish(next);
    }
  }
}
