import type { SupportedLocale } from "./core";
import { translateCharacterLine, translateIdentityWord } from "./character-text";
import { translateGameLocation } from "./game-location";
import { translatePlayerRank } from "./player-title";
import { translateMessageArgument } from "./nethack5-source-messages";
import { translateMonsterName } from "./game-monsters";
import { lookupImportedJapaneseEntity } from "./imported-entities";

// NetHack 5's conduct and achievement reports are assembled from fragments
// in insight.c. Only match complete known lines; preserve names and annotations.
const labels: Readonly<Record<string, string>> = {
  "Voluntary challenges:": "自主的な挑戦：", "Achievements:": "達成事項：", "Achievement:": "達成事項：",
  "Character rerolling was not enabled.": "キャラクターの能力値の振り直しは無効でした。",
  "Your character was not rerolled.": "キャラクターの能力値を振り直しませんでした。",
  "Recorded dungeon visits": "記録されたダンジョンの訪問先",
  "From this run's timeline; the native dungeon overview was not available.": "この冒険の記録から表示しています。ゲーム本来のダンジョン概要は保存されていません。",
  "Oracle of Delphi.": "デルフィの神託所。", "Solved.": "解決済み。", "Unsolved.": "未解決。",
  "A very big room.": "とても大きな部屋。", "A primitive area.": "原始的な場所。",
  "Home.": "故郷。", "Home (no way back...).": "故郷（戻る道はない……）。",
  "Fort Ludios.": "ルディオス砦。", "The castle.": "城。", "Valley of the Dead.": "死者の谷。",
  "Gateway to Moloch's Sanctum.": "モロクの聖域への入口。", "Moloch's Sanctum.": "モロクの聖域。",
  "Final resting place for": "ここで最期を迎えた者",
  "NetHack Help": "NetHack ヘルプ",
};
const been: Readonly<Record<string, string>> = {
  "blind from birth": "生まれつき目が見えませんでした",
  "deaf from birth": "生まれつき耳が聞こえませんでした",
  "faithfully nudist": "一貫して防具を身に着けませんでした",
  "vegetarian": "菜食を守りました", "an atheist": "無神論を貫きました",
  "a pacifist": "不殺を貫きました", "illiterate": "文字を読まず、刻みもしませんでした",
};
const never: Readonly<Record<string, string>> = {
  "hit with a wielded weapon": "武器を手に持って攻撃を命中させたことはありません",
  "had a pet": "ペットを連れたことはありません",
  "genocided any monsters": "モンスターの種族を抹殺したことはありません",
  "polymorphed an object": "物を変化させたことはありません",
  "changed form": "姿を変えたことはありません",
};
const achievements: Readonly<Record<string, string>> = {
  "followed a strict vegan diet": "完全菜食を守りました",
  "used no wishes": "願いを一度も使いませんでした",
  "entered the Gnomish Mines": "ノームの鉱山に入りました", "entered Minetown": "鉱山町に入りました",
  "entered a shop": "店に入りました", "entered a temple": "寺院に入りました",
  "consulted the Oracle of Delphi": "デルフィの神託を受けました", "read from a Discworld novel": "ディスクワールドの小説を読みました",
  "entered Sokoban": "倉庫番に入りました", "completed Sokoban": "倉庫番を攻略しました",
  "completed the Gnomish Mines": "ノームの鉱山を攻略しました", "entered the Big Room": "大部屋に入りました",
  "defeated Medusa": "メデューサを倒しました", "learned the tune to open and close the Castle's drawbridge": "城の跳ね橋を開閉する旋律を覚えました",
  "entered Gehennom": "ゲヘナに入りました", "gained access to Moloch's Sanctum": "モロクの聖域への道を開きました",
  "reached the Elemental Planes": "元素界に到達しました", "reached the Astral Plane": "アストラル界に到達しました",
};
const elapsed = (value: string): string => value === "once" ? "1回" : value === "twice" ? "2回" : value === "thrice" ? "3回" : `${value.replace(/ times$/, "")}回`;
const present = (table: Readonly<Record<string, string>>, value: string): string | undefined => Object.prototype.hasOwnProperty.call(table, value) ? `${table[value]}。` : undefined;
const features: Readonly<Record<string, string>> = {
  shop: "店", temple: "寺院", altar: "祭壇", throne: "玉座", fountain: "泉", sink: "流し", grave: "墓", tree: "木",
  "general store": "雑貨店", "untended shop": "店主のいない店", "armor shop": "防具店", "scroll shop": "巻物店", "potion shop": "ポーション店",
  "weapon shop": "武器店", "food shop": "食料品店", "ring shop": "指輪店", "wand shop": "ワンド店", "hardware store": "金物屋", "tool shop": "道具屋",
  bookstore: "本屋", "health food store": "健康食品店", "vegetarian food shop": "菜食料理店", "lighting store": "照明店", "lighting shop": "照明店",
  "used armor dealership": "中古防具店", "liquor emporium": "酒屋", "antique weapons outlet": "骨董武器店", delicatessen: "総菜屋",
  jewelers: "宝石店", "quality apparel and accessories": "高級服飾店", "rare books": "稀覯本店",
};

function translateOverviewFeatures(line: string): string | undefined {
  if (!line.endsWith(".")) return undefined;
  const parts = line.slice(0, -1).split(/, | and /);
  const translated: string[] = [];
  for (const part of parts) {
    const match = /^(a|an|some|many) (.+?)(?: to (.+))?$/i.exec(part);
    if (!match) return undefined;
    const noun = match[2].toLowerCase();
    const singular = Object.prototype.hasOwnProperty.call(features, noun) ? noun : noun.endsWith("s") ? noun.slice(0, -1) : noun;
    if (!Object.prototype.hasOwnProperty.call(features, singular)) return undefined;
    const amount = /^(a|an)$/i.test(match[1]) ? "1つ" : /^some$/i.test(match[1]) ? "いくつか" : "多数";
    translated.push(`${features[singular]}${match[3] ? `（${match[3]}に捧げられた）` : ""}が${amount}`);
  }
  return translated.length ? `${translated.join("、")}。` : undefined;
}

// end.c done_in_by(): "a hallucinogen-distorted werejackal",
// "an invisible chameleon imitating a jackal", "a vampire lord in bat form".
const killerModifiers: Readonly<Record<string, string>> = { invisible: "透明な", "hallucinogen-distorted": "幻覚で歪んだ" };
function translateKiller(text: string): string {
  const m = /^((?:the |an? )?)((?:(?:invisible|hallucinogen-distorted) )*)(.+?)(?: (imitating|disguised as|in) (.+?)( form)?)?$/.exec(text);
  if (!m || (m[4] === "in") !== Boolean(m[6])) return translateMessageArgument(text);
  const real = translateMessageArgument(`${m[1] || "a "}${m[3]}`);
  if (real === `${m[1] || "a "}${m[3]}`) return translateMessageArgument(text);
  const modifiers = m[2].trim() ? m[2].trim().split(" ").map((word) => killerModifiers[word]).join("") : "";
  if (!m[4]) return `${modifiers}${real}`;
  const shape = translateMessageArgument(m[4] === "in" ? `a ${m[5]}` : m[5]);
  if (shape === m[5] || shape === `a ${m[5]}`) return translateMessageArgument(text);
  return `${shape}${m[4] === "in" ? "の姿の" : "に化けた"}${modifiers}${real}`;
}

// insight.c list_vanquished(): "a newt", "  7 gnomes", "the Oracle (twice)".
function vanquishedMonster(name: string, plural: boolean): string | undefined {
  const candidates = [name];
  if (plural) {
    const forms: readonly [RegExp, string][] = [
      [/men$/, "man"], [/ves$/, "f"], [/([^aeiou])ies$/, "$1y"], [/(s|x|z|ch|sh)es$/, "$1"], [/s$/, ""],
      [/mumakil$/, "mumak"], [/erinyes$/, "erinys"], [/vortices$/, "vortex"], [/homunculi$/, "homunculus"], [/cyclopes$/, "cyclops"],
    ];
    for (const [re, to] of forms) if (re.test(name)) candidates.push(name.replace(re, to));
  }
  for (const candidate of candidates) {
    const translated = translateMonsterName(`a ${candidate}`, "ja");
    if (translated !== `a ${candidate}`) return translated;
  }
  return undefined;
}
function translateVanquished(line: string): string | undefined {
  let m = /^(a|an|\d+) (.+)$/.exec(line);
  if (m) {
    const name = vanquishedMonster(m[2], !/^an?$/.test(m[1]));
    return name === undefined ? undefined : /^an?$/.test(m[1]) ? name : `${name} ×${m[1]}`;
  }
  m = /^(the )?(.+?)(?: \((twice|thrice|\d+ times)\))?$/.exec(line);
  if (!m || (!m[1] && !m[3] && !/^[A-Z]/.test(m[2]))) return undefined;
  const name = translateMonsterName(`the ${m[2]}`, "ja");
  if (name === `the ${m[2]}`) return undefined;
  return `${name}${m[3] ? ` ×${m[3] === "twice" ? 2 : m[3] === "thrice" ? 3 : m[3].replace(/ times$/, "")}` : ""}`;
}

// end.c ends[]: "You died in ...", "... when you were crushed."
const endings: Readonly<Record<string, string>> = {
  died: "死んだ", choked: "窒息した", "were poisoned": "毒で死んだ", starved: "餓死した", drowned: "溺死した", burned: "焼死した",
  "dissolved in the lava": "溶岩に溶けた", "were crushed": "押しつぶされた", "turned to stone": "石になった",
  "turned into slime": "スライムになった", "were genocided": "抹殺された", panicked: "パニックに陥った", "were tricked": "だまされた",
  quit: "冒険をやめた", escaped: "脱出した", ascended: "昇天した", "passed away": "この世を去った",
};
const farewells: Readonly<Record<string, string>> = { Goodbye: "さようなら", Farvel: "さらば", Aloha: "アロハ", Sayonara: "さらば" };
const ownValue = (table: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

// end.c really_done() summary and insight.c chronicle (livelog) events.
function translateEndSummary(line: string, locale: SupportedLocale): string | undefined {
  let m = /^(Goodbye|Farvel|Aloha|Sayonara) (.+) the (.+?)\.\.\.$/.exec(line);
  if (m) return `${farewells[m[1]]}、${translatePlayerRank(m[3], locale)}の${m[2]}……`;
  m = /^You (.+?) (?:in (.+?)(?: on dungeon level (-?\d+))?|beyond the confines of the dungeon) with (\d+) points?,$/.exec(line);
  if (m && ownValue(endings, m[1])) {
    const where = m[2] ? `${translateGameLocation(m[2].replace(/^The /, "the "), locale)}${m[3] ? `の地下${m[3]}階` : ""}で` : "ダンジョンの外で";
    return `あなたは${where}${endings[m[1]]}（${m[4]}ポイント）、`;
  }
  m = /^and (\d+) pieces? of gold, after (\d+) moves?\.$/.exec(line);
  if (m) return `${m[1]}枚の金貨を持って、${m[2]}歩動いた。`;
  m = /^You were level (\d+) with a maximum of (\d+) hit points? when you (.+)\.$/.exec(line);
  if (m && ownValue(endings, m[3])) return `${endings[m[3]]}ときのレベルは${m[1]}、最大HPは${m[2]}だった。`;
  // Pets that escaped with the hero are listed on a line of their own.
  m = /^You((?: and .+?)+)$/.exec(line);
  if (m && !/ with \d+ points?,$/.test(line)) {
    const pets = m[1].split(" and ").slice(1).map((pet) => pet === "Schroedinger's cat" ? "シュレディンガーの猫" : translateMonsterName(pet, locale));
    return `あなたと${pets.join("と")}は`;
  }
  m = /^(?:You )?(went to your reward|escaped from the dungeon) with (\d+) points?,$/.exec(line);
  if (m) return `${line.startsWith("You") ? "あなたは" : ""}${m[1] === "escaped from the dungeon" ? "ダンジョンから脱出した" : "報いを受けに旅立った"}（${m[2]}ポイント）、`;
  m = /^(\d+) (.+) \(worth (\d+) (.+?)\),$/.exec(line);
  if (m) {
    const item = translateMessageArgument(`${m[1]} ${m[2]}`);
    if (item !== `${m[1]} ${m[2]}`) return `${item}（${m[3]}ゾークミド相当）、`;
  }
  m = /^Game began (\S+ \S+), ended (\S+ \S+)\.$/.exec(line);
  if (m) return `ゲーム開始 ${m[1]}、終了 ${m[2]}。`;
  m = /^(.+), (lawful|neutral|chaotic|unaligned) (?:(male|female|neuter) )?(\S+) (.+)$/.exec(line);
  if (m) {
    const words = [m[2], m[3], m[4], m[5]].filter((word): word is string => word !== undefined).map((word) => translateIdentityWord(word));
    if (!words.includes(undefined)) return `${m[1]}、${words.join("の")}`;
  }
  if (line === "Major events:") return "主な出来事：";
  if (line === "Logged events:") return "記録された出来事：";
  if (line === "Turn") return "ターン";
  m = /^(\d+): (.+)$/.exec(line);
  if (m) {
    const event = translateChronicleEvent(m[2], locale);
    if (event !== undefined) return `${m[1]}：${event}`;
  }
  return undefined;
}

const chronicleAchievements: Readonly<Record<string, string>> = {
  "acquired the Bell of Opening": "開門の鐘を手に入れた", "entered Gehennom": "ゲヘナに入った",
  "acquired the Candelabrum of Invocation": "召喚の燭台を手に入れた", "acquired the Book of the Dead": "死者の書を手に入れた",
  "performed the invocation": "儀式を執り行った", "acquired The Amulet of Yendor": "イェンダーの魔除けを手に入れた",
  "entered the Elemental Planes": "元素界に入った", "entered the Astral Plane": "アストラル界に入った", ascended: "昇天した",
  "acquired the Mines' End luckstone": "鉱山の底の幸運の石を手に入れた", "acquired the Sokoban bag of holding": "倉庫番の賞品の魔法の袋を手に入れた",
  "acquired the Sokoban amulet of reflection": "倉庫番の賞品の反射のお守りを手に入れた", "killed Medusa": "メデューサを倒した",
  "entered the Gnomish Mines": "ノームの鉱山に入った", "reached Mine Town": "鉱山町に着いた", "entered a shop": "店に入った",
  "entered a temple": "寺院に入った", "consulted the Oracle": "神託を受けた", "read a Discworld novel": "ディスクワールドの小説を読んだ",
  "entered Sokoban": "倉庫番に入った", "entered the Bigroom": "大部屋に入った", "killed for the first time": "初めて生き物を殺した",
  "declined to make a wish": "願いを断った", "declined to perform genocide": "抹殺を断った", "lost all experience": "経験をすべて失った",
  "rejected atheism with a prayer": "祈りによって無神論を捨てた", "rejected atheism by turning undead": "アンデッド退散によって無神論を捨てた",
  "ate for the first time (spinach)": "初めて物を食べた（ほうれん草）",
};
function translateChronicleEvent(event: string, locale: SupportedLocale): string | undefined {
  const fixed = ownValue(chronicleAchievements, event);
  if (fixed !== undefined) return fixed;
  let m = /^(.+) the (lawful|neutral|chaotic) (?:(male|female|neuter) )?(\S+) (.+) entered the dungeon$/.exec(event);
  if (m) {
    const words = [m[2], m[3], m[4], m[5]].filter((word): word is string => word !== undefined).map((word) => translateIdentityWord(word));
    if (!words.includes(undefined)) return `${words.join("の")}の${m[1]}がダンジョンに入った`;
  }
  m = /^attained the rank of (.+) \(level (\d+)\)$/.exec(event);
  if (m) return `${translatePlayerRank(m[1], locale)}の称号を得た（レベル${m[2]}）`;
  m = /^(re)?gained experience level (\d+)$/.exec(event);
  if (m) return `経験レベル${m[2]}に${m[1] ? "戻った" : "上がった"}`;
  m = /^lost experience level (\d+)$/.exec(event);
  if (m) return `経験レベル${m[1]}を失った`;
  m = /^obtained (?:his|her|their) first pet \((.+)\)$/.exec(event);
  if (m) return `初めてのペット（${translateMessageArgument(m[1])}）を得た`;
  m = /^(?:ate for the first time - (.+)|ate for the first time \((.+)\)|tasted meat \((.+)\) for the first time)$/.exec(event);
  if (m) return `${m[3] ? "初めて肉を口にした" : "初めて物を食べた"}（${translateMessageArgument(m[1] ?? m[2] ?? m[3])}）`;
  m = /^(made (?:his|her|their) first (artifact )?wish - |wished for )(.+)$/.exec(event);
  if (m) return `${m[1].startsWith("made") ? `初めて${m[2] ? "アーティファクトを" : ""}願った` : "願った"}：${m[3]}`;
  m = /^genocided (.+)$/.exec(event);
  if (m) {
    const name = vanquishedMonster(m[1], true);
    if (name !== undefined) return `${name}を抹殺した`;
  }
  m = /^found (.+)$/.exec(event);
  if (m) {
    const item = translateMessageArgument(m[1]);
    if (item !== m[1]) return `${item}を見つけた`;
  }
  return undefined;
}

function translateContent(line: string, locale: SupportedLocale): string {
  const exact = present(labels, line);
  // Labels already contain their own punctuation (or intentionally none).
  if (exact !== undefined) return labels[line];
  let m = /^You (?:have been|were) (.+)\.$/.exec(line);
  if (m) { const result = present(been, m[1]); if (result) return result; }
  m = /^You (?:have never|never) (.+)\.$/.exec(line);
  if (m) { const result = present(never, m[1]); if (result) return result; }
  m = /^You (?:have )?(.+)\.$/.exec(line);
  if (m) { const result = present(achievements, m[1]); if (result) return result; }
  if (/^You (?:have gone|went) without food\.$/.test(line)) return "食べ物を口にしませんでした。";
  if (/^You (?:have gone|went) without any armor\.$/.test(line)) return "防具を一切着けずに過ごしました。";
  if (/^You (?:are exploring|explored) without being able to see\.$/.test(line)) return "目が見えないまま探索しました。";
  if (/^You (?:started|started out) without possessions\.$/.test(line)) return "所持品を持たずに冒険を始めました。";
  if (/^You (?:have not|haven't|did not) wish(?:ed)? for any artifacts\.$/.test(line)) return "アーティファクトを願ったことはありません。";
  if (/^You (?:have not|haven't|did not) violat(?:ed|e) any of the special Sokoban rules\.$/.test(line)) return "倉庫番の特別ルールに一度も違反していません。";
  m = /^Your character was rerolled (once|twice|thrice|\d+ times)\.$/.exec(line);
  if (m) return `キャラクターの能力値を${elapsed(m[1])}振り直しました。`;
  m = /^You (?:have )?genocided (\d+) types? of monsters?\.$/.exec(line);
  if (m) return `${m[1]}種類のモンスターを抹殺しました。`;
  m = /^You (?:have )?used (\d+) wish(?:es)?(?: \((all |both |\d+ )?for (an artifact|artifacts)\))?\.$/.exec(line);
  if (m) {
    const art = m[3] ? `（${m[2] === "all " ? "すべて" : m[2] === "both " ? "両方" : m[2] ? m[2].trim() + "回" : "1回"}はアーティファクトを願った）` : "";
    return `願いを${m[1]}回使いました${art}。`;
  }
  m = /^You (?:have )?violated the special Sokoban rules (once|twice|thrice|\d+ times)\.$/.exec(line);
  if (m) return `倉庫番の特別ルールに${elapsed(m[1])}違反しました。`;
  m = /^You (?:have )?attained the rank of (.+)\.$/.exec(line);
  if (m) return `${translatePlayerRank(m[1], locale)}の称号を得ました。`;
  m = /^You (have|had|have handled|handled|have obtained|had obtained|delivered) (the Bell of Opening|the Candelabrum of Invocation|the Book of the Dead|the Amulet of Yendor)\.$/.exec(line);
  if (m) {
    const objects: Readonly<Record<string, string>> = { "the Bell of Opening": "開門の鐘", "the Candelabrum of Invocation": "召喚の燭台", "the Book of the Dead": "死者の書", "the Amulet of Yendor": "イェンダーの魔除け" };
    const action = m[1] === "have" ? "を持っています" : m[1] === "had" ? "を持っていました" : m[1].includes("handled") ? "を手にしたことがあります" : m[1] === "delivered" ? "を届けました" : "を手に入れました";
    return `${objects[m[2]]}${action}。`;
  }
  if (line === "You ascended!") return "昇天しました！";

  m = /^(?:The )?(.+?):(?: levels (-?\d+) (to|up to) (-?\d+))?$/.exec(line);
  if (m) {
    const location = translateGameLocation(m[1], locale);
    if (location !== m[1]) return `${location}：${m[2] ? ` ${m[2]}階から${m[4]}階${m[3] === "up to" ? "へ上る" : ""}` : ""}`;
  }
  m = /^Level (-?\d+):(.*)$/.exec(line);
  if (m) {
    const here = / <- You (are|were|left from) here\.$/.exec(m[2]);
    const rest = here ? m[2].slice(0, -here[0].length) : m[2];
    return `${m[1]}階：${rest}${here ? ` ← ${here[1] === "are" ? "現在地" : here[1] === "were" ? "ここにいました" : "ここから脱出しました"}。` : ""}`;
  }
  // Bones list under "Final resting place for": "you, killed by a fox."
  m = /^(you|.+?), (killed by|choked on|poisoned by|petrified by|crushed to death by|burned by|drowned in|dissolved in|zapped (?:him|her)self with) (.+?)([,.])$/.exec(line);
  if (m) {
    const how: Readonly<Record<string, string>> = {
      "killed by": "に殺された", "choked on": "を喉に詰まらせた", "poisoned by": "の毒で死んだ", "petrified by": "に石化された",
      "crushed to death by": "に押しつぶされた", "burned by": "に焼かれた", "drowned in": "で溺れた", "dissolved in": "に溶かされた",
    };
    const who = m[1] === "you" ? "あなた" : m[1];
    const cause = translateKiller(m[3]);
    const action = how[m[2]] ?? "で自滅した";
    return `${who}（${cause}${action}）${m[4] === "," ? "、" : "。"}`;
  }
  m = /^(Sealed portal|Portal|Connection|One way stairs up|One way stairs down|Stairs up|Stairs down) to (.+?)(?:, level (-?\d+))?\.$/.exec(line);
  if (m) {
    const type: Readonly<Record<string, string>> = { "Sealed portal": "封印されたポータル", Portal: "ポータル", Connection: "通路", "One way stairs up": "片道の上り階段", "One way stairs down": "片道の下り階段", "Stairs up": "上り階段", "Stairs down": "下り階段" };
    return `${translateGameLocation(m[2], locale)}${m[3] ? ` ${m[3]}階` : ""}への${type[m[1]]}。`;
  }
  m = /^Turn (\d+): (.+)$/.exec(line);
  if (m) return `ターン ${m[1]}：${translateGameLocation(m[2], locale)}`;
  const summary = translateEndSummary(line, locale);
  if (summary !== undefined) return summary;
  const featureLine = translateOverviewFeatures(line);
  if (featureLine) return featureLine;
  const vanquished = translateVanquished(line);
  if (vanquished) return vanquished;
  // Genocided list (insight.c list_genocided): "newts", "gnomes (extinct)".
  m = /^([a-z][a-z' -]*?)( \(extinct\))?$/.exec(line);
  if (m) {
    const name = vanquishedMonster(m[1], true);
    if (name !== undefined && name !== vanquishedMonster(m[1], false)) return `${name}${m[2] ? "（絶滅）" : ""}`;
  }
  m = /^(\d+) species genocided\.$/.exec(line);
  if (m) return `${m[1]}種を抹殺した。`;
  // Class headers of a sorted vanquished list: "Dog or other canine".
  if (/^[A-Z][a-z]/.test(line)) {
    const header = lookupImportedJapaneseEntity(line[0].toLowerCase() + line.slice(1));
    if (header !== undefined) return header;
  }
  return translateCharacterLine(line, locale);
}

/** Presentation only; names, punctuation not understood, and input remain intact. */
export function translateReportLine(line: string, locale: SupportedLocale): string {
  if (locale !== "ja") return line;
  return line.replace(/[^\r\n]+/g, (part) => {
    const m = /^([ \t]*)(.*?)([ \t]*)$/.exec(part);
    return !m || !m[2] ? part : `${m[1]}${translateContent(m[2], locale)}${m[3]}`;
  });
}
