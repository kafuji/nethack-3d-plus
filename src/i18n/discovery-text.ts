import type { SupportedLocale } from "./core";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";

// The complete discoveries report has one of these exact first lines in 5.0.
// Matching the complete line prevents unrelated message windows from being
// interpreted as a list of objects.
const headers: Readonly<Record<string, string>> = {
  "Discoveries, by order of discovery within each class": "発見物（種類ごとに発見順）",
  "Discoveries, sortloot order (by class with some sub-class groupings)": "発見物（種類と分類順）",
  "Discoveries, alphabetical within each class": "発見物（種類ごとにアルファベット順）",
  "Discoveries, alphabetical across all classes": "発見物（全種類をアルファベット順）",
};

function translateDiscoveryItem(item: string, locale: SupportedLocale): string {
  // obj_typename() can attach a parenthesized appearance to a discovered
  // type. Keep that visible description even when it has no translation.
  const appearance = /^(.+?) \(([^()]*)\)$/.exec(item);
  if (!appearance) return translateInventoryItem(item, locale);
  const [, base, detail] = appearance;
  const translated = translateInventoryItem(base, locale);
  if (translated === base) return item;
  const itemClass = /^(potion|scroll|spellbook|wand|ring|amulet)(?: of | called |$)/.exec(base)?.[1];
  let visibleDetail = detail;
  if (itemClass) {
    const description = itemClass === "scroll" ? `scroll labeled ${detail}` : `${detail} ${itemClass}`;
    const translatedDetail = translateInventoryItem(description, locale);
    if (translatedDetail !== description) visibleDetail = translatedDetail;
  }
  return `${translated}（${visibleDetail}）`;
}

/** Returns null for reports other than recognized discoveries reports. */
export function translateDiscoveryReport(lines: readonly string[], locale: SupportedLocale): string[] | null {
  if (locale !== "ja") return null;
  const first = lines[0] ?? "";
  let header = Object.prototype.hasOwnProperty.call(headers, first) ? headers[first] : undefined;
  // #knownclass emits a different header but uses the same object-line format.
  const singleClass = /^Discovered (.+) in (order of discovery|'sortloot' order|alphabetical order)$/.exec(first);
  if (singleClass) {
    const category = translateInventoryCategory(singleClass[1], locale);
    if (category !== singleClass[1]) {
      const order = singleClass[2] === "order of discovery" ? "発見順" : singleClass[2] === "alphabetical order" ? "アルファベット順" : "分類順";
      header = `発見した${category}（${order}）`;
    }
  }
  if (header === undefined) return null;
  return lines.map((line, index) => {
    if (index === 0) return header;
    if (line === "Unique items or Relics") return "固有アイテム・秘宝";
    if (line === "Discovered items") return "発見したアイテム";
    if (line === "Artifacts") return "アーティファクト";
    const prefix = /^(  |\* )(.*)$/.exec(line);
    if (prefix) return `${prefix[1]}${translateDiscoveryItem(prefix[2], locale)}`;
    return translateInventoryCategory(line, locale);
  });
}
