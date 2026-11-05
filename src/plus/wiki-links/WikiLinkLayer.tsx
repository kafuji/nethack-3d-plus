import { useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  installWikiLinkListeners,
  refreshWikiLinkHover,
  setWikiLinksEnabled,
  useActiveWikiNameIndex,
  useWikiLinkHover,
} from "./wiki-link-store";

const viewportMarginPx = 8;
const pointerGapPx = 6;

/** Owns the wiki link listeners and shows the original name of the hovered link. */
export function WikiLinkLayer({ enabled }: { enabled: boolean }): JSX.Element | null {
  const index = useActiveWikiNameIndex();
  const hover = useWikiLinkHover();

  useEffect(() => installWikiLinkListeners(), []);
  useEffect(() => setWikiLinksEnabled(enabled), [enabled]);
  // The links for this commit now exist; one may be under a resting pointer.
  useLayoutEffect(() => refreshWikiLinkHover(), [index]);

  if (!hover) return null;
  const left = Math.max(viewportMarginPx, hover.rect.left);
  const placeBelow = hover.rect.top < window.innerHeight / 2;
  return createPortal(
    <div
      className="nh3d-wiki-card"
      role="tooltip"
      lang="en"
      style={{
        left,
        maxWidth: window.innerWidth - left - viewportMarginPx,
        ...(placeBelow
          ? { top: hover.rect.bottom + pointerGapPx }
          : { bottom: window.innerHeight - hover.rect.top + pointerGapPx }),
      }}
    >
      {hover.article}
    </div>,
    document.body,
  );
}
