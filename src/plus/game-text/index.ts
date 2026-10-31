// Entry point for display-time game text translation.
//
// The translator and its dictionary are loaded lazily, and only when the
// interface language is Japanese. Until loading finishes the original English
// text is shown. src/plus/game-text/fallback.ts plugs this into the curated
// translations in src/i18n as a second tier before unreviewed references.
import { getCurrentLocale } from "../../i18n/core";
import type { GameTextData, GameTextTranslator } from "./translator";

let translator: GameTextTranslator | null = null;
let loading: Promise<void> | null = null;

/** Game text translation applies to the Japanese interface only. */
export function isGameTextTranslationAvailable(): boolean {
  return getCurrentLocale() === "ja";
}

function isActive(): boolean {
  return isGameTextTranslationAvailable();
}

export function ensureGameTextTranslatorLoaded(): void {
  if (translator || loading || !isActive()) return;
  loading = Promise.all([import("./translator"), import("./data/jnethack.generated.json")])
    .then(([module, data]) => {
      const json = data as unknown as { default?: GameTextData } & GameTextData;
      translator = new module.GameTextTranslator(json.default ?? json);
    })
    .catch((error: unknown) => {
      console.error("Failed to load game text translations:", error);
    });
}

/** Translate a game message for display; returns the input when inactive. */
export function localizeGameText(text: string | null | undefined): string {
  const value = text ?? "";
  if (!translator || !isActive()) return value;
  return translator.translate(value);
}

/** Translate an item/menu line (e.g. "a - a +1 long sword (weapon in hand)"). */
export function localizeGameItemText(text: string | null | undefined): string {
  const value = text ?? "";
  if (!translator || !isActive()) return value;
  return translator.translateItemText(value);
}

/** Translate a recognized quest/legacy text window as a whole, or return null. */
export function localizeGameQuestDocument(lines: readonly string[]): string[] | null {
  if (!translator || !isActive()) return null;
  return translator.translateQuestDocument(lines);
}

/** Status line pieces: player title, location label, hunger/encumbrance words. */
export function localizeGameStatus(
  kind: "title" | "location" | "status",
  text: string | null | undefined,
): string {
  const value = text ?? "";
  if (!translator || !isActive()) return value;
  if (kind === "title") return translator.translatePlayerTitle(value);
  if (kind === "location") return translator.translateLocation(value);
  return translator.translateStatusWord(value);
}

