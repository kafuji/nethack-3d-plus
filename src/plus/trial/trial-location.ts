import type { SupportedLocale } from "../../i18n/core";
import { translateGameLocation } from "../../i18n/game-location";
import type { TrialSlotSummary } from "./trial-slots";

const MAIN_DUNGEON = "Dungeons of Doom";
const ELEMENTAL_PLANES = "Elemental Planes";
/** Levels of the Elemental Planes by their number in that dungeon. */
const PLANE_BY_BRANCH_LEVEL = [
  "Astral Plane",
  "Plane of Water",
  "Plane of Fire",
  "Plane of Air",
  "Plane of Earth",
];

/**
 * Where a save was made, for its list entry. Depth alone is enough in the main
 * dungeon; other branches name themselves, because they share depths with it,
 * and the planes have no meaningful depth at all (it is negative).
 */
export function describeTrialLocation(
  location: Pick<TrialSlotSummary, "dlevel" | "dungeon" | "branchLevel">,
  formatDepth: (depth: number) => string,
  locale: SupportedLocale,
): string | null {
  const { dlevel: depth, dungeon, branchLevel } = location;
  if (dungeon === ELEMENTAL_PLANES) {
    const plane = branchLevel == null ? undefined : PLANE_BY_BRANCH_LEVEL[branchLevel - 1];
    return translateGameLocation(plane ?? dungeon, locale);
  }
  const depthLabel = depth != null && depth > 0 ? formatDepth(depth) : null;
  if (!dungeon || dungeon === MAIN_DUNGEON) return depthLabel;
  const dungeonLabel = translateGameLocation(dungeon, locale);
  return depthLabel ? `${dungeonLabel} ${depthLabel}` : dungeonLabel;
}
