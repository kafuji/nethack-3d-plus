import {
  type TopScoreRecord
} from "../../../runtime/top-score-storage";
import type {
  TopScoreMetric
} from "./types";
import {
  resolveTopScoreTelemetry,
  resolveTopScoreTimelineEvents
} from "./timeline-events";
import {
  resolveTopScoreMaxCharacterLevel,
  resolveTopScoreTimelineLineIncrement
} from "./timeline-labels";
import {
  formatTopScoreInteger
} from "./format";
import {
  plusStrings
} from "../shared/translations";

// nh3d-plus: localized via src/plus/i18n.
const topScoreStrings = plusStrings.topScores;

/** Timeline overview metrics and peak level summary. */
export function buildTopScoreTimelineSummaryMetrics(score: TopScoreRecord): TopScoreMetric[] {
  const events = resolveTopScoreTimelineEvents(score);
  if (events.length <= 0) {
    return [];
  }

  const killCount = events.reduce(
    (total, event) =>
      event.kind === "kill"
        ? total + resolveTopScoreTimelineLineIncrement("kills", {
          ...event,
          filterId: "kills",
        })
        : total,
    0,
  );
  const goldCollected = events.reduce((total, event) => {
    if (event.kind !== "gold") {
      return total;
    }
    return total + Math.max(0, event.amount ?? 0);
  }, 0);
  const telemetry = resolveTopScoreTelemetry(score);
  const locationsVisited = new Set(
    events
      .filter((event) => event.kind === "location")
      .map((event) => String(event.location || event.label).trim())
      .filter(Boolean),
  ).size;
  const maxCharacterLevel = resolveTopScoreMaxCharacterLevel(score, events);
  const hiddenFindCount = telemetry.hiddenFindEvents.length;
  const lootCount = telemetry.lootEvents.reduce(
    (total, event) => total + Math.max(0, event.quantity),
    0,
  );
  const spellsLearned = telemetry.spellLearnedEvents.length;

  return [
    {
      label: topScoreStrings.timeline.summary.foesDefeated,
      value: formatTopScoreInteger(killCount),
      detail: killCount === 1 ? topScoreStrings.timeline.summary.oneKill : topScoreStrings.timeline.summary.manyKills,
    },
    {
      label: topScoreStrings.timeline.summary.goldGathered,
      value: formatTopScoreInteger(goldCollected),
      detail: goldCollected === 1 ? topScoreStrings.timeline.summary.oneGold : topScoreStrings.timeline.summary.manyGold,
    },
    {
      label: topScoreStrings.timeline.summary.hiddenFinds,
      value: formatTopScoreInteger(hiddenFindCount),
      detail:
        hiddenFindCount === 1 ? topScoreStrings.timeline.summary.oneHidden : topScoreStrings.timeline.summary.manyHidden,
    },
    {
      label: topScoreStrings.timeline.summary.lootCollected,
      value: formatTopScoreInteger(lootCount),
      detail: lootCount === 1 ? topScoreStrings.timeline.summary.oneLoot : topScoreStrings.timeline.summary.manyLoot,
    },
    {
      label: topScoreStrings.timeline.summary.spellsLearned,
      value: formatTopScoreInteger(spellsLearned),
      detail:
        spellsLearned === 1 ? topScoreStrings.timeline.summary.oneSpell : topScoreStrings.timeline.summary.manySpells,
    },
    {
      label: topScoreStrings.timeline.summary.trapsSprung,
      value: formatTopScoreInteger(telemetry.trapEvents.length),
      detail:
        telemetry.trapEvents.length === 1
          ? topScoreStrings.timeline.summary.oneTrap
          : topScoreStrings.timeline.summary.manyTraps,
    },
    {
      label: topScoreStrings.timeline.summary.placesReached,
      value: formatTopScoreInteger(locationsVisited),
      detail:
        locationsVisited === 1 ? topScoreStrings.timeline.summary.onePlace : topScoreStrings.timeline.summary.manyPlaces,
    },
    {
      label: topScoreStrings.timeline.summary.maxLevel,
      value:
        maxCharacterLevel === null
          ? "--"
          : formatTopScoreInteger(maxCharacterLevel),
      detail: topScoreStrings.timeline.summary.peakLevel,
    },
  ];
}
