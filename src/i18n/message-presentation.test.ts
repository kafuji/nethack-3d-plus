import { describe, expect, it } from "vitest";
import { presentGameMessage } from "./message-presentation";

describe("message translation precedence", () => {
  it("prefers the project's translations and keeps other locales intact", () => {
    expect(presentGameMessage("The door opens.", "ja"))
      .toEqual({ text: "ドアが開いた。", isReferenceTranslation: false });
    expect(presentGameMessage("It's a wall.", "en"))
      .toEqual({ text: "It's a wall.", isReferenceTranslation: false });
  });
  it("labels imported exact matches and retains unknown text", () => {
    expect(presentGameMessage("It's a wall.", "ja"))
      .toEqual({ text: "壁だ。", isReferenceTranslation: true });
    expect(presentGameMessage("It's a wall. Extra text", "ja"))
      .toEqual({ text: "It's a wall. Extra text", isReferenceTranslation: false });
  });
  it("labels bounded pattern translations and retains the captured value", () => {
    expect(presentGameMessage("You finish eating a food ration.", "ja"))
      .toEqual({ text: "食料を食べ終えた。", isReferenceTranslation: false });
    expect(presentGameMessage("You finish eating MysteryName.", "ja"))
      .toEqual({ text: "MysteryNameを食べ終えた。", isReferenceTranslation: false });
    expect(presentGameMessage("You finish eating MysteryName.", "en"))
      .toEqual({ text: "You finish eating MysteryName.", isReferenceTranslation: false });
  });
});
