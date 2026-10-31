import {
  type TopScoreRecord,
  type TopScoreTimelineEvent
} from "../../../runtime/top-score-storage";
import type {
  TopScoreTimelineCluster,
  TopScoreTimelineDisplayEvent,
  TopScoreTimelineFilterId
} from "./types";
import {
  formatTopScoreInteger,
  resolveTopScoreAttributeValue
} from "./format";
import {
  resolveTopScoreTimelineEvents
} from "./timeline-events";
import {
  plusStrings
} from "../shared/translations";

// nh3d-plus: localized via src/plus/i18n.
const topScoreStrings = plusStrings.topScores;

/** Timeline event and line labels and level resolution. */
export function formatTopScoreTimelineClusterTurnLabel(
  cluster: TopScoreTimelineCluster,
): string {
  if (cluster.turnStart === cluster.turnEnd) {
    return topScoreStrings.timeline.turn(formatTopScoreInteger(cluster.turnStart));
  }
  return topScoreStrings.timeline.turnRange(
    formatTopScoreInteger(cluster.turnStart),
    formatTopScoreInteger(cluster.turnEnd),
  );
}

// nh3d-plus: timeline labels captured during play are stored in English.
// Map the known capture formats to the active locale when displaying them.
const storedTimelineTextPatterns: ReadonlyArray<
  [RegExp, (match: RegExpExecArray) => string]
> = [
  [/^Reached new depth$/, () => topScoreStrings.timeline.events.reachedNewDepth],
  [
    /^Reached experience level (\d+)\.$/,
    (match) => topScoreStrings.timeline.events.reachedExperienceLevel(Number(match[1])),
  ],
  [
    /^Slipped to experience level (\d+)\.$/,
    (match) => topScoreStrings.timeline.events.slippedExperienceLevel(Number(match[1])),
  ],
  [/^Reached (.+)\.$/, (match) =>
    topScoreStrings.timeline.events.reachedLocation(localizeTopScoreStoredLocation(match[1]!))],
  [/^\+(\d+) gold$/, (match) => topScoreStrings.timeline.events.goldGained(Number(match[1]))],
  [/^Picked up 1 gold piece\.$/, () => topScoreStrings.timeline.events.pickedUpGold(1)],
  [
    /^Picked up (\d+) gold pieces\.$/,
    (match) => topScoreStrings.timeline.events.pickedUpGold(Number(match[1])),
  ],
  [/^Level (\d+)$/, (match) => topScoreStrings.timeline.events.levelLabel(Number(match[1]))],
  [/^Escaped$/, () => topScoreStrings.timeline.events.escaped],
  [/^Enemy defeated$/, () => topScoreStrings.timeline.events.enemyDefeated],
  [/^Run ended$/, () => topScoreStrings.timeline.events.runEnded],
  [/^Run ended\.$/, () => topScoreStrings.timeline.events.runEndedSummary],
];

export function localizeTopScoreStoredLocation(location: string): string {
  const match = /^Depth (\d+)$/.exec(location);
  return match ? topScoreStrings.format.depth(match[1]!) : location;
}

export function localizeTopScoreStoredTimelineText(text: string): string {
  for (const [pattern, format] of storedTimelineTextPatterns) {
    const match = pattern.exec(text);
    if (match) {
      return format(match);
    }
  }
  return text;
}

export function formatTopScoreTimelineEventBadge(event: TopScoreTimelineEvent): string {
  switch (event.kind) {
    case "kill":
      return topScoreStrings.timeline.badges.kill;
    case "gold":
      return topScoreStrings.timeline.badges.gold;
    case "loot":
      return topScoreStrings.timeline.badges.loot;
    case "location":
      return topScoreStrings.timeline.badges.location;
    case "experience-level":
      return topScoreStrings.timeline.badges.level;
    case "trap":
      return topScoreStrings.timeline.badges.trap;
    case "escape":
      return topScoreStrings.timeline.badges.escape;
    case "hidden-find":
      return topScoreStrings.timeline.badges.hidden;
    case "search":
      return topScoreStrings.timeline.badges.search;
    case "spell-learned":
      return topScoreStrings.timeline.badges.spell;
    case "death":
      return topScoreStrings.timeline.badges.ending;
    default:
      return topScoreStrings.timeline.badges.moment;
  }
}

export function formatTopScoreTimelineEventMeta(event: TopScoreTimelineEvent): string {
  switch (event.kind) {
    case "gold": {
      const parts: string[] = [];
      if (typeof event.amount === "number" && Number.isFinite(event.amount)) {
        const amount = Math.trunc(event.amount);
        parts.push(topScoreStrings.timeline.meta.goldAmount(`${amount > 0 ? "+" : ""}${amount}`));
      }
      if (typeof event.total === "number" && Number.isFinite(event.total)) {
        parts.push(topScoreStrings.timeline.meta.purse(Math.trunc(event.total)));
      }
      return parts.join(" / ");
    }
    case "loot": {
      const parts: string[] = [];
      if (typeof event.amount === "number" && Number.isFinite(event.amount)) {
        parts.push(
          topScoreStrings.timeline.meta.collected(formatTopScoreInteger(Math.trunc(event.amount))),
        );
      }
      if (event.detail) {
        parts.push(event.detail);
      }
      return parts.join(" / ");
    }
    case "location":
      return localizeTopScoreStoredLocation(event.location ?? "");
    case "experience-level": {
      const parts: string[] = [];
      if (typeof event.amount === "number" && Number.isFinite(event.amount)) {
        const amount = Math.trunc(event.amount);
        if (amount !== 0) {
          parts.push(
            topScoreStrings.timeline.meta.levelDelta(`${amount > 0 ? "+" : ""}${amount}`, amount),
          );
        }
      }
      if (typeof event.total === "number" && Number.isFinite(event.total)) {
        parts.push(topScoreStrings.timeline.meta.level(Math.trunc(event.total)));
      }
      if (event.detail) {
        parts.push(localizeTopScoreStoredLocation(event.detail));
      }
      return parts.join(" / ");
    }
    case "trap":
      return event.location ?? event.detail ?? "";
    case "escape":
      return event.location ?? event.detail ?? "";
    case "hidden-find":
      return event.location ?? event.detail ?? "";
    case "search":
      return event.location ?? "";
    case "spell-learned":
      return event.detail ?? event.location ?? "";
    case "death":
      return event.location ?? "";
    default:
      return event.detail ?? "";
  }
}

export function resolveTopScoreTimelineLineIncrement(
  filterId: TopScoreTimelineFilterId,
  event: TopScoreTimelineDisplayEvent,
): number {
  switch (filterId) {
    case "hazards":
    case "magic":
      return 1;
    case "kills": {
      const amount =
        typeof event.amount === "number" && Number.isFinite(event.amount)
          ? Math.trunc(event.amount)
          : 0;
      return amount > 0 ? amount : 1;
    }
    case "gold":
    case "loot":
    case "secrets": {
      const amount =
        typeof event.amount === "number" && Number.isFinite(event.amount)
          ? Math.trunc(event.amount)
          : 0;
      if (amount > 0) {
        return amount;
      }
      return filterId === "gold" ? 0 : 1;
    }
    default:
      return 0;
  }
}

export function resolveTopScoreTimelineLevelValue(
  event: TopScoreTimelineEvent,
): number | null {
  if (event.kind !== "experience-level") {
    return null;
  }
  if (typeof event.total === "number" && Number.isFinite(event.total)) {
    return Math.max(1, Math.trunc(event.total));
  }

  const levelText = [event.label, event.summary, event.detail]
    .filter(Boolean)
    .join(" ");
  const levelMatch = /\blevel\s+(-?\d+)\b/i.exec(levelText);
  if (!levelMatch) {
    return null;
  }
  const parsedLevel = Number.parseInt(levelMatch[1]!, 10);
  return Number.isFinite(parsedLevel) ? Math.max(1, parsedLevel) : null;
}

export function resolveTopScoreFinalCharacterLevel(score: TopScoreRecord): number | null {
  const snapshotLevel =
    typeof score.detail?.playerStats.level === "number" &&
      Number.isFinite(score.detail.playerStats.level)
      ? Math.trunc(score.detail.playerStats.level)
      : null;
  if (snapshotLevel !== null) {
    return Math.max(1, snapshotLevel);
  }

  const attributeLevel = Number.parseInt(
    resolveTopScoreAttributeValue(score, "Level"),
    10,
  );
  return Number.isFinite(attributeLevel) ? Math.max(1, attributeLevel) : null;
}

export function resolveTopScoreMaxCharacterLevel(
  score: TopScoreRecord,
  events = resolveTopScoreTimelineEvents(score),
): number | null {
  const levels = events
    .map((event) => resolveTopScoreTimelineLevelValue(event))
    .filter((level): level is number => level !== null);
  const finalLevel = resolveTopScoreFinalCharacterLevel(score);
  if (finalLevel !== null) {
    levels.push(finalLevel);
  }
  return levels.length > 0 ? Math.max(...levels) : null;
}

export function formatTopScoreTimelineLineSummary(
  filterId: TopScoreTimelineFilterId,
  value: number,
): string {
  switch (filterId) {
    case "kills":
      return topScoreStrings.timeline.lineSummary.kills(formatTopScoreInteger(value));
    case "gold":
      return topScoreStrings.timeline.lineSummary.gold(formatTopScoreInteger(value));
    case "loot":
      return topScoreStrings.timeline.lineSummary.loot(formatTopScoreInteger(value));
    case "secrets":
      return topScoreStrings.timeline.lineSummary.secrets(formatTopScoreInteger(value));
    case "levels":
      return topScoreStrings.timeline.lineSummary.levels(formatTopScoreInteger(value));
    case "hazards":
      return topScoreStrings.timeline.lineSummary.hazards(formatTopScoreInteger(value));
    case "magic":
      return topScoreStrings.timeline.lineSummary.magic(formatTopScoreInteger(value));
    default:
      return topScoreStrings.timeline.lineSummary.other(formatTopScoreInteger(value));
  }
}
