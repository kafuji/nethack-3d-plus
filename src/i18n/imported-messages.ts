import entries from "./data/nehww-messages.json";

/**
 * Unreviewed imported translation. The caller must clearly label it and make
 * the exact English source available by click, tap, or directly in the display.
 * Only use after curated matches.
 */
export function lookupImportedJapaneseMessage(text: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(entries, text)
    ? (entries as Record<string, string>)[text]
    : undefined;
}
