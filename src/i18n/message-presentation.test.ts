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

describe("startup lock prompt", () => {
  it.each([
    ["There is already a game in progress under your name.  Do what?", "同じ名前のゲームが既に進行中です。どうしますか？"],
    ["  y - Destroy old game", "  y - 古いゲームを消去する"],
    ["  r - Try to recover it", "  r - 復元を試みる"],
    ["  n - Cancel", "  n - キャンセル"],
    ["Restoring save file...", "セーブファイルを復元中……"],
  ])("translates %s", (english, japanese) => {
    expect(presentGameMessage(english, "ja")).toEqual({ text: japanese, isReferenceTranslation: false });
  });
});
