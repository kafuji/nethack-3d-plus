// Test support: the JNetHack tier only loads while the current locale is "ja",
// so tests see the curated tier alone unless they call this first.
import { vi } from "vitest";
import { setCurrentLocale } from "./core";
import { ensureGameTextTranslatorLoaded, localizeGameText } from "../plus/game-text";

/** Switch this test file to Japanese and wait until the dictionary answers. */
export async function loadJapaneseDictionary(): Promise<void> {
  setCurrentLocale("ja");
  ensureGameTextTranslatorLoaded();
  await vi.waitFor(() => {
    if (localizeGameText("You die...") === "You die...") throw new Error("JNetHack dictionary is not loaded yet");
  }, { timeout: 30000, interval: 50 });
}
