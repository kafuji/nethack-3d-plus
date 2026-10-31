import { describe, expect, it } from "vitest";
import { translateGameMenuItem } from "./game-menu";

describe("NetHack menu display", () => {
  it("translates both tutorial answers without changing their meaning", () => {
    expect(translateGameMenuItem("Yes, do a tutorial", "Do you want a tutorial?", "ja")).toBe("はい、チュートリアルを始める");
    expect(translateGameMenuItem("No, just start play", "Do you want a tutorial?", "ja")).toBe("いいえ、通常プレイを始める");
  });
  it("preserves the same text in an unrelated context and other languages", () => {
    expect(translateGameMenuItem("Yes, do a tutorial", "Another question?", "ja")).toBe("Yes, do a tutorial");
    expect(translateGameMenuItem("Yes, do a tutorial", "Do you want a tutorial?", "en")).toBe("Yes, do a tutorial");
  });
});
