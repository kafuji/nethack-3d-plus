import { resolveArchivedDungeonOverview } from "../../../runtime/dungeon-overview";
import type {
  RunTelemetryLootEvent
} from "../../../game/ui-types";
import {
  createEmptyGameOverPostmortemReports
} from "../../../game/ui-types";
import {
  type TopScoreInventoryItem,
  type TopScoreRecord
} from "../../../runtime/top-score-storage";
import type {
  TopScoreBreakdownGroup,
  TopScoreInventorySection,
  TopScoreLootTimelineSection,
  TopScoreRawReportSection
} from "./types";
import {
  resolveTopScoreTelemetry
} from "./timeline-events";
import {
  formatTopScoreInteger
} from "./format";
import {
  plusStrings
} from "../shared/translations";

// nh3d-plus: localized via src/plus/i18n.
const topScoreStrings = plusStrings.topScores;

/** Score inventory, kill breakdown, loot grouping and raw report rendering. */
export function resolveTopScoreInventoryFallbackGlyph(
  item: TopScoreInventoryItem,
  fallback = "?",
): string {
  const glyphCandidate =
    typeof item.glyphChar === "string" ? item.glyphChar.trim() : "";
  const glyphCodePoint = glyphCandidate.codePointAt(0);
  if (
    typeof glyphCodePoint === "number" &&
    glyphCodePoint >= 32 &&
    glyphCodePoint !== 127
  ) {
    return glyphCandidate.charAt(0);
  }
  const accelerator =
    typeof item.accelerator === "string" ? item.accelerator.trim() : "";
  if (accelerator.length > 0) {
    return accelerator.charAt(0);
  }
  return fallback;
}

export function groupTopScoreInventoryItems(
  inventory: ReadonlyArray<TopScoreInventoryItem>,
): TopScoreInventorySection[] {
  if (!Array.isArray(inventory) || inventory.length <= 0) {
    return [];
  }

  const sections: TopScoreInventorySection[] = [];
  let currentSection: TopScoreInventorySection = {
    title: topScoreStrings.reports.pack,
    items: [],
  };

  const pushCurrentSection = (): void => {
    if (currentSection.items.length <= 0) {
      return;
    }
    sections.push(currentSection);
  };

  for (const item of inventory) {
    if (item.isCategory) {
      pushCurrentSection();
      currentSection = {
        title: item.text || topScoreStrings.reports.pack,
        items: [],
      };
      continue;
    }
    currentSection.items.push(item);
  }

  pushCurrentSection();
  return sections;
}

export function buildTopScoreKillBreakdownGroups(
  score: TopScoreRecord,
): TopScoreBreakdownGroup[] {
  const telemetry = resolveTopScoreTelemetry(score);
  return [
    {
      label: topScoreStrings.reports.killsByWeapon,
      values: telemetry.weaponKills,
      emptyLabel: topScoreStrings.reports.noWeaponKills,
    },
    {
      label: topScoreStrings.reports.killsBySpell,
      values: telemetry.spellKills,
      emptyLabel: topScoreStrings.reports.noSpellKills,
    },
    {
      label: topScoreStrings.reports.killsByPet,
      values: telemetry.petKills,
      emptyLabel: topScoreStrings.reports.noPetKills,
    },
  ];
}

export function groupTopScoreLootTimelineEvents(
  score: TopScoreRecord,
): TopScoreLootTimelineSection[] {
  const telemetry = resolveTopScoreTelemetry(score);
  if (telemetry.lootEvents.length <= 0) {
    return [];
  }
  const sections = new Map<string, RunTelemetryLootEvent[]>();
  for (const event of telemetry.lootEvents) {
    const title = String(event.category || topScoreStrings.reports.pack).trim() || topScoreStrings.reports.pack;
    const existing = sections.get(title) ?? [];
    existing.push(event);
    sections.set(title, existing);
  }
  return Array.from(sections.entries())
    .map(([title, events]) => ({
      title,
      events: [...events].sort((left, right) => left.turn - right.turn),
    }))
    .sort(
      (left, right) =>
        right.events.length - left.events.length ||
        left.title.localeCompare(right.title),
    );
}

export function buildTopScoreRawReportSections(
  score: TopScoreRecord,
): TopScoreRawReportSection[] {
  const reports =
    score.detail?.postmortemReports ?? createEmptyGameOverPostmortemReports();
  return [
    {
      id: "attributes",
      title: topScoreStrings.reports.finalAttributes,
      lines: reports.attributes,
      emptyLabel: topScoreStrings.reports.noFinalAttributes,
    },
    {
      id: "vanquished",
      title: topScoreStrings.reports.vanquished,
      lines: reports.vanquished,
      emptyLabel: topScoreStrings.reports.noVanquished,
    },
    {
      id: "conduct",
      title: topScoreStrings.reports.conduct,
      lines: reports.conduct,
      emptyLabel: topScoreStrings.reports.noConduct,
    },
    {
      id: "dungeon-overview",
      title: topScoreStrings.reports.dungeonOverview,
      lines: resolveArchivedDungeonOverview(reports.dungeonOverview, score.detail?.timeline),
      emptyLabel: topScoreStrings.reports.noDungeonOverview,
    },
  ];
}

export function renderTopScoreRawReportBlock(
  section: TopScoreRawReportSection,
): JSX.Element {
  return (
    <details
      className="nh3d-top-score-report-block"
      key={`top-score-report-${section.id}`}
      open={Boolean(section.lines?.length)}
    >
      <summary className="nh3d-top-score-report-summary">
        <span>{section.title}</span>
        <span>
          {section.lines?.length
            ? topScoreStrings.reports.lineCount(formatTopScoreInteger(section.lines.length))
            : topScoreStrings.reports.notCaptured}
        </span>
      </summary>
      {section.lines?.length ? (
        <pre className="nh3d-top-score-report-pre">
          {section.lines.join("\n")}
        </pre>
      ) : (
        <div className="nh3d-top-scores-empty">{section.emptyLabel}</div>
      )}
    </details>
  );
}
