import { describe, expect, it } from "vitest";
import { translateGamePrompt } from "./game-prompts";

describe("game prompt presentation", () => {
  it("translates known prompts while retaining choice keys and defaults", () => {
    expect(translateGamePrompt("Do you want to see what you had when you died? [yn] (n)", "ja"))
      .toBe("死亡時の持ち物を見ますか？ [yn] (n)");
    expect(translateGamePrompt("Switch from the tutorial back to regular play? [yn] (n)", "ja"))
      .toBe("チュートリアルを終了して通常プレイに戻りますか？ [yn] (n)");
    expect(translateGamePrompt("In what direction?", "ja")).toBe("どの方向ですか？");
    expect(translateGamePrompt("Really quit? [yn] (n)", "ja")).toBe("本当に終了しますか？ [yn] (n)");
    expect(translateGamePrompt("What do you want to eat?", "ja")).toBe("何を食べますか？");
    expect(translateGamePrompt("Are you sure you want to pray? [yn] (n)", "ja")).toBe("本当に祈りますか？ [yn] (n)");
    expect(translateGamePrompt("What tune are you playing? [5 notes, A-G]", "ja")).toBe("どの旋律を演奏しますか？ [5 notes, A-G]");
    expect(translateGamePrompt("What do you want to look at:", "ja")).toBe("何を調べますか：");
    expect(translateGamePrompt("Which spell would you like to cast?", "ja")).toBe("どの呪文を唱えますか？");
    expect(translateGamePrompt("Choose which spell to cast", "ja")).toBe("唱える呪文を選んでください");
  });

  it("preserves dynamic item and monster names and choice keys", () => {
    expect(translateGamePrompt("There are 5 gold pieces here; eat them? [yn] (n)", "ja"))
      .toBe("ここに金貨が5枚あります。食べますか？ [yn] (n)");
    expect(translateGamePrompt("You find a trap!  Do you want to try to disarm it? [yn] (n)", "ja"))
      .toBe("罠を発見した！ 解除を試みますか？ [yn] (n)");
    expect(translateGamePrompt("There is already a game in progress under your name.  Destroy old game? [yn] (n)", "ja"))
      .toBe("同じ名前のゲームが既に進行中です。古いゲームを消去しますか？ [yn] (n)");
    expect(translateGamePrompt("Really attack the peaceful priest? [yn] (n)", "ja"))
      .toBe("友好的な司祭を本当に攻撃しますか？ [yn] (n)");
    expect(translateGamePrompt("  Pick up a blessed scroll? [ynaq] (n)  ", "ja"))
      .toBe("  祝福された巻物を拾いますか？ [ynaq] (n)  ");
    expect(translateGamePrompt("What do you want to name this dagger?", "ja"))
      .toBe("この短剣に何と名前を付けますか？");
    expect(translateGamePrompt("Pick 3 of what?", "ja")).toBe("何を3個拾いますか？");
    expect(translateGamePrompt("This spellbook is very difficult to comprehend.  Continue? [yn] (n)", "ja"))
      .toBe("この魔法書を理解するのはとても難しいです。続けますか？ [yn] (n)");
    expect(translateGamePrompt("You are wielding a long sword.  Ready a dagger instead?", "ja"))
      .toBe("長い剣を手に持っています。代わりに短剣を準備しますか？");
  });

  it("leaves unknown prompts and other locales untouched", () => {
    for (const prompt of ["Unknown? [yn] (n)", "constructor", "toString", "__proto__"]) {
      expect(translateGamePrompt(prompt, "ja")).toBe(prompt);
    }
    expect(translateGamePrompt("Really quit?", "en")).toBe("Really quit?");
    expect(translateGamePrompt("Really attack the goblin? Extra text", "ja"))
      .toBe("Really attack the goblin? Extra text");
    expect(translateGamePrompt("Really attack the goblin? [yn] (n)", "fr"))
      .toBe("Really attack the goblin? [yn] (n)");
  });
});
