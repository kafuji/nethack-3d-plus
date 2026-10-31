import type { SupportedLocale } from "./core";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateGamePrompt } from "./game-prompts";
import { translateGameMessage } from "./game-messages";
import { translateHelpMenuItem } from "./help-text";

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
  const item = translateInventoryItem(text, locale);
  if (item !== text) return item;
  const prompt = translateGamePrompt(text, locale);
  return prompt !== text ? prompt : translateGameMessage(text, locale);
}
