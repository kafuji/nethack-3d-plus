import entries from "./data/nethack5-source-ja.json";
import { translateGroundObject } from "./game-ground";
import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { translateSpellName } from "./game-skills";
import { deityNames } from "./character-text";
import { colorAdjective, colorAdverb } from "./color-text";

// Reviewed Japanese renderings keyed by the printf format used in the NetHack
// 5.0 source (pline/You/Your/There/... first arguments, with the implicit
// prefix included). `{n}` refers to the n-th conversion of the format. A
// conversion that only carries English grammar (articles, verb endings) may be
// omitted from the translation; conversions that carry information must not.
// Captured values are translated only when recognized and are otherwise kept
// verbatim, so names, inscriptions and unknown descriptions are never altered.

interface CompiledTemplate {
  readonly pattern: RegExp;
  readonly translation: string;
  readonly literalLength: number;
}

const conversion = /%(?:\d+\$)?[-+ #0]*\d*(?:\.\d+)?(?:ll|l|h|z)?([sdiucfoxXp])|%%/g;
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const exact = new Map<string, string>();
const templates: CompiledTemplate[] = [];

for (const [format, translation] of Object.entries(entries as Record<string, string>)) {
  let source = "";
  let literal = "";
  let last = 0;
  let conversions = 0;
  for (const match of format.matchAll(conversion)) {
    const text = format.slice(last, match.index);
    source += escapeRegExp(text);
    literal += text;
    last = (match.index ?? 0) + match[0].length;
    if (match[0] === "%%") {
      source += "%";
      literal += "%";
      continue;
    }
    conversions++;
    const type = match[1];
    source += type === "c" ? "(.)" : /[diuoxX]/.test(type) ? "(-?[0-9A-Fa-f]+)" : type === "f" ? "(-?\\d+(?:\\.\\d+)?)" : "(.*?)";
  }
  const tail = format.slice(last);
  source += escapeRegExp(tail);
  literal += tail;
  if (conversions === 0) exact.set(literal, translation);
  else templates.push({ pattern: new RegExp(`^${source}$`, "s"), translation, literalLength: literal.length });
}
// Prefer the most specific format when several could match the same text.
templates.sort((a, b) => b.literalLength - a.literalLength);

const bodyParts: Readonly<Record<string, string>> = {
  arm: "腕", arms: "両腕", back: "背中", body: "体", ears: "耳", eye: "目", eyes: "両目", face: "顔", finger: "指", fingers: "指",
  foot: "足", feet: "両足", hand: "手", hands: "両手", head: "頭", leg: "脚", legs: "両脚", mouth: "口", neck: "首", nose: "鼻",
  skin: "肌", stomach: "胃", throat: "喉", tongue: "舌", teeth: "歯", toes: "足の指", wings: "翼", paw: "前足", paws: "前足",
  mud: "泥", forelimb: "前肢", "air bubble": "気泡", cloud: "雲", maw: "口", "limitless water": "果てしない水", wand: "杖", bell: "鐘", "pick-axe": "つるはし", chain: "鎖", "a chain": "鎖", rat: "ネズミ", "a rat": "ネズミ", foreclaw: "前爪", foreclaws: "前爪", wrapping: "包帯", wrappings: "包帯", "gas cloud": "ガス雲", venom: "毒液", "the venom": "毒液",
  swamp: "沼", "shallow sea": "浅瀬", music: "音楽", spores: "胞子", frost: "冷気", "poison gas": "毒ガス", "burning oil": "燃える油",
  claw: "爪", claws: "爪", hoof: "蹄", hooves: "蹄", tail: "尻尾", spine: "背骨", hair: "髪", scalp: "頭皮", flesh: "肉",
  blood: "血", fur: "毛皮", scales: "鱗", tentacles: "触手", fin: "ひれ", fins: "ひれ",
  zorkmid: "ゾークミド", zorkmids: "ゾークミド", "gold piece": "金貨", "gold pieces": "金貨",
  floor: "床", ground: "地面", headstone: "墓石", bridge: "橋", altar: "祭壇", stairs: "階段", ladder: "はしご", ceiling: "天井", air: "空中", water: "水", lava: "溶岩", ice: "氷", bottom: "底",
  // potion.c bottlename(), including the hallucinatory names.
  bottle: "瓶", phial: "小瓶", flagon: "酒瓶", carafe: "水差し", flask: "フラスコ", jar: "壺", vial: "ガラス瓶",
  jug: "ジョッキ", pitcher: "ピッチャー", barrel: "樽", tin: "缶", bag: "袋", box: "箱", glass: "グラス", beaker: "ビーカー",
  tumbler: "タンブラー", vase: "花瓶", flowerpot: "植木鉢", pan: "鍋", thingy: "なんかの容器", mug: "マグカップ", teacup: "ティーカップ",
  teapot: "ティーポット", keg: "小樽", bucket: "バケツ", thermos: "魔法瓶", amphora: "アンフォラ", wineskin: "革袋", parcel: "小包",
  bowl: "ボウル", ampoule: "アンプル",
};

/** Names of rays and breath attacks (zap.c flash_types). */
export const rayNames: Readonly<Record<string, string>> = {
  "magic missile": "魔法の矢", "bolt of fire": "炎の矢", "bolt of cold": "冷気の矢", "sleep ray": "睡眠光線", "death ray": "死の光線",
  "bolt of lightning": "稲妻の矢", fireball: "火球", "cone of cold": "冷気の円錐", "finger of death": "死の指",
  "blast of missiles": "魔法の矢の息", "blast of fire": "炎の息", "blast of frost": "冷気の息", "blast of sleep gas": "睡眠ガスの息",
  "blast of disintegration": "分解の息", "blast of lightning": "稲妻の息", "blast of poison gas": "毒ガスの息", "blast of acid": "酸の息",
  "spray of water": "水しぶき",
};

const own = (map: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;

// An unrecognized lowercase phrase of several words is most likely English
// prose assembled at runtime; prefer the original message to a mixed rendering.
// nh3d-plus: a single unknown lowercase word (e.g. a hallucinatory colour such
// as "octarine") is English as well; capitalized names are still kept.
const isUntranslatedPhrase = (original: string, translated: string): boolean =>
  original === translated && /^[a-z]/.test(original.trim())
  && (original.trim().split(/\s+/).length >= 2 || /^[a-z]{3,}$/.test(original.trim()));

/** Translate one captured value only when it is recognized; otherwise keep it. */
export function translateMessageArgument(value: string): string {
  const text = value.trim();
  if (!text) return value;
  if (/^-?\d+$/.test(text)) return value;
  if (value === "!") return "！";
  if (value === ".") return "。";
  if (/^(?:you|You|yourself)$/.test(text)) return "あなた";
  if (/^(?:it|It)$/.test(text)) return "それ";
  if (/^(?:them|Them)$/.test(text)) return "それら";
  if (/^(?:something|Something)$/.test(text)) return "何か";
  if (/^(?:someone|Someone|somebody|Somebody)$/.test(text)) return "誰か";
  const quoted = /^"(.+)"$/.exec(text);
  if (quoted) {
    const spell = translateSpellName(quoted[1], "ja");
    if (spell !== quoted[1]) return `「${spell}」`;
  }
  const ray = own(rayNames, text.replace(/^(?:[Tt]he|an?) /, ""));
  if (ray !== undefined) return ray;
  const body = own(bodyParts, text);
  if (body !== undefined) return body;
  // priest.c priestname(): "the high priestess of Moloch".
  const titled = /^(?:[Tt]he |[Aa]n? )?(high )?(priest|priestess) of (.+)$/.exec(text);
  if (titled) {
    const deity = Object.prototype.hasOwnProperty.call(deityNames, titled[3]) ? deityNames[titled[3]] : titled[3];
    return `${deity}の${titled[1] ? "高" : ""}${titled[2] === "priestess" ? "尼僧" : "僧侶"}`;
  }
  if (Object.prototype.hasOwnProperty.call(deityNames, text)) return deityNames[text];
  const monster = translateMonsterName(text, "ja");
  if (monster !== text) return monster;
  if (/ ghost$/.test(text)) {
    const named = translateMonsterName(text, "ja");
    if (named !== text) return named;
  }
  // A unique monster's bare name ("Death"), before the wand of the same name.
  if (/^[A-Z]/.test(text)) {
    const unique = translateMonsterName(`the ${text}`, "ja");
    if (unique !== `the ${text}`) return unique;
  }
  // makemon.c: "2 jackals suddenly appear next to you!"
  const counted = /^(\d+) (.+)$/.exec(text);
  if (counted) {
    const plural = counted[2];
    for (const singular of [plural.replace(/ies$/, "y"), plural.replace(/ves$/, "f"), plural.replace(/men$/, "man"),
      plural.replace(/es$/, ""), plural.replace(/s$/, ""), plural]) {
      const name = translateMonsterName(`a ${singular}`, "ja");
      if (name !== `a ${singular}`) return `${name}${counted[1]}匹`;
    }
  }
  const yours = /^(?:your|Your) (.+)$/.exec(text);
  if (yours) {
    const part = own(bodyParts, yours[1]);
    if (part !== undefined) return `あなたの${part}`;
    const item = translateInventoryItem(yours[1], "ja");
    if (item !== yours[1]) return `あなたの${item}`;
    // YMonnam(): "Your pony" for a steed or pet.
    const pet = translateMonsterName(yours[1], "ja");
    if (pet !== yours[1]) return `あなたの${pet}`;
  }
  // align_gname(): "The voice of Amaterasu Omikami booms:".
  if (Object.prototype.hasOwnProperty.call(deityNames, text)) return deityNames[text];
  // Temple priests: "the priestess of Amaterasu Omikami".
  const priest = /^(?:[Tt]he )?(high )?(priest|priestess) of (.+)$/.exec(text);
  if (priest && Object.prototype.hasOwnProperty.call(deityNames, priest[3])) {
    return `${deityNames[priest[3]]}の${priest[1] ? "高" : ""}${priest[2] === "priest" ? "僧侶" : "尼僧"}`;
  }
  // A bare word may be a player-supplied name; only translate described objects.
  if (/^(?:a|an|the|The|\d+) /.test(text) || /\(.*\)$/.test(text)) {
    const item = translateInventoryItem(text, "ja");
    if (item !== text) return item;
  }
  // nh3d-plus: An() capitalizes the article ("A dagger falls from the tree!").
  const capitalized = /^(A|An) (.+)$/.exec(text);
  if (capitalized) {
    const lower = `${capitalized[1].toLowerCase()} ${capitalized[2]}`;
    const item = translateInventoryItem(lower, "ja");
    if (item !== lower) return item;
  }
  const ground = translateGroundObject(text, "ja");
  if (ground !== text) return ground;
  // "the jackal's head", "Fido's leg": a known owner and body part.
  const possessive = /^(.+?)'s? (\S+)$/.exec(text);
  if (possessive) {
    const owner = translateMessageArgument(possessive[1]);
    const part = own(bodyParts, possessive[2]);
    if (part !== undefined && owner !== possessive[1]) return `${owner}の${part}`;
  }
  // "the jackal's long sword": a known owner and object.
  const ownedItem = /^(.+?)'s? (.+)$/.exec(text);
  if (ownedItem) {
    const owner = translateMessageArgument(ownedItem[1]);
    const item = translateInventoryItem(ownedItem[2], "ja");
    if (owner !== ownedItem[1] && item !== ownedItem[2]) return `${owner}の${item}`;
  }
  // s_suffix() owner on its own ("The jackal's" before a separate object).
  const owner = /^(.+?)'s?$/.exec(text);
  if (owner) {
    const translated = translateMessageArgument(owner[1]);
    if (translated !== owner[1]) return translated;
  }
  // Nothing knows this name, such as a hallucinated "The Ancient Multi-Hued
  // Dragon": it keeps its spelling but not the English article.
  const unknownName = /^[Tt]he ([A-Za-z][^.!?]*)$/.exec(text);
  if (unknownName) return unknownName[1];
  return value;
}

const cache = new Map<string, string | null>();

/** Exact (conversion-free) NetHack 5 source messages only. */
export function lookupNethack5SourceExact(message: string): string | undefined {
  return exact.get(message);
}

/** Return a Japanese rendering of a NetHack 5 source message, or undefined. */
export function translateNethack5SourceMessage(message: string): string | undefined {
  const direct = exact.get(message);
  if (direct !== undefined) return direct;
  if (message.length > 400) return undefined;
  const cached = cache.get(message);
  if (cached !== undefined) return cached ?? undefined;
  let result: string | undefined;
  for (const { pattern, translation } of templates) {
    const match = pattern.exec(message);
    if (!match) continue;
    let mixed = false;
    const rendered = translation.replace(/\{(\d+)\}(?=(輝|光|オーラ)?)/g, (token: string, index: string, glow: string | undefined, offset: number) => {
      const value = match[Number(index)] ?? "";
      // hcolor() before a glow verb or aura: "glows blue" -> "青色に輝いた".
      const color = glow === undefined ? undefined
        : glow === "オーラ" ? colorAdjective(value.replace(/^an? /, "")) : colorAdverb(value);
      if (color !== undefined) return color;
      const translated = translateMessageArgument(value);
      // Splitting "The dagger glows" after its article is not a real match.
      if (isUntranslatedPhrase(value, translated) || /^(?:the|an?|your)$/i.test(value.trim())) mixed = true;
      // Some owners ("your candle's") are already rendered with の.
      return translation[offset + token.length] === "の" ? translated.replace(/の$/, "") : translated;
    });
    if (mixed) continue;
    result = rendered;
    break;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(message, result ?? null);
  return result;
}
