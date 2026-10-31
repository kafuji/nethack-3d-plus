import type { SupportedLocale } from "./core";

// Only exact, already revealed names are translated; parsing and selection
// continue to use the original runtime values.
const skills: Readonly<Record<string, string>> = {
  "fighting skills": "戦闘技能", "weapon skills": "武器技能", "spellcasting skills": "魔法技能", "current skills:": "現在の技能：",
  "unskilled": "未熟練", "basic": "基本", "skilled": "熟練", "expert": "専門家", "master": "達人", "grand master": "大達人",
  "bare handed combat": "素手格闘", "bare-handed combat": "素手格闘", "martial arts": "武術", "two weapon combat": "二刀流", "two-weapon combat": "二刀流", "riding": "乗馬",
  "dagger": "短剣", "knife": "ナイフ", "axe": "斧", "pick-axe": "つるはし", "short sword": "短い剣", "broad sword": "幅広の剣", "broadsword": "幅広の剣", "long sword": "長い剣", "two-handed sword": "両手剣", "scimitar": "三日月刀", "saber": "サーベル", "club": "こん棒", "mace": "メイス", "morning star": "モーニングスター", "flail": "フレイル", "hammer": "ハンマー", "quarterstaff": "杖", "polearms": "長柄武器", "spear": "槍", "javelin": "投げ槍", "trident": "三叉槍", "lance": "ランス", "bow": "弓", "sling": "投石器", "crossbow": "クロスボウ", "dart": "投げ矢", "shuriken": "手裏剣", "boomerang": "ブーメラン", "whip": "鞭", "unicorn horn": "一角獣の角",
  "attack spells": "攻撃魔法", "healing spells": "回復魔法", "divination spells": "探知魔法", "enchantment spells": "付呪魔法", "clerical spells": "聖職魔法", "escape spells": "脱出魔法", "matter spells": "物質魔法",
  "attack": "攻撃", "healing": "回復", "divination": "探知", "enchantment": "付呪", "clerical": "聖職", "escape": "脱出", "matter": "物質",
};

const spells: Readonly<Record<string, string>> = {
  "force bolt": "魔法の矢", "magic missile": "魔法のミサイル", "fireball": "火球", "cone of cold": "冷気の円錐", "chain lightning": "連鎖雷撃", "sleep": "睡眠", "finger of death": "死の指", "drain life": "生命吸収",
  "healing": "回復", "extra healing": "上級回復", "cure blindness": "盲目治療", "cure sickness": "病気治療", "restore ability": "能力回復", "stone to flesh": "石を肉に変える",
  "light": "光", "detect monsters": "モンスター探知", "detect food": "食料探知", "detect treasure": "宝物探知", "detect unseen": "不可視のものを探知", "identify": "識別", "magic mapping": "魔法の地図", "clairvoyance": "透視",
  "confuse monster": "モンスター混乱", "slow monster": "モンスター減速", "cause fear": "恐怖", "charm monster": "モンスター魅了", "remove curse": "解呪", "create monster": "モンスター生成", "create familiar": "使い魔召喚", "turn undead": "アンデッド退散", "protection": "防御",
  "jumping": "跳躍", "haste self": "自己加速", "invisibility": "透明化", "levitation": "浮遊", "teleport away": "テレポート", "cancellation": "無効化", "dig": "掘削", "knock": "開錠", "wizard lock": "魔法の施錠", "polymorph": "変身",
};

function lookup(value: string, locale: SupportedLocale, table: Readonly<Record<string, string>>): string {
  if (locale !== "ja") return value;
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : value;
}

export function translateSkillName(value: string, locale: SupportedLocale): string {
  return lookup(value, locale, skills);
}

export function translateSpellName(value: string, locale: SupportedLocale): string {
  return lookup(value, locale, spells);
}
