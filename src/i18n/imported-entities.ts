import { withProjectTerms } from "./term-rules";
import entries from "./data/nehww-entities.json";

/** Exact runtime names only; callers must preserve names and modifiers. */
export function lookupImportedJapaneseEntity(name: string): string | undefined {
  const found = lookupImportedJapaneseEntityUnchanged(name);
  return found === undefined ? undefined : withProjectTerms(found, name);
}

function lookupImportedJapaneseEntityUnchanged(name: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(entries, name)
    ? (entries as Record<string, string>)[name]
    : undefined;
}
