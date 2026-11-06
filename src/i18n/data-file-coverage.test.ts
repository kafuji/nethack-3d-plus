// Opt-in audit: runs NetHack's data files through the app's display path, so text
// random play rarely reaches (quest dialogue, rumors, epitaphs, help) is still checked.
//   NH_DAT=<NetHack>/dat npx vitest run src/i18n/data-file-coverage.test.ts
// Writes data-untranslated.tsv in that directory: file, text, rendering.
import { expect, it, vi } from "vitest";
import { jnethackQuestDocument } from "../plus/game-text/fallback";
import { translateHelpDocument } from "./help-text";
import { loadJapaneseDictionary } from "./load-japanese-dictionary";
import { presentGameMessage } from "./message-presentation";
import { translateOracleDocument, translateRumor } from "./oracle-text";
import { translateReportLine } from "./report-text";

// Vitest exposes the process environment as import.meta.env.
const datDir = (import.meta.env as Record<string, string | undefined>).NH_DAT;

const words = (text: string) => /[A-Za-z]{3,}/.test(text.replace(/\bAgent\b/g, ""));
const comment = /^#/;

// Values for the quest.lua codes, for one role per quest: see questpgr.c convert_line().
const questRoles: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Arc: { c: "Archeologist", r: "Field Worker", R: "Investigator", l: "Lord Carnarvon", i: "the College of Archeology", o: "the Orb of Detection", O: "the Orb", n: "Minion of Huhetotl", g: "student", d: "Camaxtli", H: "the College of Archeology" },
  Bar: { c: "Barbarian", r: "Plunderer", R: "Slayer", l: "Pelias", i: "the Camp of the Duali Tribe", o: "the Heart of Ahriman", O: "the Heart", n: "Thoth Amon", g: "chieftain", d: "Mitra", H: "the Camp of the Duali Tribe" },
  Cav: { c: "Caveman", r: "Troglodyte", R: "Nomad", l: "Shaman Karnov", i: "the Caves of the Ancestors", o: "the Sceptre of Might", O: "the Sceptre", n: "Chromatic Dragon", g: "neanderthal", d: "Anu", H: "the Caves of the Ancestors" },
  Hea: { c: "Healer", r: "Rhizotomist", R: "Empiric", l: "Hippocrates", i: "the Temple of Coeus", o: "the Staff of Aesculapius", O: "the Staff", n: "Cyclops", g: "attendant", d: "Athena", H: "the Temple of Coeus" },
  Kni: { c: "Knight", r: "Gallant", R: "Esquire", l: "King Arthur", i: "Camelot Castle", o: "the Magic Mirror of Merlin", O: "the Mirror", n: "Ixoth", g: "page", d: "Lugh", H: "Camelot Castle" },
  Mon: { c: "Monk", r: "Candidate", R: "Student of Stones", l: "the Grand Master", i: "the Monastery of Chan-Sune", o: "the Eyes of the Overworld", O: "the Eyes", n: "Master Kaen", g: "abbot", d: "Shan Lai Ching", H: "the Monastery of Chan-Sune" },
  Pri: { c: "Priest", r: "Aspirant", R: "Acolyte", l: "the High Priest", i: "the Great Temple", o: "the Mitre of Holiness", O: "the Mitre", n: "Nalzok", g: "acolyte", d: "Odin", H: "the Great Temple" },
  Ran: { c: "Ranger", r: "Tenderfoot", R: "Lookout", l: "Orion", i: "Orion's camp", o: "the Longbow of Diana", O: "the Longbow", n: "Scorpius", g: "hunter", d: "Mercury", H: "Orion's camp" },
  Rog: { c: "Rogue", r: "Footpad", R: "Cutpurse", l: "the Master of Thieves", i: "the Thieves' Guild Hall", o: "the Master Key of Thievery", O: "the Master Key", n: "the Master Assassin", g: "thug", d: "Issek", H: "the Thieves' Guild Hall" },
  Sam: { c: "Samurai", r: "Hatamoto", R: "Ryoshu", l: "Lord Sato", i: "the Shogun's Castle", o: "the Tsurugi of Muramasa", O: "the Tsurugi", n: "Ashikaga Takauji", g: "roshi", d: "Amaterasu Omikami", H: "the Castle of the Taro Clan" },
  Tou: { c: "Tourist", r: "Rambler", R: "Sightseer", l: "Twoflower", i: "Ankh-Morpork", o: "the Platinum Yendorian Express Card", O: "the Card", n: "Master of Thieves", g: "guide", d: "Blind Io", H: "Ankh-Morpork" },
  Val: { c: "Valkyrie", r: "Stripling", R: "Skirmisher", l: "the Norn", i: "the Shrine of Destiny", o: "the Orb of Fate", O: "the Orb", n: "Lord Surtur", g: "warrior", d: "Tyr", H: "the Shrine of Destiny" },
  Wiz: { c: "Wizard", r: "Evoker", R: "Conjurer", l: "Neferet the Green", i: "the Lonely Tower", o: "the Eye of the Aethiopica", O: "the Eye", n: "Dark One", g: "apprentice", d: "Ptah", H: "the Lonely Tower" },
};

function fillQuest(role: string, text: string): string {
  const values: Record<string, string> = { p: "Agent", s: "sister", S: "daughter", a: "lawful", A: "Lawful", C: "chaotic", N: "neutral", L: "lawful", D: "Thoth", G: "god", x: "see", Z: "The Dungeons of Doom", ...questRoles[role] };
  const pronouns: Record<string, string> = { h: "he", H: "He", i: "him", I: "Him", j: "his", J: "His" };
  return text.replace(/%([A-Za-z])([A-Za-z]?)/g, (_token, code: string, letter: string) => {
    const value = values[code] ?? "";
    if (letter === "a") return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
    if (letter === "A") return `${/^[aeiou]/i.test(value) ? "An" : "A"} ${value}`;
    if (letter === "C") return value.charAt(0).toUpperCase() + value.slice(1);
    if (letter === "s" || letter === "S") return `${value}'s`;
    if (letter === "p" || letter === "P") return `${value}s`;
    if (letter === "t") return value.replace(/^the /i, "");
    if (letter && pronouns[letter] && "dlno".includes(code)) return pronouns[letter]!;
    return value + letter;
  });
}

/** The role sections of quest.lua and each message's text. */
function questMessages(source: string): { role: string; name: string; text: string }[] {
  const found: { role: string; name: string; text: string }[] = [];
  let role = "common";
  let name = "";
  const pattern = /^ {3}(\w+) = \{$|^ {6}(\w+) = \{$|\b(text|synopsis) = (?:\[\[([\s\S]*?)\]\]|"((?:[^"\\]|\\.)*)")/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) role = match[1];
    else if (match[2]) name = match[2];
    else if (match[3] === "text") found.push({ role, name, text: (match[4] ?? match[5] ?? "").replace(/\\"/g, "\"") });
  }
  return found;
}

it.skipIf(!datDir)("reports data file text that stayed in English", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  await loadJapaneseDictionary();
  const read = (name: string) => readFileSync(`${datDir}/${name}`, "utf8").replace(/\r\n/g, "\n");
  const lines = (name: string) => read(name).split("\n").filter((line) => line.trim() && !comment.test(line));
  const report: string[] = [];
  const add = (file: string, text: string, japanese: string) => {
    if (words(japanese)) report.push(`${file}\t${text.replace(/\n/g, " / ")}\t${japanese === text ? "" : japanese.replace(/\n/g, " / ")}`);
  };

  for (const { role, name, text } of questMessages(read("quest.lua"))) {
    const roles = role === "common" ? Object.keys(questRoles) : [role];
    for (const r of roles) {
      const filled = fillQuest(r, text);
      if (filled.includes("\n") || filled.length > 180) {
        add(`quest:${r}:${name}`, filled, jnethackQuestDocument(filled.split("\n")) ?? filled);
      } else {
        add(`quest:${r}:${name}`, filled, presentGameMessage(filled, "ja").text);
      }
      if (role === "common") break;
    }
  }

  for (const file of ["rumors.tru", "rumors.fal"]) {
    for (const raw of lines(file)) {
      // rumors.c removes the marker for rumors only a fortune cookie may show.
      const line = raw.replace(/^\[cookie\] /, "");
      add(file, line, translateRumor(line) ?? line);
    }
  }
  const passages = read("oracles.txt").split(/^-----$/m).map((part) => part.trim().split("\n")).filter((part) => part[0]);
  for (const passage of passages) add("oracles.txt", passage.join("\n"), translateOracleDocument(passage, "ja") ?? passage.join("\n"));

  for (const line of lines("engrave.txt")) add("engrave.txt", line, presentGameMessage(`You read: "${line}".`, "ja").text);
  for (const line of lines("epitaph.txt")) add("epitaph.txt", line, presentGameMessage(`You read: "${line}".`, "ja").text);

  const readC = readFileSync(`${datDir}/../src/read.c`, "utf8");
  for (const [start, end] of [["shirt_msgs[]", "};"], ["apron_msgs[]", "};"], ["card_msgs[]", "};"], ["candy_wrappers[]", "};"]]) {
    const from = readC.indexOf(start);
    const block = readC.slice(from, readC.indexOf(end, from)).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of block.matchAll(/"((?:[^"\\]|\\.)+)"/g)) add(start, match[1], presentGameMessage(`"${match[1]}"`, "ja").text);
  }

  for (const file of ["help", "hh", "keyhelp", "opthelp", "optmenu", "wizhelp", "usagehlp", "history"]) {
    const document = read(file).replace(/\n$/, "").split("\n");
    if (translateHelpDocument(document, "ja")) continue;
    for (const line of document) {
      if (line.trim()) add(file, line, presentGameMessage(translateReportLine(line, "ja"), "ja").text);
    }
  }

  writeFileSync(`${datDir}/data-untranslated.tsv`, [...new Set(report)].join("\n"));
  console.info(`${new Set(report).size} data file texts stayed in English`);
  expect(report.length).toBeGreaterThanOrEqual(0);
}, 600000);
