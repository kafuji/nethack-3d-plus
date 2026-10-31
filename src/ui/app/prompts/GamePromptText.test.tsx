import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TranslationProvider } from "../../../i18n";
import { GamePromptText } from "./GamePromptText";

describe("runtime prompt presentation", () => {
  it("uses curated questions and preserves the original choice suffix", () => {
    const markup = renderToStaticMarkup(<TranslationProvider initialLocale="ja"><GamePromptText prompt="Really quit? [yn] (n)" /></TranslationProvider>);
    expect(markup).toContain("本当に終了しますか？ [yn] (n)");
    const extra = renderToStaticMarkup(<TranslationProvider initialLocale="ja"><GamePromptText prompt="Check this door for a trap? [yn] (n)" /></TranslationProvider>);
    expect(extra).toContain("このドアに罠がないか調べますか？ [yn] (n)");
  });
  it("makes a reference translation and its original accessible without changing keys", () => {
    const markup = renderToStaticMarkup(<TranslationProvider initialLocale="ja"><GamePromptText prompt="You finish eating MysteryName. [yn] (n)" /></TranslationProvider>);
    expect(markup).toContain("参考訳・原文を見る");
    expect(markup).toContain("You finish eating MysteryName.");
    expect(markup).toContain("[yn] (n)");
  });
});
