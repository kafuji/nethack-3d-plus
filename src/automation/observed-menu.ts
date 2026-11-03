/** Expose displayable menu rows only; never leak runtime glyph or object IDs. */
export function observedMenuItems(items: readonly unknown[], isSelectable: (item: unknown) => boolean) {
  return items.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    return [{
      index,
      menuIndex: Number.isSafeInteger(item.menuIndex) ? item.menuIndex : null,
      text: typeof item.text === "string" ? item.text : "",
      accelerator: typeof item.accelerator === "string" ? item.accelerator : null,
      isCategory: item.isCategory === true,
      isSelectable: isSelectable(value),
    }];
  });
}
