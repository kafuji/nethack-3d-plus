import type { SupportedLocale } from "./core";
import { jnethackStatus } from "../plus/game-text/fallback";

// NetHack's role.c rank names, not player-supplied names or monster names.
const ranks: Readonly<Record<string, string>> = {
  Hatamoto: "旗本", Ronin: "浪人", Ninja: "忍者", Kunoichi: "くノ一",
  Joshu: "城主", Ryoshu: "領主", Kokushu: "国主", Daimyo: "大名", Kuge: "公家", Shogun: "将軍",
  Digger: "穴掘り", "Field Worker": "現場作業員", Investigator: "調査員", Exhumer: "発掘者",
  Excavator: "採掘者", Spelunker: "洞窟探検家", Speleologist: "洞窟学者", Collector: "収集家", Curator: "学芸員",
  Plunderer: "略奪者", Plunderess: "略奪者", Pillager: "襲撃者", Bandit: "山賊", Brigand: "追いはぎ",
  Raider: "侵略者", Reaver: "略奪者", Slayer: "討伐者", Chieftain: "族長", Chieftainess: "族長", Conqueror: "征服者", Conqueress: "征服者",
  Troglodyte: "洞穴人", Aborigine: "原住民", Wanderer: "放浪者", Vagrant: "放浪者", Wayfarer: "旅人",
  Roamer: "放浪者", Nomad: "遊牧民", Rover: "流浪者", Pioneer: "開拓者",
  Rhizotomist: "薬草採集者", Empiric: "経験医", Embalmer: "防腐処理師", Dresser: "手当て人",
  "Medicus ossium": "骨の医師", "Medica ossium": "骨の医師", Herbalist: "薬草師", Magister: "師範", Magistra: "師範", Physician: "医師", Chirurgeon: "外科医",
  Gallant: "勇士", Esquire: "従士", Bachelor: "若騎士", Sergeant: "軍曹", Knight: "騎士", Banneret: "旗騎士",
  Chevalier: "騎士", Chevaliere: "騎士", Seignieur: "領主", Dame: "貴婦人", Paladin: "聖騎士",
  Candidate: "志願者", Novice: "見習い", Initiate: "入門者", "Student of Stones": "石の修行者",
  "Student of Waters": "水の修行者", "Student of Metals": "金の修行者", "Student of Winds": "風の修行者", "Student of Fire": "火の修行者", Master: "達人",
  Aspirant: "志願者", Acolyte: "侍祭", Adept: "熟達者", Priest: "司祭", Priestess: "女司祭", Curate: "助祭", Canon: "司教座聖堂参事会員", Canoness: "女子参事会員", Lama: "ラマ僧", Patriarch: "総主教", Matriarch: "女総主教", "High Priest": "大司祭", "High Priestess": "大司祭",
  Footpad: "追いはぎ", Cutpurse: "すり", Rogue: "盗賊", Pilferer: "こそ泥", Robber: "強盗", Burglar: "空き巣", Filcher: "盗人", Magsman: "詐欺師", Magswoman: "詐欺師", Thief: "盗賊",
  Tenderfoot: "駆け出し", Lookout: "見張り", Trailblazer: "道開き", Reconnoiterer: "偵察者", Reconnoiteress: "偵察者",
  Scout: "斥候", Arbalester: "弩兵", Archer: "射手", Sharpshooter: "狙撃手", Marksman: "名射手", Markswoman: "名射手",
  Rambler: "散歩者", Sightseer: "観光客", Excursionist: "行楽客", Peregrinator: "巡礼者", Peregrinatrix: "巡礼者", Traveler: "旅行者", Journeyer: "旅人", Voyager: "航海者", Explorer: "探検家", Adventurer: "冒険者",
  Stripling: "若者", Skirmisher: "散兵", Fighter: "戦士", "Man-at-arms": "武装兵", "Woman-at-arms": "武装兵", Warrior: "戦士", Swashbuckler: "剣士", Hero: "英雄", Heroine: "英雄", Champion: "勇者", Lord: "領主", Lady: "貴婦人",
  Evoker: "召喚術師", Conjurer: "魔術師", Thaumaturge: "奇術師", Magician: "魔法使い", Enchanter: "付呪師", Enchantress: "付呪師", Sorcerer: "魔術師", Sorceress: "魔術師", Necromancer: "死霊術師", Wizard: "魔法使い", Mage: "魔導師",
};

export function translatePlayerRank(rank: string, locale: SupportedLocale): string {
  return locale === "ja" && Object.prototype.hasOwnProperty.call(ranks, rank)
    ? ranks[rank]
    : rank;
}

/** Translate only an exactly recognized rank; keep the player's name intact. */
export function translatePlayerTitle(name: string, locale: SupportedLocale): string {
  if (locale !== "ja") return name;
  const match = /^(.+) the (.+)$/.exec(name);
  if (!match || !Object.prototype.hasOwnProperty.call(ranks, match[2])) {
    // Polymorphed forms and unlisted ranks: try JNetHack names.
    return jnethackStatus("title", name) ?? name;
  }
  return `${match[1]}（${translatePlayerRank(match[2], locale)}）`;
}
