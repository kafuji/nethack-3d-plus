import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { deityNames } from "./intro-story";
import { translateSkillLegend, translateSkillName, translateSpellName } from "./game-skills";
import { lookupNethack5SourceExact, rayNames, translateMessageArgument as arg } from "./nethack5-source-messages";
import { translateGroundObject } from "./game-ground";
// Only called at run time, after both modules have loaded.
import { presentGameMessage } from "./message-presentation";

// Messages that NetHack assembles from several pieces (verbs chosen at
// runtime, vtense(), exclam(), shopkeeper honorifics, occupation text, ...).
// Each template recognizes the complete assembled sentence for one source
// construction; every captured value is still translated only if recognized.

type Template = readonly [RegExp, (...parts: string[]) => string];

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
  "forcing the lock": "錠をこじ開ける", "picking the lock": "錠を外す", "unlocking the door": "ドアの鍵を開ける", "locking the door": "ドアに鍵をかける",
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
  fountain: "噴水", water: "水", lava: "溶岩", air: "空中", "air bubble": "気泡", cloud: "雲", wall: "壁", bottom: "底", maw: "胃袋", husk: "抜け殻",
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
const heroRoles: Readonly<Record<string, string>> = {
  archeologist: "考古学者", barbarian: "蛮族", caveman: "原始人", cavewoman: "原始人", healer: "治療師", knight: "騎士", monk: "僧侶",
  priest: "司祭", priestess: "女司祭", rogue: "盗賊", ranger: "レンジャー", samurai: "侍", tourist: "観光客", valkyrie: "ワルキューレ", wizard: "魔法使い",
};
// Bare look/autodescribe descriptions: "tame little dog called Hachi",
// "human samurai called Kafujinho", "doorway". Unknown text stays English.
const lookDescription = (text: string): string | undefined => {
  const called = /^(.+?) (called|named) (.+)$/.exec(text);
  const base = called ? called[1] : text;
  let name: string | undefined;
  const hero = /^(\S+) (\S+)$/.exec(base);
  if (hero && own(heroRaces, hero[1]) && own(heroRoles, hero[2])) name = `${heroRaces[hero[1]]}の${heroRoles[hero[2]]}`;
  if (name === undefined) {
    const monster = translateMonsterName(`the ${base}`, "ja");
    if (monster !== `the ${base}`) name = monster;
  }
  if (name === undefined && !called) {
    const ground = translateGroundObject(base, "ja");
    if (ground !== base) name = ground;
  }
  if (name === undefined) return undefined;
  return called ? `${called[3]}という${name}` : name;
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
  [/^You enter (.+?'s?) (.+?)!$/, (keeper, type) => `${owner(keeper)}の${shopType(type)}に入った！`],
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
  // cmd.c: a row of the extended command list ("#name   description") or of
  // the key list ("M-p     pray          pray to the gods for help").
  [/^(\S+\s+(?:\[[mA]+\]\s+|[\w?#]+\s{2,})?)(\S.*)$/, (name, description) => {
    const translated = lookupNethack5SourceExact(description);
    return translated === undefined ? "" : `${name}${translated}`;
  }],
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
    const place = lookupNethack5SourceExact(what) ?? translateGroundObject(what, "ja");
    return `${place !== what ? place : arg(what)}（移動経路なし）`;
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
    const schools: Readonly<Record<string, string>> = { attack: "攻撃", healing: "回復", divination: "予知", enchantment: "付呪", clerical: "僧侶", escape: "脱出", matter: "物質" };
    return `${spellName(spell)}　レベル${level}　${schools[school]}　失敗率${fail}${retention ? `　保持率${retention}` : ""}`;
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
  [/^(\^\S+)\s+(.+) \(#(\w+)\)\.$/, (key, description, command) => `${key} ${lookupNethack5SourceExact(description) ?? arg(description)}（#${command}）。`],
  [/^Set (\S+) to what\?$/, (option) => `${option} を何に設定しますか？`],
  [/^You ready: ([A-Za-z]) - (.+)\.$/, (letter, item) => `${letter} - ${thing(item)}を準備した。`],
  // trap.c squeaky board: "squeaks a D flat note".
  [/^A board beneath (you|.+?) squeaks? an? (.+?)(?: note)?(?: loudly)?\.$/, (who, note) => `${who === "you" ? "足元" : `${arg(who)}の足元`}の床板が${note}の音できしんだ。`],
  [/^You hear an? (.+?)(?: note)? squeak in the distance\.$/, (note) => `遠くで床板が${note}の音できしむのが聞こえた。`],
  // spell.c: studying with a known magical ink.
  [/^The( magical)? ink in this spellbook is (.+)\.$/, (magical, state) => {
    const states: Readonly<Record<string, string>> = { fresh: "新しい", "slightly faded": "少し色あせている", "very faded": "とても色あせている", "extremely faded": "ひどく色あせている", "barely visible": "かろうじて見える程度だ" };
    return `この魔法書の${magical ? "魔法の" : ""}インクは${states[state] ?? arg(state)}。`;
  }],
  [/^(.+?) is caught in the (.+)!$/, (who, blast) => `${arg(who)}は${blast === "magical blast" ? "魔法の爆発" : arg(blast)}に巻き込まれた！`],
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
  [/^Added hilite (.+)$/, (rule) => `強調表示を追加した：${rule}`],
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
  [/^(?:The )?(\S+?)s aren't able to use two weapons at once\.$/, (role) => `${arg(role)}は二つの武器を同時に使えない。`],
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
];

/** Translate an assembled message, or return undefined. */
export function translateLookDescriptionMessage(message: string): string | undefined {
  if (!/^[a-z][a-z' -]*(?: (?:called|named) .+)?$/.test(message)) return undefined;
  return lookDescription(message);
}

export function translateAssembledMessage(message: string): string | undefined {
  for (const [pattern, render] of [...assembledMessageTemplates, ...statusAndWhistleTemplates]) {
    const match = pattern.exec(message);
    // A capture spanning a sentence boundary means several messages were joined.
    if (!match || match.slice(1).some((part) => part !== undefined && /[.!?]\s/.test(part))) continue;
    const result = render(...match.slice(1));
    if (result) return result;
  }
  // Last: a look description can reach the JNetHack item fallback, which would
  // otherwise take any lowercase sentence it knows ahead of the templates above.
  return translateLookDescriptionMessage(message);
}
