// State of the wiki link modifier. Links are rendered only while Ctrl (Cmd on
// macOS) is held, so normal play keeps plain text and never loads the name data.
// Pointer and click handling is delegated here: a link appears under a resting
// pointer when the key is pressed, which per-element handlers would miss.
import { useSyncExternalStore } from "react";
import { wikiArticleUrl } from "./wiki-url";
import type { WikiNameIndex } from "./wiki-names";

export const wikiLinkArticleAttribute = "data-nh3d-wiki-article";

export interface WikiLinkHover {
  readonly article: string;
  readonly rect: { readonly left: number; readonly top: number; readonly bottom: number };
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

let enabled = true;
let modifierHeld = false;
let index: WikiNameIndex | null = null;
let indexLoading = false;
let hover: WikiLinkHover | null = null;
let hoverElement: Element | null = null;
let pointer: { x: number; y: number } | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadIndex(): void {
  if (index || indexLoading) return;
  indexLoading = true;
  void import("./wiki-name-source")
    .then(({ createWikiNameIndex }) => {
      index = createWikiNameIndex();
      emit();
    })
    .catch((error: unknown) => {
      console.error("Failed to load wiki link names:", error);
    })
    .finally(() => {
      indexLoading = false;
    });
}

function setModifierHeld(held: boolean): void {
  if (modifierHeld === held) return;
  modifierHeld = held;
  if (held && enabled) loadIndex();
  if (!held) setHoverElement(null);
  emit();
}

function isModifierEvent(event: KeyboardEvent | MouseEvent): boolean {
  return event.ctrlKey || (isMac && event.metaKey);
}

function setHoverElement(element: Element | null): void {
  if (element === hoverElement) return;
  hoverElement = element;
  if (!element) {
    hover = null;
  } else {
    const rect = element.getBoundingClientRect();
    hover = {
      article: element.getAttribute(wikiLinkArticleAttribute) ?? "",
      rect: { left: rect.left, top: rect.top, bottom: rect.bottom },
    };
  }
  emit();
}

function linkFromTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(`[${wikiLinkArticleAttribute}]`) : null;
}

/** Re-resolve the link under the pointer; links come and go with the modifier. */
export function refreshWikiLinkHover(): void {
  if (!pointer || !enabled || !modifierHeld || document.pointerLockElement) {
    setHoverElement(null);
    return;
  }
  setHoverElement(linkFromTarget(document.elementFromPoint(pointer.x, pointer.y)));
}

function openArticle(article: string): void {
  window.open(wikiArticleUrl(article), "_blank", "noopener,noreferrer");
}

/** Install the document listeners; returns the matching cleanup. */
export function installWikiLinkListeners(): () => void {
  const onKey = (event: KeyboardEvent) => setModifierHeld(isModifierEvent(event));
  const release = () => setModifierHeld(false);
  const onPointerMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    // A key released outside the window sends no keyup; pointer events tell the truth.
    setModifierHeld(isModifierEvent(event));
    refreshWikiLinkHover();
  };
  const onPointerLeave = () => {
    pointer = null;
    setHoverElement(null);
  };
  // Links sit inside clickable rows: keep the whole gesture away from them.
  const swallow = (event: MouseEvent) => {
    if (!enabled || !isModifierEvent(event) || !linkFromTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const onClick = (event: MouseEvent) => {
    if (!enabled || !isModifierEvent(event)) return;
    const link = linkFromTarget(event.target);
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    openArticle(link.getAttribute(wikiLinkArticleAttribute) ?? "");
  };
  // Ctrl+click on macOS is a context menu gesture and fires no click.
  const onContextMenu = (event: MouseEvent) => {
    if (isMac && event.ctrlKey) onClick(event);
    else swallow(event);
  };
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", release);
  document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("pointerdown", swallow, true);
  document.addEventListener("mousedown", swallow, true);
  document.addEventListener("mouseup", swallow, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("contextmenu", onContextMenu, true);
  return () => {
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("keyup", onKey, true);
    window.removeEventListener("blur", release);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("pointerdown", swallow, true);
    document.removeEventListener("mousedown", swallow, true);
    document.removeEventListener("mouseup", swallow, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("contextmenu", onContextMenu, true);
    release();
  };
}

export function setWikiLinksEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  if (!value) setHoverElement(null);
  else if (modifierHeld) loadIndex();
  emit();
}

function activeIndex(): WikiNameIndex | null {
  return enabled && modifierHeld ? index : null;
}

/** The name index while links should be shown, otherwise null. */
export function useActiveWikiNameIndex(): WikiNameIndex | null {
  return useSyncExternalStore(subscribe, activeIndex, () => null);
}

export function useWikiLinkHover(): WikiLinkHover | null {
  return useSyncExternalStore(subscribe, () => hover, () => null);
}
