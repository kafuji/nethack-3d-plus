import type { NethackMenuItem } from "../../game/ui-types";
import { getTranslationStrings } from "../../i18n/core";
import { useI18n } from "../../i18n";
import { translateSkillName, translateSpellName } from "../../i18n/game-skills";
import type { SupportedLocale } from "../../i18n/core";

export type CastSpellEntry = {
  id: string;
  name: string;
  level: number;
  category: string;
  failPercent: number;
  successPercent: number;
  failBand: "low" | "medium" | "high";
  retentionLabel: string;
  retentionBand: "full" | "stable" | "fading" | "gone" | "unknown";
  retentionMinPercent: number | null;
  accelerator: string;
  selectionInput: string;
  isSelectable: boolean;
  menuItem: NethackMenuItem;
};

export type CastSpellMenuData = {
  prompt: string;
  entries: CastSpellEntry[];
  spellCount: number;
  availableCount: number;
  bestSuccessPercent: number | null;
  averageFailPercent: number | null;
  categoryCount: number;
  hasRetentionData: boolean;
};

type CastSpellMenuProps = {
  menuData: CastSpellMenuData;
  activeSelectionInput?: string | null;
  onChooseSpell: (selectionInput: string) => void;
  onFocusSpell?: ((selectionInput: string) => void) | null;
};

const sortSpellsMenuPattern = /^\[\s*sort spells\s*]$/i;
const castMenuStrings = getTranslationStrings().castMenu;

function normalizeMenuLine(rawValue: unknown): string {
  return String(rawValue || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(rawValue: unknown): string {
  return normalizeMenuLine(rawValue).toLowerCase();
}

function toTitleCase(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function slugify(value: string): string {
  return normalizeToken(value).replace(/[^a-z0-9]+/g, "-");
}

function getMenuSelectionInput(item: NethackMenuItem): string {
  if (typeof item.selectionInput === "string" && item.selectionInput.trim()) {
    return item.selectionInput.trim();
  }
  if (typeof item.accelerator === "string" && item.accelerator.trim()) {
    return item.accelerator.trim();
  }
  return "";
}

function isMenuItemSelectable(item: NethackMenuItem): boolean {
  if (!item || item.isCategory) {
    return false;
  }
  if (typeof item.isSelectable === "boolean") {
    return item.isSelectable;
  }
  if (typeof item.identifier === "number") {
    return item.identifier !== 0;
  }
  if (Number.isInteger(item.menuIndex)) {
    return true;
  }
  return getMenuSelectionInput(item).length > 0;
}

function isSpellCastPrompt(questionText: string): boolean {
  const normalizedPrompt = normalizeToken(questionText);
  return normalizedPrompt.includes("spell") && normalizedPrompt.includes("cast");
}

function isSpellHeaderLine(line: string): boolean {
  const normalizedLine = normalizeToken(line);
  const hasCoreColumns =
    normalizedLine.includes("name") &&
    normalizedLine.includes("level") &&
    normalizedLine.includes("category") &&
    normalizedLine.includes("fail");
  return hasCoreColumns;
}

type ParsedSpellRow = {
  name: string;
  level: number;
  category: string;
  failPercent: number;
  retention: string | null;
};

function parseSpellLevelToken(rawValue: string): number | null {
  const normalized = normalizeMenuLine(rawValue);
  const match = normalized.match(/^(\d+)(?:\*)?$/);
  if (!match || !match[1]) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSpellRow(menuText: string): ParsedSpellRow | null {
  const rawLine = String(menuText || "");
  const normalizedLine = normalizeMenuLine(rawLine);
  if (!normalizedLine || isSpellHeaderLine(normalizedLine)) {
    return null;
  }

  const tabColumns = rawLine
    .split("\t")
    .map((column) => normalizeMenuLine(column))
    .filter((column) => column.length > 0);
  if (
    tabColumns.length >= 5 &&
    parseSpellLevelToken(tabColumns[1]) !== null &&
    /^-?\d+%$/.test(tabColumns[3])
  ) {
    return {
      name: tabColumns[0],
      level: parseSpellLevelToken(tabColumns[1]) ?? 0,
      category: tabColumns[2],
      failPercent: Number.parseInt(tabColumns[3], 10),
      retention: tabColumns[4],
    };
  }

  if (
    tabColumns.length >= 4 &&
    parseSpellLevelToken(tabColumns[1]) !== null &&
    /^-?\d+%$/.test(tabColumns[3])
  ) {
    return {
      name: tabColumns[0],
      level: parseSpellLevelToken(tabColumns[1]) ?? 0,
      category: tabColumns[2],
      failPercent: Number.parseInt(tabColumns[3], 10),
      retention: null,
    };
  }

  const fixedColumnMatch = rawLine.match(
    /^\s*(.+?)\s+(\d+\*?)\s+([a-zA-Z][a-zA-Z_-]*)\s+(\d+)%\s+(.+?)\s*$/,
  );
  if (fixedColumnMatch) {
    const name = normalizeMenuLine(fixedColumnMatch[1]);
    const parsedLevel = parseSpellLevelToken(fixedColumnMatch[2] || "");
    const category = normalizeMenuLine(fixedColumnMatch[3]);
    const failPercent = Number.parseInt(fixedColumnMatch[4], 10);
    const retention = normalizeMenuLine(fixedColumnMatch[5]);
    if (
      !name ||
      !category ||
      !retention ||
      parsedLevel === null ||
      !Number.isFinite(failPercent)
    ) {
      return null;
    }
    return {
      name,
      level: parsedLevel,
      category,
      failPercent,
      retention,
    };
  }

  const legacyFixedColumnMatch = rawLine.match(
    /^\s*(.+?)\s+(\d+\*?)\s+([a-zA-Z][a-zA-Z_-]*)\s+(\d+)%\s*$/,
  );
  if (!legacyFixedColumnMatch) {
    return null;
  }

  const name = normalizeMenuLine(legacyFixedColumnMatch[1]);
  const parsedLevel = parseSpellLevelToken(legacyFixedColumnMatch[2] || "");
  const category = normalizeMenuLine(legacyFixedColumnMatch[3]);
  const failPercent = Number.parseInt(legacyFixedColumnMatch[4], 10);
  if (
    !name ||
    !category ||
    parsedLevel === null ||
    !Number.isFinite(failPercent)
  ) {
    return null;
  }
  return {
    name,
    level: parsedLevel,
    category,
    failPercent,
    retention: null,
  };
}

function resolveFailBand(failPercent: number): "low" | "medium" | "high" {
  if (failPercent <= 15) {
    return "low";
  }
  if (failPercent <= 40) {
    return "medium";
  }
  return "high";
}

function resolveRetentionInfo(retentionText: string): {
  label: string;
  band: "full" | "stable" | "fading" | "gone" | "unknown";
  minPercent: number | null;
} {
  const normalizedRetention = normalizeMenuLine(retentionText);
  if (!normalizedRetention) {
    return {
      label: castMenuStrings.retention.unknown,
      band: "unknown",
      minPercent: null,
    };
  }

  if (/\(gone\)/i.test(normalizedRetention)) {
    return {
      label: castMenuStrings.retention.gone,
      band: "gone",
      minPercent: 0,
    };
  }

  const rangeMatch = normalizedRetention.match(/^(\d+)%\s*-\s*(\d+)%$/);
  if (rangeMatch) {
    const minPercent = Math.max(0, Math.min(100, Number.parseInt(rangeMatch[1], 10)));
    const maxPercent = Math.max(0, Math.min(100, Number.parseInt(rangeMatch[2], 10)));
    if (minPercent >= 100 && maxPercent >= 100) {
      return {
        label: castMenuStrings.retention.full,
        band: "full",
        minPercent,
      };
    }
    if (minPercent >= 45) {
      return {
        label: `${minPercent}% - ${maxPercent}%`,
        band: "stable",
        minPercent,
      };
    }
    return {
      label: `${minPercent}% - ${maxPercent}%`,
      band: "fading",
      minPercent,
    };
  }

  const singleMatch = normalizedRetention.match(/^(\d+)%$/);
  if (singleMatch) {
    const percent = Math.max(0, Math.min(100, Number.parseInt(singleMatch[1], 10)));
    if (percent >= 100) {
      return {
        label: castMenuStrings.retention.full,
        band: "full",
        minPercent: percent,
      };
    }
    if (percent >= 45) {
      return {
        label: `${percent}%`,
        band: "stable",
        minPercent: percent,
      };
    }
    return {
      label: `${percent}%`,
      band: "fading",
      minPercent: percent,
    };
  }

  return {
    label: normalizedRetention,
    band: "unknown",
    minPercent: null,
  };
}

export function parseCastSpellMenu(
  questionText: string,
  menuItems: NethackMenuItem[],
): CastSpellMenuData | null {
  const prompt = normalizeMenuLine(questionText);
  if (!isSpellCastPrompt(prompt) || !Array.isArray(menuItems)) {
    return null;
  }

  let hasSpellTableHeader = false;
  let hasRetentionData = false;
  let selectableRowCount = 0;
  let parseableSelectableRowCount = 0;
  const entries: CastSpellEntry[] = [];

  for (let index = 0; index < menuItems.length; index += 1) {
    const item = menuItems[index];
    const line = normalizeMenuLine(item?.text);
    if (!line) {
      continue;
    }
    if (isSpellHeaderLine(line)) {
      hasSpellTableHeader = true;
      continue;
    }
    if (sortSpellsMenuPattern.test(line)) {
      continue;
    }

    const selectable = isMenuItemSelectable(item);
    if (selectable) {
      selectableRowCount += 1;
    }

    const parsedRow = parseSpellRow(String(item?.text || ""));
    if (!parsedRow) {
      if (selectable) {
        return null;
      }
      continue;
    }
    if (selectable) {
      parseableSelectableRowCount += 1;
    }

    const retentionInfo = resolveRetentionInfo(parsedRow.retention ?? "");
    hasRetentionData =
      hasRetentionData ||
      (typeof parsedRow.retention === "string" &&
        parsedRow.retention.trim().length > 0);
    const normalizedFailPercent = Math.max(0, Math.min(100, parsedRow.failPercent));
    const successPercent = Math.max(0, 100 - normalizedFailPercent);
    const accelerator =
      typeof item.accelerator === "string" ? item.accelerator.trim() : "";
    const selectionInput = getMenuSelectionInput(item);

    entries.push({
      id: `${index}-${slugify(parsedRow.name)}`,
      name: parsedRow.name,
      level: parsedRow.level,
      category: toTitleCase(parsedRow.category),
      failPercent: normalizedFailPercent,
      successPercent,
      failBand: resolveFailBand(normalizedFailPercent),
      retentionLabel: retentionInfo.label,
      retentionBand: retentionInfo.band,
      retentionMinPercent: retentionInfo.minPercent,
      accelerator,
      selectionInput,
      isSelectable: selectable,
      menuItem: item,
    });
  }

  if (entries.length === 0) {
    return null;
  }
  if (!hasSpellTableHeader && parseableSelectableRowCount === 0) {
    return null;
  }
  if (
    selectableRowCount > 0 &&
    parseableSelectableRowCount !== selectableRowCount
  ) {
    return null;
  }

  const availableEntries = entries.filter((entry) => entry.isSelectable);
  const summaryEntries = availableEntries.length > 0 ? availableEntries : entries;
  const bestSuccessPercent =
    summaryEntries.length > 0
      ? summaryEntries.reduce(
          (best, entry) => Math.max(best, entry.successPercent),
          0,
        )
      : null;
  const averageFailPercent =
    summaryEntries.length > 0
      ? Math.round(
          summaryEntries.reduce((sum, entry) => sum + entry.failPercent, 0) /
            summaryEntries.length,
        )
      : null;
  const categoryCount = new Set(
    entries
      .map((entry) => normalizeToken(entry.category))
      .filter((value) => value.length > 0),
  ).size;

  return {
    prompt,
    entries,
    spellCount: entries.length,
    availableCount: availableEntries.length,
    bestSuccessPercent,
    averageFailPercent,
    categoryCount,
    hasRetentionData,
  };
}

function renderSpellRowContent(
  entry: CastSpellEntry,
  options: { showRetentionColumn: boolean; locale: SupportedLocale },
): JSX.Element {
  const name = translateSpellName(entry.name, options.locale);
  const spellDisplayName = entry.accelerator
    ? `${entry.accelerator}) ${name}`
    : name;
  const showRetentionColumn = options.showRetentionColumn;

  return (
    <>
      <span className="nh3d-cast-row-name">
        <span className="nh3d-cast-spell-name">{spellDisplayName}</span>
      </span>
      <span className="nh3d-cast-row-level">{entry.level}</span>
        <span className="nh3d-cast-row-category">
        <span className="nh3d-cast-row-category-label">
          {castMenuStrings.schoolLabel}
        </span>
        <span className="nh3d-cast-row-category-value">{translateSkillName(entry.category, options.locale)}</span>
      </span>
      <span className="nh3d-cast-chip-stack">
        <span className={`nh3d-cast-chip nh3d-cast-chip-fail is-${entry.failBand}`}>
          {entry.failPercent}%
        </span>
        {showRetentionColumn ? (
          <span
            className={`nh3d-cast-chip nh3d-cast-chip-retention is-${entry.retentionBand}`}
          >
            {entry.retentionLabel}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function CastSpellMenu({
  menuData,
  activeSelectionInput,
  onChooseSpell,
  onFocusSpell = null,
}: CastSpellMenuProps): JSX.Element {
  const { locale } = useI18n();
  const showRetentionColumn = menuData.hasRetentionData;
  return (
    <div className="nh3d-cast-menu">
      <div className="nh3d-cast-summary">
        <span className="nh3d-cast-summary-chip is-count">
          {castMenuStrings.summary.known(menuData.spellCount)}
        </span>
        <span className="nh3d-cast-summary-chip is-ready">
          {castMenuStrings.summary.castable(menuData.availableCount)}
        </span>
        {typeof menuData.bestSuccessPercent === "number" ? (
          <span className="nh3d-cast-summary-chip is-success">
            {castMenuStrings.summary.bestSuccess(menuData.bestSuccessPercent)}
          </span>
        ) : null}
        {typeof menuData.averageFailPercent === "number" ? (
          <span className="nh3d-cast-summary-chip is-fail">
            {castMenuStrings.summary.averageFail(menuData.averageFailPercent)}
          </span>
        ) : null}
        <span className="nh3d-cast-summary-chip is-school">
          {castMenuStrings.summary.schoolCount(menuData.categoryCount)}
        </span>
      </div>
      <div className="nh3d-overflow-glow-frame">
        <div
          className={`nh3d-cast-table${
            showRetentionColumn ? "" : " is-no-retention"
          }`}
          data-nh3d-overflow-glow
          data-nh3d-overflow-glow-host="parent"
        >
          <div aria-hidden="true" className="nh3d-cast-table-head">
            <span>{castMenuStrings.headings.name}</span>
            <span>{castMenuStrings.headings.level}</span>
            <span>{castMenuStrings.headings.category}</span>
            <span>{castMenuStrings.headings.fail}</span>
            {showRetentionColumn ? (
              <span>{castMenuStrings.headings.retention}</span>
            ) : null}
          </div>
          {menuData.entries.map((entry) => {
            const canChoose =
              entry.isSelectable && entry.selectionInput.trim().length > 0;
            const isActive =
              canChoose &&
              typeof activeSelectionInput === "string" &&
              activeSelectionInput === entry.selectionInput;
            const rowClassName = `nh3d-cast-row${canChoose ? "" : " is-disabled"}${
              isActive ? " nh3d-menu-button-active" : ""
            }`;
            return canChoose ? (
              <button
                autoFocus={isActive}
                className={rowClassName}
                key={entry.id}
                onClick={() => onChooseSpell(entry.selectionInput)}
                onFocus={() => onFocusSpell?.(entry.selectionInput)}
                type="button"
              >
                {renderSpellRowContent(entry, { showRetentionColumn, locale })}
              </button>
            ) : (
              <div className={rowClassName} key={entry.id}>
                {renderSpellRowContent(entry, { showRetentionColumn, locale })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
