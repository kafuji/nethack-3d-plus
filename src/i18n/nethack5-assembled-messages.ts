import { colorAdjective } from "./color-text";
import { hawaiianDesigns, translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { deityNames } from "./intro-story";
import { translateSkillLegend, translateSkillName, translateSpellName } from "./game-skills";
import { lookupNethack5SourceExact, rayNames, translateMessageArgument as arg, hallucinatedTraps } from "./nethack5-source-messages";
import { translateGroundObject } from "./game-ground";
import { translateGameLocation } from "./game-location";
import { translatePlayerRank } from "./player-title";
import { questPlaces } from "./proper-names";
// Only called at run time, after both modules have loaded.
import { presentGameMessage } from "./message-presentation";

// Messages that NetHack assembles from several pieces (verbs chosen at
// runtime, vtense(), exclam(), shopkeeper honorifics, occupation text, ...).
// Each template recognizes the complete assembled sentence for one source
// construction; every captured value is still translated only if recognized.

type Template = readonly [RegExp, (...parts: string[]) => string];

// wizard.c random_insult[].
const insults: Readonly<Record<string, string>> = {
  antic: "道化", blackguard: "悪党", caitiff: "卑怯者", chucklehead: "間抜け", coistrel: "下郎", craven: "臆病者", cretin: "愚か者", cur: "野良犬", dastard: "卑劣漢", "demon fodder": "悪魔の餌", dimwit: "まぬけ", dolt: "うすのろ",
  fool: "愚か者", footpad: "追いはぎ", imbecile: "痴れ者", knave: "悪漢", maledict: "呪われし者", miscreant: "悪党", niddering: "腰抜け", poltroon: "臆病者", rattlepate: "おしゃべり", reprobate: "背徳者", scapegrace: "ろくでなし",
  varlet: "下郎", villein: "農奴", wittol: "間抜け", worm: "虫けら", wretch: "哀れな者",
};

// do_name.c hcolors[]: what a hallucinating hero calls a colour.
const hallucinatedColors: Readonly<Record<string, string>> = {
  ultraviolet: "紫外線色の", infrared: "赤外線色の", "bluish-orange": "青みがかった橙色の", "reddish-green": "赤みがかった緑の", "dark white": "暗い白の", "light black": "明るい黒の", "sky blue-pink": "空色がかったピンクの", "pinkish-cyan": "ピンクがかった水色の", "indigo-chartreuse": "藍色がかった黄緑の",
  salty: "塩味の", sweet: "甘い", sour: "酸っぱい", bitter: "苦い", umami: "うま味のある", striped: "縞模様の", spiral: "渦巻き模様の", swirly: "ぐるぐるした", plaid: "チェック柄の", checkered: "市松模様の", argyle: "アーガイル柄の", paisley: "ペイズリー柄の", blotchy: "まだらの", "guernsey-spotted": "ガーンジー牛の斑模様の", "polka-dotted": "水玉模様の",
  square: "四角い", round: "丸い", triangular: "三角の", cabernet: "カベルネ色の", sangria: "サングリア色の", fuchsia: "フクシア色の", wisteria: "藤色の", "lemon-lime": "レモンライム色の", "strawberry-banana": "イチゴバナナ色の", peppermint: "ペパーミント色の", romantic: "ロマンチックな", incandescent: "白熱した", octarine: "八番目の色の", "excitingly dull": "刺激的に地味な", mauve: "モーブ色の",
  electric: "電気色の", neon: "ネオン色の", fluorescent: "蛍光色の", phosphorescent: "燐光を放つ", translucent: "半透明の", opaque: "不透明な", psychedelic: "サイケデリックな", iridescent: "玉虫色の", "rainbow-colored": "虹色の", polychromatic: "多色の", colorless: "無色の", "colorless green": "無色の緑の", dancing: "踊る", singing: "歌う", loving: "愛に満ちた", loudy: "騒がしい", noisy: "やかましい", clattery: "ガタガタした", silent: "静かな",
  apocyan: "アポシアン色の", "infra-pink": "赤外ピンクの", opalescent: "乳白色の", violant: "激しい紫の", tuneless: "音痴な", viridian: "ビリジアン色の", aureolin: "オーレオリン色の", cinnabar: "辰砂色の", purpurin: "プルプリン色の", gamboge: "ガンボージ色の", madder: "茜色の", bistre: "ビスタ色の", ecru: "生成り色の", fulvous: "黄褐色の", tekhelet: "テケレット色の", "selective yellow": "セレクティブイエローの",
};

// hcolor(): adverb forms, for "glows amber".
const glowColors: Readonly<Record<string, string>> = {
  amber: "琥珀色に", black: "黒く", brown: "茶色に", red: "赤く", blue: "青く", "light blue": "淡い青に", silver: "銀色に", golden: "金色に", "dark red": "暗い赤に", green: "緑に", purple: "紫に", white: "白く", yellow: "黄色く", orange: "橙色に",
};
// artifact.c artifact_hit(): how a blade is described when its name isn't known.
const artifactBlades: Readonly<Record<string, string>> = {
  "magic-absorbing blade": "魔力を吸う刃", "fiery blade": "炎の刃", "ice-cold blade": "氷の刃", "massive hammer": "巨大なハンマー", "imaginary widget": "想像上の道具", "razor-sharp blade": "かみそりのような刃", "vorpal blade": "ヴォーパルの刃", "sharp-edged blade": "鋭い刃",
};
// dokick.c: what is heard when kicking something unseen.
const mufflings: Readonly<Record<string, string>> = { shatter: "砕ける音", clink: "カチャンという音", thud: "ドスンという音", "clang": "カランという音", "crash": "衝突音" };
const mimes: Readonly<Record<string, string>> = { eat: "食べる", read: "読む", throw: "投げる", wield: "構える", wear: "着る", zap: "振る", quaff: "飲む", drink: "飲む", apply: "使う", rubb: "こする", dipp: "浸す", put: "着ける", tak: "脱ぐ", remov: "外す", drop: "置く", dropp: "置く", fir: "撃つ", us: "使う" };
const useVerbs: Readonly<Record<string, string>> = { wield: "構える", wear: "着る", "put on": "身に着ける", "take off": "脱ぐ", remove: "外す", eat: "食べる", quaff: "飲む", read: "読む", zap: "振る", apply: "使う", ready: "準備する", swap: "入れ替える", throw: "投げる", drop: "置く", fire: "撃つ" };
const altarKinds: Readonly<Record<string, string>> = { lawful: "秩序", neutral: "中立", chaotic: "混沌", unaligned: "無属性", Moloch: "モロク" };

// polymorphed body parts: mondata.c mbodypart().
const limbNames: Readonly<Record<string, string>> = {
  leg: "脚", limb: "肢", "rear limb": "後肢", "rear leg": "後ろ脚", pseudopod: "偽足", "lower pseudopod": "下の偽足", foreclaw: "前脚の爪", claw: "爪", hindpaw: "後ろ足", paw: "前足", foot: "足", hoof: "ひづめ", tentacle: "触手", tail: "尾", flipper: "ひれ", appendage: "付属肢", vine: "つる", stalk: "柄", "lower extremity": "下肢", "rear region": "後部",
};
function limb(text: string): string {
  const side = /^(left |right )?(.+)$/.exec(text)!;
  return `${side[1] === "left " ? "左の" : side[1] === "right " ? "右の" : ""}${Object.prototype.hasOwnProperty.call(limbNames, side[2]) ? limbNames[side[2]] : side[2]}`;
}

// botl.c: one status highlight rule, "title/changed/red&bold".
const hiliteFields: Readonly<Record<string, string>> = {
  title: "称号", strength: "筋力", dexterity: "敏捷", constitution: "耐久", intelligence: "知力", wisdom: "賢さ", charisma: "魅力", alignment: "属性", score: "スコア", "carrying-capacity": "荷重",
  gold: "所持金", power: "魔力", "power-max": "最大魔力", "experience-level": "経験レベル", "armor-class": "AC", HD: "HD", time: "時間", hunger: "空腹", hitpoints: "HP", "hitpoints-max": "最大HP",
  "dungeon-level": "階", experience: "経験値", condition: "状態", version: "バージョン", weapon: "武器", armor: "防具", terrain: "地形",
};
const hiliteValues: Readonly<Record<string, string>> = {
  always: "常に", changed: "変化時", up: "増加時", down: "減少時", criticalhp: "HP危険時", lawful: "秩序", neutral: "中立", chaotic: "混沌",
  Bare: "素手", Blind: "盲目", Busy: "作業中", Conf: "混乱", Deaf: "聴覚障害", Iron: "鉄", Fly: "飛行", FoodPois: "食中毒", Glow: "光る手", Grab: "つかまれ", Hallu: "幻覚", Held: "拘束", Icy: "氷上", InLava: "溶岩", Lev: "浮遊",
  Parlyz: "麻痺", Ride: "騎乗", Zzz: "睡眠", Slime: "粘液化", Slip: "滑る手", Stone: "石化", Strngl: "窒息", Stun: "朦朧", Submrg: "水中", TermIll: "重病", Teth: "つながれ", Trap: "罠", Out: "気絶", WLegs: "脚の負傷", UHold: "つかみ中",
  Satiated: "満腹", Hungry: "空腹", Weak: "衰弱", Fainting: "気絶寸前", Fainted: "気絶", Starved: "餓死", Burdened: "重荷", Stressed: "圧迫", Strained: "限界", Overtaxed: "過負荷", Overloaded: "超過",
};
const hiliteColors: Readonly<Record<string, string>> = {
  black: "黒", red: "赤", green: "緑", brown: "茶", blue: "青", magenta: "赤紫", cyan: "水色", gray: "灰", orange: "橙", yellow: "黄", white: "白",
  "light-green": "明るい緑", "light-blue": "明るい青", "light-magenta": "明るい赤紫", "light-cyan": "明るい水色", "no-color": "色なし",
};
const hiliteAttributes: Readonly<Record<string, string>> = { normal: "通常", bold: "太字", dim: "薄暗い", italic: "斜体", underline: "下線", blink: "点滅", inverse: "反転" };

function hiliteRule(rule: string): string | undefined {
  const match = /^([a-zA-Z-]+)\/([^/]+)\/([a-zA-Z-]+)(?:&([a-zA-Z]+))?$/.exec(rule);
  if (!match) return undefined;
  const [, field, value, color, attribute] = match;
  const name = hiliteFields[field] ?? lookupNethack5SourceExact(field);
  const rank = /^"(.+)"$/.exec(value);
  const shown = rank ? `「${translatePlayerRank(rank[1], "ja")}」` : hiliteValues[value] ?? value;
  if (name === undefined || hiliteColors[color] === undefined) return undefined;
  return `${name}／${shown}／${hiliteColors[color]}${attribute ? `＆${hiliteAttributes[attribute] ?? attribute}` : ""}`;
}

// botl.c: the labels of the status condition menu's "cond_blind" rows.
const conditionOptions: Readonly<Record<string, string>> = {
  barehanded: "素手", blind: "盲目", busy: "作業中", conf: "混乱", deaf: "聴覚障害", fly: "飛行", foodPois: "食中毒", glowhands: "光る手", grab: "つかまれ", hallucinat: "幻覚", held: "拘束", holding: "つかみ中",
  ice: "氷上", iron: "鉄", lava: "溶岩", levitate: "浮遊", paralyzed: "麻痺", ride: "騎乗", sleep: "睡眠", slime: "粘液化", slip: "滑る手", stone: "石化", strngl: "窒息", stun: "朦朧", submerged: "水中", termIll: "重病",
  tethered: "つながれ", trap: "罠", unconscious: "気絶", woundedlegs: "脚の負傷",
};

// read.c: the plural motifs of a Hawaiian shirt's description.
const pluralMotifs: Readonly<Record<string, string>> = {
  flamingos: "flamingo", parrots: "parrot", toucans: "toucan", "birds of paradise": "bird of paradise", "sea turtles": "sea turtle", "tropical fish": "tropical fish", jellyfish: "jellyfish", "giant eels": "giant eel",
  "water nymphs": "water nymph", plumeria: "plumeria", orchids: "orchid", "hibiscus flowers": "hibiscus flower", "palm trees": "palm tree", "hula dancers": "hula dancer", sailboats: "sailboat", ukuleles: "ukulele",
};

const own = (map: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
const mark = (punctuation: string): string => (punctuation === "!" ? "！" : "。");

const greetings: Readonly<Record<string, string>> = {
  Hello: "こんにちは", Salutations: "ごきげんよう", "Konnichi wa": "こんにちは", Aloha: "アロハ", Velkommen: "ようこそ",
  "Good day": "こんにちは", "Good evening": "こんばんは", "Good morning": "おはよう", Greetings: "ごきげんよう",
  Ahoy: "おーい", Hallo: "こんにちは", Bonjour: "こんにちは", Irasshaimase: "いらっしゃいませ",
};
const greet = (word: string): string => own(greetings, word) ?? word;

const shopTypes: Readonly<Record<string, string>> = {
  "general store": "雑貨店", "used armor dealership": "中古防具店", "second-hand bookstore": "古本屋", "liquor emporium": "酒屋",
  "antique weapons outlet": "骨董武器店", delicatessen: "総菜屋", jewelers: "宝石店", "quality apparel and accessories": "高級服飾店",
  "hardware store": "金物屋", "rare books": "稀覯本店", "health food store": "健康食品店", "lighting store": "照明店",
  "lighting shop": "照明店", "tool shop": "道具屋",
};
const shopType = (type: string): string => own(shopTypes, type) ?? type;
// "Asidonhopo's" (s_suffix of a shopkeeper name); names stay verbatim.
const owner = (possessive: string): string => possessive.replace(/'s?$/, "");

const rays = rayNames;
// Projectiles and rays: "The dagger", "The 2 arrows", "The bolt of fire".
const missile = (text: string): string => {
  const ray = /^(?:[Tt]he |an? )?(.+)$/.exec(text);
  const translatedRay = ray ? own(rays, ray[1]) : undefined;
  if (translatedRay !== undefined) return translatedRay;
  const item = translateInventoryItem(text, "ja");
  if (item !== text) return item;
  const counted = /^[Tt]he (\d+ .+)$/.exec(text);
  if (counted) {
    const many = translateInventoryItem(counted[1], "ja");
    if (many !== counted[1]) return many;
  }
  return arg(text);
};

// A monster subject misses with its attack; an object subject simply misses.
const misser = (text: string): string => {
  const ray = /^(?:[Tt]he |an? )?(.+)$/.exec(text);
  if (ray && own(rays, ray[1]) !== undefined) return missile(text);
  const monster = translateMonsterName(text, "ja");
  return monster !== text ? `${monster}の攻撃` : missile(text);
};

const meleeVerbs: Readonly<Record<string, string>> = {
  bites: "噛みついた", stings: "刺した", butts: "頭突きした", kicks: "蹴った", hits: "攻撃を命中させた", explodes: "爆発した",
};
const playerVerbs: Readonly<Record<string, string>> = {
  hit: "に攻撃が命中した", smite: "を打ち据えた", bash: "を殴りつけた", lash: "をむちで打った", kick: "を蹴った", bite: "に噛みついた",
  sting: "を刺した", "head butt": "に頭突きした", butt: "に頭突きした", touch: "に触れた", tentacles: "に触手を伸ばした",
};

// Occupation text from set_occupation(); used by "You stop/continue ...".
const occupations: Readonly<Record<string, string>> = {
  "eating non-food": "食べ物でない物を食べる", "opening the tin": "缶詰を開ける", studying: "勉強する", engraving: "文字を刻む",
  "forcing the lock": "錠をこじ開ける", "picking the lock": "錠を外す", "unlocking the door": "扉の鍵を開ける", "locking the door": "扉に鍵をかける",
  "unlocking the chest": "宝箱の鍵を開ける", "locking the chest": "宝箱に鍵をかける", "unlocking the box": "箱の鍵を開ける", "locking the box": "箱に鍵をかける",
  digging: "掘る", chopping: "木を切る", searching: "探す", waiting: "待つ", resting: "休む", "taking off your armor": "防具を脱ぐ",
  "setting the beartrap": "トラバサミを仕掛ける", "setting the land mine": "地雷を仕掛ける", "wiping off your face": "顔をぬぐう",
  praying: "祈る", "melting your message into the ice": "氷にメッセージを溶かし込む", "burning your message into the floor": "床にメッセージを焼き付ける",
  "defacing the dungeon": "ダンジョンに落書きする", scrawling: "なぐり書きする", "writing in the dust": "ほこりに文字を書く", "playing music": "演奏する", "trying to escape": "逃げようとする",
};
const occupation = (text: string): string | undefined => {
  const known = own(occupations, text);
  if (known !== undefined) return known;
  const eating = /^(eating|consuming) (.+)$/.exec(text);
  if (eating) {
    const food = arg(eating[2]);
    return food === eating[2] && /^[a-z]/.test(food) ? undefined : `${food}を食べる`;
  }
  const off = /^taking off (.+)$/.exec(text);
  if (off) return `${arg(off[1])}を脱ぐ`;
  return undefined;
};

const tastes: Readonly<Record<string, string>> = {
  terrible: "ひどい味だ", okay: "まあまあの味だ", delicious: "おいしい", stringy: "筋っぽい", gamey: "獣臭い", fatty: "脂っこい",
  tough: "硬い", "gr-r-reat": "サイコーだ", gnarly: "イカしてる", copacetic: "いい感じだ", grody: "サイアクだ", bland: "味気ない",
};

// Bare object names (cxname) from erosion and similar messages.
// armor_simple_name() and similar generic armor words.
const simpleArmor: Readonly<Record<string, string>> = {
  mail: "鎧", suit: "鎧", cloak: "クローク", robe: "ローブ", apron: "エプロン", smock: "上着", helmet: "兜", hat: "帽子",
  item: "アイテム", stack: "束", helm: "兜", boots: "ブーツ", shoes: "靴", gloves: "手袋", gauntlets: "籠手", shield: "盾", shirt: "シャツ",
};
// What autodescribe and #terrain name: a feature, a monster, an object or a sentence.
const describePlace = (what: string): string => {
  const embedded = /^(.+?) embedded in stone$/.exec(what);
  if (embedded) return `石に埋まった${thing(embedded[1].replace(/^some /, ""))}`;
  const chained = /^(.+?) called (\S+), chained to a heavy iron ball$/.exec(what);
  if (chained) return `${heroDescription(chained[1])}（${chained[2]}）、重い鉄球につながれている`;
  const exact = lookupNethack5SourceExact(what);
  if (exact !== undefined) return exact;
  const ground = translateGroundObject(what, "ja");
  if (ground !== what) return ground;
  const monster = translateMonsterName(`the ${what}`, "ja");
  if (monster !== `the ${what}`) return monster;
  const item = translateInventoryItem(what, "ja");
  if (item !== what) return item;
  const look = translateLookDescriptionMessage(what);
  if (look !== undefined) return look;
  if (/^[A-Z]/.test(what)) {
    const sentence = presentGameMessage(`${what}.`, "ja").text;
    if (sentence !== `${what}.`) return sentence;
  }
  return arg(what);
};
// trap.c: the note a squeaky board plays.
const noteName = (note: string): string => note.replace(" flat", "フラット").replace(" sharp", "シャープ");
const thing = (text: string): string => {
  const armor = own(simpleArmor, text);
  if (armor !== undefined) return armor;
  const item = translateInventoryItem(text, "ja");
  return item !== text ? item : arg(text);
};
// "Your", "The" (visible object) or "<Monster>'s" in front of an object name.
const holder = (who: string): string => {
  if (who === "Your" || who === "your" || who === "The" || who === "the") return "";
  const monster = /^(.+?)'s?$/.exec(who);
  return monster ? `${arg(monster[1])}の` : "";
};
const erosionVerbs: Readonly<Record<string, string>> = {
  smoulder: "焦げた", rust: "錆びた", rot: "腐った", corrode: "腐食した", crack: "ひびが入った",
};
const erosionAway: Readonly<Record<string, string>> = {
  smoulder: "焼け落ちた", rust: "錆びて崩れ落ちた", rot: "腐って崩れ落ちた", corrode: "腐食して崩れ落ちた", crack: "砕け散った",
};
const erosionCauses: Readonly<Record<string, string>> = {
  heat: "熱", oxidation: "酸化", decay: "腐敗", corrosion: "腐食", impact: "衝撃",
};
const erosionStem = (verb: string): string => verb.replace(/s$/, "");
const mmVerbs: Readonly<Record<string, string>> = {
  bites: "に噛みついた", stings: "を刺した", butts: "に頭突きした", touches: "に触れた", squeezes: "を締めつけた", hits: "に攻撃を命中させた", kicks: "を蹴った",
};

const surfaces: Readonly<Record<string, string>> = {
  floor: "床", ground: "地面", ice: "氷", dust: "ほこり", bridge: "橋", headstone: "墓石", altar: "祭壇", stairs: "階段", doorway: "戸口",
  fountain: "泉", water: "水", lava: "溶岩", air: "空中", "air bubble": "気泡", cloud: "雲", wall: "壁", bottom: "底", maw: "胃袋", husk: "抜け殻",
};
const surface = (text: string): string => own(surfaces, text) ?? arg(text);
// Engraving verbs (engrave.c doengrave_ctx_verb): [past action, prompt verb].
const engraveVerbs: Readonly<Record<string, readonly [string, string]>> = {
  "write in": ["に書いた", "に何と書きますか"], "add to the writing in": ["の文字に書き足した", "の文字に何と書き足しますか"],
  "engrave on": ["に彫った", "に何と彫りますか"], "add to the epitaph on": ["の墓碑銘に彫り足した", "の墓碑銘に何と彫り足しますか"],
  "engrave in": ["に刻んだ", "に何と刻みますか"], "add to the engraving in": ["の刻まれた文字に刻み足した", "の刻まれた文字に何と刻み足しますか"],
  "burn into": ["に焼き付けた", "に何と焼き付けますか"], "melt into": ["に溶かし込んだ", "に何と溶かし込みますか"],
  "add to the burned text in": ["の焼き付けられた文字に書き足した", "の焼き付けられた文字に何と書き足しますか"],
  "scrawl on": ["になぐり書きした", "に何となぐり書きしますか"], "add to the scrawl on": ["のなぐり書きに書き足した", "のなぐり書きに何と書き足しますか"],
};
const attributeWords: Readonly<Record<string, string>> = {
  strong: "力強くなった", smart: "賢くなった", wise: "思慮深くなった", agile: "身軽になった", tough: "頑丈になった", charismatic: "魅力的になった",
  weak: "弱くなった", stupid: "愚かになった", foolish: "浅はかになった", clumsy: "不器用になった", fragile: "もろくなった", repulsive: "醜くなった",
};

const god = (name: string): string => own(deityNames, name) ?? name;
const moods: Readonly<Record<string, string>> = {
  "well-pleased": "大いに満足している", pleased: "満足している", satisfied: "納得している", displeased: "不機嫌だ",
  "pleased as punch": "ご機嫌だ", ticklish: "くすぐったがっている", full: "おなかいっぱいだ", bummed: "がっかりしている",
};
const noteNames: Readonly<Record<string, string>> = { C: "ド", D: "レ", E: "ミ", F: "ファ", G: "ソ", A: "ラ", B: "シ" };
const note = (text: string): string => {
  const parts = /^([A-G]) (note|flat|sharp)$/.exec(text);
  return parts ? `${noteNames[parts[1]]}${parts[2] === "flat" ? "♭" : parts[2] === "sharp" ? "♯" : ""}の音` : text;
};

const goals: Readonly<Record<string, string>> = {
  "a monster": "モンスター", "the creature you want to pay": "支払う相手", "the desired destination": "目的地", "the desired position": "目的の位置",
  "the monster you want to name": "名前を付けるモンスター", "the spot to hit": "攻撃する場所", "monster of interest": "注目するモンスター",
  "anything of interest": "注目するもの", food: "食料", gold: "金貨", object: "アイテム", "trap of interest": "注目する罠",
};
const lootMenu: Readonly<Record<string, string>> = {
  "take something out": "何かを取り出す", "put something in": "何かを入れる", "take anything out": "何かを取り出す", "put anything in": "何かを入れる",
  "both; take out, then put in": "両方（取り出してから入れる）", "take out, then put in": "取り出してから入れる",
  "both reversed; put in, then take out": "両方（入れてから取り出す）", "put in, then take out": "入れてから取り出す",
  "loot next container": "次の入れ物を調べる", done: "完了", "do nothing": "何もしない",
};
const stealVerbs: Readonly<Record<string, string>> = { disarms: "を奪い取った", removes: "を外した", "takes off": "を脱がせた" };
const seduceVerbs: Readonly<Record<string, string>> = {
  "helps you to take": "脱ぐのを手伝ってもらった", "you take": "脱いだ", "you continue taking": "脱ぎ続けた", "you start taking": "脱ぎ始めた",
};
const charmVerbs: Readonly<Record<string, string>> = {
  "let her take": "喜んで持って行かせた", "hand over": "喜んで渡した", "continue removing": "喜んで外し続けた", "start removing": "喜んで外し始めた",
};
const heroRaces: Readonly<Record<string, string>> = { human: "人間", elven: "エルフ", elf: "エルフ", dwarven: "ドワーフ", dwarf: "ドワーフ", gnomish: "ノーム", gnome: "ノーム", orcish: "オーク", orc: "オーク" };
// "lawful female human Valkyrie", with any of its pieces missing.
function heroDescription(text: string): string {
  const words: Readonly<Record<string, string>> = { lawful: "秩序", neutral: "中立", chaotic: "混沌", male: "男性", female: "女性", ...heroRaces, ...heroRoles };
  const shown = text.split(" ").map((word) => own(words, word.toLowerCase()) ?? word);
  return shown.join("の");
}

const heroRoles: Readonly<Record<string, string>> = {
  archeologist: "考古学者", barbarian: "蛮族", caveman: "原始人", cavewoman: "原始人", healer: "治療師", knight: "騎士", monk: "僧侶",
  priest: "司祭", priestess: "女司祭", rogue: "盗賊", ranger: "レンジャー", samurai: "侍", tourist: "観光客", valkyrie: "ワルキューレ", wizard: "魔法使い",
};
// Bare look/autodescribe descriptions: "tame little dog called Hachi",
// "human samurai called Kafujinho", "doorway". Unknown text stays English.
const lookDescription = (text: string): string | undefined => {
  const called = /^(.+?) (called|named) (.+)$/.exec(text);
  const base = (called ? called[1] : text).replace(/^an? /, "");
  let name: string | undefined;
  const hero = /^(\S+) (\S+)$/.exec(base);
  if (hero && own(heroRaces, hero[1]) && own(heroRoles, hero[2])) name = `${heroRaces[hero[1]]}の${heroRoles[hero[2]]}`;
  if (name === undefined && called && own(heroRoles, base)) name = heroRoles[base];
  if (name === undefined) {
    const monster = translateMonsterName(`the ${base}`, "ja");
    if (monster !== `the ${base}`) name = monster;
  }
  if (name === undefined && !called) {
    const ground = translateGroundObject(base, "ja");
    if (ground !== base) name = ground;
  }
  if (name === undefined) return undefined;
  return called ? `${translateMonsterName(called[3], "ja")}という${name}` : name;
};

// hcolor() results (see color-text.ts for hallucinatory colors).
const colors: Readonly<Record<string, string>> = {
  red: "赤", orange: "オレンジ", yellow: "黄", green: "緑", blue: "青", purple: "紫", violet: "すみれ", black: "黒", white: "白",
  brown: "茶", gray: "灰", grey: "灰", silver: "銀", golden: "金", gold: "金", amber: "琥珀", cyan: "シアン", magenta: "赤紫",
  pink: "桃", "light blue": "水", "dark blue": "濃い青", "light green": "薄緑", "dark green": "濃い緑", indigo: "藍", puce: "暗赤",
  "sky blue": "空", "brilliant blue": "鮮やかな青", ruby: "ルビー", emerald: "エメラルド", murky: "濁った", milky: "乳白", clear: "透明な",
};
const color = (name: string): string | undefined => {
  const base = own(colors, name);
  return base === undefined ? undefined : /[なた]$/.test(base) ? base : `${base}色の`;
};
const colorly = (name: string): string | undefined => {
  const base = own(colors, name);
  return base === undefined ? undefined : /[なた]$/.test(base) ? `${base.replace(/な$/, "")}に` : `${base}色に`;
};
const foodWords: Readonly<Record<string, string>> = {
  meal: "食事", liquid: "液体", wax: "ろう", food: "食べ物", meat: "肉", paper: "紙", cloth: "布", leather: "革", wood: "木", bone: "骨",
  scale: "鱗", metal: "金属", silver: "銀", gold: "金", platinum: "白金", mithril: "ミスリル", plastic: "プラスチック", glass: "ガラス", stone: "石",
};

const honorific = /^(?:good|honored|most gracious|esteemed|most renowned and sacred)(?: (?:sir|lady|creature|hir|hiril|dark lord|dark lady))?$/;

export const assembledMessageTemplates: readonly Template[] = [
  // Monster melee (mhitu.c hitmsg).
  [/^(.+?) (bites|stings|butts|kicks|hits|explodes)( again)?([!.])$/, (subject, verb, again, p) =>
    `${arg(subject)}が${again ? "再び" : ""}${verb === "hits" ? "攻撃を命中させた" : meleeVerbs[verb]}${mark(p)}`],
  [/^(.+?) touches you( again)?!$/, (subject, again) => `${arg(subject)}が${again ? "再び" : ""}あなたに触れた！`],
  [/^(.+?)'s tentacles suck your brain( again)?!$/, (subject, again) => `${arg(subject)}の触手が${again ? "再び" : ""}あなたの脳を吸った！`],
  [/^(.+?) (smiles at|talks to|touches) you (engagingly|seductively)\.$/, (subject, verb, manner) =>
    `${arg(subject)}は${manner === "engagingly" ? "愛想よく" : "誘惑するように"}あなたに${verb === "smiles at" ? "微笑みかけた" : verb === "talks to" ? "話しかけた" : "触れた"}。`],
  [/^(.+?) just misses!$/, (subject) => `${arg(subject)}の攻撃はかろうじて外れた！`],
  [/^(.+?) misses you\.$/, (subject) => `${misser(subject)}はあなたに当たらなかった。`],
  [/^(.+?) miss you\.$/, (subject) => `${misser(subject)}はあなたに当たらなかった。`],
  [/^You are hit by (.+?)([.!])$/, (what, p) => `${missile(what)}が当たった${mark(p)}`],
  [/^You are hit([.!])$/, (p) => `攻撃を受けた${mark(p)}`],
  [/^It misses\.$/, () => "何かは外れた。"],
  // Monster against monster (mhitm.c).
  [/^(.+?) (bites|stings|butts|touches|squeezes|hits|kicks) (.+?)([.!])$/, (subject, verb, target, p) =>
    arg(subject) === subject && arg(target) === target && missile(subject) === subject ? ""
    : verb === "hits" && translateMonsterName(subject, "ja") === subject && missile(subject) !== subject
      ? `${missile(subject)}が${arg(target)}に当たった${mark(p)}`
      : `${arg(subject)}が${arg(target)}${mmVerbs[verb]}${mark(p)}`],
  [/^(.+?)'s? tentacles suck (.+?)\.$/, (subject, target) => `${arg(subject)}の触手が${arg(target)}を吸った。`],
  [/^(.+?) (smiles at|talks to) (.+?) (engagingly|seductively)\.$/, (subject, verb, target, manner) =>
    `${arg(subject)}は${manner === "engagingly" ? "愛想よく" : "誘惑するように"}${arg(target)}に${verb === "smiles at" ? "微笑みかけた" : "話しかけた"}。`],
  // Missiles fired by monsters (mthrowu.c monshoot) and wands (muse.c).
  [/^(.+?) (shoots|throws) (.+?)(?: at (.+?))?!$/, (subject, verb, what, target) =>
    `${arg(subject)}が${target ? `${arg(target)}に向けて` : ""}${missile(what)}を${verb === "shoots" ? "放った" : "投げた"}！`],
  [/^(.+?) zaps (.+?), which suddenly explodes!$/, (subject, wand) => `${arg(subject)}が${thing(wand)}を振ると、突然爆発した！`],
  [/^(.+?) zaps (.+?)!$/, (subject, wand) => `${arg(subject)}が${thing(wand)}を振った！`],
  [/^(.+?) (lashes|bashes with) (?:his|her|its|their) (.+?)\.$/, (subject, verb, weapon) => `${arg(subject)}が${thing(weapon)}${verb === "lashes" ? "を振るった" : "で殴りかかった"}。`],
  [/^You (throw|shoot) (\d+) (.+?)\.$/, (verb, count, what) => `${thing(`${count} ${what}`)}を${verb === "shoot" ? "放った" : "投げた"}。`],
  // Erosion (trap.c erode_obj).
  [/^(.+?'s?|Your|The) (.+?) (smoulders?|rusts?|rots?|corrodes?|cracks?)( completely| further)?!$/, (who, item, verb, adverb) =>
    `${holder(who)}${thing(item)}が${adverb === " completely" ? "完全に" : adverb === " further" ? "さらに" : ""}${erosionVerbs[erosionStem(verb)]}！`],
  [/^(.+?'s?|Your|The) (.+?) (smoulders?|rusts?|rots?|corrodes?) away!$/, (who, item, verb) => `${holder(who)}${thing(item)}が${erosionAway[erosionStem(verb)]}！`],
  [/^(.+?'s?|Your|The) (.+?) shatters!$/, (who, item) => `${holder(who)}${thing(item)}が砕け散った！`],
  [/^(.+?'s?|Your) (.+?) (?:is|are) not affected by (heat|oxidation|decay|corrosion|impact)\.$/, (who, item, cause) =>
    `${holder(who)}${thing(item)}は${erosionCauses[cause]}の影響を受けない。`],
  [/^Somehow, (.+?'s?|your|the) (.+?) (?:is|are) not affected by the (heat|oxidation|decay|corrosion|impact)\.$/, (who, item, cause) =>
    `なぜか、${holder(who)}${thing(item)}は${erosionCauses[cause]}の影響を受けなかった。`],
  // Projectiles and rays against monsters (zap.c hit()/miss(), dothrow.c tmiss()).
  [/^(The .+?) hits? (.+?)([.!])$/, (what, target, p) => `${missile(what)}が${arg(target)}に当たった${mark(p)}`],
  [/^(The .+?) miss(?:es)? (.+?)\.$/, (what, target) => `${misser(what)}は${arg(target)}に当たらなかった。`],
  [/^(The .+?) misses\.$/, (what) => `${misser(what)}は外れた。`],
  // Hero melee (uhitm.c).
  [/^You (hit|smite|bash|lash|kick|bite|sting|head butt|butt|touch|tentacles) (.+?)([.!])$/, (verb, target, p) => `${arg(target)}${playerVerbs[verb]}${mark(p)}`],
  [/^You miss it\.$/, () => "攻撃は外れた。"],
  [/^You (kill|destroy) it!$/, (verb) => `${verb === "kill" ? "それを倒した" : "それを破壊した"}！`],
  [/^(.+?) is (killed|destroyed)(?: by the (.+?))?!$/, (subject, how, cause) =>
    `${arg(subject)}は${cause ? `${own(rays, cause) ?? arg(cause)}によって` : ""}${how === "killed" ? "倒された" : "破壊された"}！`],
  [/^You hear the shrieks of (.+?)\.$/, (target) => `${arg(target)}の悲鳴が聞こえた。`],
  // Shops (shk.c).
  [/^(.+?), (.+?)!  Welcome( again)? to (.+?'s?) (.+?)!$/, (hello, name, again, keeper, type) =>
    `${greet(hello)}、${name}！ ${owner(keeper)}の${shopType(type)}へ${again ? "また" : ""}ようこそ！`],
  [/^You enter (.+?'s?) (.+?)( again)?!$/, (keeper, type, again) => `${owner(keeper)}の${shopType(type)}に${again ? "再び" : ""}入った！`],
  [/^Thank you for shopping in (.+?'s?) (.+?)([.!])$/, (keeper, type, p) => `${owner(keeper)}の${shopType(type)}でのお買い物ありがとうございました${mark(p)}`],
  [/^(.+?), (.+?)!  I was looking for (.+?)\.$/, (hello, name, who) => `${greet(hello)}、${name}！ ${arg(who)}を探していたんだ。`],
  [/^(.+?), (.+?)!  Didn't you forget to pay\?$/, (hello, name) => `${greet(hello)}、${name}！ お支払いをお忘れではありませんか？`],
  [/^"For you, (.+?); only (\d+) (zorkmids?) (per|for this|for the contents of this) (.+?)( and its contents)?\."$/, (who, price, _currency, kind, item, contents) =>
    honorific.test(who)
      ? `「お客様には、${kind === "per" ? "1個につき" : kind === "for this" ? "この" : "この"}${arg(item)}${kind === "for the contents of this" ? "の中身" : ""}${contents ? "と中身" : ""}がたったの ${price} ゾークミドです」`
      : `「${who}には、この${arg(item)}は ${price} ゾークミドだ」`],
  [/^"For you, scum; (\d+) (zorkmids?) (per|for this|for the contents of this) (.+?)( and its contents)?\."$/, (price, _currency, kind, item, contents) =>
    `「貴様には、${kind === "per" ? "1個につき" : "この"}${arg(item)}${kind === "for the contents of this" ? "の中身" : ""}${contents ? "と中身" : ""}は ${price} ゾークミドだ」`],
  [/^"For you, (\d+) (zorkmids?) (per|for this|for the contents of this) (.+?)( and its contents)?\."$/, (price, _currency, kind, item, contents) =>
    `「${kind === "per" ? "1個につき" : "この"}${arg(item)}${kind === "for the contents of this" ? "の中身" : ""}${contents ? "と中身" : ""}は ${price} ゾークミドです」`],
  [/^(.+?) will cost you (\d+) (zorkmids?)( each)?\.$/, (item, price, _currency, each) => `${arg(item)}は${each ? "1個" : ""} ${price} ゾークミドかかる。`],
  [/^The list price of (.+?) is (\d+) (zorkmids?)( each)?\.$/, (item, price, _currency, each) => `${arg(item)}の定価は${each ? "1個" : ""} ${price} ゾークミドだ。`],
  [/^(.+?) offers( only)? (\d+) gold pieces? for (.+?)\.  Sell (?:it|them)\?$/, (keeper, only, price, item) =>
    `${arg(keeper)}は${arg(item)}に${only ? "たった" : ""}金貨 ${price} 枚を提示した。売りますか？`],
  [/^You (bought|sold) (.+?) for (\d+) gold pieces?\.$/, (verb, item, price) => `${arg(item)}を金貨 ${price} 枚で${verb === "bought" ? "買った" : "売った"}。`],
  [/^(.+?); you (bought|sold) (?:it|them) for (\d+) gold pieces?\.$/, (item, verb, price) => `${arg(item)}――それを金貨 ${price} 枚で${verb === "bought" ? "買った" : "売った"}。`],
  [/^You paid for (.+?) at a cost of (\d+) gold pieces?\.$/, (item, price) => `${arg(item)}の代金として金貨 ${price} 枚を支払った。`],
  [/^(.+?); you paid for (?:it|them) at a cost of (\d+) gold pieces?\.$/, (item, price) => `${arg(item)}――その代金として金貨 ${price} 枚を支払った。`],
  [/^You (?:traded|relinquish) (.+?) (?:for|and acquire) (\d+) zorkmids? in (additional )?credit\.$/, (item, amount, more) => `${arg(item)}と引き換えに${more ? "追加で" : ""} ${amount} ゾークミドの預け金を得た。`],
  [/^(.+?); you (?:traded|relinquish) (?:it|them) (?:for|and acquire) (\d+) zorkmids? in (additional )?credit\.$/, (item, amount, more) => `${arg(item)}――それと引き換えに${more ? "追加で" : ""} ${amount} ゾークミドの預け金を得た。`],
  [/^You owe (.+?) (\d+) (zorkmids?) for (it|them)!$/, (keeper, price) => `${arg(keeper)}に ${price} ゾークミドの借りができた！`],
  [/^Itemized billing\?$/, () => "明細を確認しながら支払いますか？"],
  // Engraving (engrave.c).
  [/^You (write in|add to the writing in|engrave on|add to the epitaph on|engrave in|add to the engraving in|burn into|melt into|add to the burned text in|scrawl on|add to the scrawl on) the (.+?) with (?:1 of )?(.+?)\.$/, (verb, where, tool) =>
    `${tool === "your fingertip" ? "指先" : thing(tool)}で${surface(where)}${engraveVerbs[verb][0]}。`],
  [/^What do you want to (write in|add to the writing in|engrave on|add to the epitaph on|engrave in|add to the engraving in|burn into|melt into|add to the burned text in|scrawl on|add to the scrawl on) the (.+?) here\?$/, (verb, where) =>
    `ここの${surface(where)}${engraveVerbs[verb][1]}？`],
  // Monster growth and taming (makemon.c, dog.c, hack.c).
  [/^(.+?) (grows up into|becomes|changes into) (an? .+?)\.$/, (subject, verb, form) =>
    `${arg(subject)}は${arg(form)}${verb === "grows up into" ? "に成長した" : verb === "becomes" ? "になった" : "に変わった"}。`],
  [/^As (.+?) grows up into (an? .+?), (?:he|she|it|they) (dies|expires)!$/, (subject, form) => `${arg(subject)}は${arg(form)}に成長しかけたが、死んでしまった！`],
  [/^(.+?) (is no longer tame|has become feral)\.$/, (subject, state) => `${arg(subject)}は${state === "has become feral" ? "野生に戻った" : "もうなついていない"}。`],
  [/^You frighten (.+?)\.$/, (target) => `${arg(target)}をおびえさせた。`],
  // Object prompts (eat.c, apply.c, lock.c, do_name.c).
  [/^There (?:is|are) (.+?) here; (eat|sacrifice|offer|tin|close|open|loot|untrap|use|pick up) (it|one|them)\?$/, (what, verb, count) => {
    const verbs: Readonly<Record<string, string>> = {
      eat: "食べ", sacrifice: "捧げ", offer: "捧げ", tin: "缶詰にし", close: "閉め", open: "開け", loot: "中身を調べ", untrap: "罠を解除し", use: "使い", "pick up": "拾い",
    };
    return `ここに${arg(what)}があります。${count === "one" ? "1つ" : ""}${verbs[verb]}ますか？`;
  }],
  [/^Call a stream of (.+?) fluid:$/, (color) => `${own(rays, color) ?? color}液体の流れを何と呼びますか：`],
  [/^Call (.+?):$/, (what) => `${arg(what)}を何と呼びますか：`],
  // Watchmen (mon.c).
  [/^You hear the shrill sound of (?:a guard's|guards') whistles?\.$/, () => "警備兵の甲高い笛の音が聞こえた。"],
  [/^The guards? (?:gets?|get) angry!$/, () => "警備兵が怒った！"],
  [/^(An angry|Angry) guards? (?:is|are) approaching!$/, () => "怒った警備兵が近づいてくる！"],
  // Containers and piles (pickup.c, invent.c).
  [/^There are (two|a few|several|many)( more)? objects here\.$/, (amount, more) => {
    const counts: Readonly<Record<string, string>> = { two: "2つ", "a few": "いくつか", several: "数個", many: "たくさん" };
    return `ここには${more ? "さらに" : ""}物が${counts[amount]}ある。`;
  }],
  [/^(.+?) is empty\.\s+Do what with it\?$/, (box) => `${arg(box)}は空だ。どうしますか？`],
  [/^Look inside (.+)$/, (box) => `${arg(box)}の中を見る`],
  [/^stash one item into (.+)$/, (box) => `${arg(box)}に1つしまう`],
  // potion.c: blindness and hallucination wearing off for an instant.
  [/^Your vision seems to (brighten|dim|flatten) for a moment but is (normal|sadder|happier) now\.$/, (change, state) => {
    const changes: Readonly<Record<string, string>> = { brighten: "明るく", dim: "暗く", flatten: "平らに" };
    const states: Readonly<Record<string, string>> = { normal: "元に戻った", sadder: "なんだか悲しげだ", happier: "なんだか楽しげだ" };
    return `視界が一瞬${changes[change]}なったようだが、今は${states[state]}。`;
  }],
  [/^Your (.+?) momentarily (itch|itches|twitch|twitches)\.$/, (eyes, verb) =>
    `${arg(eyes)}が一瞬${verb.startsWith("itch") ? "むずむずした" : "ぴくりと動いた"}。`],
  // monmove.c: locomotion() conjugated by makeplural().
  [/^(.+?) (\S+) (through|between) the iron bars\.$/, (who, verb, way) => {
    const manners: Readonly<Record<string, string>> = {
      floats: "ふわふわと", flies: "飛んで", slithers: "這って", flows: "流れるように", oozes: "にじみ出るように", swims: "泳いで",
    };
    return `${arg(who)}は鉄格子${way === "between" ? "の間" : ""}を${manners[verb] ?? ""}すり抜けた。`;
  }],
  // mhitu.c: a monster attacks where it thinks you are.
  [/^(.+?) (swings|snaps|kicks|lunges) wildly and misses!$/, (who, verb) => {
    const actions: Readonly<Record<string, string>> = { swings: "殴りかかった", snaps: "噛みついた", kicks: "蹴りかかった", lunges: "突きかかった" };
    return `${arg(who)}はやみくもに${actions[verb]}が、外れた！`;
  }],
  // do.c cmd_safety_prevention(): the prefix sentence follows the refusal.
  [/^(You already found a monster\.|You stop\. .+?|.+?\.)\s+Use '(.+?)' prefix to force (another search|another rest|resting|searching|waiting)\.$/, (refusal, key, action) => {
    const actions: Readonly<Record<string, string>> = {
      "another search": "探索", "another rest": "休憩", resting: "休憩", searching: "探索", waiting: "待機",
    };
    const reason = refusal === "You already found a monster." ? "すでにモンスターを見つけている。" : translateAssembledMessage(refusal) ?? arg(refusal);
    return `${reason}それでも${actions[action]}するには「${key}」を前に付ける。`;
  }],
  // trap.c water_damage().
  [/^Some (.+?) gets into your (.+?)!$/, (liquid, item) => `${arg(liquid)}が${thing(item)}に入り込んだ！`],
  [/^The (.+?) cannot get into your (.+?)\.$/, (liquid, item) => `${arg(liquid)}は${thing(item)}に入り込めない。`],
  // mhitm.c gazemm().
  [/^(?:The (blinded) )?(.+?) gazes (at|toward) (.+?)\.\.\.$/, (blinded, who, way, target) =>
    `${blinded ? "盲目の" : ""}${arg(who)}は${arg(target)}${way === "at" ? "を" : "の方を"}にらんだ……`],
  // dat/earth.lua: arriving on the Plane of Earth.
  [/^But now thou must face the final Test\.\.\.$/, () => "だが今こそ、最後の試練に立ち向かわねばならぬ……"],
  [/^Prove thyself worthy or perish!$/, () => "己の価値を示すか、さもなくば滅びよ！"],
  // o_init.c: a discoveries row, "* elven bow (runed bow)" or "potion (fizzy)".
  [/^(\* )?([A-Za-z].*?) \(([^()]+)\)$/, (star, name, look) => {
    // An item with a status in parentheses is not a discoveries row.
    const whole = `${name} (${look})`;
    const status = translateInventoryItem(whole, "ja");
    if (!star && status !== whole) return status;
    const item = translateInventoryItem(name, "ja");
    if (item === name) return "";
    const kind = /^(potion|scroll|wand|ring|spellbook|amulet)\b/.exec(name)?.[1];
    const lookForm = kind === "scroll" ? (look === "unlabeled" ? "unlabeled scroll" : `scroll labeled ${look}`) : kind ? `${look} ${kind}` : look;
    const seen = translateInventoryItem(lookForm, "ja");
    const lookText = seen !== lookForm ? seen : arg(look);
    if (lookText === look && !/^[A-Z ]+$/.test(look)) return "";
    // A bare class word adds nothing to its description.
    return `${star ? "＊ " : ""}${kind && name === kind ? lookText : `${item}（${lookText}）`}`;
  }],
  // o_init.c: an artifact's row, "Magicbane [neutral athame]".
  [/^(\* )?([A-Z].*?) \[(?:(lawful|neutral|chaotic|unaligned) )?(.+)\]$/, (star, name, alignment, base) => {
    const item = translateInventoryItem(name, "ja");
    if (item === name) return "";
    const alignments: Readonly<Record<string, string>> = { lawful: "秩序の", neutral: "中立の", chaotic: "混沌の", unaligned: "無属性の" };
    return `${star ? "＊ " : ""}${item}（${alignment ? alignments[alignment] : ""}${thing(base)}）`;
  }],
  [/^Discovered (.+?) (in order of discovery|alphabetically|by .+)$/, (category, order) => {
    const orders: Readonly<Record<string, string>> = { "in order of discovery": "発見順", alphabetically: "アルファベット順" };
    return `発見した${translateInventoryCategory(category, "ja")}：${orders[order] ?? "並び順"}`;
  }],
  // getpos.c: autodescribe.
  [/^(.+?) \(no travel path\)$/, (what) => {
    return `${describePlace(what)}（移動経路なし）`;
  }],
  // cmd.c.
  [/^Unknown direction: '(.+?)' \(use (.+) or '\.'\)\.$/, (key, keys) => `「${key}」は方向キーではない（${keys}、'.' を使ってください）。`],
  [/^The (\S+) command does not accept '(.+?)' prefix\.$/, (command, prefix) => `${command} コマンドは「${prefix}」接頭辞を受け付けない。`],
  [/^Autopickup: (OFF|ON)(?:, for (.+?) objects?(.*))?\.$/, (state, types) =>
    `自動拾い：${state === "ON" ? "オン" : "オフ"}${types ? `（${types === "all" ? "すべて" : arg(types)}のアイテム）` : ""}。`],
  // mhitu.c hitmsg(): a poisoned attack.
  [/^(.+?)(?:'s?)? (bite|sting|touch|claw|kick|butt|spit|tentacle|hit|weapon|attack)s? (?:was|were) poisoned!$/, (who, attack) => {
    const attacks: Readonly<Record<string, string>> = { bite: "牙", sting: "針", touch: "手", claw: "爪", kick: "足", butt: "角", spit: "つば", tentacle: "触手", hit: "攻撃", weapon: "武器", attack: "攻撃" };
    return `${who === "Its" ? "その" : `${arg(who)}の`}${attacks[attack]}には毒が塗られていた！`;
  }],
  // spell.c: a row of the spell menu.
  [/^(.+?)\s+(\d+)\s+(attack|healing|divination|enchantment|clerical|escape|matter)\s+(\d+%)\s*(.*)$/, (spell, level, school, fail, retention) => {
    const schools: Readonly<Record<string, string>> = { attack: "攻撃", healing: "回復", divination: "探知", enchantment: "付呪", clerical: "聖職", escape: "脱出", matter: "物質" };
    // A debug-mode list adds a column with the turns left.
    const [kept, turns] = retention.split(/\s+/);
    return `${spellName(spell)}　レベル${level}　${schools[school]}　失敗率${fail}${kept ? `　保持率${kept === "(gone)" ? "（失効）" : kept}` : ""}${turns ? `　残り${turns}ターン` : ""}`;
  }],
  // Samurai's item names, with the ordinary name in brackets (o_init.c).
  [/^(\* )?((?:pair of )?(?:potion of )?\S+) \[([^\]]+)\](?: \(([^()]+)\))?$/, (star, name, base, look) => {
    const japaneseNames: Readonly<Record<string, string>> = {
      gunyoki: "兵糧丸", kabuto: "兜", naginata: "薙刀", "ninja-to": "忍者刀", nunchaku: "ヌンチャク", shito: "小刀", tanko: "短甲",
      koto: "琴", osaku: "錠前破り", "pair of yugake": "弓懸", "potion of sake": "酒のポーション",
    };
    const item = own(japaneseNames, name);
    if (item === undefined) return "";
    return `${star ? "＊ " : ""}${item}（${thing(base)}${look ? `、${thing(look)}` : ""}）`;
  }],
  // role.c: the character creation question.
  [/^Shall I pick your (.+)'s (.+) for you\? \[ynaq\]$/, (who, parts) => {
    const words: Readonly<Record<string, string>> = {
      lawful: "秩序の", neutral: "中立の", chaotic: "混沌の", human: "人間の", elven: "エルフの", dwarven: "ドワーフの", gnomish: "ノームの", orcish: "オークの",
      male: "男の", female: "女の",
    };
    const character = who.split(" ").map((word) => {
      const known = own(words, word);
      if (known !== undefined) return known;
      return word.split("/").map((role) => arg(role)).join("・");
    }).join("");
    const choice = parts.replace(/race/g, "種族").replace(/gender/g, "性別").replace(/alignment/g, "属性").replace(/, /g, "、").replace(/ and /g, "と");
    return `${character}の${choice}をこちらで選びましょうか？ [ynaq]`;
  }],
  // invent.c doorganize().
  [/^Adjust letter to what (\[.*?\]) \(\? see used letters\)\?$/, (letters) => `どの文字に変更しますか？ ${letters}（? で使用中の文字を表示）`],
  [/^Split (\d+) to what (\[.*?\]) \(\? see used letters\)\?$/, (count, letters) => `${count}個をどの文字に分けますか？ ${letters}（? で使用中の文字を表示）`],
  [/^Are you really sure you want to break (.+)\?$/, (item) => `本当に${thing(item)}を折りますか？`],
  [/^Are you trying to use (\S+) as specified in the Guidebook\?$/, (key) => `ガイドブックにある ${key} を使おうとしていますか？`],
  [/^and press the <(.)> key\.$/, (key) => `<${key}> キーを押してください。`],
  [/^(\S+)\s+(.+) \(#(\w+)\)\.$/, (key, description, command) => `${key} ${lookupNethack5SourceExact(description) ?? arg(description)}（#${command}）。`],
  [/^Set (\S+) to what\?$/, (option) => `${option} を何に設定しますか？`],
  [/^You ready: ([A-Za-z]) - (.+)\.$/, (letter, item) => `${letter} - ${thing(item)}を準備した。`],
  // trap.c squeaky board: "squeaks a D flat note".
  [/^A board beneath (you|.+?) squeaks? an? (.+?)(?: note)?(?: loudly)?\.$/, (who, note) => `${who === "you" ? "足元" : `${arg(who)}の足元`}の床板が${noteName(note)}の音できしんだ。`],
  [/^You hear an? (.+?)(?: note)? squeak in the distance\.$/, (note) => `遠くで床板が${noteName(note)}の音できしむのが聞こえた。`],
  // spell.c: studying with a known magical ink.
  [/^The( magical)? ink in this spellbook is (.+)\.$/, (magical, state) => {
    const states: Readonly<Record<string, string>> = { fresh: "新しい", "slightly faded": "少し色あせている", "very faded": "とても色あせている", "extremely faded": "ひどく色あせている", "barely visible": "かろうじて見える程度だ" };
    return `この魔法書の${magical ? "魔法の" : ""}インクは${states[state] ?? arg(state)}。`;
  }],
  [/^(.+?) hits the edge of the pit\.$/, (item) => `${thing(item)}は穴の縁に当たった。`],
  [/^You aren't wielding an? (.+?), so you throw your (.+?) by hand\.$/, (launcher, missile) => `${thing(launcher)}を構えていないので、${thing(missile)}を手で投げた。`],
  [/^You catch (.+?)!\s+([A-Za-z]) - (.+)\.$/, (item, letter, full) => `${thing(item)}を受け止めた！ ${letter} - ${thing(full)}。`],
  [/^That is a silly thing to dip (.+?) into\.$/, (item) => `${thing(item)}を浸すようなものではない。`],
  [/^There is an? (.+?) here; (unlock|lock) it\?$/, (item, verb) => `ここに${thing(item)}がある。${verb === "unlock" ? "解錠" : "施錠"}しますか？`],
  [/^You don't have anything (else )?to (.+)\.$/, (more, verb) => {
    const verbs: Readonly<Record<string, string>> = {
      "use or apply": "使える", rub: "こすれる", eat: "食べられる", drink: "飲める", wear: "着られる", "put on": "身に着けられる", read: "読める", zap: "振れる", wield: "構えられる", throw: "投げられる", drop: "置ける", "take off": "脱げる", remove: "外せる",
    };
    const verbText = own(verbs, verb);
    return verbText === undefined ? "" : `${verbText}ものを${more ? "他に" : ""}持っていない。`;
  }],
  [/^Added hilite (.+)$/, (rule) => `強調表示を追加した：${hiliteRule(rule) ?? rule}`],
  // Things falling out of reach (do.c, dokick.c, steal.c).
  [/^Oops!\s+(.+?) drops (to the floor|out of your reach|away from you)!$/, (item, where) => {
    const places: Readonly<Record<string, string>> = { "to the floor": "床に落ちた", "out of your reach": "手の届かないところに落ちた", "away from you": "遠くへ落ちた" };
    return `おっと！ ${thing(item)}は${places[where]}！`;
  }],
  [/^You hear (.+?) incant (.+)\.$/, (who, label) => `${arg(who)}が「${label}」と唱えるのが聞こえた。`],
  // wield.c, weapon.c: cursed weapons and special hands.
  [/^(.+?) welds itself to (.+?)'s? (.+)!$/, (item, who, part) => `${thing(item)}は${who === "your" ? "あなた" : arg(who)}の${arg(part)}に貼りついた！`],
  [/^(.+?)'s? (.+?) is welded to (?:its|his|her|their) (.+)!$/, (who, item, part) => `${arg(who)}の${thing(item)}は${arg(part)}に貼りついている！`],
  [/^(.+?) returns to (?:its|his|her|their) (.+)!$/, (item, part) => `${thing(item)}は${arg(part)}に戻った！`],
  [/^(.+?) returns to (.+?)'s? (.+)!$/, (item, who, part) => `${thing(item)}は${arg(who)}の${arg(part)}に戻った！`],
  [/^Discovered (.+?) in '(\S+)' order$/, (category, order) => `発見した${translateInventoryCategory(category, "ja")}：${order}順`],
  [/^Discovered (.+?) in alphabetical order$/, (category) => `発見した${translateInventoryCategory(category, "ja")}：アルファベット順`],
  [/^You receive a faint telepathic message from (.+):$/, (who) => `${arg(who)}からのかすかなテレパシーを受け取った：`],
  [/^You find you must drop (.+)!$/, (item) => `${thing(item)}を落とさざるを得ない！`],
  [/^You see (.+?) dive under (.+)\.$/, (who, item) => `${arg(who)}が${thing(item)}の下に潜るのが見えた。`],
  // dungeon.c: the #overview and level teleport listings.
  [/^(.+?): (levels? \d+(?: to \d+)?|depth \d+)(?:, entrance (from below|from above|on \d+))?$/, (branch, levels, entrance) => {
    const range = levels.replace(/^levels? /, "").replace(" to ", "～").replace(/^depth /, "深さ");
    const way = !entrance ? "" : entrance === "from below" ? "、入口は下から" : entrance === "from above" ? "、入口は上から" : `、入口は${entrance.replace("on ", "")}階`;
    const name = branch.replace(/^The /, "");
    const located = translateGameLocation(name, "ja");
    return `${located !== name ? located : arg(branch)}：${range}階${way}`;
  }],
  [/^(.+?) catches (.+?) and burns!$/, (fire, item) => `${arg(fire)}が${thing(item)}に燃え移った！`],
  [/^(.+?)'s? wrapping smoulders( further)?!$/, (who, further) => `${arg(who)}の包帯が${further ? "さらに" : ""}くすぶった！`],
  [/^(.+?) is killed by the gas cloud!$/, (who) => `${arg(who)}はガスの雲で死んだ！`],
  // detect.c: findit() and reveal_terrain().
  [/^You reveal (.+)!$/, (list) => {
    const words = list.split(/,? and |, /).map((part) => {
      const one = /^(?:an?|\d+) (hidden monster|secret door|trap)s?$/.exec(part);
      if (!one) return "";
      const count = /^\d+/.exec(part)?.[0];
      const names: Readonly<Record<string, string>> = { "hidden monster": "隠れたモンスター", "secret door": "隠し扉", trap: "罠" };
      return `${names[one[1]]}${count ? `${count}個` : ""}`;
    });
    return words.every(Boolean) ? `${words.join("と")}をあらわにした！` : "";
  }],
  [/^(Swapping|Moving|Splitting|Collecting|Merging): ([A-Za-z]) - (.+)\.$/, (action, letter, item) => {
    const actions: Readonly<Record<string, string>> = { Swapping: "交換", Moving: "移動", Splitting: "分割", Collecting: "集約", Merging: "統合" };
    return `${actions[action]}：${letter} - ${thing(item)}。`;
  }],
  // pager.c gather_locs lists: "<17,6>   %  6 uncursed oranges".
  [/^<(\d+),(\d+)>\s+remembered text: "(.*)"$/, (x, y, text) => `<${x},${y}> 覚えている文字：「${text}」`],
  [/^<(\d+),(\d+)>\s+(\S)\s+(.+)$/, (x, y, symbol, what) => `<${x},${y}> ${symbol} ${describePlace(what)}`],
  [/^<(\d+),(\d+)>\s+(.+)$/, (x, y, what) => `<${x},${y}> ${describePlace(what)}`],
  // End of status highlight's title choices: "Chieftain" or "Chieftainess".
  [/^"([A-Z][^"]*)"(?: or "([A-Z][^"]*)")?$/, (first, second) => {
    const rank = (name: string) => translatePlayerRank(name, "ja");
    if (rank(first) === first) return "";
    return second && rank(second) !== rank(first) ? `「${rank(first)}」または「${rank(second)}」` : `「${rank(first)}」`;
  }],
  [/^(.+?) \(invalid target\)$/, (what) => `${describePlace(what)}（対象にできない）`],
  [/^(.+?), trapped in (?:a |an )?(.+)$/, (who, trap) => `${describePlace(who)}（${lookupNethack5SourceExact(trap) ?? arg(trap)}にかかっている）`],
  [/^'(.+?)' prefix has no effect for the (\S+) command\.$/, (prefix, command) => `「${prefix}」接頭辞は #${command} コマンドに効果がない。`],
  [/^What do you want to rub on the stones?\? (\[.*\])$/, (letters) => `石に何をこすりますか？ ${letters}`],
  [/^What do you want to add to the writing in the (.+?) here\?\s*(.*)$/, (place, text) => `ここの${describePlace(place)}の文字に何を書き足しますか？ ${text}`.trimEnd()],
  [/^You escape (?:a |an )?(.+)\.$/, (trap) => {
    const name = lookupNethack5SourceExact(trap);
    return name === undefined ? "" : `${name}を避けた。`;
  }],
  [/^You hear an? (.+?)(?: note)? squeak nearby\.$/, (note) => `近くで床板が${noteName(note)}の音できしむのが聞こえた。`],
  [/^You remember (?:that|this) as (.+)\.$/, (what) => `そこは${arg(what)}だったと覚えている。`],
  [/^(.+?) turns into (.+)!$/, (who, what) => `${arg(who)}は${arg(what)}に変わった！`],
  [/^Careful! (.+?) materializes on the floor!$/, (item) => `気をつけて！ ${thing(item)}が床の上に現れた！`],
  [/^You avoid stepping into the wall of (.+)\.$/, (what) => `${arg(what)}の壁に足を踏み入れないようにした。`],
  [/^You do not owe (.+?) anything\.$/, (who) => `${arg(who)}には何の借りもない。`],
  [/^(.+?) multiplies(?: from your heat)?!$/, (who) => `${arg(who)}が分裂した！`],
  [/^(.+?) wakes up!$/, (who) => `${arg(who)}が目を覚ました！`],
  [/^This (.+?) is too hard to (.+?) into\.$/, (what) => `この${describePlace(what)}は固くて掘れない。`],
  [/^You feel like (.+)!$/, (what) => `${arg(what)}になった気がする！`],
  [/^You dream that (.+)$/, (rest) => {
    const inner = presentGameMessage(`You ${rest.replace(/^you /, "")}`, "ja").text;
    return /^You /.test(inner) ? "" : `夢の中で：${inner}`;
  }],
  [/^But it reflects from (.+?)'s (.+)!$/, (who, part) => `だがそれは${arg(who)}の${arg(part)}で跳ね返った！`],
  [/^(.+?) steals (.+)!$/, (who, item) => `${arg(who)}は${thing(item)}を盗んだ！`],
  [/^(.+?) (is destroyed|is killed)!$/, (who, how) => `${arg(who)}は${how === "is killed" ? "殺された" : "破壊された"}！`],
  [/^(.+?) just misses!$/, (who) => `${arg(who)}の攻撃はかろうじて外れた！`],
  [/^(.+?) butts!$/, (who) => `${arg(who)}が頭突きした！`],
  [/^(.+?) hits (.+)\.$/, (who, target) => `${arg(who)}が${arg(target)}に攻撃を命中させた。`],
  [/^(.+?) misses (.+)\.$/, (who, target) => `${arg(who)}の攻撃は${arg(target)}に当たらなかった。`],
  [/^You don't have anything to dip (.+?) into\.$/, (item) => `${thing(item)}を浸すものを持っていない。`],
  [/^The design features (.+?) on an? (.+?) background\.$/, (motif, background) => {
    const shown = own(hawaiianDesigns, own(pluralMotifs, motif) ?? motif);
    const behind = own(hawaiianDesigns, background);
    return shown === undefined || behind === undefined ? "" : `${behind}背景に${shown}の柄が描かれている。`;
  }],
  [/^What do you want to (write|engrave|melt|burn|scratch|scribble) (?:in|on|into) the (.+?) here\?\s*(.*)$/, (verb, place, text) => {
    const verbs: Readonly<Record<string, string>> = { write: "書き", engrave: "刻み", melt: "溶かして書き", burn: "焼き付け", scratch: "削り", scribble: "書き" };
    return `ここの${describePlace(place)}に何を${verbs[verb]}ますか？ ${text}`.trimEnd();
  }],
  [/^Enter value for (\S+) threshold:$/, (field) => `${lookupNethack5SourceExact(field) ?? arg(field)}のしきい値を入力：`],
  [/^(?:OPTIONS=hilite_status: )(.+)$/, (rule) => `強調表示の設定：${hiliteRule(rule) ?? rule}`],
  [/^Choose (a color|attribute) for (?:conditions (\S+)|when (\S+) (increases|decreases)|when (\S+) is (.+)):$/, (what, condition, field, change, equal, value) => {
    const name = (key: string) => lookupNethack5SourceExact(key) ?? arg(key);
    const kind = what === "a color" ? "色" : "属性";
    if (condition) return `状態「${name(condition)}」の${kind}を選択：`;
    if (change) return `${name(field)}が${change === "increases" ? "増えた" : "減った"}ときの${kind}を選択：`;
    const threshold = /^(less than |more than )?(\d+%?)( or more| or less)?$/.exec(value);
    if (threshold) {
      const words: Readonly<Record<string, string>> = { "less than ": "未満", "more than ": "超", " or more": "以上", " or less": "以下" };
      return `${name(equal)}が${threshold[2]}${words[threshold[1] ?? threshold[3] ?? ""] ?? ""}のときの${kind}を選択：`;
    }
    return `${name(equal)}が${value}のときの${kind}を選択：`;
  }],
  [/^([a-zA-Z-]+\/[^/]+\/[a-zA-Z-]+(?:&[a-zA-Z]+)?)$/, (rule) => hiliteRule(rule) ?? ""],
  [/^cond_(\w+)\s*$/, (name) => (own(conditionOptions, name) === undefined ? "" : `cond_${name}（${conditionOptions[name]}）`)],
  // pager.c: what a symbol can be, and what this one is ("%        a piece of food (an apple)").
  [/^(\S)\s{2,}(.+?) \((.+)\)$/, (symbol, kinds, what) => {
    const kind = lookupNethack5SourceExact(kinds);
    if (kind === undefined) return "";
    const called = /^(.+) called (\S+)$/.exec(what);
    const hero = called && /^(\w+) (\w+)$/.exec(called[1]);
    const creature = called ? (hero && own(heroRaces, hero[1]) && own(heroRoles, hero[2]) ? `${heroRaces[hero[1]]}の${heroRoles[hero[2]]}` : arg(called[1])) : "";
    const shownThing = thing(what);
    return `${symbol}        ${kind}（${called ? `${creature}（${called[2]}）` : shownThing === what ? describePlace(what) : shownThing}）`;
  }],
  [/^(\S+) NetHack Version (\S+) (?:post-release|pre-release|prerelease|beta) - last build (.+?)(?: (\([0-9a-f]+,[^)]*\))\.?)?$/, (port, version, built, commit) => `${port} NetHack バージョン ${version}（最終ビルド ${built}）${commit ?? ""}`],
  // wizard.c cuss(): the Wizard's and the demons' taunts.
  [/^"(Hell shall soon claim thy remains,|I chortle at thee, thou pathetic|Prepare to die, thou|Resistance is useless,|Surrender or die, thou|There shall be no mercy, thou|Thou shalt repent of thy cunning,|Thou art as a flea to me,|Thou art doomed,|Thy fate is sealed,|Verily, thou shalt be one dead|Even now thy life force ebbs,|Relinquish the amulet,) ([^"]+)!"$/, (opening, target) => {
    const insult = own(insults, target) ?? target;
    const lines: Readonly<Record<string, string>> = {
      "Hell shall soon claim thy remains,": `地獄がまもなく汝の骸を奪うであろう、${insult}め！`, "I chortle at thee, thou pathetic": `笑わせるわ、哀れな${insult}め！`, "Prepare to die, thou": `死ぬ覚悟をせよ、${insult}め！`,
      "Resistance is useless,": `抵抗は無駄だ、${insult}め！`, "Surrender or die, thou": `降伏か死か選べ、${insult}め！`, "There shall be no mercy, thou": `慈悲はないぞ、${insult}め！`,
      "Thou shalt repent of thy cunning,": `その狡猾さを悔いるがよい、${insult}め！`, "Thou art as a flea to me,": `汝など我にはノミに等しい、${insult}め！`, "Thou art doomed,": `汝の運命は尽きた、${insult}め！`,
      "Thy fate is sealed,": `汝の運命は定まった、${insult}め！`, "Verily, thou shalt be one dead": `まことに、汝は死せる${insult}となろう！`, "Even now thy life force ebbs,": `今まさに汝の生命力は尽きようとしている、${insult}め！`,
      "Relinquish the amulet,": `魔除けを渡せ、${insult}め！`,
    };
    return `「${lines[opening]}」`;
  }],
  [/^"(?:Thy reckoning is at hand|Judgment hath been passed upon thee), ([^"]+)\."$/, (name) => `「${name}よ、汝の裁きの時が来た。」`],
  [/^"The great (.+) has sent me to make you pay for your sins!"$/, (god) => `「偉大なる${own(deityNames, god) ?? god}が汝の罪を償わせるため我を遣わした！」`],
  [/^"The wrath of (.+) is now upon you!"$/, (god) => `「${own(deityNames, god) ?? god}の怒りが今、汝に降りかかる！」`],
  [/^"Thou shalt be brought before (.+) for thy crimes!"$/, (god) => `「汝は罪ゆえに${own(deityNames, god) ?? god}の前に引き出されるであろう！」`],
  [/^"Thy life belongs to (.+) now!"$/, (god) => `「汝の命は今や${own(deityNames, god) ?? god}のものだ！」`],
  [/^"With (.+) as my witness, I shall strike thee down\."$/, (god) => `「${own(deityNames, god) ?? god}を証人として、汝を打ち倒そう。」`],
  // read.c: what a shirt or an apron says, ending the sentence with a period.
  [/^"([^"]+)"\.$/, (text) => {
    const inner = lookupNethack5SourceExact(text);
    return inner === undefined ? "" : `「${inner}」。`;
  }],
  [/^You turn into (?:an? )?(?:(male|female) )?(.+)!$/, (sex, form) => `${arg(`the ${form}`)}に変化した！`],
  [/^You are currently in (?:(?:male|female) )?(.+) form\.$/, (form) => `あなたは今${arg(`the ${form}`)}の姿だ。`],
  [/^That (.+?) is (an? .+)!$/, (what, really) => `その${thing(what)}は${arg(really)}だ！`],
  [/^Wait!\s+That (.+?) is really (.+)!$/, (what, really) => `待て！ その${arg(`the ${what}`)}の正体は${arg(really)}だ！`],
  [/^(.+?) burns to a crisp\.$/, (who) => `${arg(who)}はこんがり焼けた。`],
  [/^(.+?) tries to run away with your (.+)\.$/, (who, item) => `${arg(who)}はあなたの${thing(item)}を持って逃げようとした。`],
  [/^You are in the endgame, on the (.+)\.$/, (level) => `あなたは最終局面におり、${translateGameLocation(level, "ja")}にいる。`],
  [/^(?:(peaceful|tame) )?(.+) of (.+)$/, (attitude, creature, god) => {
    const shown = own(deityNames, god);
    if (shown === undefined) return "";
    const translated = translateMonsterName(`the ${creature} of ${god}`, "ja");
    return translated === `the ${creature} of ${god}` ? "" : `${attitude === "peaceful" ? "友好的な" : attitude === "tame" ? "飼いならされた" : ""}${translated}`;
  }],
  [/^(.+?) called (\S+), chained to a heavy iron ball$/, (who, name) => `${heroDescription(who)}（${name}）、重い鉄球につながれている`],
  [/^You were held by (.+?) \((\S+)\)\.$/, (who, where) => `${arg(who)}（${where.replace(/north/g, "北").replace(/south/g, "南").replace(/east/g, "東").replace(/west/g, "西")}）につかまれていた。`],
  [/^(.+?) swings itself around you!$/, (who) => `${arg(who)}があなたに巻きついた！`],
  // apply.c: a towel that makes things worse.
  [/^Your (.+?) (get slimy|are filthier than ever)!$/, (part, how) => `${arg(part)}が${how === "get slimy" ? "ぬるぬるになった" : "いっそう汚れた"}！`],
  [/^Yecch!\s+Your (.+?) (now has|has more) gunk on it!$/, (part, how) => `うえっ！ ${arg(part)}に${how === "now has" ? "" : "さらに"}汚れが付いた！`],
  // hack.c: pushing a boulder.
  [/^With (great|little) effort you move (.+)\.$/, (effort, what) => `${effort === "great" ? "やっとのことで" : "難なく"}${thing(what)}を動かした。`],
  [/^You swing (.+?), but the rubble has no place to go\.$/, (tool) => `${thing(tool.replace(/^your /, ""))}を振ったが、瓦礫の行き場がない。`],
  // trap.c: webs, pits and traps that catch the hero.
  [/^You (stumble into|flow through|tear through|burst through|are caught in|get stuck in|flounder in) (?:a|an|your|the) (?:spider )?web[!.]$/, (how) => {
    const ways: Readonly<Record<string, string>> = {
      "stumble into": "クモの巣に突っ込んだ", "flow through": "クモの巣をすり抜けた", "tear through": "クモの巣を引き裂いた", "burst through": "クモの巣を突き破った", "are caught in": "クモの巣に捕まった", "get stuck in": "クモの巣に絡まった", "flounder in": "クモの巣の中でもがいた",
    };
    return `${ways[how]}！`;
  }],
  [/^You carefully (step|move|climb) into the pit\.$/, () => "慎重に落とし穴へ入った。"],
  [/^You see (?:a|your) (spiked )?(pit|hole) below you\.$/, (spiked, what) => `足元に${spiked ? "棘の付いた" : ""}${what === "pit" ? "落とし穴" : "穴"}が見える。`],
  [/^You land on a set of sharp iron spikes!$/, () => "鋭い鉄の棘の上に落ちた！"],
  [/^You escape (?:a|an|your) (.+)\.$/, (trap) => `${lookupNethack5SourceExact(trap) ?? arg(trap)}を逃れた。`],
  [/^Air currents pull you down into (?:a|your) (.+)!$/, (what) => `気流に引かれて${lookupNethack5SourceExact(what) ?? arg(what)}に落ちた！`],
  [/^A bear trap closes on your (.+)!$/, (part) => `トラバサミがあなたの${limb(part)}を挟んだ！`],
  [/^You feel lighter, but your (.+) is still chained to the (floor|ground)\.$/, (part, place) => `体は軽くなったが、${limb(part)}はまだ${place === "floor" ? "床" : "地面"}につながれている。`],
  [/^You float up slightly, but you are still stuck in the (.+)\.$/, (what) => `少し浮き上がったが、まだ${lookupNethack5SourceExact(what) ?? arg(what)}に捕まっている。`],
  [/^You float up slightly, but your (.+) is still stuck\.$/, (part) => `少し浮き上がったが、${limb(part)}はまだ挟まれている。`],
  [/^You feel a little more (obvious|hidden) now\.$/, (how) => `少し${how === "obvious" ? "目立つ" : "目立たなくなった"}気がする。`],
  [/^That (.+?) was not trapped\.$/, (what) => `その${thing(what)}に罠はなかった。`],
  [/^(.+?) protects your (.+)\.$/, (what, part) => `${thing(what.replace(/^Your /, ""))}が${limb(part)}を守った。`],
  // wield.c: splitting a wielded stack for the quiver.
  [/^You are wielding (\d+) (.+?)\.\s+Ready (\d+) of them\?$/, (count, what, ready) => `${thing(what)}を${count}個構えている。そのうち${ready}個を準備しますか？`],
  [/^(Your alternate weapon is|You are dual wielding) (\d+) (.+?)\.\s+Ready (\d+) of them\?$/, (who, count, what, ready) => `${who === "Your alternate weapon is" ? "予備の武器は" : "二刀流で"}${thing(what)}${count}個だ。そのうち${ready}個を準備しますか？`],
  [/^(?:Your )?(.+?) remains? wielded\.$/, (what) => `${thing(what)}を構えたままだ。`],
  // pickup.c: a locked box.
  [/^Hmmm, (.+?) turns out to be locked\.$/, (box) => `おや、${thing(box)}には鍵がかかっていた。`],
  // pray.c: a god's voice, with what it says in its own sentence.
  [/^The voice of (.+?) (booms out|booms|rings out|thunders|resounds|roars):\s+(.+)$/, (god, how, words) => {
    const said = lookupNethack5SourceExact(words) ?? lookupNethack5SourceExact(`"${words}"`);
    return said === undefined ? "" : `${own(deityNames, god) ?? god}の声が響いた：「${said.replace(/^「|」$/g, "")}」`;
  }],
  // shk.c: returning to a shop, credit and the list price.
  [/^So, (.+?), you dare return to (\S+)'s (.+?)\?!$/, (name, keeper, shop) => `${name}よ、${keeper}の${shopType(shop)}によくも戻って来られたな！`],
  [/^The atmosphere at (\S+)'s (.+?) seems unwelcoming\.$/, (keeper, shop) => `${keeper}の${shopType(shop)}の雰囲気は歓迎的ではないようだ。`],
  [/^You have (\d+) (zorkmids?|gold pieces?) credit at (\S+)'s (.+?)\.$/, (amount, _unit, keeper, shop) => `${keeper}の${shopType(shop)}に${amount}ゾークミドの信用がある。`],
  [/^The list price of (.+?) is (\d+) (?:zorkmids?|gold pieces?)( each)?\.$/, (what, amount, each) => `${thing(what)}の定価は${each ? "1個" : ""}${amount}ゾークミドだ。`],
  // spell.c: the #spells menu.
  [/^Reordering spells; swap '(.)' with$/, (letter) => `呪文の並べ替え：「${letter}」と入れ替える呪文`],
  // getpos.c: the coordinate help.
  [/^map: upper-left: (<\d+,\d+>), lower-right: (<\d+,\d+>); column 0 unused, off left edge$/, (from, to) => `マップ：左上 ${from}、右下 ${to}。0列目は使わず、左端の外にある`],
  [/^screen: upper-left: (\[\d+,\d+\]), lower-right: (\[\d+,\d+\]); column 80 is not used$/, (from, to) => `画面：左上 ${from}、右下 ${to}。80列目は使わない`],
  // sounds.c: what a monster says when it has nothing to say.
  [/^(.+?) (grunts|squeaks|burbles|gurgles|snarls|growls|hisses|roars|bellows|buzzes|squeals|screeches|neighs|wails|groans|lows|screams|whimpers|yelps|yowls|mews|whines|mumbles)\.$/, (who, sound) => {
    const sounds: Readonly<Record<string, string>> = {
      grunts: "うなった", squeaks: "キーキー鳴いた", burbles: "ぶつぶつ言った", gurgles: "ごぼごぼと音を立てた", snarls: "牙をむいてうなった", growls: "うなり声を上げた", hisses: "シューッと音を立てた", roars: "吠えた", bellows: "太い声で吠えた",
      buzzes: "ブーンと音を立てた", squeals: "キーッと鳴いた", screeches: "金切り声を上げた", neighs: "いなないた", wails: "泣き叫んだ", groans: "うめいた", lows: "モーと鳴いた", screams: "悲鳴を上げた", whimpers: "哀れっぽく鳴いた",
      yelps: "キャンと鳴いた", yowls: "ギャーと鳴いた", mews: "ニャーと鳴いた", whines: "クーンと鳴いた", mumbles: "もごもご言った",
    };
    return `${arg(who)}は${sounds[sound]}。`;
  }],
  // mhitu.c: a body part differs by form ("the left rear limb").
  [/^(.+?) brushes against your (.+)\.$/, (who, part) => `${arg(who)}があなたの${limb(part)}をかすめた。`],
  [/^(.+?) pricks your (.+)!$/, (who, part) => `${arg(who)}があなたの${limb(part)}を刺した！`],
  [/^Your (.+) is in no shape for kicking\.$/, (part) => `${limb(part)}は蹴れる状態ではない。`],
  // insight.c: how the gods regard the hero.
  [/^(.+?) (is|was) (extremely |very |)angry with you\.$/, (god, tense, how) => {
    const shown = own(deityNames, god);
    if (shown === undefined) return "";
    return `${shown}はあなたに${how === "extremely " ? "激怒して" : how === "very " ? "ひどく怒って" : "怒って"}${tense === "is" ? "いる" : "いた"}。`;
  }],
  [/^Your alignment (is|was) (-?\d+)\.$/, (tense, value) => `あなたの属性値は${value}${tense === "is" ? "だ" : "だった"}。`],
  [/^You are currently in (.+) form\.$/, (form) => `あなたは今${arg(`the ${form}`)}の姿だ。`],
  [/^You are actually an? (.+?), a level (\d+) (.+)\.$/, (rank, level, who) => `あなたの正体は${translatePlayerRank(rank, "ja")}、レベル${level}の${heroDescription(who)}だ。`],
  // dokick.c and friends: hallucinated or polymorphed forms read as names.
  [/^There is (.+?) here, tip it onto the (.+)\?$/, (item, place) => `ここに${thing(item)}がある。${place === "floor" ? "床" : place === "ground" ? "地面" : describePlace(place)}に中身を出しますか？`],
  [/^There is (.+?) here; force its lock\?$/, (item) => `ここに${thing(item)}がある。鍵をこじ開けますか？`],
  [/^Check (.+?) for a trap\?$/, (item) => `${thing(item)}に罠がないか調べますか？`],
  [/^Dip (.+?) into the (fountain|moat|pool of water|water|lava|sink)\?$/, (item, place) => {
    const places: Readonly<Record<string, string>> = { fountain: "泉", moat: "堀", "pool of water": "水たまり", water: "水", lava: "溶岩", sink: "流し台" };
    return `${thing(item)}を${places[place]}に浸しますか？`;
  }],
  [/^A gush of water hits (.+?)'s (left|right) (.+)!$/, (who, side, part) => `水が噴き出して${arg(who)}の${limb(`${side} ${part}`)}にかかった！`],
  [/^You find old loot: (\S) - (.+)\.$/, (letter, item) => `古い戦利品を見つけた：${letter} - ${thing(item)}`],
  [/^(Your )?(.+?) glows? with an? (.+?) aura\.$/, (your, item, color) => {
    const colors: Readonly<Record<string, string>> = { amber: "琥珀色の", "light blue": "淡い青の", black: "黒い", red: "赤い", silver: "銀色の", blue: "青い", "golden": "金色の" };
    return own(colors, color) === undefined ? "" : `${your ? "あなたの" : ""}${thing(item)}が${colors[color]}オーラを放った。`;
  }],
  [/^(.+?) scratches your (left|right) (boot|shoe)!$/, (who, side) => `${arg(who)}があなたの${side === "left" ? "左" : "右"}の靴を引っかいた！`],
  [/^You cannot release your (.+?) to take off (.+)\.$/, (weapon, armor) => `${thing(weapon)}を手放せないので${thing(armor)}を脱げない。`],
  [/^You cannot drop something welded to your (hand|hands)\.$/, () => "手に貼りついたものは置けない。"],
  [/^What do you want to rub (.+?) on\? (\[.*\])$/, (item, letters) => `${thing(item)}を何にこすりつけますか？ ${letters}`],
  [/^The blast of (.+?) vanishes into the aether!$/, (what) => `${breathName(what)}の爆風は虚空に消えた！`],
  [/^(?:Your )?(wet|moist) towel \((\d+)\) gets wetter\.$/, (state, count) => `${state === "wet" ? "濡れた" : "湿った"}タオル（${count}）はさらに濡れた。`],
  [/^You have changed form (\d+) times?\.$/, (count) => `${count}回、姿を変えた。`],
  [/^You are aware of the presence of (.+)\.$/, (what) => `${what.split(/,? and |, /).map((kind) => lookupNethack5SourceExact(kind) ?? arg(kind)).join("と")}の存在が分かる。`],
  [/^What class of monsters do you want to genocide\?/, () => "どの分類のモンスターを抹殺しますか？ [分類を表す記号または名前を入力、'?' で確認]"],
  [/^(\S.*?)'s? ghost$/, (name) => `${name}の幽霊`],
  // pager.c and invent.c: one row of a list that goes on, "a tiger corpse,".
  [/^(an? .+),$/, (item) => {
    const shown = thing(item);
    return shown === item ? "" : `${shown}、`;
  }],
  [/^What do you want to call level (\d+), (.+)\?$/, (level, branch) => {
    const located = translateGameLocation(branch.replace(/^the /, "The "), "ja");
    return `${located !== branch ? located : arg(branch)}の${level}階を何と呼びますか？`;
  }],
  [/^Here the High Temple of (.+) is located\.$/, (god) => `ここに${own(deityNames, god) ?? god}の高等神殿があります。`],
  [/^Replace annotation "(.*)" with\?$/, (note) => `注釈「${note}」を何に置き換えますか？`],
  [/^Endgame prerequisite: (\S) - (.+)\.$/, (letter, item) => `最終局面の必要条件：${letter} - ${thing(item)}`],
  [/^You have hit with a wielded (.+?) (\d+) times?\.$/, (weapon, count) => `${translateSkillName(weapon, "ja")}を構えて${count}回攻撃した。`],
  [/^You have read items or engraved (\d+) times?\.$/, (count) => `${count}回、物を読むか刻むかした。`],
  [/^You will (.+) when hitting them \(next (?:(\d+) hits|hit only)\)\.$/, (effect, count) => `次に${count ? `${count}回` : "1回"}攻撃すると${effect === "confuse them" ? "相手を混乱させる" : arg(effect)}。`],
  [/^(Plane of (?:Air|Earth|Fire|Water)|Astral Plane):((?: \[\w+\])?)(?: "(.*)")?( <- You are here\.)?$/, (level, code, note, here) =>
    `${translateGameLocation(level, "ja")}：${code.trim()}${note ? `「${note}」` : ""}${here ? " ← 現在地" : ""}`],
  [/^(\* )(One way stair|Stair|Portal|Connection|Ladder|Branch) to (?:The )?(.+): (\d+)$/, (star, kind, branch, level) => {
    const kinds: Readonly<Record<string, string>> = { "One way stair": "一方通行の階段", Stair: "階段", Portal: "ポータル", Connection: "接続", Ladder: "はしご", Branch: "分岐" };
    const located = translateGameLocation(branch, "ja");
    return `${star}${located !== branch ? located : arg(branch)}への${kinds[kind]}：${level}階`;
  }],
  [/^(\s*)(.+?)\s+(Restricted|Unskilled|Basic|Skilled|Expert|Master|Grand Master)\s+(\d+\(\s*\d+\))$/, (indent, skill, level, training) => {
    const levels: Readonly<Record<string, string>> = { Restricted: "制限", Unskilled: "未熟", Basic: "基本", Skilled: "熟練", Expert: "達人", Master: "師範", "Grand Master": "大師範" };
    const name = translateSkillName(skill, "ja");
    return name === skill ? "" : `${indent}${name} ${levels[level]} ${training}`;
  }],
  [/^(.+?) \[\]$/, (item) => {
    const shown = translateInventoryItem(item, "ja");
    return shown === item ? "" : shown;
  }],
  [/^Oops!\s+(.+?) (?:slips away from you|materializes away from you)!$/, (item) => `おっと！ ${thing(item)}が手から離れた！`],
  [/^Oops!\s+The (.+?) drop to the floor!$/, (items) => `おっと！ ${thing(items)}が床に落ちた！`],
  [/^Being blind, you cannot read the formula on (.+)\.$/, (book) => `目が見えないので、${thing(book)}の呪文は読めない。`],
  [/^Both of (.+?) boil and explode!$/, (items) => `${thing(items)}の両方が沸騰して爆発した！`],
  [/^Both of (.+?) catch fire and burn!$/, (items) => `${thing(items)}の両方が燃え上がった！`],
  [/^Some (.+?) spills out\.$/, (what) => `${arg(what)}がこぼれ出た。`],
  [/^(.+?) \(on (left|right) (.+)\)$/, (item, side, part) => {
    const shown = translateInventoryItem(item, "ja");
    return shown === item ? "" : `${shown}（${side === "left" ? "左" : "右"}の${limb(part)}に着用）`;
  }],
  [/^You are held by (.+?) \((\S+)\)\.$/, (who, where) => `${arg(who)}（${where.replace(/north/g, "北").replace(/south/g, "南").replace(/east/g, "東").replace(/west/g, "西")}）につかまれている。`],
  // options.c: a row of #optionsfull's compound options.
  [/^`([^']+)'\s+- (.+?)([,.])$/, (name, description, end) => {
    const translated = lookupNethack5SourceExact(description);
    return translated === undefined ? "" : `\`${name}' - ${translated}${end === "," ? "、" : "。"}`;
  }],
  [/^(\S+)\s+\[(.*)\]\s+\(for autopickup\)$/, (name, value) => `${name} [${value}]（自動拾い用）`],
  [/^Set options as OPTIONS=<options> in (\S+)$/, (file) => `オプションは ${file} に OPTIONS=<options> の形で設定するか、`],
  [/^or use `NETHACKOPTIONS="<options>"' in your environment$/, () => "環境変数 NETHACKOPTIONS=\"<options>\" を使うか、"],
  [/^an? (Archeologist|Barbarian|Caveman|Cavewoman|Healer|Knight|Monk|Priest|Priestess|Rogue|Ranger|Samurai|Tourist|Valkyrie|Wizard)$/, (role) => own(heroRoles, role.toLowerCase()) ?? ""],
  [/^(\s*)(.+?)\s+\[(Restricted|Unskilled|Basic|Skilled|Expert|Master|Grand Master)\]$/, (indent, skill, level) => {
    const levels: Readonly<Record<string, string>> = { Restricted: "制限", Unskilled: "未熟", Basic: "基本", Skilled: "熟練", Expert: "達人", Master: "師範", "Grand Master": "大師範" };
    const name = translateSkillName(skill, "ja");
    return name === skill ? "" : `${indent}${name} [${levels[level]}]`;
  }],
  // potion.c: tasting a potion of fruit juice or see invisible while sick.
  [/^\(But in fact it was (biologically contaminated )?(.+) juice\.\)$/, (dirty, fruit) => `（実は${dirty ? "生物学的に汚染された" : ""}${arg(fruit)}のジュースだった）`],
  [/^"Yendorian Express - (Copper|Silver|Gold|Mithril|Platinum) Card"$/, (kind) => {
    const kinds: Readonly<Record<string, string>> = { Copper: "カッパー", Silver: "シルバー", Gold: "ゴールド", Mithril: "ミスリル", Platinum: "プラチナ" };
    return `「イェンダー・エクスプレス ${kinds[kind]}カード」`;
  }],
  [/^(.+?) is blinded by (.+)\.$/, (who, item) => `${arg(who)}は${arg(item)}で目が見えなくなった。`],
  [/^Really step onto that (.+)\?$/, (trap) => `本当にその${lookupNethack5SourceExact(trap) ?? arg(trap)}に足を踏み入れますか？`],
  [/^(.+?) is caught in the (.+)!$/, (who, what) => `${arg(who)}は${what === "magical blast" ? "魔法の爆発" : what === "burning oil" ? "燃える油" : what === "ball of cold" ? "冷気の球" : what === "ball of fire" ? "火の球" : arg(what)}に巻き込まれた！`],
  [/^What do you want to call level (\d+), (.+)\?$/, (level, branch) => `${arg(branch)}の${level}階を何と呼びますか？`],
  [/^What do you want to dip (.+?) into\? (\[.*\])$/, (item, letters) => `${thing(item)}を何に浸しますか？ ${letters}`],
  [/^(.+?), your life force is running out\.$/, (name) => `${arg(name)}よ、生命力が尽きかけている。`],
  [/^You are blasted by (.+?)'s power!$/, (item) => `${thing(item)}の力に打ちのめされた！`],
  // mthrowu.c: a volley ("the 2nd arrow").
  [/^You are hit by the (\d+)(?:st|nd|rd|th) (.+?)[!.]$/, (order, item) => `${order}本目の${thing(item)}が当たった！`],
  [/^The (\d+)(?:st|nd|rd|th) (.+?) (hits|misses) (.+)\.$/, (order, item, verb, who) =>
    `${order}本目の${thing(item)}は${arg(who)}に${verb === "hits" ? "当たった" : "当たらなかった"}。`],
  [/^Someone shouts "(.+)"$/, (words) => `誰かが「${arg(words)}」と叫んだ。`],
  [/^(.+?) remains? as secondary (.+)\.$/, (item) => `${thing(item)}は予備のままだ。`],
  [/^That statue is (.+)!$/, (who) => `その像は${arg(who)}だ！`],
  [/^There (?:is|are) (.+?) here, but you cannot lift any more\.$/, (item) => `ここに${thing(item)}があるが、これ以上持てない。`],
  [/^You relinquish (.+?) and receive (.+?) in compensation\.$/, (item, gold) => `${thing(item)}を手放し、補償として${arg(gold)}を受け取った。`],
  [/^You (try to feel|look around to see) what is lying in (.+?)'s interior\.$/, (how, who) => `${arg(who)}の体内に何があるか${how === "try to feel" ? "手探りした" : "見回した"}。`],
  [/^Contents of (.+?)'s interior:$/, (who) => `${arg(who)}の体内にある物：`],
  [/^(.+?) passes harmlessly through (.+)\.$/, (what, who) => `${what === "Your attack" ? "攻撃" : thing(what)}は${arg(who)}を素通りした。`],
  [/^You avoid stepping into the (.+)\.$/, (what) => `${lookupNethack5SourceExact(what) ?? arg(what)}に足を踏み入れないようにした。`],
  [/^You get expelled from (.+?) in a (blast of frost|shower of sparks|ball of fire)!$/, (who, how) => {
    const ways: Readonly<Record<string, string>> = { "blast of frost": "冷気とともに", "shower of sparks": "火花を散らしながら", "ball of fire": "火の球とともに" };
    return `${ways[how]}${arg(who)}から吐き出された！`;
  }],
  [/^You are held by (.+?) \((\S+)\)\.$/, (who, way) => {
    const ways: Readonly<Record<string, string>> = { north: "北", south: "南", east: "東", west: "西", northeast: "北東", northwest: "北西", southeast: "南東", southwest: "南西" };
    return `${arg(who)}（${ways[way] ?? way}）につかまれている。`;
  }],
  [/^You (are|were) wielding (.+)\.$/, (tense, item) => `${thing(item)}を構えて${tense === "are" ? "いる" : "いた"}。`],
  [/^'(\S+)' option toggled (on|off)\.$/, (option, state) => `${option} オプションを${state === "on" ? "オン" : "オフ"}にした。`],
  [/^'(\S+)' is still "(.+)"\.$/, (option, value) => `${option} は「${value}」のままだ。`],
  [/^Really step into that (.+)\?$/, (trap) => `本当にその${lookupNethack5SourceExact(trap) ?? arg(trap)}に踏み込みますか？`],
  [/^Overwrite config file (.+)\? \[yes\|n\] \(n\)$/, (file) => `設定ファイル ${file} を上書きしますか？ [yes|n] (n)`],
  [/^In what direction do you want to chop\? (\[.*\])$/, (keys) => `どの方向に切りますか？ ${keys}`],
  [/^(Shoot|Throw|Dip something into|Quaff \(drink\)|Drop) (one of these|this|them|this item|one of these potions|these|this stack)(?: with your wielded (.+?))?( \(same as 'f'\))?$/, (verb, which, weapon, same) => {
    const verbs: Readonly<Record<string, string>> = { Shoot: "撃つ", Throw: "投げる", "Dip something into": "に何かを浸す", "Quaff (drink)": "を飲む", Drop: "を置く" };
    const object = which.startsWith("one of these") ? "これを1つ" : which === "them" ? "これらを" : "これを";
    const usage = weapon ? `構えた${thing(weapon)}で` : "";
    const verbText = verbs[verb];
    return `${usage}${verbText.startsWith("に") || verbText.startsWith("を") ? `これ${verbText}` : `${object}${verbText}`}${same ? "（「f」と同じ）" : ""}`;
  }],
  [/^Engrave on the (.+) with (?:this item|one of these items)$/, (place) => `このアイテムで${lookupNethack5SourceExact(place) ?? arg(place)}に刻む`],
  [/^Toggle two-weapon combat (on|off)$/, (state) => `二刀流を${state === "on" ? "オン" : "オフ"}にする`],
  [/^Pick up (.+)$/, (item) => `${thing(item)}を拾う`],
  // options.c, botl.c: the status highlight menus.
  [/^(\S+)\s+\((\d+) defined\)$/, (field, count) => `${lookupNethack5SourceExact(field) ?? arg(field)}（${count}件設定）`],
  [/^status (highlight rules|condition fields)\s+\[\((\d+) currently set\)\]$/, (what, count) =>
    `${what === "highlight rules" ? "ステータス強調のルール" : "状態の項目"} ［現在 ${count} 件設定］`],
  [/^(\S+) (value changes|text match)$/, (field, kind) => `${lookupNethack5SourceExact(field) ?? arg(field)}の${kind === "text match" ? "文字列一致" : "値の変化"}`],
  [/^Always highlight (\S+)$/, (field) => `常に${lookupNethack5SourceExact(field) ?? arg(field)}を強調する`],
  [/^Select (\S+) field hilite behavior:$/, (field) => `${lookupNethack5SourceExact(field) ?? arg(field)}の強調方法を選択：`],
  [/^Select field (\S+) value:$/, (field) => `${lookupNethack5SourceExact(field) ?? arg(field)}の値を選択：`],
  [/^Current (\S+) hilites:$/, (field) => `現在の${lookupNethack5SourceExact(field) ?? arg(field)}の強調表示：`],
  [/^Choose (\S+) text value to match:$/, (field) => `一致させる${lookupNethack5SourceExact(field) ?? arg(field)}の文字列を選択：`],
  [/^Enter (\S+) text value to match:$/, (field) => `一致させる${lookupNethack5SourceExact(field) ?? arg(field)}の文字列を入力：`],
  [/^Enter (number|percentage) value for (\S+) threshold:$/, (kind, field) => `${lookupNethack5SourceExact(field) ?? arg(field)}のしきい値（${kind === "number" ? "数値" : "割合"}）を入力：`],
  [/^Choose (a color|attribute) (?:to always hilite (\S+)|for when (\S+) changes|for when (\S+) is '(.+)'):$/, (what, always, changes, field, value) => {
    const name = (key: string) => lookupNethack5SourceExact(key) ?? arg(key);
    const kind = what === "a color" ? "色" : "属性";
    if (always) return `常に${name(always)}を強調する${kind}を選択：`;
    if (changes) return `${name(changes)}が変化したときの${kind}を選択：`;
    return `${name(field)}が「${value}」のときの${kind}を選択：`;
  }],
  // role.c: the character creation menu's summary rows.
  [/^(?:(\S+) the )?((?:<?(?:lawful|neutral|chaotic|male|female|human|elven|dwarven|gnomish|orcish|elf|dwarf|gnome|orc|role|race|gender|alignment|[A-Z][a-z]+(?:\/[A-Z][a-z]+)?)>? ?)+)$/, (name, words) => {
    const pieces: Readonly<Record<string, string>> = {
      lawful: "秩序", neutral: "中立", chaotic: "混沌", male: "男性", female: "女性", human: "人間", elven: "エルフ", dwarven: "ドワーフ", gnomish: "ノーム", orcish: "オーク",
      elf: "エルフ", dwarf: "ドワーフ", gnome: "ノーム", orc: "オーク",
      "<role>": "<職業>", "<race>": "<種族>", "<gender>": "<性別>", "<alignment>": "<属性>",
    };
    const list = words.trim().split(" ");
    if (list.length < 2 || !list.some((word) => word.startsWith("<") || own(pieces, word))) return "";
    const translated = list.map((word) => own(pieces, word) ?? word.split("/").map((role) => own(heroRoles, role.toLowerCase()) ?? "").join("・"));
    return translated.every(Boolean) ? `${name ? `${name}：` : ""}${translated.join(" ")}` : "";
  }],
  [/^\s*(role|race|filter) forces (lawful|neutral|chaotic|male|female|human|elf|dwarf|gnome|orc|gender|alignment|race|role)$/, (who, value) => {
    const values: Readonly<Record<string, string>> = { lawful: "秩序", neutral: "中立", chaotic: "混沌", male: "男性", female: "女性", human: "人間", elf: "エルフ", dwarf: "ドワーフ", gnome: "ノーム", orc: "オーク", gender: "性別", alignment: "属性", race: "種族", role: "職業" };
    return `${who === "role" ? "職業" : who === "race" ? "種族" : "絞り込み"}により${values[value]}に固定`;
  }],
  [/^(.+?) embedded in stone$/, (item) => `石に埋まった${thing(item.replace(/^some /, ""))}`],
  // zap.c: a ray when hallucinating ("the blast of gravy").
  [/^You turn into (.+)!$/, (what) => `${arg(what)}に変化した！`],
  // dungeon.c #overview: connections between branches.
  [/^(One way stair|Stair|Portal|Connection|Ladder|Branch) to (?:The )?(.+): (\d+)$/, (kind, branch, level) => {
    const kinds: Readonly<Record<string, string>> = { "One way stair": "一方通行の階段", Stair: "階段", Portal: "ポータル", Connection: "接続", Ladder: "はしご", Branch: "分岐" };
    const located = translateGameLocation(branch, "ja");
    return `${located !== branch ? located : arg(branch)}への${kinds[kind]}：${level}階`;
  }],
  [/^You are in the endgame, on the (.+)\.$/, (plane) => {
    const located = translateGameLocation(plane, "ja");
    return `あなたは最終局面におり、${located !== plane ? located : arg(plane)}にいる。`;
  }],
  [/^You (have been|were) killed (once|twice|thrice|\d+ times)\.$/, (tense, count) => {
    const counts: Readonly<Record<string, string>> = { once: "1回", twice: "2回", thrice: "3回" };
    return `あなたは${counts[count] ?? count.replace(" times", "回")}殺された${tense === "were" ? "ことがあった" : "ことがある"}。`;
  }],
  [/^You started out (male|female|neuter)\.$/, (sex) => `あなたは${{ male: "男性", female: "女性", neuter: "中性" }[sex]}として冒険を始めた。`],
  [/^(.+?) is angry with you\.$/, (god) => `${arg(god)}はあなたに怒っている。`],
  [/^You sense (a gas cloud|some gas clouds) dissipate\.$/, () => "ガスの雲が消えていくのを感じた。"],
  [/^What do you want to dip into (.+?)\? (\[.*\])$/, (item, letters) => `${thing(item)}に何を浸しますか？ ${letters}`],
  [/^(.+?), (asleep|can't move|holding you|held by you|digesting you|swallowing you|engulfing you|carrying you|in a cloud of (?:vapor|poison gas|gas))$/, (who, state) => {
    const states: Readonly<Record<string, string>> = {
      asleep: "眠っている", "can't move": "動けない", "holding you": "あなたをつかんでいる", "held by you": "あなたがつかんでいる", "digesting you": "あなたを消化中", "swallowing you": "あなたを飲み込んでいる",
      "engulfing you": "あなたを包み込んでいる", "carrying you": "あなたを乗せている", "in a cloud of vapor": "蒸気の雲の中", "in a cloud of poison gas": "毒ガスの雲の中", "in a cloud of gas": "ガスの雲の中",
    };
    return `${describePlace(who)}（${states[state]}）`;
  }],
  // detect.c.
  [/^You detect (\d+)( other)? unseen monsters!$/, (count, other) => `${other ? "他に" : ""}見えないモンスターを${count}匹探知した！`],
  [/^You detect an?( other)? unseen monster!$/, (other) => `${other ? "他に" : ""}見えないモンスターを探知した！`],
  // iactions.c: the item action menu.
  [/^Name this specific (.+)$/, (item) => `この${thing(item)}に名前を付ける`],
  [/^Name this stack of (.+)$/, (item) => `この${thing(item)}の束に名前を付ける`],
  [/^Rename or un-name this specific (.+)$/, (item) => `この${thing(item)}の名前を変更または解除する`],
  [/^Rename or un-name this stack of (.+)$/, (item) => `この${thing(item)}の束の名前を変更または解除する`],
  [/^Call the type for (.+)$/, (item) => `${thing(item)}の種類に呼び名を付ける`],
  [/^Re-call or un-call the type for (.+)$/, (item) => `${thing(item)}の種類の呼び名を変更または解除する`],
  [/^Look up information about (.+)$/, (item) => `${item === "these" || item === "this" ? "これ" : thing(item)}について調べる`],
  [/^(Rub|Drop|Remove) this (.+)$/, (verb, item) => `この${thing(item)}${{ Rub: "をこする", Drop: "を置く", Remove: "を外す" }[verb as "Rub"]}`],
  [/^Wield this (.+) as your weapon$/, (item) => `この${thing(item)}を武器として構える`],
  [/^Quiver this (.+) for easy (.+) with 'f'ire$/, (item, action) => `この${thing(item)}を矢筒に入れ、「f」で${action === "throwing" ? "投げ" : "撃て"}るようにする`],
  [/^Wield '-' to un-wield (.+)$/, () => "「-」を構えて武器を手放す"],
  [/^Quiver '-' to un-ready (.+)$/, () => "「-」を矢筒に入れて準備を解く"],
  [/^Engrave on the (.+) with this item$/, (place) => `このアイテムで${arg(place)}に刻む`],
  [/^Write on the (.+) with (?:this item|one of these items)$/, (place) => `このアイテムで${arg(place)}に書く`],
  [/^Just picked up: (.+)$/, (item) => `直前に拾った物：${thing(item)}`],
  [/^(?:The )?(\S+?) aren't able to use two weapons at once\.$/, (roles) => {
    const singular = roles.toLowerCase().replace(/men$/, "man").replace(/(ess)es$|s$/, "$1");
    return `${own(heroRoles, singular) ?? arg(roles)}は二つの武器を同時に使えない。`;
  }],
  [/^Unavailable command '(.+)'\.$/, (command) => `「${command}」コマンドは使えない。`],
  [/^(Monsters|Objects|Traps|Engravings) currently shown near <(\d+),(\d+)>:$/, (what, x, y) => {
    const names: Readonly<Record<string, string>> = { Monsters: "モンスター", Objects: "アイテム", Traps: "罠", Engravings: "刻印" };
    return `<${x},${y}> の近くに表示されている${names[what]}：`;
  }],
  [/^Call (.+):$/, (item) => `${thing(item)}の呼び名：`],
  [/^(Light|Extinguish|Snuff) (this|these) (.+)$/, (verb, which, item) => {
    const verbs: Readonly<Record<string, string>> = { Light: "に火をつける", Extinguish: "の火を消す", Snuff: "の火を消す" };
    return `${which === "this" ? "この" : "これらの"}${item === "light source" ? "光源" : thing(item)}${verbs[verb]}`;
  }],
  [/^(Read|Study) this (.+)$/, (verb, item) => `この${thing(item)}を${verb === "Read" ? "読む" : "学ぶ"}`],
  [/^Open this (.+?) and eat the contents$/, (item) => `この${thing(item)}を開けて中身を食べる`],
  [/^Open (?:this tin|one of these tins) with your tin opener and eat the contents$/, () => "缶切りで缶詰を開けて中身を食べる"],
  [/^(take something out|put something in|take anything out|put anything in|both; take out, then put in|take out, then put in|both reversed; put in, then take out|put in, then take out|loot next container|done|do nothing)$/, (item) => lootMenu[item]],
  [/^You have (a little trouble|trouble|much trouble|extreme difficulty) (lifting|removing) ([A-Za-z$#]) - (.+?)\.$/, (level, action, letter, item) => {
    const degree: Readonly<Record<string, string>> = { "a little trouble": "少し苦労した", trouble: "苦労した", "much trouble": "かなり苦労した", "extreme difficulty": "非常に苦労した" };
    return `${letter} - ${thing(item)}を${action === "lifting" ? "持ち上げる" : "取り出す"}のに${degree[level]}。`;
  }],
  // Nymphs and other thieves (steal.c).
  [/^(.+?) stole (.+?)\.$/, (thief, item) => `${thief === "She" ? "彼女" : arg(thief)}は${thing(item)}を盗んだ。`],
  [/^(.+?) (disarms|removes|takes off) (?:your )?(.+?)\.$/, (thief, verb, item) => `${thief === "She" ? "彼女" : arg(thief)}はあなたの${thing(item)}${stealVerbs[verb]}。`],
  [/^(.+?) seduces you and (helps you to take|you take|you continue taking|you start taking) off your (.+?)\.$/, (thief, verb, armor) => {
    const beautiful = /^The beautiful (.+)$/.exec(thief);
    const who = thief === "She" ? "彼女" : beautiful ? `美しい${arg(`The ${beautiful[1]}`)}` : arg(thief);
    return `${who}に誘惑され、あなたは${thing(armor)}を${seduceVerbs[verb]}。`;
  }],
  [/^(.+?) charms you\.  You gladly (let her take|hand over|continue removing|start removing) your (.+?)\.$/, (thief, verb, armor) =>
    `${thief === "She" ? "彼女" : arg(thief)}に魅了され、あなたは${thing(armor)}を${charmVerbs[verb]}。`],
  // Position prompts (getpos.c).
  [/^Move cursor to (.+?):$/, (goal) => `カーソルを${own(goals, goal) ?? arg(goal)}に移動してください：`],
  // Scrolls (read.c).
  [/^As you (pronounce|cogitate) the formula on it, the scroll disappears\.$/, (verb) => `${verb === "pronounce" ? "呪文を唱える" : "呪文を思い浮かべる"}と、巻物は消えた。`],
  [/^What (class of monsters|type of monster) do you want to genocide\?(?: \[enter (.+)\])?$/, (kind, hint) => {
    const hints: Readonly<Record<string, string>> = {
      "the name of a type of monster, or '?'": "モンスターの種類の名前、または '?' を入力",
      "'?' to see previous genocides": "'?' でこれまでの抹殺を表示",
      "the symbol or name representing a class, or '?'": "分類を表す記号か名前、または '?' を入力",
    };
    return `${kind === "type of monster" ? "どの種類のモンスター" : "どの分類のモンスター"}を抹殺しますか？${hint ? ` [${own(hints, hint) ?? hint}]` : ""}`;
  }],
  [/^Such creatures (do not|no longer) exist in this world\.$/, (state) => `そのような生き物は${state === "do not" ? "この世界に存在しない" : "もはやこの世界に存在しない"}。`],
  [/^You hear (maniacal laughter|sad wailing) (in the distance|close by)\.$/, (sound, where) =>
    `${where === "close by" ? "すぐ近くで" : "遠くで"}${sound === "maniacal laughter" ? "狂ったような笑い声" : "悲しげな泣き声"}が聞こえた。`],
  [/^(Take out|Put in|Pick up|Drop|Tip|Loot|Sell|Identify) what type of (?:objects|items)\?$/, (action) => {
    const actions: Readonly<Record<string, string>> = {
      "Take out": "取り出しますか", "Put in": "入れますか", "Pick up": "拾いますか", Drop: "置きますか", Tip: "出しますか",
      Loot: "調べますか", Sell: "売りますか", Identify: "識別しますか",
    };
    return `どの種類の物を${actions[action]}？`;
  }],
  [/^What type of things do you want to take off\?$/, () => "どの種類の物を外しますか？"],
  // Glowing objects and hands (read.c).
  [/^(Your .+?|.+?'s .+?) (glows?|vibrates?)(?: (.+?))? for a (moment|while)\.$/, (what, verb, hue, length) => {
    const owner = /^Your (.+)$/.exec(what);
    const object = owner ? thing(owner[1]) : arg(what);
    const tint = hue === undefined ? "" : colorly(hue);
    if (tint === undefined) return "";
    const time = length === "moment" ? "一瞬" : "しばらく";
    return verb.startsWith("vibrate") ? `${object}が${time}震えた。` : `${object}が${time}${tint}光った。`;
  }],
  [/^Your (.+?) begins? to glow (.+?)\.$/, (part, hue) => {
    const tint = colorly(hue);
    return tint === undefined ? "" : `${thing(part)}が${tint}光り始めた。`;
  }],
  [/^Your (.+?) glows? (?:a|an even more) brilliant (.+?)\.$/, (part, hue) => {
    const tint = color(hue);
    return tint === undefined ? "" : `${thing(part)}がまばゆい${tint}光を放った。`;
  }],
  [/^Some (.+?) liquid flows from the faucet\.$/, (hue) => {
    const tint = hue === "odd" ? "奇妙な" : color(hue);
    return tint === undefined ? "" : `蛇口から${tint}液体が流れ出た。`;
  }],
  // Eating (eat.c).
  [/^Blecch!  (Rotten|Awful) (.+?)!$/, (kind, word) => `うえっ！ ${kind === "Rotten" ? "腐った" : "ひどい"}${own(foodWords, word) ?? word}だ！`],
  [/^My, this is a (yummy|primo) (.+?)!$/, (_word, fruit) => `まあ、なんておいしい${thing(fruit)}だ！`],
  // Skills (weapon.c).
  [/^You are now (more|most) skilled in (.+?)\.$/, (degree, skill) =>
    `${translateSkillName(skill, "ja")}の技能が${degree === "most" ? "最高段階まで" : ""}上達した。`],
  // Prayer and sacrifice (pray.c).
  [/^You feel that (.+?) is (well-pleased|pleased|satisfied|displeased|pleased as punch|ticklish|full|bummed)\.$/, (name, mood) => `${god(name)}は${moods[mood]}と感じた。`],
  [/^Your sacrifice is consumed in a (flash of light|plume of smoke|burst of flame)!$/, (kind) =>
    `捧げ物は${kind === "flash of light" ? "閃光" : kind === "plume of smoke" ? "立ち上る煙" : "燃え上がる炎"}に包まれて消え去った！`],
  // Traps (trap.c).
  [/^You (fall|dive|plunge) into (?:a|your) pit!$/, (verb) => `落とし穴に${verb === "fall" ? "落ちた" : "飛び込んだ"}！`],
  [/^You escape (?:a|an|your) (.+?)\.$/, (trap) => `${arg(trap)}を回避した。`],
  [/^A board beneath you squeaks (.+?) loudly\.$/, (sound) => `足元の床板が${note(sound)}で大きくきしんだ。`],
  [/^A board beneath you vibrates\.$/, () => "足元の床板が振動した。"],
  // Attribute changes (attrib.c adjattrib).
  [/^You feel (very )?(strong|smart|wise|agile|tough|charismatic|weak|stupid|foolish|clumsy|fragile|repulsive)!$/, (very, word) =>
    `${very ? "とても" : ""}${attributeWords[word]}気がする！`],
  // Pickup, wear, occupations, eating.
  [/^You have (a little trouble|trouble|much trouble|extreme difficulty) (lifting|removing) (.+?)\.  Continue\?$/, (level, action, item) => {
    const degree: Readonly<Record<string, string>> = { "a little trouble": "少し苦労する", trouble: "苦労する", "much trouble": "かなり苦労する", "extreme difficulty": "非常に苦労する" };
    return `${arg(item)}を${action === "lifting" ? "持ち上げる" : "取り出す"}のに${degree[level]}。続けますか？`;
  }],
  [/^You are now wearing (.+?)\.$/, (item) => `${arg(item)}を身に着けた。`],
  [/^You finish (eating|consuming) (.+?)\.$/, (verb, food) => `${arg(food)}を食べ終えた。`],
  [/^You (stop|continue|finish|resume) (.+?)\.$/, (verb, text) => {
    const action = occupation(text);
    if (action === undefined) return "";
    return `${action}のを${verb === "stop" ? "やめた" : verb === "finish" ? "終えた" : "再開した"}。`;
  }],
  [/^(This|The) (.+?) (tastes|is) (.+?)([.!])$/, (_det, food, _verb, taste, p) => {
    const t = own(tastes, taste);
    return t === undefined ? "" : `この${arg(food)}は${t}${mark(p)}`;
  }],
  [/^This (.+?) is (terrible|bland|delicious|grody|gnarly)([.!])$/, (food, taste, p) => `この${arg(food)}は${own(tastes, taste) ?? taste}${mark(p)}`],
];

// insight.c mstatusline()/ustatusline(), from a stethoscope or probing:
// "Status of the arch-lich (chaotic, medium):  Level 24  HP 42(92)  AC -6, fast."
const statusAlignments: Readonly<Record<string, string>> = {
  lawful: "秩序", neutral: "中立", chaotic: "混沌", unaligned: "無属性", unknown: "不明",
};
const statusSizes: Readonly<Record<string, string>> = {
  tiny: "極小", small: "小型", medium: "中型", large: "大型", huge: "巨大", gigantic: "超巨大",
};
// piousness(): the hero's alignment record, before the alignment word.
const statusPiety: Readonly<Record<string, string>> = {
  piously: "敬虔な", devoutly: "篤信の", fervently: "熱心な", stridently: "強硬な", haltingly: "ためらいがちな",
  nominally: "名ばかりの", insufficiently: "不十分な", strayed: "道を外れた", sinned: "罪を犯した", transgressed: "背信した",
};
const statusWords: Readonly<Record<string, string>> = {
  tame: "手なずけられている", peaceful: "友好的", "single segment": "体節1つ", shapechanger: "変化している", eating: "食事中",
  hiding: "隠れている", cancelled: "無力化されている", confused: "混乱している", blind: "目が見えない", stunned: "朦朧としている",
  asleep: "眠っている", "can't move": "動けない", meditating: "瞑想している", scared: "怯えている", trapped: "罠にかかっている",
  fast: "高速", slow: "低速", "very fast": "超高速", "[? speed]": "速度不明", invisible: "透明", "digesting you": "あなたを消化している",
  "swallowing you": "あなたを飲み込んでいる", "engulfing you": "あなたを包み込んでいる", "holding you": "あなたを捕まえている",
  "held by you": "あなたに捕まっている", "carrying you": "あなたを乗せている", "dying from food poisoning": "食中毒で死にかけている",
  "dying from illness": "病気で死にかけている", "dying from food poisoning and illness": "食中毒と病気で死にかけている",
  solidifying: "石化しつつある", "becoming slimy": "スライムになりつつある", "being strangled": "首を絞められている",
  nauseated: "吐き気がする", "covered by sticky goop": "ねばねばに覆われている", "sticky goop": "ねばねばに覆われている",
  concealed: "隠れている", disguised: "変装している",
};
for (const table of [statusAlignments, statusSizes, statusPiety, statusWords]) Object.setPrototypeOf(table, null);

const statusInfo = (item: string): string | undefined => {
  const word = own(statusWords, item);
  if (word !== undefined) return word;
  let m = /^(\d+)(?:st|nd|rd|th) of (\d+) segments$/.exec(item);
  if (m) return `全${m[2]}節中${m[1]}節目`;
  m = /^injured (.+)$/.exec(item);
  if (m) return `${arg(m[1])}を負傷している`;
  m = /^slippery (.+)$/.exec(item);
  if (m) return `${arg(m[1])}が滑りやすい`;
  m = /^(mimicking|masquerading as|hiding under) (.+)$/.exec(item);
  if (m) return m[1] === "hiding under" ? `${arg(m[2])}の下に隠れている` : `${arg(m[2])}に化けている`;
  m = /^chained to (.+)$/.exec(item);
  if (m) return `${arg(m[1])}につながれている`;
  m = /^in a cloud of (poison gas|vapor)$/.exec(item);
  if (m) return m[1] === "vapor" ? "蒸気の雲の中にいる" : "毒ガスの雲の中にいる";
  m = /^(being digested by|held by|holding) (.+)$/.exec(item);
  if (m) {
    const who = arg(m[2]);
    return m[1] === "holding" ? `${who}を捕まえている` : m[1] === "held by" ? `${who}に捕まっている` : `${who}に消化されている`;
  }
  return undefined;
};

const statusLine = (who: string, kind: string, level: string, hp: string, hpmax: string, ac: string, rest: string): string => {
  // A monster has "(alignment, size)"; the hero has "(piety alignment)".
  const monster = /^(\w+), (\w+)$/.exec(kind);
  let kindJa: string | undefined;
  if (monster) {
    const alignment = own(statusAlignments, monster[1]);
    const size = own(statusSizes, monster[2]);
    kindJa = alignment && size ? `${alignment}、${size}` : undefined;
  } else {
    const hero = /^(?:(\w+) )?(\w+)$/.exec(kind);
    const piety = hero?.[1] ? own(statusPiety, hero[1]) : "";
    const alignment = hero ? own(statusAlignments, hero[2]) : undefined;
    kindJa = piety !== undefined && alignment ? `${piety}${alignment}` : undefined;
  }
  const items = rest ? rest.replace(/^, /, "").split(", ").map(statusInfo) : [];
  if (kindJa === undefined || items.some((item) => item === undefined)) return "";
  const name = monster ? arg(who) : who;
  return `${name}の状態（${kindJa}）：レベル${level} HP ${hp}(${hpmax}) AC ${ac}${items.map((item) => `、${item}`).join("")}。`;
};

// apply.c use_magic_whistle(), once the whistle is known: "Two creatures
// shift locations and your large dog appears." (clauses for pets that moved,
// came into view, or went out of view).
const whistleCounts: Readonly<Record<string, string>> = {
  two: "2匹", three: "3匹", four: "4匹", several: "数匹", many: "多く",
};
Object.setPrototypeOf(whistleCounts, null);
const whistleVerbs = {
  shift: ["場所を移り", "場所を移った"], appear: ["現われ", "現われた"], disappear: ["消え", "消えた"],
} as const;
const whistleClause = (clause: string): readonly [string, keyof typeof whistleVerbs] | undefined => {
  const many = /^(\w+) (creatures|other creatures|others) (shift locations|appear|disappear)$/i.exec(clause);
  if (many) {
    const count = own(whistleCounts, many[1].toLowerCase());
    if (count === undefined) return undefined;
    const who = many[2] === "creatures" ? `${count}の生き物` : `ほかの${count}`;
    return [who, many[3].startsWith("shift") ? "shift" : (many[3] as "appear" | "disappear")];
  }
  const one = /^(.+?) (shifts location|appears|disappears)$/.exec(clause);
  if (!one) return undefined;
  const pet = arg(one[1]);
  if (/[A-Za-z]/.test(pet)) return undefined;
  return [pet, one[2] === "shifts location" ? "shift" : one[2] === "appears" ? "appear" : "disappear"];
};
const whistleMessage = (body: string): string => {
  const clauses = body.split(/,? and |, /).map(whistleClause);
  if (clauses.length === 0 || clauses.some((c) => c === undefined)) return "";
  return clauses
    .map((c, i) => `${c![0]}が${whistleVerbs[c![1]][i === clauses.length - 1 ? 1 : 0]}`)
    .join("、") + "。";
};

// pray.c godvoice() and similar: "The voice of Anu thunders: "Thou hast
// angered me."" -- the head and the quote are separate curated messages.
const headAndQuote = (head: string, quote: string): string => {
  const headJa = presentGameMessage(`${head}:`, "ja").text;
  const quoteJa = presentGameMessage(`"${quote}"`, "ja").text;
  if (/[A-Za-z]{2,}/.test(headJa) || /[A-Za-z]{2,}/.test(quoteJa)) return "";
  return `${headJa}${quoteJa}`;
};

// insight.c weapon skill lines. skill_level_name() gives "grand-master"; the
// skill table says "grand master".
const skillLevel = (level: string): string => translateSkillName(level.replace("-", " "), "ja");
const skillList = (list: string): string => list
  .split(/, and | and also with |, /)
  .map((skill) => (skill === "two weapons" ? "二刀流" : translateSkillName(skill, "ja")))
  .join("と");
const limitedEnding = (verb: string, also: string | undefined): string =>
  `${also ? "同様に" : ""}制限されてい${verb === "was" ? "た" : "る"}。`;

const directions: Readonly<Record<string, string>> = {
  north: "北", south: "南", east: "東", west: "西",
  northeast: "北東", northwest: "北西", southeast: "南東", southwest: "南西",
  up: "上", down: "下",
};
const loadTrouble: Readonly<Record<string, string>> = {
  "a little trouble": "少し苦労した", trouble: "苦労した", "much trouble": "かなり苦労した", "extreme difficulty": "ひどく苦労した",
};
// pickup.c prinv() with the load prefix: the item keeps its inventory letter.
const lettered = (item: string): string => {
  const letter = /^(\S) - (.+)$/.exec(item);
  return letter ? `${letter[1]} - ${arg(letter[2]!)}` : arg(item);
};
const spellName = (name: string): string => translateSpellName(name, "ja");

const statusAndWhistleTemplates: readonly Template[] = [
  [/^Your skill in (.+?) (is|was) (also )?limited by being (.+?) with two weapons\.$/, (skill, verb, also, level) =>
    `${translateSkillName(skill, "ja")}の技能は、二刀流が${skillLevel(level)}であるため${limitedEnding(verb, also)}`],
  [/^Your two weapon skill (is|was) (also )?limited by (?:being (.+?)|having no skill) with (.+?)\.$/, (verb, also, level, skill) =>
    `二刀流の技能は、${translateSkillName(skill, "ja")}が${level ? skillLevel(level) : "技能なし"}であるため${limitedEnding(verb, also)}`],
  [/^You (?:also )?(?:have|had) no skill (?:with|in) (.+?)( and two weapons)?\.$/, (skill, two) =>
    `あなたには${translateSkillName(skill, "ja")}${two ? "と二刀流" : ""}の技能がない。`],
  [/^You (?:also )?(have|are|had|were) (basic|expert|master|grand-master|unskilled|skilled) (?:skill with|in) (.+?)( and two weapons)?( and (?:can enhance|could have enhanced) that)?\.$/, (verb, level, skill, two, enhance) => {
    const past = verb === "had" || verb === "were";
    const line = `${translateSkillName(skill, "ja")}${two ? "と二刀流" : ""}の技能は${skillLevel(level)}${past ? "だった" : "だ"}。`;
    return enhance ? `${line}${past ? "上げることもできた。" : "上げることもできる。"}` : line;
  }],
  [/^You (can enhance|could have enhanced) skills? with (.+?)\.$/, (verb, list) =>
    `${skillList(list)}の技能を上げ${verb === "can enhance" ? "られる" : "ることができた"}。`],
  [/^\(?Skills? flagged by "([*#])" (.+?)\.?\)?$/, (mark, rest) => translateSkillLegend(mark, rest) ?? ""],
  [/^You have already gone as far (\w+) as possible\.$/, (direction) =>
    (Object.prototype.hasOwnProperty.call(directions, direction) ? `これ以上${directions[direction]}へは進めない。` : "")],
  [/^(.+?) (hands|tosses) (.+?) back to you\.$/, (monster, verb, item) =>
    `${arg(monster)}は${arg(item)}をあなたに${verb === "hands" ? "手渡した" : "投げ返した"}。`],
  [/^You have (a little trouble|trouble|much trouble|extreme difficulty) (lifting|removing) (.+?)\.$/, (degree, verb, item) =>
    `${lettered(item)}を${verb === "lifting" ? "持ち上げる" : "取り出す"}のに${loadTrouble[degree]}。`],
  [/^You learn the "(.+)" spell\.$/, (spell) => `「${spellName(spell)}」の呪文を習得した。`],
  [/^You add the "(.+)" spell to your repertoire, as '(.)'\.$/, (spell, letter) => `「${spellName(spell)}」の呪文を習得した（'${letter}'）。`],
  [/^Your knowledge of (?:the )?"(.+?)"(?: spell)? is (keener|restored)\.$/, (spell, state) =>
    `「${spellName(spell)}」の知識が${state === "keener" ? "深まった" : "よみがえった"}。`],
  [/^(.+?): "(.+)"$/, headAndQuote],
  [/^Status of (.+?) \(([^)]+)\):\s+Level (\d+)\s+HP (-?\d+)\((\d+)\)\s+AC (-?\d+)((?:, [^,]+)*)\.$/, statusLine],
  [/^((?:Two|Three|Four|Several|Many) creatures shift locations|.+? (?:shifts location|appears|disappears))((?:,? and |, ).+)?\.$/,
    (first, rest) => whistleMessage(first + (rest ?? ""))],
  // Added last: more general shapes, which must not take a sentence from those above.
  [/^(.+?) is in (extraordinary|remarkable|fine|good|poor) health for a statue\.$/, (what, how) => {
    const states: Readonly<Record<string, string>> = { extraordinary: "並外れて良好", remarkable: "驚くほど良好", fine: "良好", good: "良好", poor: "不良" };
    return `${thing(what)}は石像にしては${states[how]}な状態だ。`;
  }],
  [/^(.+?) (?:has|have) shattered!$/, (what) => `${thing(what)}は粉々に砕けた！`],
  [/^The magic-absorbing blade (\S+) (.+)!$/, (_verb, who) => `魔力を吸う刃が${who === "you" ? "あなた" : arg(who)}の魔力を奪った！`],
  [/^(.+?) slices through (.+?)(?:'s)? (\S+)\.$/, (blade, who, part) => `${thing(blade)}が${who === "your" ? "あなた" : arg(who)}の${arg(part)}を切り裂いた。`],
  // dbridge.c.
  [/^(.+?) (?:is|are) crushed underneath the drawbridge\.$/, (who) => `${arg(who)}は跳ね橋の下敷きになって潰された。`],
  [/^(.+?) (?:is|are) crushed by the falling portcullis!$/, (who) => `${arg(who)}は落ちてきた落とし格子に潰された！`],
  [/^(.+?) disappears? behind the drawbridge\.$/, (who) => `${arg(who)}は跳ね橋の向こうに消えた。`],
  [/^(.+?) (?:is|are) blown apart by flying debris\.$/, (who) => `${arg(who)}は飛び散る破片で吹き飛ばされた。`],
  [/^(.+?) gets? into some heavy metal!$/, (who) => `${arg(who)}はヘビーメタルにはまった！`],
  // do.c, do_wear.c.
  [/^(.+?) tumbles? into (.+?) pit\.$/, (what, who) => `${thing(what)}が${who === "the" || who === "a" ? "" : `${arg(who.replace(/'s?$/, ""))}の`}穴に転がり落ちた。`],
  [/^You (manage to squeeze|squeeze|jump|fly|float|swim|slither|hop|crawl|climb) (down|through) the (hole|trap door)\.$/, (how, _way, what) => `${what === "hole" ? "穴" : "落とし扉"}${how.includes("squeeze") ? "になんとか体を押し込んだ" : "に入った"}。`],
  [/^(.+?) fits? very tightly\.$/, (what) => `${thing(what)}はとてもきつい。`],
  [/^You continue (disrobing|taking off your armor|putting on your armor)\.$/, (what) => (what === "putting on your armor" ? "防具を着け続けた。" : "服を脱ぎ続けた。")],
  [/^You can't take that off without taking off your (.+?) first\.$/, (what) => `先に${thing(what)}を外さないと脱げない。`],
  [/^You can't take that off; it's embedded\.$/, () => "体に埋まっているので外せない。"],
  // hack.c.
  [/^You and (.+?) are (chained to the|stuck in the) (.+)\.$/, (steed, how, what) => `あなたと${arg(steed)}は${arg(what === "buried ball" ? "the buried ball" : what)}${how === "chained to the" ? "につながれている" : "にはまっている"}。`],
  [/^(.+?) is stuck in the (.+)\.$/, (who, what) => `${arg(who)}は${arg(what)}にはまっている。`],
  // pickup.c.
  [/^Without limbs, you cannot (.+) anything\.$/, (verb) => {
    const verbs: Readonly<Record<string, string>> = { loot: "物色する", tip: "ひっくり返す", open: "開ける", pick: "拾う" };
    return `手足がないので${own(verbs, verb) ?? "それをする"}ことはできない。`;
  }],
  [/^You (\S+) under your heavy load\.\s+Movement is very hard\.$/, () => "重い荷物によろめいた。移動がとても困難だ。"],
  [/^You (\S+) under your load\.\s+Movement is still very hard\.$/, () => "荷物によろめいた。移動はまだとても困難だ。"],
  [/^The web (ignites and |fries and |freezes, shatters and )?is swept away!$/, (how) => {
    const ways: Readonly<Record<string, string>> = { "ignites and ": "燃え上がって", "fries and ": "焼け焦げて", "freezes, shatters and ": "凍って砕け、" };
    return `蜘蛛の巣は${how ? ways[how] : ""}押し流された！`;
  }],
  // timeout.c.
  [/^(?:Unfortunately, |Yes, you do\.\s+)(.+?) (?:has|have) been genocided\.\.\.$/, (what) => `残念ながら、${arg(`the ${what.toLowerCase()}`)}は抹殺された……`],
  [/^(Its|Their) (\S+) (seems|sounds) like "(.+?)(\.|!|)"$/, (whose, _cry, _how, word) => {
    const words: Readonly<Record<string, string>> = { mommy: "ママ", daddy: "パパ", mom: "ママ", dad: "パパ", mama: "ママ", dada: "パパ" };
    return `${whose === "Its" ? "その" : "それらの"}鳴き声は「${own(words, word.toLowerCase()) ?? word}」のように聞こえた。`;
  }],
  [/^(.+?) (slips?|slides?) (on|off) the ice\.$/, (who, _how, where) => `${who === "You" ? "あなた" : arg(who)}は氷${where === "on" ? "の上で" : "から"}滑った。`],
  // trap.c.
  [/^A (.+?) erupts from the (.+?) under (.+)!$/, (fire, where, who) => `${arg(who)}の下の${arg(where)}から${arg(fire)}が噴き上がった！`],
  [/^You see an? (.+?) erupt from the (.+)!$/, (fire, where) => `${arg(where)}から${arg(fire)}が噴き上がるのが見えた！`],
  [/^A (.+?) (?:bursts|erupts) from (.+)!$/, (fire, where) => `${thing(where)}から${arg(fire)}が噴き上がった！`],
  [/^You carefully (.+?) into the pit\.$/, () => "慎重に穴へ降りた。"],
  [/^You (.+?) (a|your) spider web!$/, (_how, whose) => `${whose === "your" ? "自分の" : ""}蜘蛛の巣にかかった！`],
  [/^You find yourself (in the midst of|on top of|in|on) (.+)\.$/, (where, what) => `気がつくと${arg(what)}${where === "in the midst of" || where === "in" ? "の中" : "の上"}にいた。`],
  [/^(Your|The|A) bear trap opens\.$/, (whose) => `${whose === "Your" ? "あなたの" : ""}トラバサミが開いた。`],
  [/^You (and .+? )?don't budge\.$/, (steed) => `あなた${steed ? `と${arg(steed.slice(4, -1))}` : ""}はびくともしない。`],
  [/^(.+?) tries to (?:steal|snatch|grab|take) (your )?(.+?) but gives up\.$/, (who, your, item) => `${arg(who)}は${your ? "あなたの" : ""}${thing(item)}を盗もうとしたが、あきらめた。`],
  [/^(Your |The |.+?'s )?candelabrum's flames? (?:die|dies)\.$/, () => "燭台の炎が消えた。"],
  [/^True to her word, the Oracle (.+?):\s*$/, () => "約束どおり、神託師は告げた："],
  [/^But since (?:his|her|its|their) shop has been robbed recently,$/, () => "しかし店は最近強盗に遭っているので、"],
  [/^you (partially )?compensate (.+?) for (?:his|her|its|their) losses\.$/, (partly, who) => `${arg(who)}の損失を${partly ? "一部" : ""}補償した。`],
  // mkobj.c: a shopkeeper charging for an altered item.
  [/^You (cancel|drain|uncharge|unbless|uncurse|disenchant|degrade|dilute|erase|burn|neutralize|fix|fire|rot|rust|corrode) (.+), you pay for (?:it|them)!$/, (verb, item) => {
    const verbs: Readonly<Record<string, string>> = { cancel: "無効化", drain: "吸収", uncharge: "充電切れに", unbless: "祝福を解除", uncurse: "呪いを解除", disenchant: "魔力を除去", degrade: "劣化", dilute: "希釈", erase: "消去", burn: "焼損", neutralize: "中和", fix: "修復", fire: "焼損", rot: "腐敗", rust: "錆びつかせ", corrode: "腐食" };
    return `${thing(item.replace(/^(?:that|those) /, ""))}を${verbs[verb]}したのだから、代金を払ってもらうよ！`;
  }],
  [/^The blood floods the altar, which vanishes in (?:an? )?(.+?) cloud!$/, (color) => `血が祭壇に溢れ、${colorAdjective(color) ?? color}雲となって消えていった！`],
  // shk.c: a shopkeeper praising the goods.
  [/^(.+?), price (\d+) (zorkmids?)(, a real bargain\.|, an excellent choice\.|, finest quality\.|, superb craftsmanship!|, painstakingly developed!|, gourmets' delight!|, one of a kind!|\.)$/, (item, price, _unit, praise) => {
    const praises: Readonly<Record<string, string>> = { ", a real bargain.": "掘り出し物だよ。", ", an excellent choice.": "いい選択だ。", ", finest quality.": "最高品質だ。", ", superb craftsmanship!": "見事な出来ばえだ！", ", painstakingly developed!": "苦心の作だ！", ", gourmets' delight!": "美食家も大喜びだ！", ", one of a kind!": "世界に一つだけだ！", ".": "" };
    return `${thing(item)}、お値段${price}ゾークミド。${praises[praise]}`;
  }],
  [/^(.+?), (\d+) zorkmids? each$/, (item, price) => `${thing(item)}、1個${price}ゾークミド`],
  [/^(.+?) suddenly drops from the (.+)!$/, (who, where) => `${arg(who)}が${arg(where)}から突然落ちてきた！`],
  [/^(.+?) strikes the (.+)\.$/, (what, where) => `${thing(what)}が${arg(where)}に当たった。`],
  [/^The entire (astral plane|plane|sanctum|puzzle|tower|dungeon) is shaking around you!$/, (where) => {
    const places: Readonly<Record<string, string>> = { "astral plane": "アストラル界", plane: "この次元界", sanctum: "聖所", puzzle: "このパズル", tower: "塔", dungeon: "ダンジョン" };
    return `${places[where]}全体があなたの周りで揺れている！`;
  }],
  [/^(.+?) shrinks out of (?:his|her|its|their) (.+)!$/, (who, item) => `${arg(who)}は体が縮んで${thing(item)}から抜け出た！`],
  [/^The (.+?) crashes on (its|his|her|their) (.+?) and breaks into shards\.$/, (what, _whose, part) => `${arg(what)}がその${arg(part)}に当たって割れ、破片になった。`],
  [/^The (.+?) crashes on (.+?)'s (.+?) and breaks into shards\.$/, (what, who, part) => `${arg(what)}が${arg(who)}の${arg(part)}に当たって割れ、破片になった。`],
  [/^(.+?) acts as though (?:he|she|it|they) (?:has|have) got a (severe )?headache\.$/, (who, severe) => `${arg(who)}は${severe ? "ひどい" : ""}頭痛がするかのようにふるまった。`],
  [/^You find you must release your (.+)!$/, (item) => `${thing(item)}を手放さざるを得なくなった！`],
  [/^(.+?) snatches (.+)!$/, (who, item) => `${arg(who)}が${thing(item)}を奪い取った！`],
  [/^(.+?) <(-?\d+)>\.$/, (plain, number) => {
    const shown = lookupNethack5SourceExact(`${plain}.`);
    return shown === undefined ? "" : `${shown}（${number}）`;
  }],
  [/^([a-z][a-z (),-]*)$/, (name) => own(hallucinatedTraps, name) ?? ""],
  [/^You hear someone summoning something, and (.+?) appears?\.$/, (what) => `誰かが何かを召喚する音が聞こえ、${arg(what)}が現れた。`],
  [/^You splash some (.+?) around\.$/, (liquid) => `${arg(liquid)}をあたりにはね散らした。`],
  [/^You avoid (?:stepping|walking|flying|floating|swimming|slithering|hopping|crawling|rolling|moving) into the (.+)\.$/, (where) => `${arg(where)}に足を踏み入れないようにした。`],
  [/^Since your weapon is welded to your (.+?), you cannot (.+?) (?:that|this|your) (.+)\.$/, (_part, _verb, tool) => `武器が手から離れないため、その${thing(tool)}を振るうことはできません。`],
  [/^'([a-z_]+)' changed to (?:"(.+)"|(\d+))\.$/, (option, text, number) => `'${option}' を「${text ?? number}」に変更した。`],
  [/^New ([a-z_]+): (\[.*\])(?: \((.+)\))?$/, (option, letters, current) => `${option} の新しい値：${letters}${current ? `（現在：${current === "all" ? "すべて" : current}）` : ""}`],
  [/^The Elemental Planes: levels (-?\d+) to (-?\d+), entrance on (-?\d+)$/, (from, to, entrance) => `精霊界：${from}階から${to}階、入口は${entrance}階`],
  // pager.c: the state a look at a monster adds after its name.
  [/^(.+?), can't move \(paralyzed or sleeping or busy\)$/, (who) => `${arg(`the ${who}`)}（動けない：麻痺、睡眠、または行動中）`],
  // mon.c: a vampire that was killed in another shape.
  [/^The seemingly dead (.+?) suddenly (reconstitutes|transforms) and rises as (.+)!$/, (who, how, what) => `死んだと思われた${arg(`the ${who}`)}が突然${how === "reconstitutes" ? "再生し" : "姿を変え"}、${arg(what)}として蘇った！`],
  // A capitalized name standing alone: "Medusa", "peaceful Archon".
  [/^(?:(peaceful) )?([A-Z][A-Za-z-]*(?: [A-Za-z-]+)*)$/, (attitude, name) => {
    const shown = translateMonsterName(`the ${name}`, "ja");
    return shown === `the ${name}` ? "" : `${attitude ? "友好的な" : ""}${shown}`;
  }],
  [/^peaceful ([ァ-ヶー・の]+)$/, (name) => `友好的な${name}`],
  [/^some (.+?) corpses$/, (what) => `${arg(`the ${what}`)}の死体`],
  // An item shown as a line of its own: "a ring.", "l - 2 scrolls labeled FOO".
  [/^(an? .+?|\d+ .+?)(\.\.\.|\.)$/, (item, stop) => {
    const shown = translateInventoryItem(item, "ja");
    return shown === item ? "" : `${shown}${stop === "." ? "。" : "……"}`;
  }],
  [/^([a-zA-Z$#]) - (.+)$/, (letter, item) => {
    const shown = translateInventoryItem(item, "ja");
    return shown === item ? "" : `${letter} - ${shown}`;
  }],
  // cmd.c: a row of the extended command menu, "adjust: adjust inventory letters".
  [/^([#?]|[a-z][a-z0-9_-]*): (.+)$/, (command, description) => {
    const translated = lookupNethack5SourceExact(description) ?? lookupNethack5SourceExact(`${description}.`);
    return translated === undefined ? "" : `${command}: ${translated}`;
  }],
  [/^There is (.+?) here\.\s+Check it for traps\?$/, (item) => `ここに${thing(item)}がある。罠を調べますか？`],
  [/^\s*(.*?)candy bars? labeled "(.+)"$/, (prefix, label) => {
    const shown = thing(`${prefix.trim()} candy bar`.trim());
    return `${shown}「${label}」`;
  }],
  [/^(\s*<\d+,\d+>\s+\S\s+)(.+?) called (\S+), chained to a heavy iron ball$/, (row, who, name) => `${row}${heroDescription(who)}（${name}）、重い鉄球につながれている`],
  [/^(.+?) murmurs in your ear, while helping you undress\.$/, (who) => `${arg(who)}は服を脱がせながら耳元でささやいた。`],
  [/^You would have confused monsters when hitting them\.$/, () => "攻撃した相手を混乱させられたはずだ。"],
  [/^(What do you want to .+? here\?) (\S.*)$/, (question, answer) => {
    const translated = translateAssembledMessage(question) ?? lookupNethack5SourceExact(question);
    return translated === undefined ? "" : `${translated} ${answer}`;
  }],
  [/^You consume (.+)\.$/, (food) => {
    const words = /^(homemade|boiled|deep fried|broiled|candied|dried|french fried|fried|pickled|pureed|rotten|sauteed|smoked|stir fried|szechuan|stewed)? ?(.+)$/.exec(food)!;
    const tin = translateInventoryItem(`tin of ${words[1] ? `${words[1]} ` : ""}${words[2]} meat`, "ja");
    return /の缶詰$/.test(tin) ? `${tin.replace(/の缶詰$/, "")}を食べた。` : "";
  }],
  // shk.c: rows of a bill and of the sell menu.
  [/^(.+), (\d+) (?:zorkmids?|gold pieces?)$/, (item, price) => {
    const shown = thing(item);
    return shown === item ? "" : `${shown}（${price}ゾークミド）`;
  }],
  [/^(.+), no charge$/, (item) => {
    const shown = thing(item);
    return shown === item ? "" : `${shown}（無料）`;
  }],
  [/^(\d+) Zm, (.+)$/, (price, item) => `${price}ゾークミド、${thing(item)}`],
  [/^Besides, you don't have enough to interest (?:him|her|it|them)\.$/, () => "それに、相手の気を引くほどの持ち合わせがない。"],
  [/^Moreover, you seem to have no (money|gold|valuables)\.$/, () => "しかも、お金を持っていないようだ。"],
  [/^(\S+) mentions how much (?:he|she|it|they) dislikes? non-paying customers\.$/, (keeper) => `${keeper}は、代金を払わない客がどれほど嫌いかを口にした。`],
  // sounds.c: chatting.
  [/^(.+?) tells you a funny joke!$/, (who) => `${who === "The wall" ? "壁" : arg(who)}が面白い冗談を言った！`],
  [/^The (wall|door|fountain|altar|tree|boulder|stairs) doesn't seem to be interested\.$/, (what) => `${describePlace(what)}は興味がないようだ。`],
  [/^(.+?)'s (.+?) tears apart!$/, (who, item) => `${arg(who)}の${thing(item)}が裂けた！`],
  [/^Your (.+?) tears apart!$/, (item) => `${thing(item)}が裂けた！`],
  [/^(.+?) (?:intones|intone):$/, (who) => `${arg(who)}は唱えた：`],
  [/^(.+?) gets angry!$/, (who) => `${arg(who)}は怒った！`],
  [/^You are caught in the (ball of fire|ball of cold|fireball|explosion)!$/, (what) => `${what === "ball of cold" ? "冷気の球" : what === "explosion" ? "爆発" : "火の球"}に巻き込まれた！`],
  [/^You are floating high above the (.+)\.$/, (where) => `${describePlace(where)}の真上を浮遊している。`],
  [/^Everything (feels|looks|sounds) SO boring now\.$/, () => "もう何もかもがとても退屈だ。"],
  [/^Your nose tingles and you smell (.+)\.$/, (what) => `鼻がむずむずして、${arg(what)}のにおいがした。`],
  [/^(.+?) voice booms:\s+"How darest thou harm my servant!"$/, (god) => `${own(deityNames, god.replace(/'s?$/, "")) ?? god}の声が響いた：「我がしもべを傷つけるとは何事か！」`],
  [/^(.+?) stole (.+)\.$/, (who, item) => `${arg(who)}は${thing(item)}を盗んだ。`],
  [/^\((\S+)\): You remember (?:that|this) as (.+)\.$/, (where, what) => `（${where.replace(/north/g, "北").replace(/south/g, "南").replace(/east/g, "東").replace(/west/g, "西")}）：${arg(what)}だったと覚えている。`],
  [/^You remember (?:that|this) as an? (square|irregularly shaped|rectangular) (\d+) by (\d+) (room|area)\.$/, (shape, w, h, kind) => `${w}×${h}の${shape === "square" ? "正方形の" : shape === "rectangular" ? "長方形の" : "不規則な形の"}${kind === "room" ? "部屋" : "区域"}だったと覚えている。`],
  // Followed by a mock Latin name, which withJapaneseProperNames then replaces.
  [/^(coyote) - (.+)$/, (who, latin) => `${arg(`the ${who}`)} - ${latin}`],
  [/^An? (ultraviolet|infrared|bluish-orange|reddish-green|dark white|light black|sky blue-pink|pinkish-cyan|indigo-chartreuse|salty|sweet|sour|bitter|umami|striped|spiral|swirly|plaid|checkered|argyle|paisley|blotchy|guernsey-spotted|polka-dotted|square|round|triangular|cabernet|sangria|fuchsia|wisteria|lemon-lime|strawberry-banana|peppermint|romantic|incandescent|octarine|excitingly dull|mauve|electric|neon|fluorescent|phosphorescent|translucent|opaque|psychedelic|iridescent|rainbow-colored|polychromatic|colorless|colorless green|dancing|singing|loving|loudy|noisy|clattery|silent|apocyan|infra-pink|opalescent|violant|tuneless|viridian|aureolin|cinnabar|purpurin|gamboge|madder|bistre|ecru|fulvous|tekhelet|selective yellow) glow surrounds you\.$/, (color) => `${hallucinatedColors[color]}光があなたを包んだ。`],
  [/^(Portal to|Stair to|Ladder to) (.+)$/, (kind, branch) => {
    const located = translateGameLocation(branch, "ja");
    return `${located !== branch ? located : arg(branch)}への${kind === "Portal to" ? "ポータル" : kind === "Stair to" ? "階段" : "はしご"}`;
  }],
  [/^(.+?): levels (\d+) to (\d+), entrance on (\d+)$/, (branch, from, to, entrance) => {
    const located = translateGameLocation(branch, "ja");
    return `${located !== branch ? located : arg(branch)}：${from}階から${to}階（入口は${entrance}階）`;
  }],
  [/^(.+?) named (.+?) \(for sale, (\d+) (?:zorkmids?|gold pieces?)\)$/, (item, name, price) => {
    const shown = thing(item);
    return shown === item ? "" : `${shown}「${name}」（売り物、${price}ゾークミド）`;
  }],
  // shk.c: entering, paying and owing.
  [/^So, (.+?), you dare return to (\S+?)(?:'s?)? (.+?)\?!$/, (name, keeper, shop) => `${name}よ、${keeper}の${shopType(shop)}によくも戻って来られたな！`],
  [/^(.+?) seems (quite upset|ticked off|furious) over your return to (?:his|her|its|their) (.+)!$/, (keeper, mood, shop) => {
    const moods: Readonly<Record<string, string>> = { "quite upset": "ひどく腹を立てている", "ticked off": "いら立っている", furious: "激怒している" };
    return `${arg(keeper)}は、あなたが${shopType(shop)}に戻ってきたことに${moods[mood]}ようだ！`;
  }],
  [/^The atmosphere at (\S+?)(?:'s?)? (.+?) seems unwelcoming\.$/, (keeper, shop) => `${keeper}の${shopType(shop)}の雰囲気は歓迎的ではないようだ。`],
  [/^(.+?) (is hesitant|refuses) to let you in with your (digging tools?|pick-axes?|dwarvish mattocks?|mattocks?)\.$/, (keeper, how, tool) => `${arg(keeper)}は${/mattock/.test(tool) ? "つるはしのようなドワーフの鍬" : /pick/.test(tool) ? "つるはし" : "掘削道具"}を持ったあなたを${how === "refuses" ? "入れようとしない" : "入れるのをためらっている"}。`],
  [/^Thank you for shopping in (\S+?)(?:'s?)? (.+?)[!.]$/, (keeper, shop) => `${keeper}の${shopType(shop)}をご利用いただきありがとうございます！`],
  [/^(.+?) nods( appreciatively)? at you for shopping in (?:his|her|its|their) (.+?)[!.]$/, (keeper, warm, shop) => `${arg(keeper)}は${shopType(shop)}での買い物に${warm ? "感謝して" : ""}うなずいた。`],
  [/^You owe (\S+) (\d+) (?:zorkmids?|gold pieces?) for (burying merchandise|objects destroyed|goods lost)\.$/, (keeper, amount, why) => {
    const reasons: Readonly<Record<string, string>> = { "burying merchandise": "商品を埋めた代金", "objects destroyed": "壊した品物の代金", "goods lost": "失われた品物の代金" };
    return `${keeper}に${reasons[why]}として${amount}ゾークミドの借りがある。`;
  }],
  [/^But since (?:his|her|its|their) shop has been robbed recently,$/, () => "しかし、最近店が強盗に遭ったので、"],
  [/^(\S+) takes the (\d+) (?:zorkmids?|gold pieces?) (you )?owed (.+)\.$/, (keeper, amount) => `${keeper}は借りの${amount}ゾークミドを受け取った。`],
  [/^Satisfied, (\S+) suddenly disappears!$/, (keeper) => `満足した${keeper}は突然姿を消した！`],
  [/^(.+?) quickly snatches some gold from (between|beneath) (.+)!$/, (who) => `${arg(who)}は素早く金貨を奪った！`],
  [/^(.+?) curses (?:his|her|its|their|him|her|it|them)(?:self)? inability to grab your backpack!$/, (who) => `${arg(who)}はあなたの背負い袋をつかめないことを呪った！`],
  [/^(.+?) (leaps|hops|flies|floats|slithers|lurches|swims|moves|rushes)(?:,)? and (grabs|snatches) your backpack!$/, (who) => `${arg(who)}は飛びかかってあなたの背負い袋をつかんだ！`],
  [/^(.+?) (grabs|snatches) your backpack!$/, (who) => `${arg(who)}はあなたの背負い袋をつかんだ！`],
  [/^The (.+?) established (\d+) (?:zorkmids?|gold pieces?) credit\.$/, (item, amount) => `${thing(item)}で${amount}ゾークミドの信用が付いた。`],
  [/^Your displaced image doesn't fool (\S+)!$/, (keeper) => `${keeper}はあなたの幻影にだまされない！`],
  [/^Your invisibility does not fool (\S+)!$/, (keeper) => `${keeper}は透明なあなたにだまされない！`],
  [/^Mollified, (\S+) accepts your restitution\.$/, (keeper) => `${keeper}は機嫌を直し、あなたの賠償を受け入れた。`],
  [/^(\S+) is after blood, not gold!$/, (keeper) => `${keeper}が求めているのは金ではなく血だ！`],
  [/^But (\S+) is as angry as ever\.$/, (keeper) => `しかし、${keeper}は相変わらず怒っている。`],
  [/^You give (\S+) the (\d+) gold pieces? (?:he|she|it|they) asked for\.$/, (keeper, amount) => `${keeper}に求められた金貨${amount}枚を渡した。`],
  [/^You give (\S+) all your( openly kept)? gold\.$/, (keeper) => `${keeper}に金貨をすべて渡した。`],
  [/^(\S+) (?:says|whispers|mumbles|mutters|shouts|screams|yells|rumbles|grumbles) "You be careful with my (.+)!"$/, (keeper, item) => `${keeper}が言った。「${arg(item)}の扱いには気をつけろ！」`],
  [/^(\S+) looks apprehensive about your wielding (?:his|her|its|their) (.+)\.$/, (keeper, item) => `${keeper}は、あなたが自分の${thing(item)}を構えているのを不安そうに見ている。`],
  [/^I'm (\S+), not (.+)\.$/, (keeper, other) => `私は${keeper}だ、${other}ではない。`],
  [/^You fracture (\S+?)(?:'s?)? (.+)\.$/, (keeper, item) => `${keeper}の${thing(item)}を砕いた。`],
  // apply.c: towels, statues, mirrors and traps.
  [/^You push your (lenses|towel|blindfold|other towel) (cock-eyed|crooked|off)\.$/, (what, how) => {
    const names: Readonly<Record<string, string>> = { lenses: "レンズ", towel: "タオル", blindfold: "目隠し", "other towel": "もう一枚のタオル" };
    return `${names[what]}を${how === "off" ? "押しのけた" : "ずらした"}。`;
  }],
  [/^You hear a voice say, "(It's|He's|She's|They're|You're both) (dead|stoned), Jim\."$/, (_who, state) => `「${state === "dead" ? "死んでいるよ" : "石になっているよ"}、ジム」という声が聞こえた。`],
  [/^(.+?) (?:has|have) shattered!$/, (item) => `${thing(item)}は砕け散った！`],
  [/^You feel (.+?) (\w+) from your pack!$/, (what) => `${what === "something" ? "何か" : arg(what)}が背負い袋から出てくるのを感じた！`],
  [/^You see (.+?) (\w+) out of (your pack|.+?)( and vanish)?!$/, (what, _verb, from, vanish) => `${arg(what)}が${from === "your pack" ? "背負い袋" : arg(from)}から出てくるのが見えた${vanish ? "が、消えた" : ""}！`],
  [/^You can't set a trap (.+)!$/, (why) => {
    const reasons: Readonly<Record<string, string>> = { "without hands": "手がないので", "while stunned": "朦朧としているので", "while swallowed": "飲み込まれているので", "while engulfed": "飲み込まれているので", "while levitating": "浮遊しているので", "while flying": "飛んでいるので", "while riding": "騎乗しているので", "while you're trapped": "捕まっているので", "here": "ここには", "on the ice": "氷の上には", "on the air": "空中には", "in the water": "水中には" };
    return `${reasons[why] ?? arg(why)}罠を仕掛けられない！`;
  }],
  [/^You (resume|begin) setting (?:your |a |an |the )?(.+)\.$/, (how, trap) => `${lookupNethack5SourceExact(trap) ?? arg(trap)}の設置を${how === "resume" ? "再開した" : "始めた"}。`],
  [/^(Your |The )(.+?) (softly )?glows? (amber|black|brown|red|blue|light blue|silver|golden|dark red|green|purple|white|yellow|orange)( and (?:is|are) now as good as new)?[.!]?$/, (who, item, softly, color, fixed) =>
    (softly && !fixed ? "" : `${who === "Your " ? "あなたの" : ""}${thing(item)}が${glowColors[color]}光った${fixed ? "。新品同様になった" : ""}。`)],
  [/^(Your |The )(.+?) (?:softly )?glows? with an? (.+?) aura( and (?:is|are) now as good as new)?\.$/, (who, item, color, fixed) => `${who === "Your " ? "あなたの" : ""}${thing(item)}が${glowColors[color] ?? arg(color)}オーラを放った${fixed ? "。新品同様になった" : ""}。`],
  [/^The (.+?) glows? a strange (.+?), but remains intact\.$/, (item, color) => `${thing(item)}は${glowColors[color] ?? arg(color)}奇妙に光ったが、無傷だった。`],
  // artifact.c: named weapons and what they do.
  [/^The (magic-absorbing blade|fiery blade|ice-cold blade|massive hammer|imaginary widget|razor-sharp blade|vorpal blade|sharp-edged blade) (hits|drains|burns|freezes|vaporizes part of)!?(.*?)[!.]?$/, (blade, verb, target) => {
    const verbs: Readonly<Record<string, string>> = { hits: "を打った", drains: "の力を吸い取った", burns: "を焼いた", freezes: "を凍らせた", "vaporizes part of": "の一部を蒸発させた" };
    const name = target.trim() === "you" ? "あなた" : arg(target.trim());
    return `${artifactBlades[blade]}が${name}${verbs[verb]}！`;
  }],
  [/^The (massive hammer|imaginary widget) hits!\s+(Lightning strikes|A hail of magic missiles strikes) (.+)[!.]$/, (blade, what, target) => `${artifactBlades[blade]}が命中した！ ${what === "Lightning strikes" ? "雷が" : "魔法の矢の雨が"}${target === "you" ? "あなた" : arg(target)}を打った！`],
  [/^The (razor-sharp blade|vorpal blade) cuts (.+?) in half!$/, (blade, target) => `${artifactBlades[blade]}が${target === "you" ? "あなた" : arg(target)}を真っ二つにした！`],
  [/^The (razor-sharp blade|vorpal blade) slices through (.+?)'s? (.+)\.$/, (blade, target, part) => `${artifactBlades[blade]}が${arg(target)}の${limb(part)}を切り裂いた。`],
  [/^The (razor-sharp blade|vorpal blade) slices through your (.+)\.$/, (blade, part) => `${artifactBlades[blade]}があなたの${limb(part)}を切り裂いた。`],
  [/^The black blade draws the (life|animating force) from (.+)!$/, (_life, target) => `黒い刃が${arg(target)}の命を奪った！`],
  [/^(.+?) draws the (life|animating force) from (.+)!$/, (item, _life, target) => `${thing(item)}が${arg(target)}の命を奪った！`],
  [/^You feel an (unholy blade|object) drain your (life|animating force)!$/, (what) => `${what === "object" ? "何か" : "邪悪な刃"}に命を吸い取られるのを感じた！`],
  [/^The black blade drains your (life|animating force)!$/, () => "黒い刃があなたの命を吸い取った！"],
  [/^(.+?) drains your (life|animating force)!$/, (item) => `${thing(item)}があなたの命を吸い取った！`],
  [/^(Sting|Orcrist|Glamdring|Grimtooth) (?:glows?|is glowing|quivers?|is quivering|flickers?|is flickering|glimmers?|is glimmering|gleams?|is gleaming)(?: (\S+(?: \S+)?))?[.!]$/, (item, color) => `${translateInventoryItem(item, "ja")}が${color && glowColors[color] ? glowColors[color] : ""}かすかに光っている。`],
  // attrib.c: exercise and limits.
  [/^You're (currently|already) as (strong|smart|wise|agile|tough|charismatic) as you can get\.$/, (_when, what) => {
    const traits: Readonly<Record<string, string>> = { strong: "筋力", smart: "知力", wise: "賢さ", agile: "敏捷", tough: "耐久", charismatic: "魅力" };
    return `${traits[what]}はすでに限界まで高い。`;
  }],
  [/^Your innate (strength|intelligence|wisdom|dexterity|constitution|charisma) has (improved|declined)\.$/, (what, how) => {
    const traits: Readonly<Record<string, string>> = { strength: "筋力", intelligence: "知力", wisdom: "賢さ", dexterity: "敏捷", constitution: "耐久", charisma: "魅力" };
    return `生来の${traits[what]}が${how === "improved" ? "向上した" : "低下した"}。`;
  }],
  [/^You (must have been|haven't been) (exercising diligently|exercising properly|very observant|paying attention|working on your reflexes|working on reflexes lately|leading a healthy life-style|watching your health)\.$/, (how, what) => {
    const habits: Readonly<Record<string, string>> = { "exercising diligently": "熱心に体を鍛えて", "exercising properly": "きちんと体を鍛えて", "very observant": "よく観察して", "paying attention": "注意を払って", "working on your reflexes": "反射神経を鍛えて", "working on reflexes lately": "最近反射神経を鍛えて", "leading a healthy life-style": "健康的に暮らして", "watching your health": "健康に気をつけて" };
    return `${habits[what]}${how === "must have been" ? "いたに違いない" : "いなかったようだ"}。`;
  }],
  // ball.c: dragged out of a trap.
  [/^The iron ball pulls you out of the (pit|web|lava|bear trap|molten lava)!$/, (what) => {
    const traps: Readonly<Record<string, string>> = { pit: "落とし穴", web: "クモの巣", lava: "溶岩", "molten lava": "溶岩", "bear trap": "トラバサミ" };
    return `鉄球に引っ張られて${traps[what]}から抜け出した！`;
  }],
  // cmd.c: prefixes.
  [/^The (\S+) command does not accept '(.+)' prefix\.$/, (command, prefix) => `#${command} コマンドに「${prefix}」接頭辞は使えない。`],
  [/^The '(.+)' prefix should be followed by a movement command( other than up or down)?\.$/, (prefix, except) => `「${prefix}」接頭辞の後には${except ? "上下以外の" : ""}移動コマンドを続けてください。`],
  // dbridge.c: the drawbridge's victims.
  [/^(You|.+?) (?:is|are) crushed underneath the drawbridge\.$/, (who) => `${who === "You" ? "あなた" : arg(who)}は跳ね橋の下敷きになった。`],
  [/^(You|.+?) (?:is|are) crushed by the falling portcullis!$/, (who) => `${who === "You" ? "あなた" : arg(who)}は落ちてきた落とし格子につぶされた！`],
  [/^(You|.+?) disappears? behind the drawbridge\.$/, (who) => `${who === "You" ? "あなた" : arg(who)}は跳ね橋の向こうに消えた。`],
  [/^(You|.+?) (?:is|are) blown apart by flying debris\.$/, (who) => `${who === "You" ? "あなた" : arg(who)}は飛んできた破片で粉々になった。`],
  [/^(You|.+?) gets? (?:smashed |crushed |rammed |)into some heavy metal!$/, (who) => `${who === "You" ? "あなた" : arg(who)}は重い金属に叩きつけられた！`],
  // dig.c: limits of digging.
  [/^You cannot (dig|reach|dig in|dig into) thin air\.$/, () => "何もない空中は掘れない。"],
  [/^There isn't enough room to (.+) here\.$/, () => "ここには掘る余地がない。"],
  [/^The stairs are too hard to (.+)\.$/, () => "階段は硬すぎて掘れない。"],
  [/^You feel like (enlisting|marching|protesting|fleeing)\.$/, (what) => {
    const moods: Readonly<Record<string, string>> = { enlisting: "入隊したい", marching: "行進したい", protesting: "抗議したい", fleeing: "逃げ出したい" };
    return `${moods[what]}気分だ。`;
  }],
  // do.c: holes and pits.
  [/^(A|The) boulder (\w+) into the pit( with you)?\.$/, (_a, _verb, you) => `大岩が${you ? "あなたごと" : ""}落とし穴に落ちた。`],
  [/^(.+?) (?:tumbles?|falls?) into (?:the|your|a) pit\.$/, (item) => `${thing(item)}が落とし穴に転がり落ちた。`],
  [/^The (.+?) flow seems (less|great)er now\.$/, (water, how) => `${arg(water)}の流れが${how === "less" ? "弱まった" : "強まった"}ようだ。`],
  [/^For some reason, you cannot (\w+)( any of)? the stones?!$/, (verb) => `なぜか石を${verb === "drop" ? "置く" : verb === "throw" ? "投げる" : "手放す"}ことができない！`],
  [/^You don't fit (down|through|.+?) easily\.$/, () => "簡単には通り抜けられない。"],
  [/^You were unable to fit (down|through|.+?)\.$/, () => "通り抜けられなかった。"],
  [/^You (fall|plunge|fly|squeeze|sink|float|slither|swim) (down|through) the (hole|trap door)\.$/, (_verb, _dir, what) => `${what === "hole" ? "穴" : "落とし戸"}を通り抜けた。`],
  [/^(With great effort, you|You) (climb|float|fly|crawl|slither|swim) up(?: along)? the (stairs|ladder)\.$/, (effort, _verb, what) => `${effort.startsWith("With") ? "やっとのことで" : ""}${what === "stairs" ? "階段" : "はしご"}を上った。`],
  // dokick.c: kicks and falling objects.
  [/^The kick passes harmlessly through\.$/, () => "蹴りは素通りした。"],
  [/^You (scatter the coins|knock coins all over the place|send coins flying in all directions)!$/, () => "金貨を四方に蹴散らした！"],
  [/^(The|All the) adjacent (object|objects) falls? (.+)\.$/, () => "隣の物が落ちていった。"],
  [/^(One of the|Some of the) adjacent objects falls? (.+)\.$/, () => "隣の物の一部が落ちていった。"],
  [/^You hear a muffled (.+)\.$/, (what) => `くぐもった${own(mufflings, what) ?? arg(what)}が聞こえた。`],
  // do_wear.c, potion.c, zap.c: feet and footing.
  [/^Your (.+?) are stuck in the (.+)!$/, (part, where) => `${limb(part.replace(/ves$/, "f").replace(/feet$/, "foot"))}が${describePlace(where)}にはまった！`],
  [/^You are stuck in the (.+), and cannot pull your (.+) out\.$/, (where) => `${describePlace(where)}にはまり、足を引き抜けない。`],
  [/^Your (.+?) are frozen to the (.+)!$/, (_part, where) => `足が${describePlace(where)}に凍りついた！`],
  [/^You sense something below your (.+)\.$/, () => "足元に何かの気配を感じた。"],
  [/^You feel a strange vibration (beneath you|under your .+|beneath .+)\.$/, () => "足元に奇妙な振動を感じた。"],
  [/^Blood (boil|pool)s (beneath|at) your (.+)\.$/, (how) => `足元で血が${how === "boil" ? "沸き立った" : "たまった"}。`],
  [/^(.+?) (lands?|appears?) (beneath|at) your (.+)!$/, (item) => `足元に${thing(item)}が現れた！`],
  [/^(You|.+?) (?:fall|falls|plunge|plunges|crash|crashes) through the ice\.$/, (who) => `${who === "You" ? "あなた" : arg(who)}は氷を割って落ちた。`],
  [/^Egads!\s+(.+?) bites? your (.+)!$/, (what, part) => `なんてこった！ ${thing(what)}が${limb(part)}に噛みついた！`],
  // hack.c: pets, the chain and traps while riding.
  [/^You (\w+) over a boulder here\.$/, () => "ここにある大岩を乗り越えた。"],
  [/^You and (.+?) are (stuck in the|chained to the|caught in a|stuck to the) (.+)\.$/, (steed, _how, what) => `あなたと${arg(steed)}は${lookupNethack5SourceExact(what) ?? arg(what)}に捕まっている。`],
  [/^(.+?) is (stuck in the|chained to the|caught in a|stuck to the) (.+)\.$/, (steed, _how, what) => `${arg(steed)}は${lookupNethack5SourceExact(what) ?? arg(what)}に捕まっている。`],
  [/^You avoid (\w+) into the (.+)\.$/, (_verb, where) => `${describePlace(where)}に踏み込まないようにした。`],
  [/^You stop\.\s+(.+?) can't move out of (that|a|an) (.+)\.$/, (who, _a, what) => `立ち止まった。${arg(who)}は${lookupNethack5SourceExact(what) ?? arg(what)}から出られない。`],
  [/^You stop\.\s+(.+?) can't move diagonally\.$/, (who) => `立ち止まった。${arg(who)}は斜めに動けない。`],
  [/^You stop\.\s+(.+?) won't fit through\.$/, (who) => `立ち止まった。${arg(who)}は通り抜けられない。`],
  [/^You stop\.\s+(.+?) won't fit into the same spot that you're at\.$/, (who) => `立ち止まった。${arg(who)}はあなたのいる場所に入れない。`],
  [/^You stop\.\s+(.+?) (?:is|are) in the way\.$/, (who) => `立ち止まった。${arg(who)}が邪魔をしている。`],
  [/^(.+?) away!\s+\1 away!$/, (what) => `${arg(what)}だ、逃げろ！ 逃げろ！`],
  // insight.c and invent.c.
  [/^You are (already|now) (.+)\.$/, (when, what) => {
    const shown = lookupNethack5SourceExact(what) ?? lookupNethack5SourceExact(`You are ${what}.`);
    return shown === undefined ? "" : `${when === "already" ? "すでに" : "今は"}${shown.replace(/。$/, "")}。`;
  }],
  [/^You mime (\w+?)ing( .+?)? something( .+?)?\.$/, (verb) => `何かを${own(mimes, verb) ?? "する"}まねをした。`],
  [/^Use the '(.+)' command to (.+?) (that|those)( .+)?\.$/, (command, verb) => `それを${own(useVerbs, verb) ?? verb}には「${command}」コマンドを使ってください。`],
  [/^You aren't carrying any unpaid items but there (?:is|are) (\d+) (.+)\.$/, (count) => `未払いの物は持っていないが、ほかに${count}個ある。`],
  [/^You have no (.*?)objects(.*?)\.$/, (before, after) => `${before ? `${lookupNethack5SourceExact(before.trim()) ?? arg(before.trim())}の` : ""}物を持っていない${after ? `（${after.trim()}）` : ""}。`],
  // lock.c: doors that crumble.
  [/^A cloud of dust springs up in the older, more primitive doorway\.$/, () => "古くて粗末な戸口にほこりの雲が舞い上がった。"],
  [/^The cloud quickly dissipates\.$/, () => "雲はすぐに消えた。"],
  [/^A cloud of dust springs up in the doorway, but quickly dissipates\.$/, () => "戸口にほこりの雲が舞い上がったが、すぐに消えた。"],
  // mhitm.c, mhitu.c, muse.c: monsters acting.
  [/^(.+?) (swings|thrusts|bashes with|slashes with) (one of )?(?:his|her|its|their) (.+?) at (.+)\.$/, (who, _verb, _one, weapon, target) => `${arg(who)}が${thing(weapon)}で${target === "you" ? "あなた" : arg(target)}に攻撃した。`],
  [/^(.+?) (staggers|wobbles|flutters|falters|staggers around|reels|flounders)(\.\.\.|\.)$/, (who) => `${arg(who)}はよろめいた。`],
  [/^You (stagger|wobble|flutter|falter)(?:\.\.\.| under your (?:heavy )?load\.\s+Movement is (?:still )?very hard\.)$/, (_verb) => "よろめいた。動くのがとても難しい。"],
  [/^(.+?) (swings|thrusts|flails) wildly!$/, (who) => `${arg(who)}がやみくもに武器を振るった！`],
  [/^(.+?) is splashed by (your )?(.+)!$/, (who, _your, what) => `${arg(who)}に${what === "acid" ? "酸" : arg(what)}がかかった！`],
  [/^(.+?) (?:says|whispers|mumbles|mutters|shouts|screams|yells|rumbles|grumbles) something\.$/, (who) => `${arg(who)}が何か言った。`],
  [/^Talk\? -- (.+)$/, (words) => `話す？ -- ${lookupNethack5SourceExact(words) ?? words}`],
  [/^(.+?) returns? to (.+?), landing (beneath|at) (?:his|her|its|their) (.+)\.$/, (item, who) => `${thing(item)}が${arg(who)}の足元に戻ってきた。`],
  [/^(.+?) (quaffs|opens and eats the contents of|eats|zaps|reads) (.+)\.$/, (who, verb, item) => {
    const verbs: Readonly<Record<string, string>> = { quaffs: "を飲んだ", "opens and eats the contents of": "を開けて中身を食べた", eats: "を食べた", zaps: "を振った", reads: "を読んだ" };
    return `${arg(who)}が${thing(item)}${verbs[verb]}。`;
  }],
  [/^The (lawful|neutral|chaotic|unaligned|Moloch) altar falls( into a chasm)?\.?$/, (kind, chasm) => `${own(altarKinds, kind) ?? kind}の祭壇が${chasm ? "裂け目に" : ""}落ちた。`],
  // pray.c: the god's words and altars.
  [/^Thou durst (scorn|call upon) me\?$/, (verb) => (verb === "scorn" ? "汝は我をあざけるか？" : "汝は我を呼ぶとは何事か？")],
  [/^(The|One of the|Some of the) potions? on the altar glows? (.+?) for a moment\.$/, (who, color) => `${who === "The" ? "祭壇の" : who === "One of the" ? "祭壇の1本の" : "祭壇の何本かの"}ポーションが一瞬${glowColors[color] ?? arg(color)}光った。`],
  [/^The blood floods the altar, which vanishes in an? (.+) cloud!$/, (color) => `血が祭壇にあふれ、祭壇は${glowColors[color]?.replace(/く$/, "い") ?? arg(color)}雲の中に消えた！`],
  [/^The (cloud dissipates|blood coagulates)\.$/, (what) => (what === "cloud dissipates" ? "雲は消えた。" : "血は固まった。")],
  // read.c: reading what is worn.
  [/^(That|Your) shirt is obscured by (?:your |a |an |the )?(.+)\.$/, (_whose, cover) => `シャツは${thing(cover)}に隠れている。`],
  [/^(There is writing|You feel lettering) on the (.+?)\.\s+It reads:\s+(.+)\.$/, (how, item, text) => `${thing(item)}に${how === "There is writing" ? "文字が書かれている" : "文字を感じる"}：${text}`],
  [/^(.+?) of boulders materializes? (around|above) you!$/, (what, where) => `大岩の${/^A/.test(what) ? "雨" : "山"}があなたの${where === "around" ? "周り" : "頭上"}に現れた！`],
  [/^True to her word, the Oracle (offhandedly |casually |nonchalantly )?(?:says|whispers|mumbles|mutters|intones|shouts|rumbles|grumbles):\s*$/, () => "約束どおり、神託師はこう言った："],
  // spell.c: dangerous books.
  [/^The book (explodes|radiates explosive energy|glows|.+?), but you are unharmed!$/, () => "本が爆発したが、無傷だった！"],
  [/^As you read the book, it (explodes|radiates explosive energy|.+?) in your (.+)!$/, () => "本を読んでいると、顔の前で爆発した！"],
  // steal.c, steed.c.
  // teleport.c.
  [/^You (are too weak from hunger|lack the strength|lack the energy) (for a teleport spell|to teleport)\.$/, (why) => `${why === "are too weak from hunger" ? "空腹で弱っていて" : why === "lack the strength" ? "力が足りず" : "魔力が足りず"}テレポートできない。`],
  [/^You (can't cast that spell|don't know that spell|are not able to teleport at will)\.$/, (what) => {
    const lines: Readonly<Record<string, string>> = { "can't cast that spell": "その呪文は唱えられない。", "don't know that spell": "その呪文を知らない。", "are not able to teleport at will": "思いどおりにテレポートできない。" };
    return lines[what];
  }],
  // timeout.c: eggs and candles.
  [/^(Their|Its) (\w+) (seems|sounds) like "(.+)"$/, (_who, _verb, _how, sound) => `その声は「${sound}」のようだ`],
  [/^(Your |.+?'s |The )(candelabrum's )?(\d+ )?candles? (?:is|are) getting short\.$/, (whose, menorah) => `${whose === "Your " ? "あなたの" : ""}${menorah ? "燭台の" : ""}ろうそくが短くなってきた。`],
  [/^(Your |.+?'s |The )(candelabrum's )?candle(?:'s|s') flames? flickers? low!$/, (whose, menorah) => `${whose === "Your " ? "あなたの" : ""}${menorah ? "燭台の" : ""}ろうそくの炎が弱くなった！`],
  [/^(Your |.+?'s |The )candelabrum's flames? dies?\.$/, (whose) => `${whose === "Your " ? "あなたの" : ""}燭台の炎が消えた。`],
  [/^You see (?:a |\d+ )?(?:(?:the )?candelabrum's )?candles?(?: flames?)? (?:getting short|flicker low)[.!]$/, () => "ろうそくが弱くなるのが見えた。"],
  // trap.c: damage, water and fire.
  [/^(Your|The|.+?'s) (.+?) (rusts|corrodes|burns|rots|smoulders|fades|gets wet)( completely| further)?( away)?[!.]$/, (whose, item, verb, degree, away) => {
    const verbs: Readonly<Record<string, string>> = { rusts: "錆びた", corrodes: "腐食した", burns: "焦げた", rots: "腐った", smoulders: "くすぶった", fades: "色あせた", "gets wet": "濡れた" };
    const owner = whose === "Your" ? "あなたの" : whose === "The" ? "" : `${arg(whose.replace(/'s$/, ""))}の`;
    return `${owner}${thing(item)}が${degree === " completely" ? "完全に" : degree === " further" ? "さらに" : ""}${verbs[verb]}${away ? "。跡形もない" : ""}！`;
  }],
  [/^(.+?)'s (.+?) (?:is|are) (not affected|already rusted|protected)\.?$/, (who, item) => `${arg(who)}の${thing(item)}に変化はない。`],
  [/^Instead of shattering, (.+?) suddenly (disappears|comes to life|animates)!$/, (statue, what) => `砕ける代わりに、${thing(statue)}が突然${what === "disappears" ? "消えた" : "動き出した"}！`],
  [/^(A|Your) bear trap closes on (.+?)'s? (.+)!$/, (_a, who, part) => `トラバサミが${arg(who)}の${limb(part)}を挟んだ！`],
  [/^A gush of water hits you on the (.+)!$/, (part) => `水が噴き出してあなたの${limb(part)}に当たった！`],
  [/^A (tower of flame|pillar of fire) erupts from the (.+?) under (.+)!$/, (_what, place, who) => `${describePlace(place)}から炎の柱が噴き出し、${arg(who)}を包んだ！`],
  [/^You see a (tower of flame|pillar of fire) erupt from the (.+)!$/, (_what, place) => `${describePlace(place)}から炎の柱が噴き出すのが見えた！`],
  [/^A (tower of flame|pillar of fire) (bursts|erupts) from (.+)!$/, (_what, _verb, from) => `${describePlace(from.replace(/^the /, ""))}から炎の柱が噴き出した！`],
  [/^(.+?) (steps|lands) (?:on|into) (?:a|the) (?:set of )?(.+)!$/, (who, _verb, what) => (/poor /.test(who) ? `${arg(who.replace(/poor /, ""))}は${lookupNethack5SourceExact(what) ?? arg(what)}に落ちた！` : "")],
  [/^You (stumble into|flow through|walk into|step into) (?:a|your) spider web!$/, (how) => (how === "flow through" ? "クモの巣をすり抜けた！" : "クモの巣に突っ込んだ！")],
  [/^You (step onto|trigger|float over|fly over|step on) a polymorph trap!$/, () => "変化の罠にかかった！"],
  [/^(You|.+?) touch(?:es)? (.+?) corpse\.$/, (who, what) => `${who === "You" ? "あなた" : arg(who)}は${arg(what)}の死体に触れた。`],
  [/^You (climb|float|fly|crawl|slither) from the (pit|hole)\.$/, (_verb, what) => `${what === "pit" ? "落とし穴" : "穴"}から出た。`],
  [/^(Your |.+?'s )(.+?) fades?\.$/, (whose, item) => `${whose === "Your " ? "あなたの" : `${arg(whose.replace(/'s $/, ""))}の`}${thing(item)}の色があせた。`],
  [/^You find yourself (in the midst|on top) of (.+)\.$/, (_how, what) => `気がつくと${arg(what)}の中にいた。`],
  [/^You find yourself in (an air bubble|mid air)\.$/, (where) => `気がつくと${where === "mid air" ? "空中" : "気泡の中"}にいた。`],
  [/^You find yourself (in|on) (.+)\.$/, (_how, what) => `気がつくと${arg(what)}${_how === "in" ? "の中" : "の上"}にいた。`],
  [/^You find yourself on top of (.+)\.$/, (what) => `気がつくと${arg(what)}の上にいた。`],
  [/^(.+?) (?:box |chest |door )?opens\.$/, (what) => (/(?:box|chest|door|trap)/.test(what) ? `${thing(what)}が開いた。` : "")],
  [/^You (stagger|wobble|flutter|falter)( and get dizzy| and your vision blurs)?\.\.\.$/, (_verb, how) => `よろめいた${how === " and get dizzy" ? "。めまいがする" : how ? "。視界がかすむ" : ""}……`],
  // uhitm.c.
  [/^You begin (striking|bashing) monsters with your (gloved|bare) (.+)\.$/, (how, kind) => `${kind === "gloved" ? "手袋をした手" : "素手"}でモンスターを${how === "striking" ? "打ち" : "殴り"}始めた。`],
  [/^Your (.+?) (?:pass|passes) harmlessly through (.+)\.$/, (what, who) => `${what === "attack" ? "攻撃" : thing(what)}は${who === "you" ? "あなた" : arg(who)}を素通りした。`],
  [/^(.+?)'s (.+?) (?:pass|passes) harmlessly through (.+)\.$/, (whose, what, who) => `${arg(whose)}の${what === "attack" ? "攻撃" : thing(what)}は${who === "you" ? "あなた" : arg(who)}を素通りした。`],
  [/^(.+?) is (on fire|burning|being burned|scalded|frozen solid|coated in frost|struck by lightning|melting|boiling)!$/, (who, how) => {
    const states: Readonly<Record<string, string>> = { "on fire": "燃えている", burning: "燃えている", "being burned": "焼かれている", scalded: "やけどした", "frozen solid": "凍りついた", "coated in frost": "霜に覆われた", "struck by lightning": "雷に打たれた", melting: "溶けている", boiling: "沸騰している" };
    return `${arg(who)}は${states[how]}！`;
  }],
  [/^You and (.+?) don't budge\.$/, (who) => `あなたも${arg(who)}も動かなかった。`],
  // weapon.c, wield.c: welded and wet.
  [/^Since (.+?)'s? weapons? (?:is|are) welded to (.+?),$/, (who) => `${arg(who)}の武器は手に貼りついているので、`],
  [/^(.+?) cannot wield that (.+)\.$/, (who, what) => `${arg(who)}はその${thing(what)}を構えられない。`],
  [/^(.+?)'s (.+?) gets (wet|wetter|moist|drier|dry)\.$/, (who, item, how) => `${arg(who)}の${thing(item)}が${how === "wetter" ? "さらに濡れた" : how === "wet" ? "濡れた" : how === "moist" ? "湿った" : "乾いた"}。`],
  [/^(Your |The )?(.+?) welds? (?:itself|themselves) to your (left |right )?(.+?)!$/, (whose, item) => `${whose === "Your " ? "あなたの" : ""}${thing(item)}は手に貼りついた！`],
  [/^(?:Your )?(.+?) remains? readied\.$/, (what) => `${thing(what)}は準備したままだ。`],
  [/^(?:Your )?(.+?) remains? as secondary weapon\.$/, (what) => `${thing(what)}は予備の武器のままだ。`],
  [/^(.+?) puts on (.+)\.$/, (who, item) => `${arg(who)}は${thing(item)}を身に着けた。`],
  [/^(.+?)'s body reintegrates before your (.+)!$/, (who) => `${arg(who)}の体が目の前で元に戻った！`],
  [/^The (.+?) (?:hit|hits) (.+?)( with [a-z -]*force)?[!.]$/, (what, who) => (lookupNethack5SourceExact(what) === undefined ? "" : `${lookupNethack5SourceExact(what)}が${who === "it" ? "それ" : arg(who)}に当たった。`)],
];

/** Translate an assembled message, or return undefined. */
export function translateLookDescriptionMessage(message: string): string | undefined {
  if (!/^[a-z][a-z' -]*(?: (?:called|named) .+)?$/.test(message) && !/^[A-Z][A-Za-z-]+ (?:called|named) .+$/.test(message)) return undefined;
  return lookDescription(message);
}

// cmd.c: a row of the extended command list ("#name   description") or of the
// key list ("M-p     pray          pray to the gods for help"). The first column
// may be "." or "?", which the sentence-boundary check below would take for two
// messages joined together.
function translateKeyRow(message: string): string | undefined {
  const row = /^(\S+\s{2,}(?:\[[mA]+\]\s+|[\w?#]+\s{2,})?)(\S.*?)\.?$/.exec(message);
  if (!row) return undefined;
  const translated = lookupNethack5SourceExact(row[2]) ?? lookupNethack5SourceExact(`${row[2]}.`);
  return translated === undefined ? undefined : `${row[1]}${translated}`;
}

// mthrowu.c breathwep_name(): what a hallucinating hero sees a monster breathe.
const hallucinatedBreaths: Readonly<Record<string, string>> = {
  missiles: "魔法の矢", asteroids: "小惑星", beads: "ビーズ", bubbles: "泡", butterflies: "蝶", champagne: "シャンパン", chaos: "混沌", coins: "硬貨", "cotton candy": "綿あめ", crumbs: "パンくず", "dark matter": "暗黒物質",
  darkness: "闇", data: "データ", "dust specks": "ほこり", emoticons: "顔文字", emotions: "感情", entropy: "エントロピー", flowers: "花", foam: "泡", fog: "霧", "gamma rays": "ガンマ線", gelatin: "ゼラチン",
  gemstones: "宝石", ghosts: "幽霊", "glass shards": "ガラスの破片", glitter: "ラメ", "good vibes": "いい感じの雰囲気", gravel: "砂利", gravity: "重力", gravy: "グレイビーソース", grawlixes: "伏せ字", "holy light": "聖なる光",
  hornets: "スズメバチ", "hot air": "熱風", hyphens: "ハイフン", hypnosis: "催眠", infrared: "赤外線", insects: "虫", jargon: "専門用語", "laser beams": "レーザー光線", leaves: "木の葉", lightening: "稲光", "logic gates": "論理ゲート",
  magma: "マグマ", marbles: "ビー玉", mathematics: "数学", megabytes: "メガバイト", "metal shavings": "金属の削りくず", metapatterns: "メタパターン", meteors: "流星", mist: "霧", mud: "泥", music: "音楽", nanites: "ナノマシン",
  needles: "針", noise: "雑音", nostalgia: "郷愁", oil: "油", paint: "ペンキ", photons: "光子", pixels: "ピクセル", plasma: "プラズマ", polarity: "極性", powder: "粉", powerups: "パワーアップ", "prismatic light": "虹色の光",
  "pure logic": "純粋な論理", purple: "紫色", "radio waves": "電波", rainbows: "虹", "rock music": "ロック音楽", "rocket fuel": "ロケット燃料", rope: "ロープ", sadness: "悲しみ", salt: "塩", sand: "砂", scrolls: "巻物", sludge: "ヘドロ",
  smileys: "スマイルマーク", snowflakes: "雪の結晶", sparkles: "きらめき", specularity: "鏡面反射", spores: "胞子", stars: "星", steam: "蒸気", tetrahedrons: "四面体", text: "文字", "the past": "過去", tornadoes: "竜巻",
  "toxic waste": "有毒廃棄物", "ultraviolet light": "紫外線", viruses: "ウイルス", water: "水", waveforms: "波形", wind: "風", "X-rays": "X線", zorkmids: "ゾークミド",
  frost: "冷気", fire: "炎", "sleep gas": "睡眠ガス", disintegration: "分解", lightning: "稲妻", "poison gas": "毒ガス", acid: "酸",
};
const breathName = (what: string): string => own(hallucinatedBreaths, what) ?? arg(what);

// Run before the general templates, whose "The <missile> hits <target>" would otherwise take these.
const realBlasts = "(?!missiles\\b|fire\\b|frost\\b|sleep gas\\b|disintegration\\b|lightning\\b|poison gas\\b|acid\\b)";
const blastName = (what: string): string => own(hallucinatedBreaths, what) ?? what;
const earlyTemplates: ReadonlyArray<readonly [RegExp, (...parts: string[]) => string]> = [
  // zap.c: a hallucinating hero sees rays of anything at all.
  [new RegExp(`^The blast of ${realBlasts}(.+?) bounces!$`), (what) => `${blastName(what)}の爆風が跳ね返った！`],
  [new RegExp(`^The blast of ${realBlasts}(.+?) misses (.+)\\.$`), (what, who) => `${blastName(what)}の爆風は${arg(who)}に当たらなかった。`],
  [new RegExp(`^The blast of ${realBlasts}(.+?) hits (.+)\\.$`), (what, who) => `${blastName(what)}の爆風が${who === "it" ? "それ" : arg(who)}に当たった。`],
  [new RegExp(`^(.+?) is killed by the blast of ${realBlasts}(.+)!$`), (who, what) => `${arg(who)}は${blastName(what)}の爆風で殺された！`],
  [/^(.+?) hits (.+?) but passes harmlessly through (?:it|him|her|them)\.$/, (what, who) => `${thing(what)}は${arg(who)}に当たったが、すり抜けた。`],
  [/^You are hit by a falling (.+)!$/, (what) => `落ちてきた${arg(`the ${what}`)}に当たった！`],
  [/^You feel like a new (man|woman|elf|dwarf|gnome|orc|human)!$/, (who) => {
    const kinds: Readonly<Record<string, string>> = { man: "男", woman: "女", elf: "エルフ", dwarf: "ドワーフ", gnome: "ノーム", orc: "オーク", human: "人間" };
    return `新しい${kinds[who]}になった気分だ！`;
  }],
  [/^Your help is urgently needed at (.+)!$/, (home) => `${own(questPlaces, home) ?? arg(home)}であなたの助けが緊急に必要だ！`],
  [/^(.+?), asleep(?:, in a cloud of (.+))?$/, (who, cloud) => `${arg(`the ${who}`)}（眠っている${cloud ? `、${arg(cloud)}の雲の中` : ""}）`],
  [/^Choose (a color|attribute) for when title is '(.+)':$/, (what, title) => `称号が「${title}」のときの${what === "attribute" ? "属性" : "色"}を選んでください：`],
  [/^Choose (a color|attribute) for conditions (.+):$/, (what, condition) => {
    const conditions: Readonly<Record<string, string>> = { Stone: "石化", Slime: "粘液化", Strngl: "窒息", FoodPois: "食中毒", TermIll: "不治の病", Blind: "盲目", Deaf: "聴覚喪失", Stun: "朦朧", Conf: "混乱", Hallu: "幻覚", Lev: "浮遊", Fly: "飛行", Ride: "騎乗", Bare: "素手", Busy: "行動中", Elbere: "エルベレス", Glow: "発光", Grab: "つかまれ", Held: "拘束", IceSlp: "氷で滑る", Inlava: "溶岩の中", Parlyz: "麻痺", Slp: "睡眠", Slip: "滑りやすい", Submrg: "水没", Tether: "つながれ", Trap: "罠", Unconc: "気絶", Woozy: "ふらつき", Wither: "衰弱" };
    return `状態「${own(conditions, condition) ?? condition}」のときの${what === "attribute" ? "属性" : "色"}を選んでください：`;
  }],
  // The letters offered can include "? ", which looks like the end of a sentence.
  [/^What kinds of thing do you want to (drop|take off)\? (\[.*\])$/, (verb, letters) => `どの種類の物を${verb === "drop" ? "置き" : "脱ぎ"}ますか？ ${letters}`],
  [/^(.+?) shines (brilliantly|brightly|faintly|softly) in (.+?)'s (\S+)!$/, (item, how, who, part) => {
    const ways: Readonly<Record<string, string>> = { brilliantly: "まばゆく", brightly: "明るく", faintly: "かすかに", softly: "やわらかく" };
    return `${thing(item.replace(/^The /, "the "))}は${arg(who.replace(/^The /, "the "))}の${arg(part)}の中で${ways[how]}輝いた！`;
  }],
  [/^(.+?) \(invalid target\) \(no travel path\)$/, (what) => `${describePlace(what)}（対象にできない）（移動経路なし）`],
  // getpos.c: autodescribe with a compass offset, "(2north,3east): doorway."
  [/^\(([^()]*?(?:north|south|east|west)[^()]*)\): (.+?)\.?$/, (offset, what) => {
    const directions = offset.replace(/north/g, "北").replace(/south/g, "南").replace(/east/g, "東").replace(/west/g, "西").replace(/,/g, "、");
    return `（${directions}）：${describePlace(what)}`;
  }],
  [/^The blast of (.+?) hits (.+)!$/, (what, who) => `${breathName(what)}の爆風が${who === "you" ? "あなた" : arg(who)}に当たった！`],
  [/^(.+?) breathes (?:a blast of |an? )?(.+)!$/, (who, what) => `${arg(who)}は${what === "disintegration blast" ? "分解の息" : breathName(what)}を吐いた！`],
  [/^(.+?) is caught in (?:the |a |an )?(.+?) field!$/, (who, kind) => `${arg(who)}は${kind === "death" ? "死" : arg(kind)}の場に巻き込まれた！`],
];

export function translateAssembledMessage(message: string): string | undefined {
  const keyRow = translateKeyRow(message);
  if (keyRow !== undefined) return keyRow;
  for (const [pattern, render] of earlyTemplates) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  for (const [pattern, render] of [...assembledMessageTemplates, ...statusAndWhistleTemplates]) {
    const match = pattern.exec(message);
    // A capture spanning a sentence boundary means several messages were joined.
    if (!match || match.slice(1).some((part) => part !== undefined && /[.!?]\s/.test(part))) continue;
    const result = render(...match.slice(1));
    if (result) return result;
  }
  // Last: a look description would otherwise take any lowercase sentence that
  // names an item ahead of the templates above.
  return translateLookDescriptionMessage(message);
}
