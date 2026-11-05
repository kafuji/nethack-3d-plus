import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedWikiSummary, fetchWikiSummary, shortenWikiExtract, wikiArticleUrl } from "./wiki-client";

function mockResponse(pages: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({ ok, status, json: async () => ({ query: { pages } }) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wikiArticleUrl", () => {
  it("builds wiki paths", () => {
    expect(wikiArticleUrl("Giant ant")).toBe("https://nethackwiki.com/wiki/Giant_ant");
    expect(wikiArticleUrl("Potion of healing")).toBe("https://nethackwiki.com/wiki/Potion_of_healing");
  });

  it("escapes reserved characters", () => {
    expect(wikiArticleUrl("A/B?c")).toBe("https://nethackwiki.com/wiki/A%2FB%3Fc");
  });
});

describe("fetchWikiSummary", () => {
  it("requests a cross-origin introduction and caches it", async () => {
    const fetchMock = mockResponse({ 1: { title: "Found page", extract: "  Intro.\n\nMore.  " } });
    expect(await fetchWikiSummary("Found page")).toEqual({ status: "found", title: "Found page", extract: "Intro.\nMore." });
    expect(await fetchWikiSummary("Found page")).toEqual({ status: "found", title: "Found page", extract: "Intro.\nMore." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe("https://nethackwiki.com/api.php");
    expect(url.searchParams.get("origin")).toBe("*");
    expect(url.searchParams.get("redirects")).toBe("1");
    expect(url.searchParams.get("titles")).toBe("Found page");
  });

  it("reports a missing article", async () => {
    mockResponse({ "-1": { title: "Nothing here", missing: "" } });
    expect(await fetchWikiSummary("Nothing here")).toEqual({ status: "missing" });
    expect(cachedWikiSummary("Nothing here")).toEqual({ status: "missing" });
  });

  it("uses the redirect target's title", async () => {
    mockResponse({ 2: { title: "The Oracle", extract: "Seer." } });
    expect(await fetchWikiSummary("Oracle page")).toEqual({ status: "found", title: "The Oracle", extract: "Seer." });
  });

  it("does not cache a failure", async () => {
    mockResponse({}, false, 503);
    await expect(fetchWikiSummary("Flaky page")).rejects.toThrow("503");
    expect(cachedWikiSummary("Flaky page")).toBeUndefined();
    mockResponse({ 3: { title: "Flaky page", extract: "Back." } });
    expect(await fetchWikiSummary("Flaky page")).toMatchObject({ status: "found", extract: "Back." });
  });
});

describe("shortenWikiExtract", () => {
  it("keeps short text and cuts long text", () => {
    expect(shortenWikiExtract("short")).toBe("short");
    const shortened = shortenWikiExtract("x".repeat(1000));
    expect(shortened.length).toBe(481);
    expect(shortened.endsWith("…")).toBe(true);
  });
});
