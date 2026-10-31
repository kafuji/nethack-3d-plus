import type { SupportedLocale } from "./core";

// Hunger and encumbrance badges carry the runtime's raw status words. The
// label remains the state key; only the displayed text is translated.
const japaneseStatusWords: Readonly<Record<string, string>> = {
  satiated: "満腹", hungry: "空腹", weak: "衰弱", fainting: "気絶寸前", fainted: "気絶", starved: "餓死",
  burdened: "重荷", stressed: "圧迫", strained: "限界", overtaxed: "過負荷", overloaded: "超過",
};

export function translateStatusBadgeLabel(label: string, locale: SupportedLocale): string {
  if (locale !== "ja") return label;
  const key = label.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(japaneseStatusWords, key) ? japaneseStatusWords[key] : label;
}
