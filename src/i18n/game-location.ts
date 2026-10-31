import type { SupportedLocale } from "./core";

// These are display names produced by the runtime's branch mapping. Unknown
// names are left intact so variant-specific locations are never obscured.
const japaneseBranches: Readonly<Record<string, string>> = {
  "Dungeons of Doom": "運命の大迷宮",
  "Gnomish Mines": "ノームの鉱山",
  "Quest": "クエスト",
  "Sokoban": "倉庫番",
  "Vlad's Tower": "ヴラドの塔",
  "Endgame": "最終局面",
  "Tutorial": "チュートリアル",
  "Gehennom": "ゲヘナ",
  "Fort Ludios": "ルディオス砦",
  "Elemental Planes": "元素界",
  "Astral Plane": "アストラル界",
  "Plane of Earth": "地の界",
  "Plane of Air": "風の界",
  "Plane of Fire": "火の界",
  "Plane of Water": "水の界",
};

export function translateGameLocation(label: string, locale: SupportedLocale): string {
  if (locale !== "ja") return label;
  const match = /^(\s*)(?:The )?(.+?)(?:,\s*level\s+(-?\d+)|\s+(-?\d+))?(\s*)$/.exec(label);
  if (!match || !Object.prototype.hasOwnProperty.call(japaneseBranches, match[2])) return label;
  const level = match[3] ?? match[4];
  return `${match[1]}${japaneseBranches[match[2]]}${level === undefined ? "" : ` ${level}`}${match[5]}`;
}
