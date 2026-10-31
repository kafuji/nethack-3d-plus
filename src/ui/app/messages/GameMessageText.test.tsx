import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TranslationProvider } from "../../../i18n";
import { defaultNh3dClientOptions } from "../../../game/ui-types";
import { GameMessageText } from "./GameMessageText";
import { FloatingMessages } from "./FloatingMessages";

describe("reference translations in the message UI", () => {
  it("marks the reference and provides the original in a disclosure", () => {
    const html = renderToStaticMarkup(
      <TranslationProvider initialLocale="ja"><GameMessageText message="It's a wall." /></TranslationProvider>,
    );
    expect(html).toContain("<details");
    expect(html).toContain("参考訳・原文を見る");
    expect(html).toContain("壁だ。");
    expect(html).toContain("It&#x27;s a wall.");
  });

  it("retains the original in floating references even if the log is unavailable", () => {
    const html = renderToStaticMarkup(
      <TranslationProvider initialLocale="ja">
        <FloatingMessages
          clientOptions={{ ...defaultNh3dClientOptions, liveMessageLog: false }}
          floatingMessages={[{ id: 1, text: "It's a wall." }]}
          floatingMessageTextStyle={{}}
        />
      </TranslationProvider>,
    );
    expect(html).toContain("参考訳");
    expect(html).toContain("It&#x27;s a wall.");
  });
});
