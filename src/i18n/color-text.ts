// hcolor() results: the NH_* color names and, while hallucinating, a random
// entry of do_name.c hcolors[]. Values are stems; colorAdjective() and
// colorAdverb() add "色の" / "色に" unless the stem is already an adjective.
const colors: Readonly<Record<string, string>> = {
  black: "黒", amber: "琥珀", golden: "金", "light blue": "水", red: "赤", green: "緑", silver: "銀", blue: "青", purple: "紫",
  white: "白", orange: "オレンジ", brown: "茶", yellow: "黄", gray: "灰", grey: "灰", cyan: "シアン", magenta: "赤紫",
  // Hallucinatory hcolors[].
  ultraviolet: "紫外", infrared: "赤外", "bluish-orange": "青みがかったオレンジ", "reddish-green": "赤みがかった緑", "dark white": "暗い白",
  "light black": "明るい黒", "sky blue-pink": "空色がかった桃", "pinkish-cyan": "桃色がかったシアン", "indigo-chartreuse": "藍がかった黄緑",
  salty: "しょっぱい", sweet: "甘い", sour: "すっぱい", bitter: "苦い", umami: "うま味のある",
  striped: "縞模様の", spiral: "渦巻き模様の", swirly: "ぐるぐる模様の", plaid: "格子縞の", checkered: "市松模様の", argyle: "アーガイル柄の",
  paisley: "ペイズリー柄の", blotchy: "まだら模様の", "guernsey-spotted": "ガーンジー牛柄の", "polka-dotted": "水玉模様の", square: "四角い",
  round: "丸い", triangular: "三角の", cabernet: "カベルネ", sangria: "サングリア", fuchsia: "フクシア", wisteria: "藤",
  "lemon-lime": "レモンライム", "strawberry-banana": "ストロベリーバナナ", peppermint: "ペパーミント", romantic: "ロマンチックな",
  incandescent: "白熱した", octarine: "オクタリン", "excitingly dull": "わくわくするほど地味な", mauve: "モーブ", electric: "電撃的な",
  neon: "ネオン", fluorescent: "蛍光", phosphorescent: "燐光", translucent: "半透明の", opaque: "不透明な", psychedelic: "サイケデリックな",
  iridescent: "玉虫", "rainbow-colored": "虹", polychromatic: "多彩な", colorless: "無", "colorless green": "無色の緑",
  dancing: "踊る", singing: "歌う", loving: "愛にあふれた", loudy: "やかましい", noisy: "騒がしい", clattery: "カタカタいう", silent: "静かな",
  apocyan: "アポシアン", "infra-pink": "赤外桃", opalescent: "乳白", violant: "すみれ", tuneless: "調子はずれの",
};

// A stem that already ends like a Japanese adjective or adnominal phrase.
const isAdjective = (stem: string): boolean => /[いなのたるう]$/.test(stem);

/** "blue" -> "青色の"; undefined for an unknown name. */
export function colorAdjective(name: string): string | undefined {
  const stem = Object.prototype.hasOwnProperty.call(colors, name) ? colors[name] : undefined;
  if (stem === undefined) return undefined;
  return isAdjective(stem) ? stem : `${stem}色の`;
}

/** "blue" -> "青色に" for glow verbs; undefined for an unknown name. */
export function colorAdverb(name: string): string | undefined {
  const stem = Object.prototype.hasOwnProperty.call(colors, name) ? colors[name] : undefined;
  if (stem === undefined) return undefined;
  if (!isAdjective(stem)) return `${stem}色に`;
  if (/い$/.test(stem)) return `${stem.slice(0, -1)}く`;
  if (/[なの]$/.test(stem)) return `${stem.slice(0, -1)}に`;
  return `${stem}ように`;
}
