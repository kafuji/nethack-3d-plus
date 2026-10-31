import type { SupportedLocale } from "./core";
import { translatePlayerRank } from "./player-title";

// NetHack inserts the player's deity and rank into this introductory text.
// Use whole-document recognition so unrelated information windows are never
// rewritten and previously unseen versions can fall back to the original.
const introduction = /^It is written in the Book of (.+?): After the Creation, the cruel god Moloch rebelled against the authority of Marduk the Creator\. Moloch stole from Marduk the most powerful of all the artifacts of the gods, the Amulet of Yendor, and he hid it in the dark cavities of Gehennom, the Under World, where he now lurks, and bides his time\. Your (god|goddess) (.+?) seeks to possess the Amulet, and with it to gain deserved ascendance over the other gods\. You, a newly trained (.+?), have been heralded from birth as the instrument of (.+?)\. You are destined to recover the Amulet for your deity, or die in the attempt\. Your hour of destiny has come\. For the sake of us all: Go bravely with (.+?)!$/;

// Names and starting ranks from the bundled NetHack 3.6.7 role definitions.
export const deityNames: Readonly<Record<string, string>> = {
  Quetzalcoatl: "ケツァルコアトル", Camaxtli: "カマシュトリ", Huhetotl: "ウエテオトル",
  Mitra: "ミトラ", Crom: "クロム", Set: "セト", Anu: "アヌ", Ishtar: "イシュタル", Anshar: "アンシャル",
  Athena: "アテナ", Hermes: "ヘルメス", Poseidon: "ポセイドン", Lugh: "ルー", Brigit: "ブリギッド",
  "Manannan Mac Lir": "マナナン・マク・リル", "Shan Lai Ching": "シャン・ライ・チン",
  "Chih Sung-tzu": "チー・スンツー", "Huan Ti": "ホアン・ティ", Issek: "イセク", Mog: "モグ", Kos: "コス",
  Mercury: "メルクリウス", Venus: "ウェヌス", Mars: "マルス", "Amaterasu Omikami": "天照大神",
  Raijin: "雷神", Susanowo: "スサノオ", "Blind Io": "盲目のイオ", "The Lady": "貴婦人", Offler: "オフラー",
  Tyr: "テュール", Odin: "オーディン", Loki: "ロキ", Ptah: "プタハ", Thoth: "トート", Anhur: "アンフル",
  Moloch: "モロク", "Moloch, Lord of the Underworld": "冥界の主モロク",
};

function knownName(dictionary: Readonly<Record<string, string>>, name: string): string {
  return Object.prototype.hasOwnProperty.call(dictionary, name) ? dictionary[name] : name;
}

/** Returns null if this is not the recognized introductory document. */
export function translateIntroStory(lines: readonly string[], locale: SupportedLocale): string | null {
  if (locale !== "ja") return null;
  const document = lines.join("\n").replace(/\s+/g, " ").trim();
  const match = introduction.exec(document);
  if (!match) return null;
  const [, bookDeity, godOrGoddess, deity, rank, instrumentDeity, finalDeity] = match;
  if (bookDeity !== deity || deity !== instrumentDeity || deity !== finalDeity) return null;
  const deityName = knownName(deityNames, deity);
  const rankName = translatePlayerRank(rank, locale);
  const deityTitle = godOrGoddess === "goddess" ? "女神" : "神";
  return [
    `「${deityName}の書」には、こう記されている。`,
    "",
    "創世の後、残忍な神モロクは、創造主マルドゥクの権威に反旗を翻した。モロクは神々の神器の中で最も強大なイェンダーの魔除けをマルドゥクから盗み出し、冥界ゲヘナの暗い洞窟に隠した。今もそこで身を潜め、時を待っている。",
    "",
    `あなたの信じる${deityTitle}${deityName}は、魔除けを手に入れ、その力で他の神々の上に立とうとしている。`,
    "",
    `修行を終えたばかりの${rankName}であるあなたは、${deityName}の使いとして生まれた時から期待を寄せられてきた。神のために魔除けを取り戻すか、その試みの中で命を落とすか。それがあなたの定めだ。`,
    "",
    `運命の時が来た。すべての者のために、${deityName}と共に勇敢に進め！`,
  ].join("\n");
}
