import type { SupportedLocale } from "./core";

const labels: Readonly<Record<string, string>> = {
  Archeologist: "考古学者", Barbarian: "蛮族", Caveman: "原始人", Healer: "治療師", Knight: "騎士", Monk: "僧侶", Priest: "司祭", Rogue: "盗賊", Ranger: "レンジャー", Samurai: "侍", Tourist: "観光客", Valkyrie: "ワルキューレ", Wizard: "魔法使い", "Flame Mage": "炎の魔術師", "Ice Mage": "氷の魔術師", Necromancer: "死霊術師", "Undead Slayer": "アンデッド討伐者", Yeoman: "自作農",
  human: "人間", elf: "エルフ", dwarf: "ドワーフ", gnome: "ノーム", orc: "オーク", doppelganger: "ドッペルゲンガー", drow: "ダークエルフ", hobbit: "ホビット", lycanthrope: "獣人", vampire: "吸血鬼",
  male: "男性", female: "女性", neuter: "中性", lawful: "秩序", neutral: "中立", chaotic: "混沌",
};

/** Only the visible labels change; option values remain runtime identifiers. */
export function translateStartupCharacterOption(value: string, locale: SupportedLocale): string {
  return locale === "ja" && Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : value;
}
