// Builds the name index from the game's dictionaries. Loaded on first use, so a
// session that never asks for wiki links does not pay for it.
import monsterNames from "./monster-names.json";
import { translateMonsterName } from "../../i18n/game-monsters";
import { lookupImportedJapaneseEntity } from "../../i18n/imported-entities";
import { curatedItemNames, genericAppearanceNames, translateInventoryItem } from "../../i18n/inventory-text";
import { WikiNameIndex } from "./wiki-names";

const classDisplayNames: Readonly<Record<string, string>> = {
  potion: "ポーション", scroll: "巻物", ring: "指輪", wand: "杖", amulet: "護符", spellbook: "魔法書", gem: "宝石", stone: "石",
};

function own(table: Readonly<Record<string, string>>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** Every Japanese spelling of a name: src/i18n's and the imported list's can differ. */
function japaneseDisplayNames(name: string): string[] {
  const names = [
    own(classDisplayNames, name),
    translateMonsterName(`the ${name}`, "ja"),
    translateInventoryItem(name, "ja"),
    lookupImportedJapaneseEntity(name),
  ];
  // Translators return their input when they do not recognize it.
  return [...new Set(names.filter((text): text is string => !!text && text !== name && text !== `the ${name}`))];
}

export function createWikiNameIndex(): WikiNameIndex {
  return new WikiNameIndex({
    // dat/monsters.h of NetHack 5.0.
    monsters: monsterNames,
    items: curatedItemNames(),
    appearances: genericAppearanceNames(),
    displayNames: japaneseDisplayNames,
  });
}
