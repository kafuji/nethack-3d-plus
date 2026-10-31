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

export const supportedLocaleOptions = getSupportedLocaleOptions();
