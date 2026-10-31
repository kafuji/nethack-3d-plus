// Display-time English -> Japanese translation of NetHack game text.
//
// Game logic and client-side parsers keep seeing the original English text;
// only what is shown to the player goes through translateGameText().
// Templates and names come from JNetHack (NetHack General Public License),
// see scripts/plus/extract-jnethack-texts.mjs.
import { GameNameTranslator, type GameTextNameData } from "./object-names";
import { coreGameTextRules, type CoreRuleContext } from "./core-rules";

export interface GameTextData extends GameTextNameData {
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

function fillJapanese(template: string, values: readonly string[]): string {
  return template.replace(/\{\{|\}\}|\{(\d+)!?\}/g, (token, index: string | undefined) => {
    if (token === "{{") return "{";
    if (token === "}}") return "}";
    return values[Number(index)] ?? "";
  });
}

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

const sentenceEnd: Readonly<Record<string, string>> = { ".": "．", "!": "！", "?": "？" };

export class GameTextTranslator {
  private readonly templates: CompiledTemplate[];
  private readonly names: GameNameTranslator;
  private readonly cache = new Map<string, string>();
  private readonly context: CoreRuleContext;

  constructor(data: GameTextData) {
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

  private translateSentence(sentence: string, depth: number): string | null {
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
      return fillJapanese(template.japanese, values);
    }
    return null;
  }

  private translateArgument(value: string, depth: number): string {
    const noun = this.translateNoun(value);
    if (noun !== value) return noun;
    if (depth < 1) {
      const nested = this.translateSentence(value, depth + 1);
      if (nested !== null) return nested.replace(/[．。]$/, "");
    }
    return value;
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
    return this.names.translateMonster(value) ?? this.names.translateObject(value) ?? value;
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
