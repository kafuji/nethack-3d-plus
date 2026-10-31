// English -> Japanese object and monster name translation, modeled on
// JNetHack's xname()/doname() output (see src/objnam.c and japanese/jlib.c
// in https://github.com/jnethack/jnethack-alpha).

export type ObjectCategory =
  | "weapon"
  | "armor"
  | "ring"
  | "amulet"
  | "tool"
  | "food"
  | "potion"
  | "scroll"
  | "spellbook"
  | "wand"
  | "coin"
  | "gem"
  | "rock"
  | "other";

export interface GameTextNameData {
  readonly monsters: Readonly<Record<string, string>>;
  readonly objects: Readonly<Partial<Record<ObjectCategory, Readonly<Record<string, string>>>>>;
  /** Map features and traps ("doorway", "fountain"). */
  readonly features?: Readonly<Record<string, string>>;
  /** Dungeon branch names ("The Gnomish Mines"). */
  readonly dungeons?: Readonly<Record<string, string>>;
}

// Features look_here() builds itself rather than taking from defsyms.
const extraFeatures: Readonly<Record<string, string>> = {
  "broken door": "壊れた扉",
  "pool of water": "水たまり",
  "set of iron bars": "鉄の棒",
  "open drawbridge portcullis": "降りている跳ね橋",
  "ladder": "はしご",
  "staircase": "階段",
  "stairs": "階段",
};

const alignmentWords: Readonly<Record<string, string>> = {
  lawful: "秩序",
  neutral: "中立",
  chaotic: "混沌",
  unaligned: "無心",
};

// Prefix words from doname(), longest first so "very rusty" wins over "rusty".
const prefixWords: ReadonlyArray<readonly [string, string]> = [
  ["partly eaten", "食べかけの"],
  ["partly used", "使いさしの"],
  ["thoroughly", "かなり"],
  ["very", "とても"],
  ["uncursed", "呪われていない"],
  ["cursed", "呪われた"],
  ["blessed", "祝福された"],
  ["unholy", "不浄な"],
  ["holy", "聖"],
  ["empty", "空っぽの"],
  ["broken", "鍵の壊れた"],
  ["unlocked", "鍵の掛かっていない"],
  ["locked", "鍵の掛かった"],
  ["trapped", "罠の仕掛けられた"],
  ["greased", "油の塗られた"],
  ["poisoned", "毒の塗られた"],
  ["rusty", "錆びた"],
  ["burnt", "焦げた"],
  ["corroded", "腐食した"],
  ["rotted", "腐った"],
  ["rustproof", "錆びない"],
  ["fireproof", "燃えない"],
  ["corrodeproof", "腐食しない"],
  ["rotproof", "腐らない"],
  ["fixed", "安定した"],
  ["diluted", "薄まった"],
  ["lit", "光っている"],
  ["unlit", "光っていない"],
  ["unpaid", "未払いの"],
  ["engraved", "彫られた"],
  ["smoothed", "滑らかな"],
];

// Parenthesized doname() suffixes.
const suffixPhrases: Readonly<Record<string, string>> = {
  "being worn": "身につけている",
  "being donned": "身につけている途中",
  "being doffed": "脱いでいる途中",
  "embedded in your skin": "肌に埋めこまれている",
  wielded: "装備している",
  lit: "光っている",
  "in quiver": "矢筒に入っている",
  "in quiver pouch": "弾入れに入っている",
  "at the ready": "準備している",
  "laid by you": "あなたが産んだ",
  "alternate weapon; not wielded": "予備の武器;装備していない",
  "alternate weapons; not wielded": "予備の武器;装備していない",
  "weapon in hand": "手に持っている",
  "weapon in hands": "両手に持っている",
  "weapon in left hand": "左手に持っている",
  "weapon in right hand": "右手に持っている",
  "wielded in left hand": "左手にしている",
  "wielded in right hand": "右手にしている",
  "on left hand": "左手",
  "on right hand": "右手",
  "chained to you": "あなたにつながれている",
  "unpaid": "未払い",
  "no charge": "無料",
  "in use": "使用中",
};

const monsterAdjectives: ReadonlyArray<readonly [string, string]> = [
  ["invisible", "姿の見えない"],
  ["peaceful", "友好的な"],
  ["tame", "飼いならされた"],
  ["saddled", "鞍をつけた"],
  ["trapped", "罠にかかった"],
];

const irregularPlurals: Readonly<Record<string, string>> = {
  teeth: "tooth",
  feet: "foot",
  knives: "knife",
  staves: "staff",
  mice: "mouse",
  lice: "louse",
  geese: "goose",
  men: "man",
  women: "woman",
  dwarves: "dwarf",
  elves: "elf",
  wolves: "wolf",
  thieves: "thief",
  leaves: "leaf",
  loaves: "loaf",
  oxen: "ox",
  children: "child",
  "gold pieces": "gold piece",
  vortices: "vortex",
  matzot: "matzo",
  homunculi: "homunculus",
  fungi: "fungus",
  djinn: "djinni",
  cyclopes: "cyclops",
};

/** Candidate singular forms for an English noun phrase (plural last word). */
export function singularCandidates(name: string): string[] {
  const candidates = [name];
  const irregular = irregularPlurals[name];
  if (irregular) candidates.push(irregular);
  // "pairs of X", "potions of X": singularize the head word before " of ".
  const ofIndex = name.indexOf(" of ");
  const head = ofIndex > 0 ? name.slice(0, ofIndex) : name;
  const tail = ofIndex > 0 ? name.slice(ofIndex) : "";
  const words = head.split(" ");
  const last = words[words.length - 1] ?? "";
  const forms: string[] = [];
  const irregularLast = irregularPlurals[last];
  if (irregularLast) forms.push(irregularLast);
  if (/[^aeiou]ies$/.test(last)) forms.push(`${last.slice(0, -3)}y`);
  if (/(?:s|x|z|ch|sh)es$/.test(last)) forms.push(last.slice(0, -2));
  if (/ves$/.test(last)) forms.push(`${last.slice(0, -3)}f`, `${last.slice(0, -3)}fe`);
  if (/s$/.test(last) && !/ss$/.test(last)) forms.push(last.slice(0, -1));
  for (const form of forms) {
    candidates.push([...words.slice(0, -1), form].join(" ") + tail);
  }
  return candidates;
}

export function counterFor(category: ObjectCategory | null, singularName: string, quantity: number): string {
  switch (category) {
    case "weapon":
      return singularName === "shuriken" ? "枚" : "本";
    case "wand":
      return "本";
    case "armor":
      return "着";
    case "gem":
    case "rock":
      return "個";
    case "scroll":
    case "coin":
      return "枚";
    case "spellbook":
      return "冊";
    case "tool":
      if (/^(credit card|towel|blindfold)$/.test(singularName)) return "枚";
      if (/^(skeleton key|tallow candle|wax candle|pick-axe|unicorn horn|leash|stethoscope|magic marker)$/.test(singularName)) {
        return "本";
      }
      if (singularName === "crystal ball") return "個";
      return quantity < 10 ? "つ" : "";
    default:
      return quantity < 10 ? "つ" : "";
  }
}

const categoryNouns: ReadonlyArray<readonly [ObjectCategory, string, string]> = [
  ["potion", "potion", "薬"],
  ["scroll", "scroll", "巻物"],
  ["wand", "wand", "杖"],
  ["ring", "ring", "指輪"],
  ["amulet", "amulet", "魔除け"],
  ["spellbook", "spellbook", "魔法書"],
];

export class GameNameTranslator {
  constructor(private readonly data: GameTextNameData) {}

  /** "The Gnomish Mines" / "the Gnomish Mines" -> "ノームの鉱山". */
  lookupDungeon(name: string): string | null {
    const dungeons = this.data.dungeons ?? {};
    const trimmed = name.trim();
    const capitalized = trimmed.replace(/^the /, "The ");
    return dungeons[trimmed] ?? dungeons[capitalized] ?? dungeons[`The ${trimmed}`] ?? null;
  }

  /** Map features, traps, stairs and altars ("a doorway", "staircase down to level 3"). */
  translateFeature(phrase: string): string | null {
    const rest = phrase.trim().replace(/^(?:an?|the) /i, "");
    const features = this.data.features ?? {};
    const direct = features[rest] ?? extraFeatures[rest];
    if (direct) return direct;
    const altar = /^(high )?altar to (.+?) \((\w+)\)$/.exec(rest);
    if (altar) {
      const alignment = alignmentWords[altar[3]!] ?? altar[3];
      return `${altar[1] ? "高位の" : ""}${altar[2]}の祭壇(${alignment})`;
    }
    const stairs = /^((?:branch )?(?:staircase|stairs|ladder) (?:up|down))(?: (.+))?$/.exec(rest);
    if (stairs) {
      const base = features[stairs[1]!.replace(/^(branch )?stairs/, "$1staircase")];
      if (!base) return null;
      const where = stairs[2];
      if (!where) return base;
      const level = /^to level (\d+)$/.exec(where);
      if (level) return `地下${level[1]}階への${base}`;
      if (where === "out of the dungeon") return `ダンジョンの外への${base}`;
      if (where === "to the Elemental Planes") return `精霊界への${base}`;
      if (where === "to the end game") return `最終試練への${base}`;
      const branch = /^to (.+?)(?: level (\d+))?$/.exec(where);
      const dungeon = branch ? this.lookupDungeon(branch[1]!) : null;
      if (dungeon) return `${dungeon}${branch![2] ? `の${branch![2]}階` : ""}への${base}`;
    }
    return null;
  }

  lookupMonster(name: string): string | null {
    const lower = name.toLowerCase();
    for (const candidate of singularCandidates(lower)) {
      const ja = this.data.monsters[candidate] ?? this.data.monsters[name];
      if (ja) return ja;
    }
    return null;
  }

  private lookupIn(category: ObjectCategory, name: string): string | null {
    const table = this.data.objects[category];
    if (!table) return null;
    return table[name] ?? null;
  }

  /** Translate a bare (article/count/prefix-free) object noun. */
  lookupObjectCore(name: string): { ja: string; category: ObjectCategory | null; singular: string } | null {
    for (const candidate of singularCandidates(name)) {
      const result = this.lookupObjectSingular(candidate);
      if (result) return { ...result, singular: candidate };
    }
    return null;
  }

  private lookupObjectSingular(name: string): { ja: string; category: ObjectCategory | null } | null {
    // "potion of healing", "ring of conflict", ...
    for (const [category, noun, jaNoun] of categoryNouns) {
      if (name === noun) return { ja: jaNoun, category };
      const ofMatch = new RegExp(`^${noun} of (.+)$`).exec(name);
      if (ofMatch) {
        const ja = this.lookupIn(category, ofMatch[1]!) ?? this.lookupIn(category, name);
        if (ja) return { ja, category };
      }
      const calledMatch = new RegExp(`^${noun} called (.+)$`).exec(name);
      if (calledMatch) return { ja: `${calledMatch[1]}と呼ばれる${jaNoun}`, category };
      const descMatch = new RegExp(`^(.+) ${noun}$`).exec(name);
      if (descMatch) {
        const ja = this.lookupIn(category, descMatch[1]!);
        if (ja) return { ja: ja.endsWith(jaNoun) ? ja : `${ja}${jaNoun}`, category };
      }
    }
    const labeled = /^scroll labeled (.+)$/.exec(name);
    if (labeled) {
      const ja = this.lookupIn("scroll", labeled[1]!);
      return { ja: ja ?? `『${labeled[1]}』と書かれた巻物`, category: "scroll" };
    }
    if (name === "unlabeled scroll") {
      return { ja: this.lookupIn("scroll", "unlabeled") ?? "ラベルのない巻物", category: "scroll" };
    }
    for (const category of ["gem", "rock"] as const) {
      const gem = /^(.+) (gem|stone)$/.exec(name);
      if (gem) {
        const ja = this.lookupIn(category, gem[1]!);
        if (ja) return { ja, category };
      }
    }
    const bareNouns: Readonly<Record<string, readonly [string, ObjectCategory]>> = {
      gem: ["宝石", "gem"],
      stone: ["石", "rock"],
      rock: ["石", "rock"],
      boulder: ["岩", "rock"],
    };
    if (bareNouns[name]) return { ja: bareNouns[name]![0], category: bareNouns[name]![1] };
    // Plain lookup in every table (identified names and appearances).
    const order: ObjectCategory[] = [
      "weapon", "armor", "tool", "food", "gem", "rock", "coin", "other",
      "potion", "scroll", "ring", "amulet", "spellbook", "wand",
    ];
    for (const category of order) {
      const ja = this.lookupIn(category, name);
      if (ja) return { ja, category };
    }
    // Monster-derived objects.
    const corpse = /^(.+) (corpse|egg|meat)$/.exec(name);
    if (corpse) {
      const monster = this.lookupMonster(corpse[1]!);
      if (monster) {
        const noun = { corpse: "死体", egg: "卵", meat: "肉" }[corpse[2] as "corpse" | "egg" | "meat"];
        return { ja: `${monster}の${noun}`, category: "food" };
      }
    }
    const tin = /^tin of (.+?)(?: meat)?$/.exec(name);
    if (tin) {
      const monster = this.lookupMonster(tin[1]!);
      if (monster) return { ja: `${monster}の肉の缶詰`, category: "food" };
    }
    const statue = /^(statue|figurine) of (.+)$/.exec(name);
    if (statue) {
      const monster = this.lookupMonster(statue[2]!.replace(/^(?:an?|the) /, ""));
      if (monster) return { ja: `${monster}の${statue[1] === "statue" ? "像" : "人形"}`, category: statue[1] === "statue" ? "rock" : "tool" };
    }
    const named = /^(.+) named (.+)$/.exec(name);
    if (named) {
      const base = this.lookupObjectCore(named[1]!);
      if (base) return { ja: `${named[2]}と名づけられた${base.ja}`, category: base.category };
    }
    const called = /^(.+) called (.+)$/.exec(name);
    if (called) {
      const base = this.lookupObjectCore(called[1]!);
      if (base) return { ja: `${called[2]}と呼ばれる${base.ja}`, category: base.category };
    }
    return null;
  }

  /**
   * Translate a full doname()-style object phrase, e.g.
   * "2 blessed +1 elven arrows (in quiver)". Returns null when the core
   * noun is unknown.
   */
  translateObject(phrase: string): string | null {
    let rest = phrase.trim();
    const suffixes: string[] = [];
    for (;;) {
      const m = /\s*\(([^()]*)\)$/.exec(rest);
      if (!m) break;
      const inner = m[1]!.trim();
      const charges = /^(-?\d+):(-?\d+)$/.exec(inner);
      if (charges) suffixes.unshift(`(${inner})`);
      else if (suffixPhrases[inner]) suffixes.unshift(`(${suffixPhrases[inner]})`);
      else if (/^\d+ zorkmids?$/.test(inner)) suffixes.unshift(`(${inner.replace(/ zorkmids?/, "ゴールド")})`);
      else if (/^unpaid, \d+ zorkmids?$/.test(inner)) suffixes.unshift(`(未払い，${inner.replace(/^unpaid, /, "").replace(/ zorkmids?/, "ゴールド")})`);
      else if (/^for sale, \d+ zorkmids?$/.test(inner)) suffixes.unshift(`(売り物，${inner.replace(/^for sale, /, "").replace(/ zorkmids?/, "ゴールド")})`);
      else return null;
      rest = rest.slice(0, m.index);
    }
    let quantity = 1;
    let quantityPrefix = "";
    const article = /^(a|an|the|some|your)\s+/i.exec(rest);
    let possessive = "";
    if (article) {
      rest = rest.slice(article[0].length);
      const word = article[1]!.toLowerCase();
      if (word === "your") possessive = "あなたの";
      if (word === "some") quantityPrefix = "いくつかの";
    }
    const count = /^(\d+)\s+/.exec(rest);
    if (count) {
      quantity = Number(count[1]);
      rest = rest.slice(count[0].length);
    }
    const prefixes: string[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      const enchant = /^([+-]\d+)\s+/.exec(rest);
      if (enchant) {
        prefixes.push(`${enchant[1]} `);
        rest = rest.slice(enchant[0].length);
        changed = true;
        continue;
      }
      for (const [en, ja] of prefixWords) {
        if (rest.toLowerCase().startsWith(`${en} `)) {
          prefixes.push(ja);
          rest = rest.slice(en.length + 1);
          changed = true;
          break;
        }
      }
    }
    const core = this.lookupObjectCore(rest) ?? this.lookupObjectCore(rest.toLowerCase());
    if (!core) return null;
    if (count) {
      quantityPrefix = `${quantity}${counterFor(core.category, core.singular, quantity)}の`;
    }
    return `${possessive}${quantityPrefix}${prefixes.join("")}${core.ja}${suffixes.join("")}`;
  }

  /** Translate a monster reference such as "the invisible jackal" or "It". */
  translateMonster(phrase: string): string | null {
    let rest = phrase.trim();
    let possessive = "";
    const article = /^(a|an|the|your)\s+/i.exec(rest);
    if (article) {
      rest = rest.slice(article[0].length);
      if (article[1]!.toLowerCase() === "your") possessive = "あなたの";
    }
    const adjectives: string[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [en, ja] of monsterAdjectives) {
        if (rest.toLowerCase().startsWith(`${en} `)) {
          adjectives.push(ja);
          rest = rest.slice(en.length + 1);
          changed = true;
        }
      }
    }
    const count = /^(\d+)\s+/.exec(rest);
    if (count) rest = rest.slice(count[0].length);
    const named = /^(.+) (?:called|named) (.+)$/.exec(rest);
    if (named) {
      const base = this.lookupMonster(named[1]!);
      return base ? `${possessive}${named[2]}と呼ばれる${adjectives.join("")}${base}` : null;
    }
    const ja = this.lookupMonster(rest);
    if (!ja) return null;
    return `${possessive}${count ? `${count[1]}匹の` : ""}${adjectives.join("")}${ja}`;
  }
}
