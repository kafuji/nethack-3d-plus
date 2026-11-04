import { describe, expect, it } from "vitest";
import { translateGamePrompt } from "./game-prompts";
import { translateMenuItemText } from "./inventory-text";

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
      .toBe("このダガーに何と名前を付けますか？");
    expect(translateGamePrompt("Pick 3 of what?", "ja")).toBe("何を3個拾いますか？");
    expect(translateGamePrompt("This spellbook is very difficult to comprehend.  Continue? [yn] (n)", "ja"))
      .toBe("この魔法書を理解するのはとても難しいです。続けますか？ [yn] (n)");
    expect(translateGamePrompt("You are wielding a long sword.  Ready a dagger instead?", "ja"))
      .toBe("ロングソードを手に持っています。代わりにダガーを準備しますか？");
  });

  it("translates the pronoun-only wield and ready confirmations", () => {
    expect(translateGamePrompt("You have that readied.  Wield it instead? [ynq] (n)", "ja"))
      .toBe("それは準備しています。代わりに手に持ちますか？ [ynq] (n)");
    expect(translateGamePrompt("You are wielding those.  Ready them instead?", "ja"))
      .toBe("それは手に持っています。代わりに準備しますか？");
    expect(translateGamePrompt("That is your alternate weapon.  Ready it instead?", "ja"))
      .toBe("それは予備の武器です。代わりに準備しますか？");
    expect(translateGamePrompt("You have 5 daggers readied.  Wield one?", "ja"))
      .toBe("ダガー ×5を準備しています。一つを手に持ちますか？");
    expect(translateGamePrompt("You are wielding 3 daggers.  Ready 2 of them?", "ja"))
      .toBe("ダガー ×3を手に持っています。そのうち2つを準備しますか？");
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

  it("translates container class menus without leaving English verbs", () => {
    expect(translateGamePrompt("Put in what type of objects?", "ja")).toBe("どの種類の物を入れますか？");
    expect(translateGamePrompt("What kinds of thing do you want to put in? [abc or ?*]", "ja"))
      .toBe("どの種類の物を入れますか？ [abc or ?*]");
  });

  it("translates the just-picked-up menu choice", () => {
    expect(translateMenuItemText("Just picked up: a platinum wand", "ja")).toBe("直前に拾った物：白金の杖");
    expect(translateMenuItemText("Items you just picked up", "ja")).toBe("直前に拾った物");
  });
});
