import type { SupportedLocale } from "./core";
import { translateGroundObject } from "./game-ground";
import { translateMonsterName } from "./game-monsters";

// Display-only labels. The engine continues to use the original action IDs,
// target descriptions, and look results for routing and classification.
const actionLabels: Readonly<Record<string, string>> = {
  cast: "呪文を唱える", technique: "技を使う", info: "情報", tip: "中身を空ける",
  force: "こじ開ける", apply: "使う", ascend: "上る (<)", descend: "下りる (>)",
  kick: "蹴る", throw: "投げる", fire: "発射", search: "探索", pickup: "拾う",
  loot: "中身を調べる", eat: "食べる", open: "開ける", close: "閉める", quaff: "飲む",
};

const targetNames: Readonly<Record<string, string>> = {
  monster: "モンスター", loot: "アイテム", door: "ドア", "stairs up": "上り階段",
  "stairs down": "下り階段", "staircase up": "上り階段", "staircase down": "下り階段",
  wall: "壁", water: "水", trap: "罠", feature: "地形", floor: "床", tile: "マス",
  "closed door": "閉じたドア", "open door": "開いたドア", "broken door": "壊れたドア",
  "floor of a room": "部屋の床", corridor: "通路", "dark corridor": "暗い通路",
  fountain: "噴水", sink: "流し",
  pool: "水たまり", moat: "堀", lava: "溶岩", altar: "祭壇", throne: "玉座",
  grave: "墓", tree: "木", "iron bars": "鉄格子", boulder: "大岩", statue: "石像",
};

// Explanations of object classes shown by NetHack's farlook. These are
// category descriptions only and must not identify the item in parentheses.
const lookCategories: Readonly<Record<string, string>> = {
  "a weapon": "武器", "a piece of armor": "防具", "a ring": "指輪", "an amulet": "お守り", "a useful item": "道具", "a tool": "道具", "a comestible": "食料", "a potion": "ポーション", "a scroll": "巻物", "a spellbook": "魔法書", "a wand": "ワンド", "a coin": "硬貨", "a gem": "宝石", "a gem or rock": "宝石または石", "a boulder": "大岩", "a statue": "石像", "a trap": "罠",
};

function own(map: Readonly<Record<string, string>>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

export function translateTileContextAction(id: string, kind: string, label: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !["quick", "extended", "contextual"].includes(kind)) return label;
  return own(actionLabels, id) ?? label;
}

function translateLookDescription(text: string, locale: SupportedLocale): string {
  const direct = own(targetNames, text);
  if (direct !== undefined) return direct;
  const category = own(lookCategories, text);
  if (category !== undefined) return category;
  const item = translateGroundObject(text, locale);
  if (item !== text) return item;
  return translateMonsterName(text, locale);
}

function translateGlancePart(part: string, locale: SupportedLocale): string {
  const here = /^(?:You see here |There is )(.+)\.$/.exec(part);
  if (here) {
    const item = translateGroundObject(here[1], locale);
    if (item !== here[1]) return `ここに${item}がある。`;
  }
  // Quicklook prints the visible glyph and class, optionally followed by a
  // parenthesized description. Translate only explicitly displayed text.
  const look = /^(\S)(\s+)(.+?)(?: \(([^()]*)\))?$/.exec(part);
  if (look) {
    const [, glyph, spacing, description, detail] = look;
    const category = own(lookCategories, description);
    if (category !== undefined) {
      const translatedDetail = detail === undefined ? undefined : translateLookDescription(detail, locale);
      return `${glyph}${spacing}${category}${detail === undefined ? "" : `（${translatedDetail}）`}`;
    }
  }
  return translateLookDescription(part, locale);
}

/** Translate recognized complete look descriptions, preserving unknown names. */
export function translateTileContextTitle(title: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !title) return title;
  const scanning = title.endsWith(" (scanning...)");
  const base = scanning ? title.slice(0, -" (scanning...)".length) : title;
  const translated = base.split(" | ").map((part) => {
    const prefix = /^(Target: |: |. - )(.+)$/.exec(part);
    if (!prefix) return translateGlancePart(part, locale);
    const description = translateGlancePart(prefix[2], locale);
    if (description === prefix[2]) return part;
    return prefix[1] === "Target: " ? `対象: ${description}` : `${prefix[1]}${description}`;
  }).join(" | ");
  return scanning ? `${translated}（調査中...）` : translated;
}
