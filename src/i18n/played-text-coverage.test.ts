// Opt-in audit: lists what the game really showed that stayed in English.
//   node scripts/i18n/play-bot.mjs played.json --seeds 1 --first-seed 1 --steps 6000
//   (one process per seed; a second game in one process breaks Asyncify)
//   NH_PLAYED_TEXT=played.json npx vitest run src/i18n/played-text-coverage.test.ts
// Writes <played>-untranslated.tsv next to the input: kind, times seen, text, rendering.
// Each string goes through the display path its kind uses in the app.
import { expect, it, vi } from "vitest";
import { translateDiscoveryReport } from "./discovery-text";
import { translateEncyclopediaEntry } from "./encyclopedia-text";
import { translateGameMenuItem, translateMenuHeading } from "./game-menu";
import { translateHelpDocument } from "./help-text";
import { translateIntroStory } from "./intro-story";
import { translateOracleDocument } from "./oracle-text";
import { translateGamePrompt } from "./game-prompts";
import { translateInventoryItem } from "./inventory-text";
import { presentGameMessage } from "./message-presentation";
import { translateQuestDocument } from "./quest-text";
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
    case "line":
      return presentGameMessage(translateReportLine(text, "ja"), "ja").text;
    default:
      return presentGameMessage(text, "ja").text;
  }
}

// Kept on purpose: the weight unit, scroll labels, the player's own names and
// option keywords, which the player has to type as they are.
const kept = [/「[^」]*」/g, /\bAgent\d+\b/g, /^\s*\S+\s+(?:\[[mA]+\]\s+|[\w?#]+\s{2,})?(?=[^\sA-Za-z])/, /\[[^\]]*\]/g, /\baum\b/g, /「[^」]*」と書かれた/g, /（(?:名前|呼び名)：[^）]*）/g, /#\w+/g, /\b(?:call|shell|exit|SIGINT|fg|config|enter|return|cmdassist|perm_invent|autopickup|optionsfull|NetHack|Return|Enter|ESC|Unicode|DECgraphics|IBMgraphics|AmigaFont|Amiga|hack\.font|curses|Enhanced\d|Guidebook|devteam|nethack|org|www|https|number_pad|menustyle)\b/g, /\bwizard\b/g, /\bWizard\b/g, /'[^']*'/g, /\bAgent\d+\b/g, /\bElbereth\b/g, /「[^」]*」/g, /[A-Za-z' ]+の幽霊/g, /`[^']+'/g, /\b[a-zA-Z]+_[\w]*\b/g, /\b(?:NETHACK)?OPTIONS\b/g, /\S*nethackrc\b/g, /<options>/g, /\bUTF\b/g, /『[^』]*』/g, /\b(?:lua|Lua|NHUUID|seen|des)\b/g, /\{ [0-9a-f-]+ \}/g, /\bUnix\b/g, /\([0-9a-f]{20,},branch:[^)]*\)/g, /\b[A-Z][a-z]{2} \d+ \d{4}\b/g];
const optionRow = /^\s*\S+\s+\[.*\]\s*$/;
// The list of boolean options in #optionsfull.
const optionList = /^(?:[a-zA-Z_]+(?:, |,$|\.$)\s*)+$/;
// A translated row of compound options: its examples are values the player types.
const optionHelp = /^`[^']+' - .*[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

/** Letters left from the original. */
function isUntranslated(text: string, japanese: string): boolean {
  if (debugTable.test(text) || optionRow.test(text) || optionList.test(text.trimEnd()) || optionHelp.test(japanese)) return false;
  let rest = japanese;
  for (const pattern of kept) rest = rest.replace(pattern, "");
  return /[A-Za-z]{3,}/.test(rest);
}

// insight.c shows these only in debug mode, which the bot uses to reach deep levels.
const debugSuffix = /(?:\s*[(<]-?\d+[)>])|(?: (?:innately|intrinsically|because of .+|from your .+|due to .+|by .+ form))(?=[.;]|$)/g;
// Reports of debug commands that are numbers and internal names rather than text:
// #wizobjprobs, #wizborn, #wizrumorcheck, #wizwhere, #stats, #terrain and the memory map.
const debugTable = /^\s*\d+ \/ +\d+ \(|^\s*\d+ +\d+ |object rot_|_{5,}$|^\*? ?[a-zA-Z-]+\d*: -?\d+|^\s*castle: \d+ \(tune|^[.x@#0-9f]+$|^\s*. - .+ . - |^\s*. - [a-z/ -]+$|^\S start=|^\s*<\d+,\d+>|@\[\d+,|, (?:base )?size |^\s*count\s+bytes|^Timeout for |^Mobile light|mons pending|^died born|^level number out of|^already have amulet|calculated: |^F \d+ "|^#wizcustom|^config_error_add|glyph identifier|base-36|^\s*<(?:none|empty)>|^\s*wizload|^object type names|^\s*peaceful \S+ to \d|__$|^condition\/|^Rogue[A-Z]/;
function translatesWithoutDebugSuffix(kind: string, text: string): boolean {
  const plain = text.replace(/\(-?\d+\)due /, "due ").replace(debugSuffix, "");
  return plain !== text && !isUntranslated(plain, render(kind, plain));
}

it.skipIf(!playedFile)("reports played text that stayed in English", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  const played = JSON.parse(readFileSync(playedFile!, "utf8")) as [string, number][];
  const report: string[] = [];
  for (const [key, count] of played) {
    const [kind, text] = key.split("\t") as [string, string];
    if (kind === "status" || kind === "error") continue;
    if (kind === "document") {
      // The same order CharacterInfoDialog tries: whole documents, then each line.
      const lines = text.split("\u0001");
      if (translateHelpDocument(lines, "ja") ?? translateEncyclopediaEntry(lines, "ja") ?? translateDiscoveryReport(lines, "ja")
        ?? translateOracleDocument(lines, "ja") ?? translateIntroStory(lines, "ja") ?? translateQuestDocument(lines)) continue;
      for (const line of lines) {
        if (!line.trim()) continue;
        const japanese = render("line", line);
        if (isUntranslated(line, japanese) && !translatesWithoutDebugSuffix("line", line)) report.push(`text\t${count}\t${line}\t${japanese === line ? "" : japanese}`);
      }
      continue;
    }
    const japanese = render(kind, text);
    if (isUntranslated(text, japanese) && !translatesWithoutDebugSuffix(kind, text)) report.push(`${kind}\t${count}\t${text}\t${japanese === text ? "" : japanese}`);
  }
  const unique = [...new Set(report)];
  report.length = 0;
  report.push(...unique);
  report.sort();
  writeFileSync(playedFile!.replace(/\.json$/, "") + "-untranslated.tsv", report.join("\n"));
  console.info(`${report.length} of ${played.length} played strings stayed in English`);
  expect(played.length).toBeGreaterThan(0);
}, 600000);
