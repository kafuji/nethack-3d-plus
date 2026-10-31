import { describe, expect, it } from "vitest";
import { nethack5ExtraMessages } from "./nethack5-extra-messages";

describe("NetHack 5 exact message translations", () => {
  it("preserves the consequences and selection keys of recovery", () => {
    expect(nethack5ExtraMessages["Old game in progress. Destroy [y], Recover [r], or Cancel [n]?"])
      .toContain("削除 [y]、復元 [r]、キャンセル [n]");
    expect(nethack5ExtraMessages["Couldn't recover old game."]).toBe("以前のゲームを復元できなかった。");
  });

  it("keeps lethal warnings, item identity and input instructions", () => {
    expect(nethack5ExtraMessages["Eating that is instantly fatal."]).toContain("即死");
    expect(nethack5ExtraMessages["Sorry to say, this is a mere imitation of the true Amulet of Yendor."]).toContain("模造品");
    expect(nethack5ExtraMessages["Choose an item; use ESC to decline."]).toContain("ESC");
    expect(nethack5ExtraMessages["Hide [h] or spin a web [s]?"]).toContain("[h]");
    expect(nethack5ExtraMessages["Hide [h] or spin a web [s]?"]).toContain("[s]");
  });
});
