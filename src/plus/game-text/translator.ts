// Display-time English -> Japanese translation of NetHack game text.
//
// Game logic and client-side parsers keep seeing the original English text;
// only what is shown to the player goes through translateGameText().
// Templates and names come from JNetHack (NetHack General Public License),
// see scripts/plus/extract-jnethack-texts.mjs.
import { GameNameTranslator, type GameTextNameData } from "./object-names";
import { coreGameTextRules, type CoreRuleContext } from "./core-rules";

export interface GameTextData extends GameTextNameData {
  /** Quest/legacy texts (English, Japanese) with %x substitution codes. */
  readonly questTexts?: ReadonlyArray<readonly [string, string]>;
  /** "<macro>|<english attr>" -> "<macro>|<japanese attr>" for "You are fast." lines. */
  readonly enlightenment?: Readonly<Record<string, string>>;
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
        pattern += specPatterns[pieces[i]!] ?? "(.+?)";
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
}

// quest.lua substitution codes: %d deity, %r rank, %G "god"/"goddess", ...
// An optional capital suffix (%dC, %dI) selects a capitalized variant.
const questCodePattern = /%([A-Za-z])(?:[A-Z](?![a-z]))?/g;

function compileQuestTexts(texts: ReadonlyArray<readonly [string, string]>): CompiledQuestText[] {
  const compiled: CompiledQuestText[] = [];
  for (const [english, japanese] of texts) {
    const normalized = normalizeSpaces(english);
    const codes: string[] = [];
    let pattern = "";
    let needle = "";
    let last = 0;
    for (const match of normalized.matchAll(questCodePattern)) {
      const literal = normalized.slice(last, match.index);
      pattern += escapeRegExp(literal) + "(.+?)";
      if (literal.trim().length > needle.length) needle = literal.trim().toLowerCase();
      codes.push(match[1]!);
      last = match.index! + match[0].length;
    }
    const tail = normalized.slice(last);
    pattern += escapeRegExp(tail);
    if (tail.trim().length > needle.length) needle = tail.trim().toLowerCase();
    if (needle.replace(/[^a-z]/g, "").length < 8) continue;
    compiled.push({ regex: new RegExp(`^${pattern}$`, "i"), needle, codes, japanese });
  }
  return compiled;
}

function fillJapanese(template: string, values: readonly string[]): string {
  return template.replace(/\{\{|\}\}|\{(\d+)!?\}/g, (token, index: string | undefined) => {
    if (token === "{{") return "{";
    if (token === "}}") return "}";
    return values[Number(index)] ?? "";
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
  Armor: "鎧",
  Rings: "指輪",
  Amulets: "魔除け",
  Tools: "道具",
  Comestibles: "食料",
  Potions: "薬",
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

export class GameTextTranslator {
  private readonly templates: CompiledTemplate[];
  private readonly names: GameNameTranslator;
  private readonly cache = new Map<string, string>();
  private readonly context: CoreRuleContext;
  private readonly roleNames: Readonly<Record<string, string>>;
  private readonly questTexts: CompiledQuestText[];
  private readonly enlightenment: Readonly<Record<string, string>>;

  constructor(data: GameTextData) {
    this.enlightenment = data.enlightenment ?? {};
    this.roleNames = data.roleNames ?? {};
    this.questTexts = compileQuestTexts(data.questTexts ?? []);
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
    const whole = this.translateSentence(normalized, 0);
    if (whole !== null) return whole;
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

  private translateQuestText(text: string): string | null {
    const normalized = normalizeSpaces(text);
    if (normalized.length < 8) return null;
    const lower = normalized.toLowerCase();
    for (const quest of this.questTexts) {
      if (!lower.includes(quest.needle)) continue;
      const match = quest.regex.exec(normalized);
      if (!match) continue;
      const values = new Map<string, string>();
      quest.codes.forEach((code, i) => {
        if (!values.has(code)) values.set(code, this.translateQuestValue(code, match[i + 1]!));
      });
      return quest.japanese.replace(questCodePattern, (token, code: string) => values.get(code) ?? token);
    }
    return null;
  }

  private translateQuestValue(code: string, value: string): string {
    const trimmed = value.trim();
    if (code === "G") return /goddess/i.test(trimmed) ? "女神" : "神";
    const bare = trimmed.replace(/^(?:the|a|an) /i, "");
    return this.roleNames[trimmed] ?? this.roleNames[bare] ?? this.translateNoun(trimmed);
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
    for (const rule of coreGameTextRules) {
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
    if (pronouns[lower]) return pronouns[lower]!;
    const possessive = /^(.+?)(?:'s|')$/.exec(value);
    if (possessive) {
      const base = this.translateNoun(possessive[1]!);
      return base !== possessive[1] ? `${base}の` : value;
    }
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
