// src/i18n's names for JNetHack's entries. Loaded with the dictionary rather
// than imported by index.ts: src/i18n imports index.ts through fallback.ts, so
// a static import would make a cycle that index.ts cannot be the entry of.
import { translateCuratedFeature } from "../../i18n/game-ground";
import { translateMonsterName } from "../../i18n/game-monsters";
import { translateCuratedItemName } from "../../i18n/inventory-text";
import type { ObjectCategory } from "./object-names";
import type { CuratedNames } from "./translator";

/** How NetHack names an entry of each JNetHack objects table, identified or not. */
const objectNounForms: Partial<Record<ObjectCategory, (english: string) => string[]>> = {
  potion: (english) => [`potion of ${english}`, `${english} potion`],
  scroll: (english) => [`scroll of ${english}`, `scroll labeled ${english}`, `${english} scroll`],
  wand: (english) => [`wand of ${english}`, `${english} wand`],
  ring: (english) => [`ring of ${english}`, `${english} ring`],
  spellbook: (english) => [`spellbook of ${english}`, `${english} spellbook`],
  amulet: (english) => [english, `${english} amulet`],
  gem: (english) => [english, `${english} gem`, `${english} stone`],
  rock: (english) => [english, `${english} stone`],
};

/** src/i18n's names for JNetHack's monster, object and map feature entries. */
export const curatedNames: CuratedNames = {
  monster: (english) => {
    const named = translateMonsterName(`the ${english}`, "ja");
    return named !== `the ${english}` ? named : undefined;
  },
  object: (category, english) => {
    for (const form of objectNounForms[category]?.(english) ?? [english]) {
      const named = translateCuratedItemName(form);
      if (named !== undefined) return named;
    }
    return undefined;
  },
  feature: translateCuratedFeature,
};
