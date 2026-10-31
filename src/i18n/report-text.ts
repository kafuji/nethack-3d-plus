import type { SupportedLocale } from "./core";
import { translateCharacterLine } from "./character-text";
import { translateGameLocation } from "./game-location";
import { translatePlayerRank } from "./player-title";
import { translateMessageArgument } from "./nethack5-source-messages";

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
    const cause = translateMessageArgument(m[3]);
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
  const featureLine = translateOverviewFeatures(line);
  if (featureLine) return featureLine;
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
