import entries from "./data/nehww-entities.json";

/** Exact runtime names only; callers must preserve names and modifiers. */
export function lookupImportedJapaneseEntity(name: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(entries, name)
    ? (entries as Record<string, string>)[name]
    : undefined;
}
