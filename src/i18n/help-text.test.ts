import { describe, expect, it } from "vitest";
import { translateHelpDocument, translateHelpMenuItem } from "./help-text";

describe("help translations", () => {
  it("translates the help menu", () => {
    expect(translateHelpMenuItem("List of game commands.", "ja")).toBe("ゲームコマンドの一覧。");
    expect(translateHelpMenuItem("Using the '#optionsfull' or 'm O' command to set options.", "ja"))
      .toBe("'#optionsfull' または 'm O' コマンドでオプションを設定する方法。");
    expect(translateHelpMenuItem("List of game commands.", "en")).toBe("List of game commands.");
  });

  it("replaces only the recognized command summary document", () => {
    const hh = ["y k u   7 8 9   Move commands:", " \\|/     \\|/            yuhjklbn: go one step", "", "Additional commands are available in debug mode (also known as wizard mode).", ""];
    expect(translateHelpDocument(hh, "ja")?.split("\n")[0]).toBe("y k u   7 8 9   移動コマンド：");
    expect(translateHelpDocument(["Some other text."], "ja")).toBeNull();
    expect(translateHelpDocument(hh, "en")).toBeNull();
  });
});
