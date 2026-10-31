import type { SupportedLocale } from "./core";
import { translateGameMessage } from "./game-messages";
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
  if (locale !== "ja" || curated !== message) {
    return { text: curated, isReferenceTranslation: false };
  }
  const trimmed = message.trim();
  // JNetHack's human translation ranks above unreviewed reference matches.
  const jnethack = jnethackMessage(trimmed);
  if (jnethack !== undefined) {
    const leading = message.slice(0, message.length - message.trimStart().length);
    const trailing = message.slice(message.trimEnd().length);
    return { text: `${leading}${jnethack}${trailing}`, isReferenceTranslation: false };
  }
  const suggested = lookupImportedJapaneseMessage(trimmed) ?? lookupImportedJapanesePattern(trimmed);
  if (suggested === undefined) return { text: message, isReferenceTranslation: false };
  const leading = message.slice(0, message.length - message.trimStart().length);
  const trailing = message.slice(message.trimEnd().length);
  return { text: `${leading}${suggested}${trailing}`, isReferenceTranslation: true };
}
