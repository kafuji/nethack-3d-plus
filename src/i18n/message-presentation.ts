import type { SupportedLocale } from "./core";
import { englishLeftover, translateGameMessage } from "./game-messages";
import { translateRuntimeText } from "./runtime-text";
import { lookupImportedJapaneseMessage } from "./imported-messages";
import { lookupImportedJapanesePattern } from "./imported-patterns";
import { jnethackMessage } from "../plus/game-text/fallback";

export interface PresentedGameMessage {
  text: string;
  isReferenceTranslation: boolean;
}

/** Preserve curated translations and runtime errors before using an unreviewed exact match. */
export function presentGameMessage(message: string, locale: SupportedLocale): PresentedGameMessage {
  if (locale === "ja" && /\n/.test(message.trim())) {
    // Several messages shown together; translate each line independently.
    const lines = message.split("\n").map((line) => presentGameMessage(line, locale));
    return { text: lines.map((line) => line.text).join("\n"), isReferenceTranslation: lines.some((line) => line.isReferenceTranslation) };
  }
  const curated = translateRuntimeText(translateGameMessage(message, locale), locale);
  const trimmed = message.trim();
  if (locale !== "ja") return { text: curated, isReferenceTranslation: false };
  // JNetHack's human translation ranks above unreviewed reference matches,
  // and above a curated rendering that still kept English words.
  const jnethack = curated !== message && englishLeftover(message, curated) === 0 ? undefined : jnethackMessage(trimmed);
  if (curated !== message && !keepsEnglishRun(message, curated)
    && (jnethack === undefined || englishLeftover(trimmed, jnethack) >= englishLeftover(message, curated))) {
    return { text: curated, isReferenceTranslation: false };
  }
  if (jnethack !== undefined) {
    const leading = message.slice(0, message.length - message.trimStart().length);
    const trailing = message.slice(message.trimEnd().length);
    return { text: `${leading}${jnethack}${trailing}`, isReferenceTranslation: false };
  }
  const suggested = lookupImportedJapaneseMessage(trimmed) ?? lookupImportedJapanesePattern(trimmed);
  if (suggested === undefined || keepsEnglishRun(trimmed, suggested)) {
    // nh3d-plus: a partial translation that kept an English phrase reads worse
    // than either language alone; prefer the curated text, then the original.
    return { text: curated !== message && !keepsEnglishRun(message, curated) ? curated : message, isReferenceTranslation: false };
  }
  const leading = message.slice(0, message.length - message.trimStart().length);
  const trailing = message.slice(message.trimEnd().length);
  return { text: `${leading}${suggested}${trailing}`, isReferenceTranslation: true };
}

/**
 * nh3d-plus: true when a translation still contains three or more consecutive
 * English words copied from the original, e.g. a pattern that captured
 * "your displaced image and misses you" as a monster name.
 */
export function keepsEnglishRun(original: string, translated: string): boolean {
  for (const run of translated.match(/[A-Za-z][A-Za-z'-]*(?: [A-Za-z][A-Za-z'-]*){2,}/g) ?? []) {
    if (original.includes(run)) return true;
  }
  return false;
}
