import { describe, expect, it } from "vitest";
import { wikiArticleUrl } from "./wiki-url";

describe("wikiArticleUrl", () => {
  it("builds wiki paths", () => {
    expect(wikiArticleUrl("Giant ant")).toBe("https://nethackwiki.com/wiki/Giant_ant");
    expect(wikiArticleUrl("Potion of healing")).toBe("https://nethackwiki.com/wiki/Potion_of_healing");
  });

  it("escapes reserved characters", () => {
    expect(wikiArticleUrl("A/B?c")).toBe("https://nethackwiki.com/wiki/A%2FB%3Fc");
  });
});
