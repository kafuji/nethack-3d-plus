import type { NethackMenuItem } from "../../game/ui-types";
// nh3d-plus: localized column headers.
import { plusStrings } from "../app/shared/translations";

export type TechniqueEntry = {
  id: string;
  name: string;
  level: number;
  status: string;
  statusBand: "ready" | "active" | "soon" | "locked" | "limit" | "unknown";
  accelerator: string;
  selectionInput: string;
  isSelectable: boolean;
  menuItem: NethackMenuItem;
};

export type TechniqueMenuData = {
  prompt: string;
  entries: TechniqueEntry[];
  knownCount: number;
  readyCount: number;
  activeCount: number;
};

type TechniqueMenuProps = {
  menuData: TechniqueMenuData;
  activeSelectionInput?: string | null;
  onChooseTechnique: (selectionInput: string) => void;
  onFocusTechnique?: ((selectionInput: string) => void) | null;
};

const techniqueStatusPatterns: Array<{
  band: TechniqueEntry["statusBand"];
  normalized: string;
  pattern: RegExp;
}> = [
  { normalized: "beyond recall", band: "locked", pattern: /^beyond recall(?:\(\d+\))?$/i },
  { normalized: "not ready", band: "locked", pattern: /^not ready(?:\(\d+\))?$/i },
  { normalized: "prepared", band: "ready", pattern: /^prepared(?:\(\d+\))?$/i },
  { normalized: "active", band: "active", pattern: /^active(?:\(\d+\))?$/i },
  { normalized: "limit", band: "limit", pattern: /^limit(?:\(\d+\))?$/i },
  { normalized: "soon", band: "soon", pattern: /^soon(?:\(\d+\))?$/i },
];

function normalizeMenuLine(rawValue: unknown): string {
  return String(rawValue || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeMenuLine(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

function isTechniquePrompt(questionText: string): boolean {
  const normalized = normalizeMenuLine(questionText).toLowerCase();
  return normalized.includes("technique");
}

function isTechniqueHeaderLine(line: string): boolean {
  const normalized = normalizeMenuLine(line).toLowerCase();
  return (
    normalized.includes("name") &&
    normalized.includes("level") &&
    normalized.includes("status")
  );
}

function resolveTechniqueStatusBand(
  status: string,
): TechniqueEntry["statusBand"] {
  for (const entry of techniqueStatusPatterns) {
    if (entry.pattern.test(status)) {
      return entry.band;
    }
  }
  return "unknown";
}

function parseTechniqueRow(menuText: string): {
  name: string;
  level: number;
  status: string;
} | null {
  const rawLine = String(menuText || "");
  const normalizedLine = normalizeMenuLine(rawLine);
  if (!normalizedLine || isTechniqueHeaderLine(normalizedLine)) {
    return null;
  }

  const tabColumns = rawLine
    .split("\t")
    .map((column) => normalizeMenuLine(column))
    .filter((column) => column.length > 0);
  if (tabColumns.length >= 3) {
    const parsedLevel = Number.parseInt(tabColumns[1] || "", 10);
    if (Number.isFinite(parsedLevel)) {
      return {
        name: tabColumns[0],
        level: parsedLevel,
        status: tabColumns.slice(2).join(" "),
      };
    }
  }

  for (const techniqueStatus of techniqueStatusPatterns) {
    const fixedColumnMatch = normalizedLine.match(
      new RegExp(
        `^(.*?)\\s+(-?\\d+)\\s+(${techniqueStatus.normalized.replace(/\s+/g, "\\s+")}(?:\\(\\d+\\))?)$`,
        "i",
      ),
    );
    if (!fixedColumnMatch) {
      continue;
    }
    const name = normalizeMenuLine(fixedColumnMatch[1]);
    const parsedLevel = Number.parseInt(fixedColumnMatch[2] || "", 10);
    const status = normalizeMenuLine(fixedColumnMatch[3]);
    if (!name || !Number.isFinite(parsedLevel) || !status) {
      return null;
    }
    return {
      name,
      level: parsedLevel,
      status,
    };
  }

  return null;
}

export function parseTechniqueMenu(
  questionText: string,
  menuItems: NethackMenuItem[],
): TechniqueMenuData | null {
  const prompt = normalizeMenuLine(questionText);
  if (!isTechniquePrompt(prompt) || !Array.isArray(menuItems)) {
    return null;
  }

  let hasTechniqueHeader = false;
  let selectableRowCount = 0;
  let parseableSelectableRowCount = 0;
  const entries: TechniqueEntry[] = [];

  for (let index = 0; index < menuItems.length; index += 1) {
    const item = menuItems[index];
    const line = normalizeMenuLine(item?.text);
    if (!line) {
      continue;
    }
    if (isTechniqueHeaderLine(line)) {
      hasTechniqueHeader = true;
      continue;
    }

    const selectable = isMenuItemSelectable(item);
    if (selectable) {
      selectableRowCount += 1;
    }

    const parsedRow = parseTechniqueRow(String(item?.text || ""));
    if (!parsedRow) {
      if (selectable) {
        return null;
      }
      continue;
    }
    if (selectable) {
      parseableSelectableRowCount += 1;
    }

    const accelerator =
      typeof item.accelerator === "string" ? item.accelerator.trim() : "";
    const selectionInput = getMenuSelectionInput(item);
    const status = parsedRow.status;

    entries.push({
      id: `${index}-${slugify(parsedRow.name)}`,
      name: parsedRow.name,
      level: parsedRow.level,
      status,
      statusBand: resolveTechniqueStatusBand(status),
      accelerator,
      selectionInput,
      isSelectable: selectable,
      menuItem: item,
    });
  }

  if (entries.length === 0) {
    return null;
  }
  if (!hasTechniqueHeader && parseableSelectableRowCount === 0) {
    return null;
  }
  if (
    selectableRowCount > 0 &&
    parseableSelectableRowCount !== selectableRowCount
  ) {
    return null;
  }

  const readyCount = entries.filter(
    (entry) => entry.isSelectable || entry.statusBand === "ready",
  ).length;
  const activeCount = entries.filter((entry) => entry.statusBand === "active")
    .length;

  return {
    prompt,
    entries,
    knownCount: entries.length,
    readyCount,
    activeCount,
  };
}

function renderTechniqueRowContent(entry: TechniqueEntry): JSX.Element {
  const techniqueDisplayName = entry.accelerator
    ? `${entry.accelerator}) ${entry.name}`
    : entry.name;

  return (
    <>
      <span className="nh3d-technique-row-name">
        <span className="nh3d-technique-name">{techniqueDisplayName}</span>
      </span>
      <span className="nh3d-technique-row-level">Lvl {entry.level}</span>
      <span className="nh3d-technique-chip-stack">
        <span
          className={`nh3d-technique-chip nh3d-technique-chip-status is-${entry.statusBand}`}
        >
          {entry.status}
        </span>
      </span>
    </>
  );
}

export function TechniqueMenu({
  menuData,
  activeSelectionInput,
  onChooseTechnique,
  onFocusTechnique = null,
}: TechniqueMenuProps): JSX.Element {
  return (
    <div className="nh3d-technique-menu">
      <div className="nh3d-technique-summary">
        <span className="nh3d-technique-summary-chip is-count">
          {menuData.knownCount} known
        </span>
        <span className="nh3d-technique-summary-chip is-ready">
          {menuData.readyCount} ready
        </span>
        {menuData.activeCount > 0 ? (
          <span className="nh3d-technique-summary-chip is-active">
            {menuData.activeCount} active
          </span>
        ) : null}
      </div>
      <div className="nh3d-overflow-glow-frame">
        <div
          className="nh3d-technique-list"
          data-nh3d-overflow-glow
          data-nh3d-overflow-glow-host="parent"
        >
          <div aria-hidden="true" className="nh3d-technique-list-head">
            <span>{plusStrings.techniqueMenu.name}</span>
            <span>{plusStrings.techniqueMenu.level}</span>
            <span>{plusStrings.techniqueMenu.status}</span>
          </div>
          {menuData.entries.map((entry) => {
            const canChoose =
              entry.isSelectable && entry.selectionInput.trim().length > 0;
            const isActive =
              canChoose &&
              typeof activeSelectionInput === "string" &&
              activeSelectionInput === entry.selectionInput;
            const rowClassName = `nh3d-technique-row${
              canChoose ? "" : " is-disabled"
            }${isActive ? " nh3d-menu-button-active" : ""}`;
            return canChoose ? (
              <button
                autoFocus={isActive}
                className={rowClassName}
                key={entry.id}
                onClick={() => onChooseTechnique(entry.selectionInput)}
                onFocus={() => onFocusTechnique?.(entry.selectionInput)}
                type="button"
              >
                {renderTechniqueRowContent(entry)}
              </button>
            ) : (
              <div className={rowClassName} key={entry.id}>
                {renderTechniqueRowContent(entry)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
