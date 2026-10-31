import patterns from "./data/nehww-patterns.json";
import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";

// The generated patterns contain literal fragments and at most two captures;
// they are matched with string operations rather than evaluating source regexes.
// Reject ambiguous matches and preserve captures the dictionaries do not know.
export function lookupImportedJapanesePattern(message: string): string | undefined {
  if (message.length > 256 || /[\r\n]/.test(message)) return undefined;
  let result: string | undefined;
  for (const { parts, translation } of patterns) {
    const first = parts[0], last = parts[parts.length - 1];
    if (!message.startsWith(first) || !message.endsWith(last) || message.length <= first.length + last.length) continue;
    const middle = message.slice(first.length, last.length ? message.length - last.length : undefined);
    let captures: string[];
    if (parts.length === 2) captures = [middle];
    else {
      const separator = parts[1];
      const position = middle.indexOf(separator);
      if (position <= 0 || position !== middle.lastIndexOf(separator) || position + separator.length >= middle.length) continue;
      captures = [middle.slice(0, position), middle.slice(position + separator.length)];
    }
    const translated = translation.replace(/\$(\d+)/g, (_, index: string) => {
      const value = captures[Number(index) - 1];
      const monster = translateMonsterName(value, "ja");
      // A bare word can be a player or pet name; only attempt object lookup
      // when the runtime describes it with an English article.
      return monster !== value ? monster : /^(?:a|an|the) /i.test(value) ? translateInventoryItem(value, "ja") : value;
    });
    if (result !== undefined && result !== translated) return undefined;
    result = translated;
  }
  return result;
}
