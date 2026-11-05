// Display-time English -> Japanese translation of NetHack game text.
//
// Game logic and client-side parsers keep seeing the original English text;
// only what is shown to the player goes through translateGameText().
// Templates and names come from JNetHack (NetHack General Public License),
// see scripts/plus/extract-jnethack-texts.mjs.
import { GameNameTranslator, type GameTextNameData, type ObjectCategory } from "./object-names";
import { coreGameTextRules, type CoreRuleContext } from "./core-rules";
import { disclosureRules } from "./disclosure-rules";
import { questLines } from "./quest-lines";
import { questSynopses } from "./quest-synopses";
import { questTextFixes } from "./quest-text-fixes";

export interface GameTextData extends GameTextNameData {
  /** Quest/legacy texts (English, Japanese) with %x substitution codes. */
  readonly questTexts?: ReadonlyArray<readonly [string, string]>;
  /** "<macro>|<english attr>" -> "<macro>|<japanese attr>" for "You are fast." lines. */
  readonly enlightenment?: Readonly<Record<string, string>>;
  /** Humanoid body part names ("leg" -> "足"). */
  readonly bodyParts?: Readonly<Record<string, string>>;
  /** Role, rank-title and god names from JNetHack role.c. */
  readonly roleNames?: Readonly<Record<string, string>>;
  /** English format with "\u0000<spec>" placeholders -> Japanese with {n}. */
  readonly templates: Readonly<Record<string, string>>;
}

interface CompiledTemplate {
  readonly regex: RegExp;
  readonly needle: string;
  readonly literalLength: number;
  readonly specs: string[];
  readonly japanese: string;
}

const specPatterns: Readonly<Record<string, string>> = {
  s: "(.+?)",
  d: "([-+]?\\d+)",
  i: "([-+]?\\d+)",
  u: "(\\d+)",
  c: "(.)",
};

/** Copy JSON data with null-prototype objects, so lookups only find its own keys. */
function withoutPrototypes<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutPrototypes) as T;
  if (value === null || typeof value !== "object") return value;
  const copy = Object.create(null) as Record<string, unknown>;
  for (const [key, item] of Object.entries(value)) copy[key] = withoutPrototypes(item);
  return copy as T;
}

// Objects src/i18n names differently from JNetHack (短剣, 小剣, 長剣, 小手,
// 魔除け, 薬), for entries src/i18n has no name of its own for.
const objectRenames: ReadonlyArray<readonly [ObjectCategory, RegExp, string, string]> = [
  ["weapon", /dagger$/, "短剣", "ダガー"],
  ["weapon", /short sword$/, "小剣", "ショートソード"],
  ["weapon", /^long sword$/, "長剣", "ロングソード"],
  ["armor", /./, "小手", "籠手"],
  ["amulet", /./, "魔除け", "護符"],
  ["potion", /./, "の薬", "のポーション"],
];

/** src/i18n's names, so a message this tier translates names things the way the curated messages do. */
export interface CuratedNames {
  readonly monster?: (english: string) => string | undefined;
  /** Name for a JNetHack objects-table entry ("striking" in the wand table). */
  readonly object?: (category: ObjectCategory, english: string) => string | undefined;
  readonly feature?: (english: string) => string | undefined;
}

// Words JNetHack uses where src/i18n has settled on another term.
const termRenames: ReadonlyArray<readonly [RegExp, string]> = [
  [/怪物/g, "モンスター"],
  [/瞬間移動/g, "テレポート"],
  [/変身/g, "変化"],
  [/鞄/g, "袋"],
  [/魔導書/g, "魔法書"],
];
// Only in message templates: quest texts also use 薬 for medicine. 薬指 (ring
// finger), 薬瓶 and 薬っぽい stay.
const templateTermRenames: ReadonlyArray<readonly [RegExp, string]> = [
  [/薬(?![指瓶っ師物])/g, "ポーション"],
  [/小手/g, "手袋"],
];

function renameTerms(text: string, renames: ReadonlyArray<readonly [RegExp, string]>): string {
  for (const [pattern, replacement] of renames) text = text.replace(pattern, replacement);
  return text;
}

function useCuratedNames(data: GameTextData, curated: CuratedNames): void {
  const replaceAll = (table: object | undefined, rename: (english: string, japanese: string) => string): void => {
    const record = (table ?? {}) as Record<string, string>;
    for (const [english, japanese] of Object.entries(record)) record[english] = rename(english, japanese);
  };
  replaceAll(data.monsters, (english, japanese) => curated.monster?.(english) ?? japanese);
  for (const [category, table] of Object.entries(data.objects) as [ObjectCategory, object][]) {
    replaceAll(table, (english, japanese) => curated.object?.(category, english) ?? japanese);
  }
  replaceAll(data.features, (english, japanese) => curated.feature?.(english) ?? renameTerms(japanese, termRenames));
  replaceAll(data.enlightenment, (_english, japanese) => renameTerms(japanese, termRenames));
  replaceAll(data.templates, (_english, japanese) => renameTerms(renameTerms(japanese, termRenames), templateTermRenames));
  (data as { questTexts?: GameTextData["questTexts"] }).questTexts =
    data.questTexts?.map(([english, japanese]) => [english, renameTerms(japanese, termRenames)] as const);
}

function renameObjects(data: GameTextData): void {
  for (const [category, pattern, from, to] of objectRenames) {
    const table = data.objects[category] as Record<string, string> | undefined;
    if (!table) continue;
    for (const [english, japanese] of Object.entries(table)) {
      if (pattern.test(english)) table[english] = japanese.replace(from, to);
    }
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** NetHack collapses "  " after sentences; compare on single spaces. */
function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function compileTemplates(templates: Readonly<Record<string, string>>): CompiledTemplate[] {
  const compiled: CompiledTemplate[] = [];
  for (const [english, japanese] of Object.entries(templates)) {
    const pieces = english.split(/\u0000([sdiuc])/);
    let pattern = "";
    const specs: string[] = [];
    let needle = "";
    let literalLength = 0;
    for (let i = 0; i < pieces.length; i += 1) {
      if (i % 2 === 1) {
        specs.push(pieces[i]!);
        // "%sfaster" / "%sless": an optional word glued to the next one
        // ("much ", "") may be empty.
        const glued = pieces[i] === "s" && /^[a-z]/.test(pieces[i + 1] ?? "");
        pattern += glued ? "(.*?)" : specPatterns[pieces[i]!] ?? "(.+?)";
        continue;
      }
      const literal = pieces[i]!.replace(/\s+/g, " ");
      pattern += escapeRegExp(literal);
      literalLength += literal.replace(/[^A-Za-z]/g, "").length;
      const trimmed = literal.trim().toLowerCase();
      if (trimmed.length > needle.length) needle = trimmed;
    }
    if (!needle) continue;
    compiled.push({
      regex: new RegExp(`^${pattern}$`, "i"),
      needle,
      literalLength,
      specs,
      japanese,
    });
  }
  // Most specific (longest literal text) first.
  compiled.sort((a, b) => b.literalLength - a.literalLength);
  return compiled;
}

interface CompiledQuestText {
  readonly regex: RegExp;
  readonly needle: string;
  readonly codes: string[];
  readonly japanese: string;
  readonly literalLength: number;
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
// Quest values JNetHack's roleNames lacks: the quest artifacts (%o) and the
// Ranger, whom it has no names for. Spelled as in src/i18n.
const questNames: Readonly<Record<string, string>> = {
  "Orb of Detection": "探知の宝珠", "Heart of Ahriman": "アーリマンの心臓", "Sceptre of Might": "力の王笏",
  "Staff of Aesculapius": "アスクレピオスの杖", "Magic Mirror of Merlin": "マーリンの魔法の鏡", "Eyes of the Overworld": "異界の眼",
  "Mitre of Holiness": "聖なる司教冠", "Longbow of Diana": "ディアナの長弓", "Master Key of Thievery": "盗賊の万能鍵",
  "Tsurugi of Muramasa": "村正の剣", "Platinum Yendorian Express Card": "プラチナ・イェンダー・エクスプレスカード",
  "Orb of Fate": "運命の宝珠", "Eye of the Aethiopica": "エチオピカの眼",
  Ranger: "レンジャー", Mercury: "メルクリウス", Venus: "ウェヌス", Mars: "マルス",
  Tenderfoot: "駆け出し", Lookout: "見張り", Trailblazer: "道開き", Reconnoiterer: "偵察者", Reconnoiteress: "偵察者",
  Scout: "斥候", Arbalester: "弩兵", Archer: "射手", Sharpshooter: "狙撃手", Marksman: "名射手", Markswoman: "名射手",
};
for (const table of [questPronouns, questPronounPatterns, questWords, questNames]) Object.setPrototypeOf(table, null);

function compileQuestTexts(texts: ReadonlyArray<readonly [string, string]>, minNeedle = 8): CompiledQuestText[] {
  const compiled: CompiledQuestText[] = [];
  for (const [english, jnethack] of texts) {
    const normalized = normalizeSpaces(english);
    const japanese = questTextFixes[normalized] ?? jnethack;
    // A few JNetHack entries were never translated (the English of another
    // version); matching them would only swap one English text for another.
    const latin = japanese.replace(/%[A-Za-z]+/g, "").replace(/[^A-Za-z]/g, "").length;
    if (latin * 2 > japanese.replace(/\s/g, "").length) continue;
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
      pattern += escapeRegExp(literal) + (questPronounPatterns[modifier.toLowerCase()] ?? "(.+?)");
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

function fillJapanese(template: string, values: readonly string[]): string {
  return template.replace(/\{\{|\}\}|\{(\d+)!?\}/g, (token, index: string | undefined, offset: number) => {
    if (token === "{{") return "{";
    if (token === "}}") return "}";
    const value = values[Number(index)] ?? "";
    // A possessive argument ("the jackal's") is already rendered with の.
    return template[offset + token.length] === "の" ? value.replace(/の$/, "") : value;
  });
}

const statusWords: Readonly<Record<string, string>> = {
  Satiated: "満腹",
  Hungry: "ぺこぺこ",
  Weak: "衰弱",
  Fainting: "ふらふら",
  Fainted: "卒倒",
  Starved: "餓死",
  Burdened: "よろめき",
  Stressed: "圧迫",
  Strained: "限界",
  Overtaxed: "荷重",
  Overloaded: "超過",
};

// Inventory class headers (JNetHack invent.c names[]).
const inventoryCategoryNames: Readonly<Record<string, string>> = {
  "Illegal objects": "妙な物体",
  Weapons: "武器",
  Armor: "防具",
  Rings: "指輪",
  Amulets: "護符",
  Tools: "道具",
  Comestibles: "食料",
  Potions: "ポーション",
  Scrolls: "巻物",
  Spellbooks: "魔法書",
  Wands: "杖",
  Coins: "金貨",
  "Gems/Stones": "宝石",
  "Boulders/Statues": "岩または彫像",
  "Iron balls": "鉄球",
  Chains: "鎖",
  Venoms: "毒",
  "Bagged/Boxed items": "詰められた道具",
};

/** Names such as "Hachi" or "Amaterasu Omikami" are not translated. */
function isProperName(value: string): boolean {
  return /^[A-Z][a-z'-]+(?: [A-Z][a-z'-]+)*$/.test(value.trim()) || !/[A-Za-z]/.test(value);
}

const sentenceEnd: Readonly<Record<string, string>> = { ".": "．", "!": "！", "?": "？" };
// Text such as "constructor" must not find Object.prototype members.
for (const table of [specPatterns, statusWords, inventoryCategoryNames, sentenceEnd]) Object.setPrototypeOf(table, null);

export class GameTextTranslator {
  private readonly templates: CompiledTemplate[];
  private readonly names: GameNameTranslator;
  private readonly cache = new Map<string, string>();
  private readonly context: CoreRuleContext;
  private readonly roleNames: Readonly<Record<string, string>>;
  private readonly bodyParts: Readonly<Record<string, string>>;
  private readonly questTexts: CompiledQuestText[];
  private readonly questSynopses: CompiledQuestText[];
  private readonly enlightenment: Readonly<Record<string, string>>;

  constructor(data: GameTextData, curated: CuratedNames = {}) {
    data = withoutPrototypes(data);
    renameObjects(data);
    useCuratedNames(data, curated);
    this.enlightenment = data.enlightenment ?? {};
    this.roleNames = data.roleNames ?? {};
    this.bodyParts = data.bodyParts ?? {};
    this.questTexts = compileQuestTexts([...(data.questTexts ?? []), ...questLines]);
    // Only ever seen in brackets, so short ones ("%nC dies.") are safe to match.
    this.questSynopses = compileQuestTexts(questSynopses, 0);
    this.templates = compileTemplates(data.templates);
    this.names = new GameNameTranslator(data);
    this.context = {
      noun: (text) => this.translateNoun(text),
      punct: (mark) => sentenceEnd[mark] ?? mark,
    };
  }

  /** Translate a whole message line; untranslatable text is returned as-is. */
  translate(text: string): string {
    const source = String(text ?? "");
    if (!/[A-Za-z]/.test(source)) return source;
    const cached = this.cache.get(source);
    if (cached !== undefined) return cached;
    const result = this.translateUncached(source);
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(source, result);
    return result;
  }

  private translateUncached(source: string): string {
    const normalized = normalizeSpaces(source);
    // questpgr.c puts each quest text window in the message history as
    // "[synopsis]", or as "[the whole text]" when it has no synopsis.
    const synopsis = /^\[(.+)\]$/.exec(normalized);
    if (synopsis) {
      const quest = this.translateQuestText(synopsis[1]!, this.questSynopses) ?? this.translateQuestText(synopsis[1]!);
      if (quest !== null) return `[${quest.replace(/\s*\n\s*/g, "")}]`;
    }
    const whole = this.translateSentence(normalized, 0);
    if (whole !== null) return whole;
    // Spoken lines (verbalize) arrive wrapped in quotes: translate the inside.
    const quoted = /^"(.+)"$/.exec(normalized);
    if (quoted) {
      const inner = this.translateSentence(quoted[1]!, 0);
      if (inner !== null) return `「${inner.replace(/^「|」$/g, "")}」`;
    }
    // NetHack joins several messages with two spaces on one line.
    const sentences = source.split(/(?<=[.!?])\s{2,}/).map(normalizeSpaces).filter(Boolean);
    if (sentences.length > 1) {
      const parts = sentences.map((sentence) => this.translateSentence(sentence, 0));
      if (parts.some((part) => part !== null)) {
        return parts.map((part, i) => part ?? sentences[i]).join("");
      }
    }
    return source;
  }

  /**
   * Translate a whole text window (quest messages, legacy intro). Falls back
   * to translating each line on its own.
   */
  translateWindow(lines: readonly string[]): string[] {
    const quest = this.translateQuestText(lines.join(" "));
    if (quest !== null) return quest.split("\n");
    return lines.map((line) => this.translate(line));
  }

  /** Whole quest/legacy text only (no per-line fallback); null when unknown. */
  translateQuestDocument(lines: readonly string[]): string[] | null {
    const quest = this.translateQuestText(lines.join(" "));
    return quest === null ? null : quest.split("\n");
  }

  private translateQuestText(text: string, texts: readonly CompiledQuestText[] = this.questTexts): string | null {
    const normalized = normalizeSpaces(text);
    if (normalized.length < 8) return null;
    const lower = normalized.toLowerCase();
    for (const quest of texts) {
      if (!lower.includes(quest.needle)) continue;
      const match = quest.regex.exec(normalized);
      if (!match) continue;
      // Keyed by code plus modifier ("nh" is a pronoun, "n" a name); a
      // Japanese code falls back to the bare code's value.
      const values = new Map<string, string>();
      quest.codes.forEach((token, i) => {
        if (!values.has(token)) values.set(token, this.translateQuestValue(token, match[i + 1]!));
        const code = token[0]!;
        if (!values.has(code) && !/[hHiIjJ]/.test(token.slice(1))) values.set(code, values.get(token)!);
      });
      return replaceQuestCodes(quest.japanese, (code, modifier) =>
        values.get(code + modifier) ?? values.get(code) ?? `%${code}${modifier}`);
    }
    return null;
  }

  private translateQuestValue(token: string, value: string): string {
    const trimmed = value.trim();
    const code = token[0]!;
    const modifier = token.slice(1);
    if (code === "G") return /goddess/i.test(trimmed) ? "女神" : "神";
    if (/[hHiIjJ]/.test(modifier)) return questPronouns[trimmed.toLowerCase()] ?? trimmed;
    const bare = trimmed.replace(/^(?:the|a|an) /i, "").replace(/'s?$/, "");
    if ("sSaACNLx".includes(code)) {
      const word = questWords[bare.toLowerCase().replace(/s$/, "")] ?? questWords[bare.toLowerCase()];
      if (word) return word;
    }
    // %HC capitalizes "the College of Archeology" to "The College ...".
    const lowered = trimmed.replace(/^The /, "the ").replace(/'s?$/, "");
    // %Rp, %gP: makeplural() of a rank or guard ("Excavators", "Priestesses").
    for (const name of /[pP]/.test(modifier) ? [bare, bare.replace(/es$/, ""), bare.replace(/s$/, "")] : [bare]) {
      const found = this.roleNames[trimmed] ?? this.roleNames[lowered] ?? this.roleNames[name] ?? questNames[name];
      if (found) return found;
    }
    return this.translateNoun(bare);
  }

  /** "You were fast." -> JNetHack insight.c wording (enlght_line). */
  private translateEnlightenment(sentence: string): string | null {
    const match =
      /^You (are|were|have been|have never|never|have|had|can|could) (.+?)(?: because of .+?)?\.$/.exec(sentence);
    if (!match) return null;
    const verb = match[1]!;
    const macro =
      verb === "are" || verb === "were" ? (["you_are", "you_have_been"] as const)
      : verb === "have been" ? (["you_have_been"] as const)
      : verb === "have never" || verb === "never" ? (["you_have_never"] as const)
      : verb === "have" || verb === "had" ? (["you_have", "you_have_X"] as const)
      : (["you_can"] as const);
    const past = ["were", "had", "could", "never"].includes(verb);
    for (const candidate of macro) {
      const entry = this.enlightenment[`${candidate}|${match[2]}`];
      if (!entry) continue;
      const [jaMacro, attr] = entry.split("|") as [string, string];
      const endings: Readonly<Record<string, readonly [string, string, string]>> = {
        // [prefix, present, past] following JNetHack's enl_msg() macros.
        you_are: ["あなたは", "である", "であった"],
        you_have_been: ["あなたは", "である", "であった"],
        you_have: ["あなたは", "をもっている", "をもっていた"],
        you_can: ["あなたは", "できる", "できた"],
        you_are_ing: ["あなたは", "いる", "いた"],
        you_have_never: ["", "ていない", "なかった"],
        you_have_X: ["", "ている", "た"],
      };
      const ending = endings[jaMacro];
      if (!ending) continue;
      return `${ending[0]}${attr}${past ? ending[2] : ending[1]}．`;
    }
    return null;
  }

  private translateSentence(sentence: string, depth: number): string | null {
    const quest = depth === 0 ? this.translateQuestText(sentence) : null;
    if (quest !== null) return quest.replace(/\n+/g, "");
    const enlightenment = this.translateEnlightenment(sentence);
    if (enlightenment !== null) return enlightenment;
    for (const rule of [...coreGameTextRules, ...disclosureRules]) {
      const match = rule.pattern.exec(sentence);
      if (match) {
        const result = rule.translate(match, this.context);
        if (result !== null) return result;
      }
    }
    const lower = sentence.toLowerCase();
    for (const template of this.templates) {
      if (!lower.includes(template.needle)) continue;
      const match = template.regex.exec(sentence);
      if (!match) continue;
      const values = match.slice(1).map((value, i) =>
        template.specs[i] === "s" ? this.translateArgument(value, depth) : value,
      );
      // A capture left in English usually means the template matched the
      // wrong message; only proper names (pets, gods, shopkeepers) may stay.
      const unresolved = values.some(
        (value, i) => template.specs[i] === "s" && /[a-z]{3,}/.test(value) && !isProperName(value),
      );
      if (unresolved) continue;
      return fillJapanese(template.japanese, values);
    }
    return null;
  }

  private translateArgument(value: string, depth: number): string {
    // Only noun phrases are substituted: translating verb phrases on their
    // own produces broken Japanese ("食べる終えた").
    void depth;
    return this.translateNoun(value);
  }

  /** Translate a noun phrase (monster, object, pronoun); returns input if unknown. */
  translateNoun(text: string): string {
    const value = text.trim();
    const lower = value.toLowerCase();
    // Small intensifiers passed as %s ("moving %sfaster").
    const adverbs: Readonly<Record<string, string>> = {
      "": "",
      much: "ずっと",
      very: "とても",
      "a bit": "少し",
      slightly: "わずかに",
      more: "もっと",
      less: "少なく",
    };
    if (Object.prototype.hasOwnProperty.call(adverbs, lower) && text !== "") return adverbs[lower]!;
    if (value === "") return "";
    // Temple priests: "the priestess of Amaterasu Omikami" (priest.c priestname).
    const priest = /^(?:the |a |an )?(high )?(priest|priestess) of (.+)$/i.exec(value);
    if (priest) {
      const deity = this.roleNames[priest[3]!] ?? priest[3]!;
      return `${deity}の${priest[1] ? "高" : ""}${priest[2]!.toLowerCase() === "priestess" ? "尼僧" : "僧侶"}`;
    }
    const pronouns: Readonly<Record<string, string>> = {
      it: "何者か",
      you: "あなた",
      yourself: "あなた自身",
      something: "何か",
      someone: "誰か",
      "it's": "何者かの",
      your: "あなたの",
      its: "その",
      their: "それらの",
      them: "それら",
    };
    if (Object.prototype.hasOwnProperty.call(pronouns, lower)) return pronouns[lower]!;
    const possessive = /^(.+?)(?:'s|')$/.exec(value);
    if (possessive) {
      const base = this.translateNoun(possessive[1]!);
      return base !== possessive[1] ? `${base}の` : value;
    }
    const bodyPart = this.translateBodyPart(value);
    if (bodyPart) return bodyPart;
    return (
      this.names.translateMonster(value) ??
      this.names.translateObject(value) ??
      this.names.translateFeature(value) ??
      this.names.lookupDungeon(value) ??
      value
    );
  }

  /** Status line title "Tester the Plunderess" -> "Tester 盗賊" (JNetHack botl.c). */
  translatePlayerTitle(text: string): string {
    const match = /^(.+?) the (.+)$/.exec(String(text ?? "").trim());
    if (!match) return text;
    const rank = this.roleNames[match[2]!] ?? this.names.lookupMonster(match[2]!.toLowerCase());
    return rank ? `${match[1]} ${rank}` : text;
  }

  /** Hunger and encumbrance words shown as status badges (JNetHack eat.c/botl.c). */
  translateStatusWord(text: string): string {
    return statusWords[String(text ?? "").trim()] ?? text;
  }

  /** "legs", "your hands" -> JNetHack body part words. */
  private translateBodyPart(text: string): string | null {
    const match = /^(?:(your|his|her|its|their) )?([a-z ]+?)$/i.exec(text.trim());
    if (!match) return null;
    const parts = this.bodyParts;
    const word = match[2]!.toLowerCase();
    const singular = parts[word] ? word : word.replace(/(?:ves)$/, "f").replace(/(?:feet)$/, "foot").replace(/s$/, "");
    const ja = parts[singular] ?? (word === "feet" ? parts.foot : undefined);
    if (!ja) return null;
    return `${match[1]?.toLowerCase() === "your" ? "あなたの" : ""}${ja}`;
  }

  /** "Dungeons of Doom 3" style location labels from the status line. */
  translateLocation(text: string): string {
    const match = /^(.+?)(?:\s+(\d+))?$/.exec(String(text ?? "").trim());
    if (!match) return text;
    const dungeon = this.names.lookupDungeon(match[1]!);
    if (!dungeon) return text;
    return match[2] ? `${dungeon} ${match[2]}` : dungeon;
  }

  /** Translate an object or inventory line such as "a - a +1 long sword (weapon in hand)". */
  translateItemText(text: string): string {
    const source = String(text ?? "");
    const category = /^(Unpaid )?([A-Za-z/ ]+?)(\s+\('.'\))?$/.exec(source.trim());
    if (category && inventoryCategoryNames[category[2]!]) {
      return `${category[1] ? "未払いの" : ""}${inventoryCategoryNames[category[2]!]}${category[3] ?? ""}`;
    }
    const inventoryLine = /^(\s*[A-Za-z$#&]\s+[-+]\s+)(.+?)(\.?)$/.exec(source);
    if (inventoryLine) {
      const name = this.names.translateObject(inventoryLine[2]!);
      if (name) return `${inventoryLine[1]}${name}${inventoryLine[3] ? "．" : ""}`;
    }
    const name = this.names.translateObject(source);
    if (name) return name;
    return this.translate(source);
  }
}
