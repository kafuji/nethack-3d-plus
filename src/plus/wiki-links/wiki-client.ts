// NetHackWiki article URLs and summaries (MediaWiki API with TextExtracts).
// Summaries are fetched when asked for and never bundled with the game.
const wikiOrigin = "https://nethackwiki.com";
const summaryLimit = 480;

export type WikiSummary =
  | { readonly status: "found"; readonly title: string; readonly extract: string }
  | { readonly status: "missing" };

const summaries = new Map<string, WikiSummary>();

export function wikiArticleUrl(article: string): string {
  return `${wikiOrigin}/wiki/${encodeURIComponent(article.replace(/ /g, "_"))}`;
}

/** A summary already fetched this session. */
export function cachedWikiSummary(article: string): WikiSummary | undefined {
  return summaries.get(article);
}

/** Reduce an article introduction to a short plain-text summary. */
export function shortenWikiExtract(extract: string): string {
  const text = extract.trim().replace(/\n{2,}/g, "\n");
  if (text.length <= summaryLimit) return text;
  return `${text.slice(0, summaryLimit).trimEnd()}…`;
}

/** Fetch one article's summary. Failures reject and are not cached, so a later hover retries. */
export async function fetchWikiSummary(article: string, signal?: AbortSignal): Promise<WikiSummary> {
  const cached = summaries.get(article);
  if (cached) return cached;
  const parameters = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    titles: article,
    format: "json",
    origin: "*",
  });
  const response = await fetch(`${wikiOrigin}/api.php?${parameters}`, { signal });
  if (!response.ok) throw new Error(`NetHackWiki responded with ${response.status}`);
  const body = (await response.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string; missing?: unknown }> };
  };
  const page = Object.values(body.query?.pages ?? {})[0];
  if (!page) throw new Error("NetHackWiki returned no page");
  const summary: WikiSummary = "missing" in page
    ? { status: "missing" }
    : { status: "found", title: page.title ?? article, extract: shortenWikiExtract(page.extract ?? "") };
  summaries.set(article, summary);
  return summary;
}
