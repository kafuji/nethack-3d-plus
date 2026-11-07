// Quest dialogue (dat/quest.lua). NetHack fills %-codes into each text before
// showing it, so a shown text is matched against the English with the codes
// as captures, and the captured names are put into the Japanese the same way.
import questData from "./data/quest-texts-ja.json";
import { translateIdentityWord } from "./character-text";
import { translateMonsterName } from "./game-monsters";
import { deityNames } from "./intro-story";
import { translateInventoryItem } from "./inventory-text";
import { translatePlayerRank } from "./player-title";
import { questArtifactShortNames, questPlaces } from "./proper-names";
import { questLines } from "./quest-lines";
import { questSynopses } from "./quest-synopses";

interface CompiledQuestText {
  readonly regex: RegExp;
  readonly needle: string;
  readonly codes: string[];
  readonly japanese: string;
  readonly literalLength: number;
}

const own = <T>(table: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** NetHack collapses "  " after sentences and rewraps windows; compare on single spaces. */
function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const questPronounPatterns: Readonly<Record<string, string>> = {
  h: "(he|she|it|they)", i: "(him|her|it|them)", j: "(his|her|its|their)",
};

// quest.lua substitution codes: %d deity, %r rank, %G "god"/"goddess", ...
// questpgr.c convert_line() always takes one modifier letter from "AaCPpSst"
// after the code (%Ra "a Ryoshu", %ns "Ashikaga Takauji's"), and takes a
// pronoun modifier (h, i, j and capitals) only after d, l, n or o.
const questCodePattern = /%([A-Za-z])([A-Za-z]?)/g;

function questModifier(code: string, letter: string): string {
  if (letter && "AaCPpSst".includes(letter)) return letter;
  if (letter && "hHiIjJ".includes(letter) && "dlno".includes(code.toLowerCase())) return letter;
  return "";
}

/** Replace each quest code with fill(code, modifier), keeping unconsumed letters. */
function replaceQuestCodes(text: string, fill: (code: string, modifier: string) => string): string {
  return text.replace(questCodePattern, (_token, code: string, letter: string) => {
    const modifier = questModifier(code, letter);
    return fill(code, modifier) + (modifier ? "" : letter);
  });
}

const questPronouns: Readonly<Record<string, string>> = {
  he: "彼", she: "彼女", him: "彼", her: "彼女", his: "彼の", it: "それ", its: "その", they: "彼ら", them: "彼ら", their: "彼らの",
};
// %s/%S kin, %a/%A/%C/%N/%L alignments, and %x, which the Japanese texts
// use as a verb stem ("%xた").
const questWords: Readonly<Record<string, string>> = {
  brother: "兄弟", sister: "姉妹", son: "息子", daughter: "娘",
  lawful: "秩序", neutral: "中立", chaotic: "混沌", unaligned: "無属性",
  see: "見", sense: "感じ",
};

function compileQuestTexts(texts: ReadonlyArray<readonly [string, string]>, minNeedle = 8): CompiledQuestText[] {
  const compiled: CompiledQuestText[] = [];
  for (const [english, japanese] of texts) {
    const normalized = normalizeSpaces(english);
    const codes: string[] = [];
    let pattern = "";
    let needle = "";
    let literalLength = 0;
    let last = 0;
    for (const match of normalized.matchAll(questCodePattern)) {
      const modifier = questModifier(match[1]!, match[2]!);
      const literal = normalized.slice(last, match.index);
      // A pronoun is one word; matching it as such keeps "%o %lh" from
      // splitting "the Orb of Detection he" at the wrong space.
      pattern += escapeRegExp(literal) + (own(questPronounPatterns, modifier.toLowerCase()) ?? "(.+?)");
      literalLength += literal.length;
      if (literal.trim().length > needle.length) needle = literal.trim().toLowerCase();
      codes.push(match[1]! + modifier);
      last = match.index! + 1 + match[1]!.length + modifier.length;
    }
    const tail = normalized.slice(last);
    pattern += escapeRegExp(tail);
    literalLength += tail.length;
    if (tail.trim().length > needle.length) needle = tail.trim().toLowerCase();
    if (needle.replace(/[^a-z]/g, "").length < minNeedle) continue;
    compiled.push({ regex: new RegExp(`^${pattern}$`, "i"), needle, codes, japanese, literalLength });
  }
  // "Once again, you stand before %i." also matches the text of "...before
  // the entrance to %i."; try the template with the most fixed text first.
  return compiled.sort((a, b) => b.literalLength - a.literalLength);
}

let questTexts: CompiledQuestText[] | undefined;
let synopsisTexts: CompiledQuestText[] | undefined;

function texts(): CompiledQuestText[] {
  questTexts ??= compileQuestTexts([...(questData.texts as [string, string][]), ...questLines]);
  return questTexts;
}

function synopses(): CompiledQuestText[] {
  // Only ever seen in brackets, so short ones ("%nC dies.") are safe to match.
  synopsisTexts ??= compileQuestTexts(questSynopses, 0);
  return synopsisTexts;
}

/** The Japanese for one name NetHack put in place of a quest code. */
function questValue(token: string, value: string): string {
  const trimmed = value.trim();
  const code = token[0]!;
  const modifier = token.slice(1);
  if (code === "G") return /goddess/i.test(trimmed) ? "女神" : "神";
  if (/[hHiIjJ]/.test(modifier)) return own(questPronouns, trimmed.toLowerCase()) ?? trimmed;
  const bare = trimmed.replace(/^(?:the|a|an) /i, "").replace(/'s?$/, "");
  if ("sSaACNLx".includes(code)) {
    const word = own(questWords, bare.toLowerCase().replace(/s$/, "")) ?? own(questWords, bare.toLowerCase());
    if (word) return word;
  }
  if (code === "Z") return "運命の大迷宮";
  // %HC capitalizes "the College of Archeology" to "The College ...".
  const lowered = trimmed.replace(/^The /, "the ").replace(/'s?$/, "");
  const place = own(questPlaces, lowered) ?? own(questPlaces, bare);
  if (place) return place;
  const short = own(questArtifactShortNames, lowered);
  if (short) return short;
  // %Rp, %gP: makeplural() of a rank or guard ("Excavators", "Priestesses").
  const forms = /[pP]/.test(modifier) ? [bare, bare.replace(/es$/, ""), bare.replace(/s$/, "")] : [bare];
  // %gC capitalizes a guardian ("Roshi"), which the monster table has in lower case.
  const names = [...forms, ...forms.map((form) => form.charAt(0).toLowerCase() + form.slice(1))];
  for (const name of names) {
    const deity = own(deityNames, name);
    if (deity) return deity;
    const role = translateIdentityWord(name);
    if (role) return role;
    const rank = translatePlayerRank(name, "ja");
    if (rank !== name) return rank;
    const monster = translateMonsterName(`the ${name}`, "ja");
    if (monster !== `the ${name}`) return monster;
    const artifact = translateInventoryItem(`the ${name}`, "ja");
    if (artifact !== `the ${name}`) return artifact;
  }
  return bare;
}

function translateQuestText(text: string, candidates: readonly CompiledQuestText[]): string | undefined {
  const normalized = normalizeSpaces(text);
  if (normalized.length < 8) return undefined;
  const lower = normalized.toLowerCase();
  for (const quest of candidates) {
    if (!lower.includes(quest.needle)) continue;
    const match = quest.regex.exec(normalized);
    if (!match) continue;
    // Keyed by code plus modifier ("nh" is a pronoun, "n" a name); a
    // Japanese code falls back to the bare code's value.
    const values = new Map<string, string>();
    quest.codes.forEach((token, i) => {
      if (!values.has(token)) values.set(token, questValue(token, match[i + 1]!));
      const code = token[0]!;
      if (!values.has(code) && !/[hHiIjJ]/.test(token.slice(1))) values.set(code, values.get(token)!);
    });
    return replaceQuestCodes(quest.japanese, (code, modifier) =>
      values.get(code + modifier) ?? values.get(code) ?? `%${code}${modifier}`);
  }
  return undefined;
}

/** A quest text window, translated as a whole; undefined when it is not one. */
export function translateQuestDocument(lines: readonly string[]): string | undefined {
  return translateQuestText(lines.join(" "), texts());
}

/**
 * A quest text shown as a message: a short text, a spoken line, or the
 * "[synopsis]" questpgr.c puts in the message history after a text window
 * ("[the whole text]" when it has none).
 */
export function translateQuestMessage(message: string): string | undefined {
  const normalized = normalizeSpaces(message);
  const synopsis = /^\[(.+)\]$/.exec(normalized);
  if (synopsis) {
    const quest = translateQuestText(synopsis[1]!, synopses()) ?? translateQuestText(synopsis[1]!, texts());
    if (quest !== undefined) return `[${quest.replace(/\s*\n\s*/g, "")}]`;
  }
  return translateQuestText(normalized, texts())?.replace(/\n+/g, "");
}
