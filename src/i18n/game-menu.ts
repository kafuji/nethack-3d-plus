import type { SupportedLocale } from "./core";
import { translateCuratedItemName, translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateGamePrompt } from "./game-prompts";
import { translateGameMessage } from "./game-messages";
import { translateHelpMenuItem } from "./help-text";
import { translateReportLine } from "./report-text";

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
  const named = translateCuratedItemName(text);
  if (named !== undefined) return named;
  const prompt = translateGamePrompt(text, locale);
  if (prompt !== text) return prompt;
  const message = translateGameMessage(text, locale);
  return message !== text ? message : translateInventoryItem(text, locale);
}

/** A menu heading: an object class, a report line, or any other menu text. */
export function translateMenuHeading(text: string, locale: SupportedLocale): string {
  const heading = translateReportLine(translateInventoryCategory(text, locale), locale);
  return heading !== text ? heading : translateGameMenuItem(text, "", locale);
}
