import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { deityNames } from "./intro-story";
import { translateSkillName } from "./game-skills";
import { rayNames, translateMessageArgument as arg } from "./nethack5-source-messages";
import { translateGroundObject } from "./game-ground";

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
  helm: "兜", boots: "ブーツ", shoes: "靴", gloves: "手袋", gauntlets: "小手", shield: "盾", shirt: "シャツ",
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

// hcolor() results; a hallucinatory color is left untranslated.
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

/** Translate an assembled message, or return undefined. */
export function translateLookDescriptionMessage(message: string): string | undefined {
  if (!/^[a-z][a-z' -]*(?: (?:called|named) .+)?$/.test(message)) return undefined;
  return lookDescription(message);
}

export function translateAssembledMessage(message: string): string | undefined {
  const look = translateLookDescriptionMessage(message);
  if (look !== undefined) return look;
  for (const [pattern, render] of assembledMessageTemplates) {
    const match = pattern.exec(message);
    // A capture spanning a sentence boundary means several messages were joined.
    if (!match || match.slice(1).some((part) => part !== undefined && /[.!?]\s/.test(part))) continue;
    const result = render(...match.slice(1));
    if (result) return result;
  }
  return undefined;
}
