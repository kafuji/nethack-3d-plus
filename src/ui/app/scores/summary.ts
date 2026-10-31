import {
  type TopScoreRecord
} from "../../../runtime/top-score-storage";
import type {
  TopScoreChipGroup,
  TopScoreMetric
} from "./types";
import {
  formatTopScoreAlignmentLabel,
  formatTopScoreCharacterLine,
  formatTopScoreDateTime,
  formatTopScoreDuration,
  formatTopScoreHp,
  formatTopScoreInteger,
  formatTopScorePlayerName,
  formatTopScoreShortDateTime,
  formatTopScoreText,
  hasTopScoreDisplayValue,
  pushTopScoreMetric,
  pushTopScoreRow,
  resolveTopScoreAttributeValue,
  resolveTopScoreDepthMetric,
  resolveTopScoreLocationLabel,
  translateTopScoreAchievementLabel,
  translateTopScoreConductLabel,
  translateTopScoreFlagLabel
} from "./format";
import {
  plusStrings
} from "../shared/translations";

// nh3d-plus: localized via src/plus/i18n.
const topScoreStrings = plusStrings.topScores;

/** Score cards, overview, adventure, attributes and challenge groups. */
export function buildTopScoreCardMetrics(score: TopScoreRecord): TopScoreMetric[] {
  const metrics: TopScoreMetric[] = [];
  pushTopScoreMetric(metrics, topScoreStrings.cardMetrics.turns, formatTopScoreInteger(score.turns));
  pushTopScoreMetric(metrics, topScoreStrings.cardMetrics.depth, resolveTopScoreDepthMetric(score));
  pushTopScoreMetric(metrics, topScoreStrings.cardMetrics.finalHp, formatTopScoreHp(score));
  pushTopScoreMetric(
    metrics,
    topScoreStrings.cardMetrics.ended,
    formatTopScoreShortDateTime(
      score.endtime || score.deathdate || score.detail?.capturedAtIso,
    ),
  );
  return metrics;
}

export function buildTopScoreOverviewRows(score: TopScoreRecord): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  pushTopScoreRow(rows, topScoreStrings.overview.adventurer, formatTopScorePlayerName(score));
  pushTopScoreRow(rows, topScoreStrings.overview.path, formatTopScoreCharacterLine(score));
  pushTopScoreRow(
    rows,
    topScoreStrings.overview.finalScore,
    topScoreStrings.points(formatTopScoreInteger(score.points)),
  );
  pushTopScoreRow(rows, topScoreStrings.overview.causeOfEnd, formatTopScoreText(score.death));
  pushTopScoreRow(rows, topScoreStrings.overview.finalLocation, resolveTopScoreLocationLabel(score));
  pushTopScoreRow(rows, topScoreStrings.overview.turnsSurvived, formatTopScoreInteger(score.turns));
  pushTopScoreRow(rows, topScoreStrings.overview.realTime, formatTopScoreDuration(score.realtimeSeconds));
  pushTopScoreRow(rows, topScoreStrings.overview.finalHp, formatTopScoreHp(score));
  pushTopScoreRow(rows, topScoreStrings.overview.started, formatTopScoreDateTime(score.starttime));
  pushTopScoreRow(
    rows,
    topScoreStrings.overview.ended,
    formatTopScoreDateTime(
      score.endtime || score.deathdate || score.detail?.capturedAtIso,
    ),
  );
  pushTopScoreRow(rows, topScoreStrings.overview.stateAtDeath, formatTopScoreText(score.whileHelpless));
  return rows;
}

export function buildTopScoreAdventureMetrics(score: TopScoreRecord): TopScoreMetric[] {
  const metrics: TopScoreMetric[] = [];
  const hitPoints = resolveTopScoreAttributeValue(score, "Hit points");
  const power = resolveTopScoreAttributeValue(score, "Power");
  const armorClass = resolveTopScoreAttributeValue(score, "Armor class");
  const experience = resolveTopScoreAttributeValue(score, "Experience");
  const level = resolveTopScoreAttributeValue(score, "Level");
  const gold = resolveTopScoreAttributeValue(score, "Gold");
  const alignment =
    resolveTopScoreAttributeValue(score, "Alignment") ||
    formatTopScoreAlignmentLabel(score.align);
  const turn =
    resolveTopScoreAttributeValue(score, "Turn") || formatTopScoreInteger(score.turns);

  pushTopScoreMetric(
    metrics,
    topScoreStrings.adventure.hitPoints,
    hitPoints || formatTopScoreHp(score),
    power ? topScoreStrings.adventure.power(power) : undefined,
  );
  pushTopScoreMetric(metrics, topScoreStrings.adventure.armorClass, armorClass);
  pushTopScoreMetric(
    metrics,
    topScoreStrings.adventure.experience,
    experience,
    level ? topScoreStrings.adventure.level(level) : undefined,
  );
  pushTopScoreMetric(metrics, topScoreStrings.adventure.gold, gold);
  pushTopScoreMetric(metrics, topScoreStrings.adventure.alignment, alignment);
  pushTopScoreMetric(metrics, topScoreStrings.adventure.turn, turn);

  if (metrics.length < 4) {
    pushTopScoreMetric(metrics, topScoreStrings.adventure.depth, resolveTopScoreDepthMetric(score));
    pushTopScoreMetric(metrics, topScoreStrings.adventure.realTime, formatTopScoreDuration(score.realtimeSeconds));
    pushTopScoreMetric(metrics, topScoreStrings.adventure.deathsOnFile, formatTopScoreInteger(score.deaths));
  }

  return metrics;
}

export function buildTopScoreAttributeMetrics(score: TopScoreRecord): TopScoreMetric[] {
  return [
    { label: topScoreStrings.attributes.strength, value: resolveTopScoreAttributeValue(score, "Strength") },
    { label: topScoreStrings.attributes.dexterity, value: resolveTopScoreAttributeValue(score, "Dexterity") },
    {
      label: topScoreStrings.attributes.constitution,
      value: resolveTopScoreAttributeValue(score, "Constitution"),
    },
    {
      label: topScoreStrings.attributes.intelligence,
      value: resolveTopScoreAttributeValue(score, "Intelligence"),
    },
    { label: topScoreStrings.attributes.wisdom, value: resolveTopScoreAttributeValue(score, "Wisdom") },
    { label: topScoreStrings.attributes.charisma, value: resolveTopScoreAttributeValue(score, "Charisma") },
  ].filter((metric) => hasTopScoreDisplayValue(metric.value));
}

export function buildTopScoreChallengeGroups(score: TopScoreRecord): TopScoreChipGroup[] {
  return [
    {
      label: topScoreStrings.challenges.streaks,
      values: score.conductLabels.map(translateTopScoreConductLabel),
      emptyLabel: topScoreStrings.challenges.noStreaks,
    },
    {
      label: topScoreStrings.challenges.milestones,
      values: score.achievementLabels.map(translateTopScoreAchievementLabel),
      emptyLabel: topScoreStrings.challenges.noMilestones,
    },
    {
      label: topScoreStrings.challenges.runRules,
      values:
        score.flagLabels.length > 0
          ? score.flagLabels.map(translateTopScoreFlagLabel)
          : [topScoreStrings.challenges.normal],
      emptyLabel: topScoreStrings.challenges.normal,
    },
  ];
}

export function buildTopScorePreviewLabels(score: TopScoreRecord): string[] {
  const allLabels = [
    ...score.flagLabels
      .filter((label) => label.trim().toLowerCase() !== "bones disabled")
      .map(translateTopScoreFlagLabel),
    ...score.conductLabels.map(translateTopScoreConductLabel),
    ...score.achievementLabels.map(translateTopScoreAchievementLabel),
  ];
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const label of allLabels) {
    const normalized = label.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(normalized);
  }
  const visible = deduped.slice(0, 5);
  if (deduped.length > visible.length) {
    visible.push(topScoreStrings.challenges.moreLabels(deduped.length - visible.length));
  }
  return visible;
}
