import { describe, expect, it } from "vitest";
import { translateHelpDocument } from "../i18n/help-text";
import { getBundledDisplayFile } from "./displayFileCatalog";

describe("bundled display files", () => {
  it("shows NetHack 5.0 its own files and the older versions theirs", () => {
    expect(getBundledDisplayFile("history", "5.0")?.lines[0]).toBe("NetHack History file for release 5.0");
    expect(getBundledDisplayFile("history", "3.6.7")?.lines[0]).toContain("release 3.6");
    expect(getBundledDisplayFile("usagehlp", "5.0")?.lines.length).toBeGreaterThan(0);
    expect(getBundledDisplayFile("usagehlp", "3.6.7")).toBeNull();
    expect(getBundledDisplayFile("cmdhelp", "5.0")?.title).toBe("Command Help");
  });

  // The license stays in its original wording.
  it.each(["help", "hh", "history", "keyhelp", "opthelp", "optmenu", "usagehlp", "wizhelp"])("translates NetHack 5.0's %s as a whole", (name) => {
    expect(translateHelpDocument(getBundledDisplayFile(name, "5.0")!.lines, "ja")).toMatch(/[\p{Script=Hiragana}\p{Script=Han}]/u);
  });

  it("keeps the 3.6.7 option list out of the 5.0 translation", () => {
    expect(translateHelpDocument(getBundledDisplayFile("opthelp", "3.6.7")!.lines, "ja")).toBeNull();
  });
});
