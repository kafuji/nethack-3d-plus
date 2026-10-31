// JNetHack-based fallback for the project's curated Japanese game text
// (src/i18n/*). Each helper returns undefined when it has nothing better than
// the original English, so callers can keep their own "leave unchanged" rule.
import {
  ensureGameTextTranslatorLoaded,
  localizeGameItemText,
  localizeGameStatus,
  localizeGameQuestDocument,
  localizeGameText,
} from "./index";

// Start loading as soon as the curated translators are imported, so the
// dictionary is usually ready before the first game message arrives.
ensureGameTextTranslatorLoaded();

/** JNetHack writes "，．"; the curated translations use "、。". */
function matchCuratedPunctuation(text: string): string {
  return text.replace(/，/g, "、").replace(/．/g, "。");
}

function changed(original: string, translated: string): string | undefined {
  return translated !== original ? matchCuratedPunctuation(translated) : undefined;
}

export function jnethackMessage(text: string): string | undefined {
  ensureGameTextTranslatorLoaded();
  return changed(text, localizeGameText(text));
}

export function jnethackItem(text: string): string | undefined {
  ensureGameTextTranslatorLoaded();
  return changed(text, localizeGameItemText(text));
}

export function jnethackStatus(kind: "title" | "location", text: string): string | undefined {
  ensureGameTextTranslatorLoaded();
  return changed(text, localizeGameStatus(kind, text));
}

/** Quest dialogue and similar multi-line texts recognized as a whole. */
export function jnethackQuestDocument(lines: readonly string[]): string | undefined {
  ensureGameTextTranslatorLoaded();
  const document = localizeGameQuestDocument(lines);
  return document ? matchCuratedPunctuation(document.join("\n")) : undefined;
}
