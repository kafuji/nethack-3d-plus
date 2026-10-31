import {
  type TopScoreTimelineEvent
} from "../../../runtime/top-score-storage";
import type {
  TopScoreTimelineFilterConfig,
  TopScoreTimelineFilterId
} from "./types";
import {
  plusStrings
} from "../shared/translations";

// nh3d-plus: localized via src/plus/i18n.
const topScoreStrings = plusStrings.topScores;

/** Timeline filter catalog and event-kind classification. */
export const topScoreTimelineFilterConfigs: readonly TopScoreTimelineFilterConfig[] = [
  {
    id: "kills",
    label: topScoreStrings.timeline.filters.kills.label,
    detail: topScoreStrings.timeline.filters.kills.detail,
    color: "#ff8a8a",
    tint: "rgba(255, 138, 138, 0.18)",
    rowType: "line",
  },
  {
    id: "gold",
    label: topScoreStrings.timeline.filters.gold.label,
    detail: topScoreStrings.timeline.filters.gold.detail,
    color: "#f2d06f",
    tint: "rgba(242, 208, 111, 0.18)",
    rowType: "line",
  },
  {
    id: "loot",
    label: topScoreStrings.timeline.filters.loot.label,
    detail: topScoreStrings.timeline.filters.loot.detail,
    color: "#8fe4c3",
    tint: "rgba(143, 228, 195, 0.18)",
    rowType: "line",
  },
  {
    id: "secrets",
    label: topScoreStrings.timeline.filters.secrets.label,
    detail: topScoreStrings.timeline.filters.secrets.detail,
    color: "#c7b8ff",
    tint: "rgba(199, 184, 255, 0.18)",
    rowType: "line",
  },
  {
    id: "levels",
    label: topScoreStrings.timeline.filters.levels.label,
    detail: topScoreStrings.timeline.filters.levels.detail,
    color: "#9bd470",
    tint: "rgba(155, 212, 112, 0.18)",
    rowType: "line",
  },
  {
    id: "hazards",
    label: topScoreStrings.timeline.filters.hazards.label,
    detail: topScoreStrings.timeline.filters.hazards.detail,
    color: "#ffb17a",
    tint: "rgba(255, 177, 122, 0.18)",
    rowType: "line",
  },
  {
    id: "magic",
    label: topScoreStrings.timeline.filters.magic.label,
    detail: topScoreStrings.timeline.filters.magic.detail,
    color: "#80e2ff",
    tint: "rgba(128, 226, 255, 0.18)",
    rowType: "line",
  },
  {
    id: "milestones",
    label: topScoreStrings.timeline.filters.milestones.label,
    detail: topScoreStrings.timeline.filters.milestones.detail,
    color: "#7ec8ff",
    tint: "rgba(126, 200, 255, 0.18)",
    rowType: "markers",
  },
] as const;

export const defaultTopScoreTimelineFilters: TopScoreTimelineFilterId[] = [
  "kills",
  "gold",
  "loot",
  "secrets",
  "levels",
  "hazards",
  "milestones",
];

export function resolveTopScoreTimelineFilterId(
  event: TopScoreTimelineEvent,
): TopScoreTimelineFilterId {
  switch (event.kind) {
    case "kill":
      return "kills";
    case "gold":
      return "gold";
    case "loot":
      return "loot";
    case "hidden-find":
      return "secrets";
    case "experience-level":
      return "levels";
    case "trap":
      return "hazards";
    case "spell-learned":
      return "magic";
    default:
      return "milestones";
  }
}

export function resolveTopScoreTimelineFilterConfig(
  filterId: TopScoreTimelineFilterId,
): TopScoreTimelineFilterConfig {
  return (
    topScoreTimelineFilterConfigs.find((config) => config.id === filterId) ??
    topScoreTimelineFilterConfigs[0]
  );
}
