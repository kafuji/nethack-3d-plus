import type { SupportedLocale } from "./core";
import data from "./data/oracles-rumors-ja.json";

// Rumors (dat/rumors.tru, dat/rumors.fal) and major oracles (dat/oracles.txt)
// paired with JNetHack's translations; see data/README.md. Lookups compare
// text with runs of whitespace collapsed, since the game rewraps oracles.
const rumors: Readonly<Record<string, string>> = data.rumors;
const oracles = new Map<string, string>(data.oracles as [string, string][]);

const oracleHeaders: Readonly<Record<string, string>> = {
  "The Oracle meditates for a moment and then intones:": "神託師はしばし瞑想し、そして詠唱した：",
  "The Oracle scornfully takes all your gold and says:": "神託師は軽蔑したようにあなたの金貨をすべて受け取ると、こう言った：",
  "The Oracle scornfully takes all your money and says:": "神託師は軽蔑したようにあなたのお金をすべて受け取ると、こう言った：",
  "The message reads:": "メッセージにはこう書かれている：",
};

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A rumor line, bare or spoken in quotes; null when it is not a known rumor. */
export function translateRumor(text: string): string | null {
  const line = collapse(text);
  if (Object.prototype.hasOwnProperty.call(rumors, line)) return rumors[line];
  const quoted = /^"(.+)"$/.exec(line);
  if (quoted && Object.prototype.hasOwnProperty.call(rumors, quoted[1])) {
    const inner = rumors[quoted[1]];
    return inner.startsWith("「") ? inner : `「${inner}」`;
  }
  return null;
}

/**
 * A major oracle consultation window: an optional header line, then the
 * oracle passage. Returns null unless the passage is recognized.
 */
export function translateOracleDocument(lines: readonly string[], locale: SupportedLocale): string | null {
  if (locale !== "ja") return null;
  const first = lines.findIndex((line) => line.trim());
  if (first < 0) return null;
  const headerLine = collapse(lines[first]);
  const header = Object.prototype.hasOwnProperty.call(oracleHeaders, headerLine) ? oracleHeaders[headerLine] : null;
  const passage = oracles.get(collapse(lines.slice(header === null ? first : first + 1).join(" ")));
  if (passage === undefined) return null;
  return header === null ? passage : `${header}\n\n${passage}`;
}
