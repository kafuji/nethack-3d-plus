import {
  getSupportedLocaleOptions,
  getTranslationStrings
} from "../../../i18n/core";

/** Module-time translation snapshot shared by all app features. */
export const translationStrings = getTranslationStrings();

export const commonStrings = translationStrings.common;

export const t = translationStrings.app;

// nh3d-plus: fork-only strings.
export const plusStrings = translationStrings.plus;

// nh3d-plus: client-generated window titles arrive in English from the runtime.
export function localizePlusWindowTitle(title: string | null | undefined): string {
  const normalized = String(title ?? "").trim();
  const titles: Readonly<Record<string, string>> = plusStrings.windowTitles;
  return titles[normalized] ?? normalized;
}

export const supportedLocaleOptions = getSupportedLocaleOptions();
