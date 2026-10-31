import type { SupportedLocale } from "./core";
import encyclopediaSource from "./data/encyclopedia-ja.txt?raw";

// NetHack's data.base entries (the lookup encyclopedia) are shown as a whole
// document. Each translation is keyed by an FNV-1a hash of the English body
// with whitespace collapsed, so wrapping and tab expansion do not matter.
let encyclopedia: ReadonlyMap<string, string> | null = null;

function loadEncyclopedia(): ReadonlyMap<string, string> {
  if (encyclopedia) return encyclopedia;
  const entries = new Map<string, string>();
  let key: string | null = null;
  let body: string[] = [];
  const flush = () => {
    if (key) entries.set(key, body.join("\n").replace(/\n+$/, ""));
  };
  for (const line of encyclopediaSource.split(/\r?\n/)) {
    const header = /^@@ ([0-9a-f]{8})\b/.exec(line);
    if (header) {
      flush();
      key = header[1];
      body = [];
    } else if (key) {
      body.push(line);
    }
  }
  flush();
  encyclopedia = entries;
  return entries;
}

export function encyclopediaHash(lines: readonly string[]): string {
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Translate a recognized encyclopedia entry; returns null otherwise. */
export function translateEncyclopediaEntry(lines: readonly string[], locale: SupportedLocale): string | null {
  if (locale !== "ja" || lines.length === 0) return null;
  return loadEncyclopedia().get(encyclopediaHash(lines)) ?? null;
}
