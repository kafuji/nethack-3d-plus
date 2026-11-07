import entries from "./data/nethack5-source-ja.json";
import { translateGroundObject } from "./game-ground";
import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { translateSpellName } from "./game-skills";
import { deityNames } from "./character-text";
import { colorAdjective, colorAdverb } from "./color-text";
import { translateGameLocation } from "./game-location";

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

// polyself.c body_part(): the words a polymorphed hero's body is described with.
const unusualBodyParts: Readonly<Record<string, string>> = {
  pseudopod: "仮足", "dark spot": "黒点", front: "前面", "pseudopod extension": "仮足の先", "pseudopod extremity": "仮足の末端", "pseudopod root": "仮足の根元", grasp: "把握部",
  "cerebral area": "脳域", "lower pseudopod": "下部の仮足", surface: "表面", ripples: "さざ波", juices: "体液", sensor: "感覚器",
  "claw tip": "爪の先", "rear claw": "後ろ爪", "rear limb": "後肢", "rear claw tip": "後ろ爪の先", wing: "翼", "wing tip": "翼の先", feathers: "羽毛", lung: "肺", bill: "くちばし",
  foreleg: "前脚", forehoof: "前蹄", "hoof tip": "蹄の先", "rear hoof": "後ろ蹄", "rear leg": "後ろ脚", backbone: "背骨", "rear hoof tip": "後ろ蹄の先", mane: "たてがみ",
  appendage: "付属肢", "optic nerve": "視神経", tentacle: "触手", "tentacle tip": "触手の先", "lower appendage": "下部の付属肢", "lower tentacle": "下部の触手", equator: "赤道",
  "lower tentacle tip": "下部の触手の先", cilia: "繊毛", "life force": "生命力", retina: "網膜", "olfactory nerve": "嗅神経", interior: "内部",
  mycelium: "菌糸体", "visual area": "視覚域", hypha: "菌糸", root: "根", strand: "菌糸束", "cap area": "傘", rhizome: "根茎", stalk: "柄", "rhizome tip": "根茎の先", gill: "えら",
  region: "領域", "minor current": "小さな流れ", "lower current": "下部の流れ", swirl: "渦", "central core": "中心核", center: "中心", currents: "流れ", edge: "縁", "leading edge": "前縁",
  "vestigial limb": "痕跡肢", "large scale": "大きな鱗", "large scale tip": "大きな鱗の先", "rear region": "後部", "scale gap": "鱗の隙間", length: "胴", "rear scale": "後部の鱗", "forked tongue": "二股の舌",
  "anterior segment": "前体節", "light sensitive cell": "感光細胞", clitellum: "環帯", setae: "剛毛", "posterior segment": "後体節", segment: "体節", posterior: "後部", "posterior setae": "後部の剛毛", prostomium: "口前葉",
  pedipalp: "触肢", tarsus: "跗節", cephalothorax: "頭胸部", abdomen: "腹部", hemolymph: "血リンパ", "book lung": "書肺", labrum: "上唇", "digestive tract": "消化管",
  premaxillary: "前上顎骨", "pelvic axillary": "腹びれの付け根", "pelvic fin": "腹びれ", "anal fin": "尻びれ", "pectoral fin": "胸びれ", peduncle: "尾柄", gills: "えら", "dorsal fin": "背びれ", "caudal fin": "尾びれ", nostril: "鼻孔",
  fingertip: "指先", toe: "つま先",
};

// do_name.c hliquids: what water looks like to a hallucinating hero.
const hallucinatedLiquids: Readonly<Record<string, string>> = {
  yoghurt: "ヨーグルト", oobleck: "ウーブレック", "clotted blood": "凝固した血", "diluted water": "薄めた水", "purified water": "精製水", "instant coffee": "インスタントコーヒー", tea: "お茶",
  "herbal infusion": "ハーブティー", "liquid rainbow": "液状の虹", "creamy foam": "クリーミーな泡", "mulled wine": "ホットワイン", bouillon: "ブイヨン", nectar: "ネクター", grog: "グロッグ",
  flubber: "フラバー", ketchup: "ケチャップ", "slow light": "遅い光", oil: "油", vinaigrette: "ドレッシング", "liquid crystal": "液晶", honey: "蜂蜜", "caramel sauce": "キャラメルソース", ink: "インク",
  "aqueous humour": "眼房水", "milk substitute": "代用乳", "fruit juice": "フルーツジュース", "glowing lava": "光る溶岩", "gastric acid": "胃酸", "mineral water": "ミネラルウォーター",
  "cough syrup": "咳止めシロップ", quicksilver: "水銀", "sweet vitriol": "甘い硫酸", "grey goo": "グレイ・グー", "pink slime": "ピンクのスライム", "cosmic latte": "コズミック・ラテ",
  "bone oil": "骨油", custard: "カスタード", lard: "ラード", vinegar: "酢", creosote: "クレオソート",
};

// trap.c halu_trapnames: the traps a hallucinating hero thinks are there.
export const hallucinatedTraps: Readonly<Record<string, string>> = {
  "bottomless pit": "底なし穴", "polymorphism trap": "変化の罠", "devil teleporter": "悪魔の転送装置", "falling boulder trap": "落石の罠", "anti-anti-magic field": "反反魔法の領域", "weeping gas trap": "催涙ガスの罠",
  "queasy board": "吐き気のする床板", "electrified web": "電気の巣", "owlbear trap": "アウルベアの罠", "sand mine": "砂の地雷", "vacillating triangle": "揺れ動く三角形",
  "death trap": "死の罠", "disintegration trap": "分解の罠", "ice trap": "氷の罠", "monochrome trap": "白黒の罠", "axeblade trap": "斧刃の罠", "pool of boiling oil": "煮えたぎる油の池", "pool of quicksand": "流砂の池",
  "field of caltrops": "まきびしの原", "buzzsaw trap": "丸のこの罠", "spiked floor": "とげの床", "revolving wall": "回転する壁", "uneven floor": "でこぼこの床", "finger trap": "指の罠", "jack-in-a-box": "びっくり箱", "yellow snow": "黄色い雪",
  "booby trap": "ブービートラップ", "rat trap": "ネズミ捕り", "poisoned nail": "毒の釘", snare: "くくり罠", whirlpool: "渦潮", "trip wire": "仕掛け線", "roach motel (tm)": "ゴキブリホイホイ（商標）",
  "negative space": "負の空間", "tensor field": "テンソル場", singularity: "特異点", "imperial fleet": "帝国艦隊", "black hole": "ブラックホール", "thermal detonator": "熱爆弾", "event horizon": "事象の地平線", "entoptic phenomenon": "内視現象",
  "sweet-smelling gas vent": "甘い香りのガス孔", "phone booth": "電話ボックス", "exploding runes": "爆発するルーン", "never-ending elevator": "止まらないエレベーター", "slime pit": "スライムの穴", "warp zone": "ワープゾーン", "illusory floor": "幻の床",
  "pile of poo": "うんちの山", "honey trap": "ハニートラップ", "tourist trap": "観光客向けの罠", "banana peel": "バナナの皮", "garden rake": "熊手", "whoopie cushion": "ブーブークッション", "box and stick trap": "箱と棒の罠",
  "fly trap": "ハエ取り", "legal trap": "法の罠", "pit of snakes": "蛇の穴", "pollywog trap": "おたまじゃくしの罠", "slippery slope": "滑りやすい坂", "thirst trap": "渇きの罠", suntrap: "日だまり",
};

const otherNouns: Readonly<Record<string, string>> = {
  "The razor-sharp blade": "かみそりのような刃", "razor-sharp blade": "かみそりのような刃",
  "tower of flame": "火柱", "an air bubble": "気泡", "mid air": "空中", "molten lava": "溶岩", "desired location": "目的の場所", "the buried ball": "埋まった鉄球",
  vapor: "蒸気", explosion: "爆発", door: "扉", mortal: "人間", creature: "生き物", wall: "壁", "the wall": "壁", "the stone": "石", weapon: "武器", "your weapon": "あなたの武器",
  food: "食べ物", pie: "パイ", "the pie": "パイ", venom: "毒液", "the venom": "毒液", candelabra: "燭台", sword: "剣", sky: "空", "Some food": "食べ物",
  "expanse above": "頭上の空間", "the expanse above": "頭上の空間", "rock cavern": "洞窟の天井", "the rock cavern": "洞窟の天井", "water above": "頭上の水", "the water above": "頭上の水",
  "an insect": "昆虫", insects: "昆虫", "a snake": "ヘビ", snakes: "ヘビ",
};

const bodyParts: Readonly<Record<string, string>> = {
  ...unusualBodyParts,
  ...hallucinatedTraps,
  ...hallucinatedLiquids,
  ...Object.fromEntries(Object.entries(hallucinatedLiquids).map(([liquid, shown]) => [`deep ${liquid}`, `深い${shown}`])),
  ...otherNouns,
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
  const sided = /^(left|right) (.+)$/.exec(text);
  if (sided && own(bodyParts, sided[2]) !== undefined) return `${sided[1] === "left" ? "左" : "右"}${bodyParts[sided[2]]}`;
  // cmd.c: what #terrain and the look-around command call a room.
  const room = /^an? (?:square )?(\d+) by (\d+) (room|area)$/.exec(text);
  if (room) return `${room[1]}×${room[2]}の${room[3] === "room" ? "部屋" : "区域"}`;
  // priest.c priestname(): "the high priestess of Moloch".
  const titled = /^(?:[Tt]he |[Aa]n? )?(high )?(priest|priestess) of (.+)$/.exec(text);
  if (titled) {
    const deity = Object.prototype.hasOwnProperty.call(deityNames, titled[3]) ? deityNames[titled[3]] : titled[3];
    return `${deity}の${titled[1] ? (titled[2] === "priestess" ? "高位の" : "高") : ""}${titled[2] === "priestess" ? "女司祭" : "司祭"}`;
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
    // read.c: a species as a brand name, "Magic Marker(TM) Water Moccasin Red Ink Marker Pen".
    const branded = translateMonsterName(`the ${text.toLowerCase()}`, "ja");
    if (branded !== `the ${text.toLowerCase()}`) return branded;
    // A dungeon branch: "You were in the Dungeons of Doom, on level 1."
    const branch = translateGameLocation(text, "ja");
    if (branch !== text) return branch;
  }
  if (/^the [A-Z]/.test(text)) {
    const branch = translateGameLocation(text.replace(/^the /, ""), "ja");
    if (branch !== text.replace(/^the /, "")) return branch;
  }
  // A species without an article: "Creating doppelganger instead; force shopkeeper?"
  if (/^[a-z][a-z -]+$/.test(text)) {
    const species = translateMonsterName(`the ${text}`, "ja");
    if (species !== `the ${text}`) return species;
    // hcolor(): "You see brown streaks on the stone."
    const color = colorAdjective(text);
    if (color !== undefined) return color.replace(/色の$/, "色");
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
  // A species named in the plural: "Wiped out all dwarves."
  if (/^[a-z][a-z -]*s$/.test(text)) {
    for (const singular of [text.replace(/ies$/, "y"), text.replace(/ves$/, "f"), text.replace(/men$/, "man"), text.replace(/es$/, ""), text.replace(/s$/, "")]) {
      if (singular === text) continue;
      const name = translateMonsterName(`the ${singular}`, "ja");
      if (name !== `the ${singular}`) return name;
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
