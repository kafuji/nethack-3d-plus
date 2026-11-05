import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import { cachedWikiSummary, fetchWikiSummary, type WikiSummary } from "./wiki-client";
import {
  installWikiLinkListeners,
  refreshWikiLinkHover,
  setWikiLinksEnabled,
  useActiveWikiNameIndex,
  useWikiLinkHover,
} from "./wiki-link-store";

const cardWidthPx = 360;
const viewportMarginPx = 8;
const pointerGapPx = 6;
// Sweeping across a line of links should not send a request for each of them.
const fetchDelayMs = 150;

type SummaryState = WikiSummary | { readonly status: "loading" } | { readonly status: "failed" };

function useWikiSummary(article: string | null): SummaryState {
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  useEffect(() => {
    if (!article) return undefined;
    const cached = cachedWikiSummary(article);
    if (cached) {
      setState(cached);
      return undefined;
    }
    setState({ status: "loading" });
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      fetchWikiSummary(article, abort.signal).then(
        (summary) => {
          if (!abort.signal.aborted) setState(summary);
        },
        () => {
          if (!abort.signal.aborted) setState({ status: "failed" });
        },
      );
    }, fetchDelayMs);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [article]);
  return state;
}

/** Owns the wiki link listeners and shows the summary of the hovered name. */
export function WikiLinkLayer({ enabled }: { enabled: boolean }): JSX.Element | null {
  const strings = useI18n().strings.plus.wikiLinks;
  const index = useActiveWikiNameIndex();
  const hover = useWikiLinkHover();
  const summary = useWikiSummary(hover?.article ?? null);

  useEffect(() => installWikiLinkListeners(), []);
  useEffect(() => setWikiLinksEnabled(enabled), [enabled]);
  // The links for this commit now exist; one may be under a resting pointer.
  useLayoutEffect(() => refreshWikiLinkHover(), [index]);

  if (!hover) return null;
  const left = Math.max(viewportMarginPx, Math.min(hover.rect.left, window.innerWidth - cardWidthPx - viewportMarginPx));
  const placeBelow = hover.rect.top < window.innerHeight / 2;
  const title = summary.status === "found" ? summary.title : hover.article;
  const showDisplayText = hover.displayText.toLowerCase() !== title.toLowerCase();
  return createPortal(
    <div
      className="nh3d-wiki-card"
      role="tooltip"
      style={{
        left,
        maxWidth: cardWidthPx,
        ...(placeBelow
          ? { top: hover.rect.bottom + pointerGapPx }
          : { bottom: window.innerHeight - hover.rect.top + pointerGapPx }),
      }}
    >
      <div className="nh3d-wiki-card-title">
        {showDisplayText ? <span>{hover.displayText}</span> : null}
        <strong lang="en">{title}</strong>
      </div>
      {summary.status === "loading" ? <div className="nh3d-wiki-card-note">{strings.loading}</div> : null}
      {summary.status === "missing" ? <div className="nh3d-wiki-card-note">{strings.missing}</div> : null}
      {summary.status === "failed" ? <div className="nh3d-wiki-card-note">{strings.unavailable}</div> : null}
      {summary.status === "found" && summary.extract ? <div className="nh3d-wiki-card-summary" lang="en">{summary.extract}</div> : null}
      {summary.status !== "missing" ? <div className="nh3d-wiki-card-note">{strings.openHint}</div> : null}
    </div>,
    document.body,
  );
}
