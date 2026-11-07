import type { SupportedLocale } from "./core";
import { lookupImportedJapaneseEntity } from "./imported-entities";
import hallucinatedMonsters from "./data/hallucinated-monsters-ja.json";
import { deityNames } from "./intro-story";
import { translatePlayerRank } from "./player-title";
import { hallucinatedDeities, playerMonsterName } from "./proper-names";

// dat/bogusmon.txt: what a hallucinating hero sees.
const hallucinated: Readonly<Record<string, string>> = hallucinatedMonsters;
const own = (map: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;

// Names are matched in their entirety against the bundled monster catalog.
// Do not strip adjectives: "peaceful", "tame", "invisible" and others can
// affect gameplay, and a pet's custom name is not a monster identifier.
const monsters: Readonly<Record<string, string>> = {
  "giant ant": "巨大アリ", "killer bee": "殺人バチ", "soldier ant": "兵隊アリ", "fire ant": "火アリ", "giant beetle": "巨大カブトムシ",
  "acid blob": "酸性の塊", "quivering blob": "震える塊", "gelatinous cube": "ゼラチンキューブ",
  "jackal": "ジャッカル", "fox": "キツネ", "coyote": "コヨーテ", "little dog": "子犬", "dog": "犬", "large dog": "大型犬", "wolf": "オオカミ", "winter wolf": "冬オオカミ", "werewolf": "人狼",
  "floating eye": "浮遊する目玉", "kitten": "子猫", "housecat": "飼い猫", "large cat": "大きな猫",
  "dwarf": "ドワーフ", "dwarf lord": "ドワーフの領主", "dwarf king": "ドワーフの王",
  "kobold": "コボルド", "large kobold": "大きなコボルド", "kobold lord": "コボルドの領主", "kobold shaman": "コボルドの呪術師",
  "goblin": "ゴブリン", "hobgoblin": "ホブゴブリン", "orc": "オーク", "hill orc": "丘オーク", "Mordor orc": "モルドールのオーク", "Uruk-hai": "ウルク＝ハイ", "orc shaman": "オークの呪術師", "orc-captain": "オークの隊長",
  "sewer rat": "ドブネズミ", "giant rat": "巨大ネズミ", "rabid rat": "狂暴なネズミ", "rock mole": "岩モグラ",
  "grid bug": "グリッドバグ", "bat": "コウモリ", "giant bat": "巨大コウモリ",
  "lichen": "地衣類", "brown mold": "茶色カビ", "yellow mold": "黄色カビ", "green mold": "緑色カビ", "red mold": "赤色カビ",
  "gnome": "ノーム", "gnome lord": "ノームの領主", "gnomish wizard": "ノームの魔法使い", "gnome king": "ノームの王",
  "kobold zombie": "コボルドのゾンビ", "gnome zombie": "ノームのゾンビ", "orc zombie": "オークのゾンビ", "dwarf zombie": "ドワーフのゾンビ", "human zombie": "人間のゾンビ",
  // NetHack 5.0 names not covered by the imported entity list.
  "Aleax": "アレアックス", "Angel": "天使", "Arch Priest": "大司祭", "Archon": "アルコン", "Ashikaga Takauji": "足利尊氏",
  "Asmodeus": "アスモデウス", "Baalzebub": "ベルゼブブ", "Cerberus": "ケルベロス", "Charon": "カロン", "Chromatic Dragon": "クロマティック・ドラゴン",
  "Croesus": "クロイソス", "Cyclops": "サイクロプス", "Dark One": "闇の者", "Death": "死", "Demogorgon": "デモゴルゴン", "Dispater": "ディスパテル",
  "Earendil": "エアレンディル", "Elvenking": "エルフの王", "Elvenqueen": "エルフの女王", "Elwing": "エルウィング", "Famine": "飢饉",
  "Geryon": "ゲリュオン", "Goblin King": "ゴブリンの王", "Grand Master": "大師範", "Green-elf": "緑エルフ", "Grey-elf": "灰色エルフ",
  "High-elf": "ハイエルフ", "Hippocrates": "ヒポクラテス", "Ixoth": "イクソス", "Juiblex": "ジュイブレックス", "Keystone Kop": "キーストン・コップ",
  "King Arthur": "アーサー王", "Kop Kaptain": "コップ警部", "Kop Lieutenant": "コップ警部補", "Kop Sergeant": "コップ巡査部長",
  "Lord Carnarvon": "カーナヴォン卿", "Lord Sato": "佐藤卿", "Lord Surtur": "スルト卿", "Master Assassin": "暗殺者の頭領",
  "Master Kaen": "カエン師", "Master of Thieves": "盗賊の頭領", "Medusa": "メデューサ", "Minion of Huhetotl": "ウエテオトルの手下",
  "Nalzok": "ナルゾク", "Nazgul": "ナズグル", "Neferet the Green": "緑のネフェレト", "Norn": "ノルン", "Olog-hai": "オログ＝ハイ",
  "Oracle": "神託師", "Orcus": "オルクス", "Orion": "オリオン", "Pelias": "ペリアス", "Pestilence": "疫病", "Scorpius": "スコルピウス",
  "Shaman Karnov": "シャーマン・カルノフ", "Thoth Amon": "トート・アモン", "Twoflower": "トゥーフラワー", "Vlad the Impaler": "串刺し公ヴラド",
  "Wizard of Yendor": "イェンダーの魔法使い", "Woodland-elf": "森エルフ", "Yeenoghu": "イーノグー", "aligned cleric": "聖職者",
  "baby shimmering dragon": "子供のきらめくドラゴン", "barbed devil": "とげの悪魔", "beholder": "ビホルダー", "chieftain": "族長",
  "dwarf lady": "ドワーフの貴婦人", "dwarf queen": "ドワーフの女王", "elf-lady": "エルフの貴婦人", "gnome queen": "ノームの女王",
  "high priestess": "高位の女司祭", "kobold lady": "コボルドの貴婦人", "lieutenant": "中尉", "marilith": "マリリス", "nalfeshnee": "ナルフェシュニー",
  "ogre lady": "オーガの貴婦人", "ogre queen": "オーガの女王", "shimmering dragon": "きらめくドラゴン", "succubus": "サキュバス",
  "vampire lady": "吸血鬼の貴婦人", "vampire lord": "吸血鬼の君主", "vampire mage": "吸血鬼の魔術師", "vorpal jabberwock": "ヴォーパル・ジャバウォック",
  "newt": "イモリ", "gecko": "ヤモリ", "lizard": "トカゲ", "nymph": "ニンフ", "small mimic": "小さなミミック", "large mimic": "大きなミミック",
};

/** Translate only an unmodified common monster name, preserving unknown text. */
export function translateMonsterName(text: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  // do_name.c rndghostname(): "Dirk's ghost", kept apart from the article rule below.
  const ghost = /^(?:[Tt]he )?([A-Za-z][A-Za-z' -]*?)'s? ghost$/.exec(text);
  if (ghost) return `${ghost[1]}の幽霊`;
  // bogusmon.txt's personal names have no article, nor do player monsters ("Mike the Traveler").
  if (/^[A-Z]/.test(text) && own(hallucinated, text) !== undefined) return hallucinated[text];
  const titled = /^(\S+) the ([A-Z].*)$/.exec(text);
  if (titled && translatePlayerRank(titled[2], "ja") !== titled[2]) return `${translatePlayerRank(titled[2], "ja")}の${playerMonsterName(titled[1])}`;
  // A unique monster has no article ("You miss Medusa.").
  if (/^[A-Z]/.test(text) && own(monsters, text) !== undefined) return monsters[text];
  // A bare name may be a pet's individual name (even "dog" or "jackal").
  const match = /^(the |The |a |an |A |An |your |Your )(.+)$/.exec(text);
  if (!match) return text;
  const adjectives: Readonly<Record<string, string>> = {
    renegade: "背教の", tame: "飼いならされた", peaceful: "友好的な", invisible: "透明な", saddled: "鞍を付けた", poor: "かわいそうな",
  };
  let name = match[2];
  const modifiers: string[] = [];
  for (;;) {
    const modifier = /^(renegade|tame|peaceful|invisible|saddled|poor) (.+)$/.exec(name);
    if (!modifier) break;
    modifiers.push(adjectives[modifier[1]]);
    name = modifier[2];
  }
  // minion.c: a god's servant ("the succubus of Set").
  const minion = /^(.+) of (.+)$/.exec(name);
  const deity = minion ? own(deityNames, minion[2]) ?? own(hallucinatedDeities, minion[2]) : undefined;
  if (minion && deity !== undefined) {
    // priest.c: "poohbah" is what a hallucinating hero takes a priest for.
    const base = minion[1] === "priest" ? "司祭" : minion[1] === "priestess" ? "女司祭" : minion[1] === "poohbah" ? "お偉方" : own(monsters, minion[1]) ?? own(hallucinated, minion[1]) ?? lookupImportedJapaneseEntity(minion[1]);
    if (base !== undefined) return `${modifiers.join("")}${deity}の${base}`;
  }
  const translated = own(monsters, name) ?? own(hallucinated, name) ?? lookupImportedJapaneseEntity(name);
  // do_name.c: a player monster is named by its rank ("the kunoichi").
  const rankName = name.replace(/(^| )([a-z])/g, (_all, gap: string, letter: string) => gap + letter.toUpperCase()).replace(/ Of /g, " of ");
  // Most ranks capitalize every word, but not "Medicus ossium".
  const firstCapital = name.charAt(0).toUpperCase() + name.slice(1);
  const rank = translated ?? (translatePlayerRank(firstCapital, "ja") !== firstCapital ? translatePlayerRank(firstCapital, "ja") : translatePlayerRank(rankName, "ja"));
  if (rank === rankName) return text;
  return `${/^your /i.test(match[1]) ? "あなたの" : ""}${modifiers.join("")}${rank}`;
}
