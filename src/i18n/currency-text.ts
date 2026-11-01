// invent.c currency(): "zorkmid", or while hallucinating a random currency
// from fiction. Names are matched singular or plural (makeplural adds "s").
const currencies: Readonly<Record<string, string>> = {
  "Altarian Dollar": "アルタイル・ドル", "Ankh-Morpork Dollar": "アンク・モルポーク・ドル", auric: "オーリック",
  buckazoid: "バッカゾイド", cirbozoid: "サーボゾイド", "credit chit": "クレジット・チット", cubit: "キュービット",
  "Flainian Pobble Bead": "フレイニアン・ポブル・ビーズ", fretzer: "フレッツァー", "imperial credit": "帝国クレジット",
  "Hong Kong Luna Dollar": "香港ルナ・ドル", kongbuck: "コングバック", nanite: "ナナイト", quatloo: "クワトルー",
  simoleon: "シモレオン", solari: "ソラリ", spacebuck: "スペースバック", sporebuck: "スポアバック",
  "Triganic Pu": "トリガニック・プー", woolong: "ウーロン", zorkmid: "ゾークミド",
};

/** Japanese name of a currency word ("zorkmids", "kongbuck"), or undefined. */
export function translateCurrency(word: string): string | undefined {
  for (const name of [word, word.replace(/s$/, ""), word.replace(/es$/, "")]) {
    if (Object.prototype.hasOwnProperty.call(currencies, name)) return currencies[name];
  }
  return undefined;
}

const hallucinated = new RegExp(
  `\\b(\\d[\\d,]*) (${Object.keys(currencies).filter((name) => name !== "zorkmid").map((name) => `${name}(?:e?s)?`).join("|")})\\b`,
  "g",
);

/**
 * Translate a message that names a hallucinatory currency by translating it
 * with "zorkmids" and then restoring the hallucinated name.
 */
export function withHallucinatedCurrency(message: string, translate: (text: string) => string): string | undefined {
  const names: string[] = [];
  const normalized = message.replace(hallucinated, (_, amount: string, name: string) => {
    names.push(translateCurrency(name)!);
    return `${amount} ${amount === "1" ? "zorkmid" : "zorkmids"}`;
  });
  if (names.length === 0) return undefined;
  const translated = translate(normalized);
  if (translated === normalized) return undefined;
  let index = 0;
  return translated.replace(/ゾークミド/g, (match) => names[index++] ?? match);
}
