const wikiOrigin = "https://nethackwiki.com";

export function wikiArticleUrl(article: string): string {
  return `${wikiOrigin}/wiki/${encodeURIComponent(article.replace(/ /g, "_"))}`;
}
