import type { SupportedLocale } from "./core";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateGamePrompt } from "./game-prompts";
import { translateGameMessage } from "./game-messages";
import { translateHelpMenuItem } from "./help-text";
import { translateReportLine } from "./report-text";
import { translateSpellName } from "./game-skills";

/** Translate known menu options in context without changing selection inputs. */
export function translateGameMenuItem(text: string, question: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  if (/^Do you want a tutorial\?/.test(question.trim())) {
    if (text === "Yes, do a tutorial") return "はい、チュートリアルを始める";
    if (text === "No, just start play") return "いいえ、通常プレイを始める";
  }
  const help = translateHelpMenuItem(text, locale);
  if (help !== text) return help;
  const category = translateInventoryCategory(text, locale);
  if (category !== text) return category;
  const named = translateInventoryItem(text, locale);
  if (named !== text) return named;
  const prompt = translateGamePrompt(text, locale);
  if (prompt !== text) return prompt;
  const message = translateGameMessage(text, locale);
  return message !== text ? message : translateMenuWord(text) ?? text;
}

// Japanese class words, to take a type's own name from "<name>の<class>".
const typeClasses: ReadonlyArray<readonly [string, string]> = [
  ["ring", "指輪"], ["wand", "杖"], ["potion", "ポーション"], ["scroll", "巻物"], ["amulet", "護符"], ["spellbook", "魔法書"],
];
// options.c status highlight colors; a "light" color is spelled as two words.
const colorNames: Readonly<Record<string, string>> = {
  black: "黒", red: "赤", green: "緑", brown: "茶", blue: "青", magenta: "赤紫", cyan: "水色", gray: "灰", orange: "橙",
  yellow: "黄", white: "白", "bright green": "明るい緑", "bright blue": "明るい青", "bright magenta": "明るい赤紫",
  "bright cyan": "明るい水色", "no color": "色なし",
};
const thresholdWords: Readonly<Record<string, string>> = {
  "Value changes": "値が変わったとき", "Value goes up": "値が増えたとき", "Value goes down": "値が減ったとき",
};

/**
 * A word on its own in a menu: a spell or object type in a list of names
 * (#discoveries, #knownclass), a color, or a status highlight threshold.
 */
function translateMenuWord(text: string): string | undefined {
  const word = text.trim();
  if (Object.prototype.hasOwnProperty.call(colorNames, word)) return colorNames[word];
  if (Object.prototype.hasOwnProperty.call(thresholdWords, word)) return thresholdWords[word];
  // options.c status_hilite_menu_choose_behavior(): "34% or more", "Less than 34".
  const bound = /^(?:(\d+%?) or (more|less)|(More|Less) than (\d+%?))$/.exec(word);
  if (bound) {
    return bound[1] ? `${bound[1]}${bound[2] === "more" ? "以上" : "以下"}` : `${bound[4]}${bound[3] === "More" ? "より大きい" : "未満"}`;
  }
  if (!/^[a-z][a-z -]*$/.test(word)) return undefined;
  const spell = translateSpellName(word, "ja");
  if (spell !== word) return spell;
  for (const [english, japanese] of typeClasses) {
    const named = translateInventoryItem(`${english} of ${word}`, "ja");
    if (named.endsWith(`の${japanese}`)) return named.slice(0, -japanese.length - 1);
  }
  return undefined;
}

/** A menu heading: an object class, a report line, or any other menu text. */
export function translateMenuHeading(text: string, locale: SupportedLocale): string {
  const heading = translateReportLine(translateInventoryCategory(text, locale), locale);
  return heading !== text ? heading : translateGameMenuItem(text, "", locale);
}
