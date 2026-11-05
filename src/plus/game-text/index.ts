// Entry point for display-time game text translation.
//
// The translator and its dictionary are loaded lazily, and only when the
// interface language is Japanese. Until loading finishes the original English
// text is shown. src/plus/game-text/fallback.ts plugs this into the curated
// translations in src/i18n as a second tier before unreviewed references.
import { getCurrentLocale } from "../../i18n/core";
import type { GameTextData, GameTextTranslator } from "./translator";

let translator: GameTextTranslator | null = null;
let build: (() => GameTextTranslator) | null = null;
let loading: Promise<void> | null = null;

/** Game text translation applies to the Japanese interface only. */
export function isGameTextTranslationAvailable(): boolean {
  return getCurrentLocale() === "ja";
}

function isActive(): boolean {
  return isGameTextTranslationAvailable();
}

export function ensureGameTextTranslatorLoaded(): void {
  if (translator || build || loading || !isActive()) return;
  loading = Promise.all([import("./translator"), import("./data/jnethack.generated.json"), import("./curated-names")])
    .then(([module, data, { curatedNames }]) => {
      const json = data as unknown as { default?: GameTextData } & GameTextData;
      build = () => new module.GameTextTranslator(json.default ?? json, curatedNames);
    })
    .catch((error: unknown) => {
      console.error("Failed to load game text translations:", error);
    });
}

/**
 * The translator, built on first use: curated-names reads src/i18n's tables,
 * which may still be initializing when the imports above settle.
 */
function activeTranslator(): GameTextTranslator | null {
  if (!isActive()) return null;
  if (!translator && build) {
    translator = build();
    build = null;
  }
  return translator;
}

/** Translate a game message for display; returns the input when inactive. */
export function localizeGameText(text: string | null | undefined): string {
  const value = text ?? "";
  const active = activeTranslator();
  if (!active) return value;
  return active.translate(value);
}

/** Translate an item/menu line (e.g. "a - a +1 long sword (weapon in hand)"). */
export function localizeGameItemText(text: string | null | undefined): string {
  const value = text ?? "";
  const active = activeTranslator();
  if (!active) return value;
  return active.translateItemText(value);
}

/** Translate a recognized quest/legacy text window as a whole, or return null. */
export function localizeGameQuestDocument(lines: readonly string[]): string[] | null {
  const active = activeTranslator();
  if (!active) return null;
  return active.translateQuestDocument(lines);
}

/** Status line pieces: player title, location label, hunger/encumbrance words. */
export function localizeGameStatus(
  kind: "title" | "location" | "status",
  text: string | null | undefined,
): string {
  const value = text ?? "";
  const active = activeTranslator();
  if (!active) return value;
  if (kind === "title") return active.translatePlayerTitle(value);
  if (kind === "location") return active.translateLocation(value);
  return active.translateStatusWord(value);
}

