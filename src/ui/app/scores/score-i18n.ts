import type { SupportedLocale } from "../../../i18n/core";

// Presentation labels only: never use translated text to sort, identify or
// persist records. Unknown values (including user-entered names) stay intact.
const ja: Readonly<Record<string, string>> = {
  "Top Scores": "冒険の記録", "Close top scores": "冒険の記録を閉じる", "Close top score details": "冒険の詳細を閉じる",
  "Recorded runs": "記録された冒険", "One name in the ledger": "記録された冒険者", "Names in the ledger": "記録された冒険者",
  "Best score": "最高得点", "Latest entry": "最新の記録", Snapshots: "終了時の記録", "final build saved": "終了時の状態を保存", "final builds saved": "終了時の状態を保存",
  Date: "日付", Score: "得点", Depth: "到達階", Turns: "ターン", Turn: "ターン", Kills: "討伐数", Gold: "金貨", Loot: "戦利品", Location: "場所", Level: "レベル",
  "Final HP": "終了時HP", Ended: "終了日時", Adventurer: "冒険者", Path: "職業・種族", "Final score": "最終得点", "Cause of end": "終了理由", "Final location": "終了場所", "Turns survived": "経過ターン", "Real time": "実時間", Started: "開始日時", "State at death": "死亡時の状態",
  "Hit points": "HP", Power: "魔力", "Armor class": "アーマークラス", Experience: "経験値", Alignment: "属性", "Deaths on file": "死亡回数", Strength: "筋力", Dexterity: "敏捷さ", Constitution: "耐久力", Intelligence: "知力", Wisdom: "判断力", Charisma: "魅力",
  "Foes defeated": "倒した敵", "one recorded kill": "討伐を記録", "recorded kills": "討伐を記録", "Gold gathered": "獲得した金貨", "piece picked up": "拾得数", "pieces picked up": "拾得数", "Hidden finds": "隠された発見", "one secret revealed": "発見を記録", "secrets revealed": "発見を記録", "Loot collected": "拾得した品", "one item tracked": "拾得を記録", "items tracked": "拾得を記録", "Spells learned": "習得した呪文", "one spell discovered": "習得を記録", "spells discovered": "習得を記録", "Traps sprung": "作動した罠", "one hazard triggered": "危険を記録", "hazards triggered": "危険を記録", "Places reached": "到達した場所", "floor or branch logged": "到達を記録", "floors or branches logged": "到達を記録", "Max level": "最高レベル", "peak character level": "最高到達レベル",
  "Hidden Finds": "隠された発見", Hazards: "危険", Magic: "魔法", Milestones: "節目", "Challenge streaks": "行動記録", "Run rules": "ルール", Normal: "通常", "Archive only": "記録のみ", "Unknown depth": "階層不明", "Unclassified adventurer": "詳細不明の冒険者", "A recorded expedition.": "記録された冒険。", "Pack update": "持ち物の更新", Pack: "持ち物",
  "No conduct streaks were recorded for this run.": "この冒険の行動記録はありません。", "No milestone flags were recorded for this run.": "この冒険の節目は記録されていません。",
  "Final attributes": "最終的な能力・状態", "Creatures vanquished": "倒した生き物", Conduct: "行動記録", "Dungeon overview": "ダンジョンの概要", "Not captured": "記録なし", "No final-attributes report was archived for this run.": "最終的な能力・状態は記録されていません。", "No vanquished-creatures report was archived for this run.": "討伐した生き物は記録されていません。", "No conduct report was archived for this run.": "行動記録は保存されていません。", "No dungeon-overview report was archived for this run.": "ダンジョンの概要は記録されていません。",
  "Kills by weapon": "武器による討伐", "Kills by spell": "呪文による討伐", "Kills by pet": "ペットによる討伐", "No weapon-attributed kills were tracked for this run.": "武器による討伐は記録されていません。", "No spell-attributed kills were tracked for this run.": "呪文による討伐は記録されていません。", "No pet-attributed kills were tracked for this run.": "ペットによる討伐は記録されていません。",
  Archeologist: "考古学者", Barbarian: "蛮族", Caveman: "原始人", Healer: "治療師", Knight: "騎士", Monk: "僧侶", Priest: "司祭", Ranger: "レンジャー", Rogue: "盗賊", Samurai: "侍", Tourist: "観光客", Valkyrie: "ワルキューレ", Wizard: "魔法使い", Dwarf: "ドワーフ", Elf: "エルフ", Gnome: "ノーム", Human: "人間", Orc: "オーク", Female: "女性", Male: "男性", Chaotic: "混沌", Lawful: "秩序", Neutral: "中立", Unaligned: "無属性",
  Kill: "討伐", Trap: "罠", Escape: "脱出", Hidden: "発見", Search: "探索", Spell: "呪文", Ending: "結末", Moment: "出来事", "Run ended": "冒険終了", "Enemy defeated": "敵を倒した", "Pet defeated an enemy": "ペットが敵を倒した", "Reached new depth": "新しい階に到達", Escaped: "脱出", "Loot picked up": "品物を拾った", "Unable to load top scores.": "冒険の記録を読み込めませんでした。",
};

export function translateScoreText(text: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  if (Object.prototype.hasOwnProperty.call(ja, text)) return ja[text];
  let match = /^(\+\d+) more$/.exec(text);
  if (match) return `ほか ${match[1].slice(1)} 件`;
  match = /^([\d,]+) points$/.exec(text);
  if (match) return `${match[1]} 点`;
  match = /^(Power|Level|Turn|Depth) ([\d,]+)$/.exec(text);
  if (match) return `${ja[match[1]] ?? (match[1] === "Power" ? "魔力" : match[1])} ${match[2]}`;
  match = /^Turns ([\d,]+)-([\d,]+)$/.exec(text);
  if (match) return `ターン ${match[1]}〜${match[2]}`;
  return text;
}

export function translateScoreCharacterLine(text: string, locale: SupportedLocale): string {
  return locale === "ja" ? text.split(" / ").map((part) => translateScoreText(part, locale)).join(" / ") : text;
}

// Timeline labels can also be player-supplied names. Translate only these
// known generated event labels, never arbitrary labels or creature names.
const generatedEventLabels = new Set([
  "Run ended", "Enemy defeated", "Pet defeated an enemy", "Reached new depth", "Escaped", "Loot picked up",
]);

export function translateScoreEventLabel(text: string, locale: SupportedLocale): string {
  return generatedEventLabels.has(text) ? translateScoreText(text, locale) : text;
}

export function translateScoreTimelineMeta(text: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  return text.split(" / ").map((part) => {
    let match = /^([+-]?\d+) gold$/.exec(part);
    if (match) return `金貨 ${match[1]}`;
    match = /^purse (\d+)$/.exec(part);
    if (match) return `所持金 ${match[1]}`;
    match = /^([\d,]+) collected$/.exec(part);
    if (match) return `${match[1]} 個を取得`;
    match = /^([+-]?\d+) levels?$/.exec(part);
    if (match) return `レベル ${match[1]}`;
    match = /^level (\d+)$/.exec(part);
    return match ? `レベル ${match[1]}` : part;
  }).join(" / ");
}
