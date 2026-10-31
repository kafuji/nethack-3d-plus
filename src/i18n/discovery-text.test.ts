import { describe, expect, it } from "vitest";
import { translateDiscoveryReport } from "./discovery-text";

describe("NetHack 5 discoveries report", () => {
  it("translates headings and only visible item details while preserving the unseen marker", () => {
    const lines = ["Discoveries, by order of discovery within each class", "", "Potions", "  potion of healing (pink)", "* potion (pink)", "  potion called My cure (pink)", "  unrecognized artifact (custom detail)"];
    expect(translateDiscoveryReport(lines, "ja")).toEqual(["発見物（種類ごとに発見順）", "", "ポーション", "  回復のポーション（桃色のポーション）", "* ポーション（桃色のポーション）", "  ポーション（呼び名：My cure）（桃色のポーション）", "  unrecognized artifact (custom detail)"]);
    expect(lines[3]).toBe("  potion of healing (pink)");
    expect(translateDiscoveryReport(lines, "en")).toBeNull();
    expect(translateDiscoveryReport(["A different report", "  potion (pink)"], "ja")).toBeNull();
  });
  it("handles a single class without changing unknown report headings", () => {
    expect(translateDiscoveryReport(["Discovered Potions in alphabetical order", "  potion (pink)"], "ja"))
      .toEqual(["発見したポーション（アルファベット順）", "  ポーション（桃色のポーション）"]);
    expect(translateDiscoveryReport(["Discovered custom types in alphabetical order", "  potion (pink)"], "ja")).toBeNull();
  });
});
