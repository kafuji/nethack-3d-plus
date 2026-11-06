// Opt-in audit: lists what the game really showed that stayed in English.
//   node scripts/i18n/play-bot.mjs played.json --seeds 1 --first-seed 1 --steps 6000
//   (one process per seed; a second game in one process breaks Asyncify)
//   NH_PLAYED_TEXT=played.json npx vitest run src/i18n/played-text-coverage.test.ts
// Writes <played>-untranslated.tsv next to the input: kind, times seen, text, rendering.
// Each string goes through the display path its kind uses in the app.
import { expect, it, vi } from "vitest";
import { translateGameMenuItem, translateMenuHeading } from "./game-menu";
import { translateGamePrompt } from "./game-prompts";
import { translateInventoryItem } from "./inventory-text";
import { loadJapaneseDictionary } from "./load-japanese-dictionary";
import { presentGameMessage } from "./message-presentation";
import { translateReportLine } from "./report-text";

// Vitest exposes the process environment as import.meta.env.
const playedFile = (import.meta.env as Record<string, string | undefined>).NH_PLAYED_TEXT;

function render(kind: string, text: string): string {
  switch (kind) {
    case "menu":
      return translateReportLine(translateGameMenuItem(text, "", "ja"), "ja");
    case "menu-heading":
      return translateMenuHeading(text, "ja");
    case "menu-title":
    case "question": {
      const prompt = translateGamePrompt(text, "ja");
      return prompt !== text ? prompt : presentGameMessage(text, "ja").text;
    }
    case "item":
      return translateInventoryItem(text, "ja");
    default:
      return presentGameMessage(text, "ja").text;
  }
}

// Kept on purpose: the weight unit, scroll labels, the player's own names and
// option keywords, which the player has to type as they are.
const kept = [/^\s*\S+\s+(?:\[[mA]+\]\s+|[\w?#]+\s{2,})?(?=[^\sA-Za-z])/, /\[[^\]]*\]/g, /\baum\b/g, /「[^」]*」と書かれた/g, /（(?:名前|呼び名)：[^）]*）/g, /\bwizard\b/g, /\bAgent\d+\b/g, /\bElbereth\b/g, /「[^」]*」/g, /[A-Za-z' ]+の幽霊/g];
const optionRow = /^\s*\S+\s+\[.*\]\s*$/;

/** Letters left from the original. */
function isUntranslated(text: string, japanese: string): boolean {
  if (optionRow.test(text)) return false;
  let rest = japanese;
  for (const pattern of kept) rest = rest.replace(pattern, "");
  return /[A-Za-z]{3,}/.test(rest);
}

it.skipIf(!playedFile)("reports played text that stayed in English", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  await loadJapaneseDictionary();
  const played = JSON.parse(readFileSync(playedFile!, "utf8")) as [string, number][];
  const report: string[] = [];
  for (const [key, count] of played) {
    const [kind, text] = key.split("\t") as [string, string];
    if (kind === "status" || kind === "error") continue;
    const japanese = render(kind, text);
    if (isUntranslated(text, japanese)) report.push(`${kind}\t${count}\t${text}\t${japanese === text ? "" : japanese}`);
  }
  report.sort();
  writeFileSync(playedFile!.replace(/\.json$/, "") + "-untranslated.tsv", report.join("\n"));
  console.info(`${report.length} of ${played.length} played strings stayed in English`);
  expect(played.length).toBeGreaterThan(0);
}, 600000);
