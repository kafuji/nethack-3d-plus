// Entry point for display-time game text translation.
//
// The translator and its ~260 KB dictionary are loaded lazily, and only when
// the interface language is Japanese and the player has not turned the
// feature off. Until loading finishes the original English text is shown.
import { useSyncExternalStore } from "react";
import { getCurrentLocale } from "../../i18n/core";
import type { GameTextData, GameTextTranslator } from "./translator";

const settingStorageKey = "nh3d-plus-game-text-translation";

let translator: GameTextTranslator | null = null;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Whether the player wants game text translated (default: on). */
export function isGameTextTranslationPreferred(): boolean {
  try {
    return globalThis.localStorage?.getItem(settingStorageKey) !== "off";
  } catch {
    return true;
  }
}

export function setGameTextTranslationPreferred(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(settingStorageKey, enabled ? "on" : "off");
  } catch {
    // Storage unavailable: the preference only lasts for this session.
  }
  if (enabled) ensureGameTextTranslatorLoaded();
  notify();
}

/** Game text translation applies to the Japanese interface only. */
export function isGameTextTranslationAvailable(): boolean {
  return getCurrentLocale() === "ja";
}

function isActive(): boolean {
  return isGameTextTranslationAvailable() && isGameTextTranslationPreferred();
}

export function ensureGameTextTranslatorLoaded(): void {
  if (translator || loading || !isActive()) return;
  loading = Promise.all([import("./translator"), import("./data/jnethack.generated.json")])
    .then(([module, data]) => {
      const json = data as unknown as { default?: GameTextData } & GameTextData;
      translator = new module.GameTextTranslator(json.default ?? json);
      notify();
    })
    .catch((error: unknown) => {
      console.error("Failed to load game text translations:", error);
    });
}

/** Translate a game message for display; returns the input when inactive. */
export function localizeGameText(text: string | null | undefined): string {
  const value = text ?? "";
  if (!translator || !isActive()) return value;
  return translator.translate(value);
}

/** Translate an item/menu line (e.g. "a - a +1 long sword (weapon in hand)"). */
export function localizeGameItemText(text: string | null | undefined): string {
  const value = text ?? "";
  if (!translator || !isActive()) return value;
  return translator.translateItemText(value);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Re-render the calling component once the translator finishes loading or
 * the preference changes. Returns the current translation functions.
 */
export function useGameTextLocalization(): {
  text: (value: string | null | undefined) => string;
  item: (value: string | null | undefined) => string;
} {
  useSyncExternalStore(subscribe, () => version, () => version);
  ensureGameTextTranslatorLoaded();
  return { text: localizeGameText, item: localizeGameItemText };
}
