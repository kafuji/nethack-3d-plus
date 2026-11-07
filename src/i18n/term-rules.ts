// nh3d-plus: one spelling for each thing. The translations are written with
// these terms (term-rules.test.ts keeps them so); the imported reference
// translations are brought in line with them when they are shown.

/** [other spelling, the term used, only when the English says ...] */
export type TermRule = readonly [RegExp, string | ((match: string) => string), RegExp?];

export const termRules: readonly TermRule[] = [
  // Punctuation of Japanese sentences.
  [/．．．|\.\.\.(?=[぀-ヿ一-鿿」』]|$)/g, "……"],
  [/，/g, "、"],
  [/．/g, "。"],
  [/(?<=[぀-ヿ一-鿿」』）！？])[!?]+/g, (marks: string) => marks.replace(/!/g, "！").replace(/\?/g, "？")],
  // Words.
  [/落し穴/g, "落とし穴"],
  [/落し扉/g, "落とし扉"],
  [/虐殺/g, "抹殺"],
  [/鑑定/g, "識別"],
  [/寺院/g, "神殿"],
  [/オラクル/g, "神託師"],
  [/仔犬|小犬/g, "子犬"],
  [/仔猫|小猫/g, "子猫"],
  [/小馬/g, "子馬"],
  [/大箱/g, "大きな箱"],
  [/ホルン/g, "角笛"],
  [/ドラム/g, "太鼓"],
  [/鞭/g, "むち"],
  [/熊の罠|虎挟み|とらばさみ/g, "トラバサミ"],
  [/噴水/g, "泉"],
  [/マミー/g, "ミイラ"],
  [/狼男/g, "人狼"],
  [/彫像/g, "石像"],
  [/ヴァンパイア|バンパイア/g, "吸血鬼"],
  [/トロル(?!ー)/g, "トロール"],
  [/(?<![ァ-ヶー])ドア(?![ァ-ヶー])/g, "扉"],
  [/メドゥーサ/g, "メデューサ"],
  [/イエンダー/g, "イェンダー"],
  [/一角獣/g, "ユニコーン"],
  [/元素界/g, "精霊界"],
  [/ローディオス/g, "ルディオス"],
  [/ヴラド侯の塔/g, "ヴラドの塔"],
  // Only where the English names the thing.
  [/迷宮/g, "ダンジョン", /\bdungeon(?!s? of Doom)/i],
  [/外套|マント/g, "クローク", /\bcloak/i],
  [/流し(?!台)/g, "流し台", /\bsinks?\b/i],
  [/笛/g, "フルート", /\bflutes?\b/i],
  [/ゴールド/g, "ゾークミド", /\bzorkmids?\b/i],
  [/(?<!女)僧侶/g, "司祭", /\bpriests?\b/i],
  [/尼僧/g, "女司祭", /\bpriestess(?:es)?\b/i],
  [/修行僧/g, "僧侶", /\bmonk\b/i],
];

/** Bring a Japanese rendering of `english` to the project's terms. */
export function withProjectTerms(japanese: string, english = ""): string {
  let text = japanese;
  for (const [pattern, term, context] of termRules) {
    if (context && !context.test(english)) continue;
    text = typeof term === "string" ? text.replace(pattern, term) : text.replace(pattern, term);
  }
  return text;
}
