// Opt-in audit: lists game strings that no display path translates.
//   node scripts/i18n/extract-source-strings.mjs <NetHack> strings.json
//   NH_STRINGS=strings.json npx vitest run src/i18n/source-string-coverage.test.ts
// Writes <strings>-untranslated.tsv next to the input. Many entries are sentence
// fragments, so each one is tried on its own and in the sentences NetHack builds
// from such fragments; only those that stay English in every form are listed.
import { expect, it, vi } from "vitest";
import { translateGameMenuItem } from "./game-menu";
import { translateGamePrompt } from "./game-prompts";
import { translateInventoryItem } from "./inventory-text";
import { loadJapaneseDictionary } from "./load-japanese-dictionary";
import { presentGameMessage } from "./message-presentation";
import { translateReportLine } from "./report-text";

// Vitest exposes the process environment as import.meta.env.
const stringsFile = (import.meta.env as Record<string, string | undefined>).NH_STRINGS;

const plineFamily = new Set([
  "You", "Your", "You_feel", "You_hear", "You_see", "You_cant", "You_are", "pline_The", "There", "pline", "Norep",
  "verbalize", "urgent_pline", "pline_mon", "pline_xy", "custompline", "com_pline",
]);

// Stand-ins for what the C code fills in. A word of these left over is not a leak.
const fillers = ["the jackal", "the dagger", "it", "your hand", "Lord Sato", "water"];
const fillerWords = /\b(?:the|jackal|dagger|your|hand|Lord|Sato|water|You)\b/gi;

function withFiller(format: string, filler: string): string {
  return format
    .replace(/%%/g, "\u0000")
    .replace(/%(?:\d+\$)?[-+ #0]*(?:\d+|\*)?(?:\.\d+)?(?:ll|l|h|z)?([a-zA-Z])/g, (_all, conversion: string) =>
      conversion === "s" ? filler : conversion === "c" ? "a" : "2")
    .replace(/\u0000/g, "%")
    .trim();
}

/** Forms a string can reach the player in. */
function forms(text: string): string[] {
  const results = new Set<string>();
  for (const filler of /%/.test(text) ? fillers : [fillers[0]!]) {
    const filled = withFiller(text, filler);
    results.add(filled);
    if (/^[a-z%]/.test(text)) {
      results.add(`The jackal ${filled}`);
      results.add(`You ${filled}`);
      results.add(`You feel ${filled}`);
      results.add(`You hear ${filled}`);
      results.add(`a ${filled}`);
      // insight.c enlightenment lines and end.c death reasons.
      results.add(`You are ${filled}.`);
      results.add(`You were ${filled}.`);
      results.add(`You have ${filled}.`);
      results.add(`You had ${filled}.`);
      results.add(`You can ${filled}.`);
      results.add(`You could ${filled}.`);
      results.add(`You ${filled}.`);
      results.add(`killed by ${filled}`);
    }
    if (/^[A-Z]/.test(text) && !/[.!?]$/.test(filled)) results.add(`${filled}.`);
  }
  return [...results];
}

/** English left in a rendering: any word of three or more letters it kept. */
function isUntranslated(japanese: string): boolean {
  if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(japanese)) return true;
  return /[A-Za-z]{3,}/.test(japanese.replace(fillerWords, ""));
}

function renderings(text: string): string[] {
  return [
    presentGameMessage(text, "ja").text,
    translateGameMenuItem(text, "", "ja"),
    translateGamePrompt(text, "ja"),
    translateInventoryItem(text, "ja"),
    translateReportLine(text, "ja"),
  ];
}

it.skipIf(!stringsFile)("reports game strings without a Japanese rendering", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  await loadJapaneseDictionary();
  const entries = JSON.parse(readFileSync(stringsFile!, "utf8")) as { text: string; kind: string; call?: string; at: string[] }[];
  const report: string[] = [];
  for (const entry of entries) {
    // Calls that build a sentence themselves are covered by source-message-coverage.test.ts.
    if (entry.call && plineFamily.has(entry.call)) continue;
    const allForms = forms(entry.text);
    if (allForms.some((form) => renderings(form).some((japanese) => !isUntranslated(japanese)))) continue;
    report.push(`${entry.at[0]}\t${entry.call ?? entry.kind}\t${entry.text.replace(/\s+/g, " ")}`);
  }
  writeFileSync(stringsFile!.replace(/\.json$/, "") + "-untranslated.tsv", report.join("\n"));
  console.info(`${report.length} of ${entries.length} strings have no Japanese rendering`);
  expect(entries.length).toBeGreaterThan(0);
}, 600000);
