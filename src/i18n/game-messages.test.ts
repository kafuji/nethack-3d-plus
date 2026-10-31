import { describe, expect, it } from "vitest";
import { translateGameMessage } from "./game-messages";

describe("game message presentation", () => {
  it("translates NetHack 5 tutorial engravings and retains configured keys", () => {
    expect(translateGameMessage('You read: "Move around with 4 2 8 6".', "ja"))
      .toBe("「4 2 8 6 で移動します」と読んだ。");
    expect(translateGameMessage("Something is engraved here on the floor.", "ja"))
      .toBe("ここの床に何かが刻まれている。");
    expect(translateGameMessage("Not carrying anything.", "ja")).toBe("何も持っていない。");
    expect(translateGameMessage('You read: "Move around with h j k l".', "ja"))
      .toBe("「h j k l で移動します」と読んだ。");
    expect(translateGameMessage('You read: "Close the door with \'c\'".', "ja"))
      .toBe("「'c' でドアを閉めます」と読んだ。");
    expect(translateGameMessage('You read: "Note: Outside the tutorial, Ctrl-key combinations are shown prefixed with a caret, like \'^D\'".', "ja"))
      .toBe("「注：チュートリアルの外では、Ctrl キーとの組み合わせを '^D' のように表示します」と読んだ。");
    expect(translateGameMessage('You feel the words: "Pick up items with \',\'".', "ja"))
      .toBe("「',' でアイテムを拾います」の文字を指で感じた。");
    expect(translateGameMessage('You read: "Open the door by moving into it".', "ja"))
      .toBe("「ドアに向かって移動すると開きます」と読んだ。");
    expect(translateGameMessage('You read: "Elbereth".', "ja"))
      .toBe('You read: "Elbereth".');
    expect(translateGameMessage('You read: "Close the door with \'c\'".', "en"))
      .toBe('You read: "Close the door with \'c\'".');
  });
  it("translates known messages and preserves surrounding whitespace", () => {
    expect(translateGameMessage("Eating that is instantly fatal.", "ja")).toContain("即死");
    expect(translateGameMessage("  The door opens.  ", "ja")).toBe("  ドアが開いた。  ");
    expect(translateGameMessage("You descend the stairs.", "ja")).toBe("階段を下りた。");
    expect(translateGameMessage("You see no door there.", "ja")).toBe("そこにドアは見当たらない。");
  });

  it("keeps variable names and numbers in supported templates", () => {
    expect(translateGameMessage("You swap places with Hachi.", "ja"))
      .toBe("Hachiと位置を入れ替えた。");
    expect(translateGameMessage("You swap places with your kitten.", "ja"))
      .toBe("あなたの子猫と位置を入れ替えた。");
    expect(translateGameMessage("The goblin thrusts her orcish dagger.", "ja"))
      .toBe("ゴブリンが自分のオークの短剣を突き出した。");
    expect(translateGameMessage("h - a scroll labeled ABRA KA DABRA.", "ja"))
      .toBe("h - 「ABRA KA DABRA」と書かれた巻物。");
    expect(translateGameMessage("h - a scroll labeled ABRA KA DABRA.", "en"))
      .toBe("h - a scroll labeled ABRA KA DABRA.");
    expect(translateGameMessage("Hachi bites the goblin.", "ja"))
      .toBe("Hachiがゴブリンに噛みついた。");
    expect(translateGameMessage("Hachi eats a goblin corpse.", "ja"))
      .toBe("Hachiがゴブリンの死体を食べた。");
    expect(translateGameMessage("Hachi picks up some gold.", "ja"))
      .toBe("Hachiが金貨を拾った。");
    expect(translateGameMessage("The goblin wields an orcish dagger!", "ja"))
      .toBe("ゴブリンがオークの短剣を手に持った！");
    expect(translateGameMessage("The goblin casts a spell at Hachi!", "ja"))
      .toBe("ゴブリンがHachiに呪文を唱えた！");
    expect(translateGameMessage("The goblin steals a long sword from Hachi!", "ja"))
      .toBe("ゴブリンがHachiから長い剣を盗んだ！");
    expect(translateGameMessage("The goblin falls asleep.", "ja")).toBe("ゴブリンは眠りに落ちた。");
    expect(translateGameMessage("Hachi is trapped!", "ja")).toBe("Hachiは罠にかかった！");
    expect(translateGameMessage("Your long sword crumbles and turns to dust!", "ja"))
      .toBe("長い剣が崩れて塵になった！");
    expect(translateGameMessage("This wand is a wand of fire!", "ja"))
      .toBe("このワンドは炎のワンドだ！");
    expect(translateGameMessage("This pink potion contains toxic wastes!", "ja"))
      .toBe("この桃色のポーションには有毒な廃棄物が入っている！");
    expect(translateGameMessage("You can't tip a sack while carrying so much.", "ja"))
      .toBe("荷物が多すぎて袋を傾けられない。");
    expect(translateGameMessage("A trap door above you opens, but nothing falls out!", "ja"))
      .toBe("あなたの上の落とし戸が開いたが、何も落ちてこなかった！");
    expect(translateGameMessage("There is a doorway here.", "ja"))
      .toBe("ここには戸口がある。");
    expect(translateGameMessage("The invisible goblin misses Hachi.", "ja"))
      .toBe("透明なゴブリンの攻撃はHachiに当たらなかった。");
    expect(translateGameMessage("Your oil lamp catches light!", "ja")).toBe("油のランプに火がついた！");
    expect(translateGameMessage("The goblin is destroyed!", "ja")).toBe("ゴブリンは破壊された！");
    expect(translateGameMessage("The goblin pretends to be friendly to the dog.", "ja"))
      .toBe("ゴブリンは犬に友好的なふりをした。");
    expect(translateGameMessage("You hit the goblin.", "ja")).toBe("ゴブリンに攻撃が命中した。");
    expect(translateGameMessage("Welcome to experience level 3.", "ja")).toBe("経験レベルが3になった。");
    expect(translateGameMessage("Velkommen Web_user, welcome to NetHack! You are a lawful dwarven Valkyrie.", "ja"))
      .toBe("ようこそ、Web_user！ NetHackへようこそ。あなたは秩序属性のドワーフのワルキューレです。");
    expect(translateGameMessage("Hello Web_user, welcome to NetHack! You are a lawful dwarven Caveman.", "ja"))
      .toBe("こんにちは、Web_user！ NetHackへようこそ。あなたは秩序属性のドワーフの原始人です。");
    expect(translateGameMessage("Hello Web_user, welcome to NetHack! You are a chaotic male orcish Rogue.", "ja"))
      .toBe("こんにちは、Web_user！ NetHackへようこそ。あなたは混沌属性の男性のオークの盗賊です。");
    expect(translateGameMessage("Hello Alice, welcome to NetHack! You are a neutral female human Priestess.", "ja"))
      .toBe("こんにちは、Alice！ NetHackへようこそ。あなたは中立属性の女性の人間の女司祭です。");
    expect(translateGameMessage("Konnichi wa Keiko, welcome to NetHack!  You are a lawful human Samurai.", "ja"))
      .toBe("こんにちは、Keiko！ NetHackへようこそ。あなたは秩序属性の人間の侍です。");
    expect(translateGameMessage("Hello Alice, welcome to NetHack! You are a neutral hobbit Flame Mage.", "ja"))
      .toBe("こんにちは、Alice！ NetHackへようこそ。あなたは中立属性のホビットの炎の魔術師です。");
    expect(translateGameMessage("Hello Alice, welcome to NetHack! You are a mysterious human Inventor.", "ja"))
      .toBe("こんにちは、Alice！ NetHackへようこそ。あなたはmysteriousの人間のInventorです。");
    expect(translateGameMessage("Hello Alice, welcome to NetHack! You are an unknown hero.", "ja"))
      .toBe("こんにちは、Alice！ NetHackへようこそ。あなたはan unknown heroです。");
  });

  it("translates common dungeon events and danger messages", () => {
    expect(translateGameMessage("You drop one dagger!", "ja")).toBe("短剣を1個落とした！");
    expect(translateGameMessage('This scroll is marked "ZELGO MER".', "ja"))
      .toBe("この巻物には「ZELGO MER」と書かれている。");
    expect(translateGameMessage("Boing!", "ja")).toBe("ボヨン！");
    expect(translateGameMessage("You see here a blessed +1 long sword.", "ja"))
      .toBe("ここには祝福された +1 長い剣がある。");
    expect(translateGameMessage("There is a mysterious object here.", "ja"))
      .toBe("ここにはa mysterious objectがある。");
    expect(translateGameMessage("You are suddenly moving much faster.", "ja"))
      .toBe("急に体がずっと速く動くようになった。");
    expect(translateGameMessage("The door unlocks!", "ja")).toBe("ドアの鍵が開いた！");
    expect(translateGameMessage("A boulder blocks your path.", "ja")).toBe("大岩が行く手をふさいでいる。");
    expect(translateGameMessage("Your limbs are stiffening.", "ja")).toBe("手足がこわばってきた。");
    expect(translateGameMessage("A trap door opens up under you!", "ja")).toBe("足元に落とし戸が開いた！");
    expect(translateGameMessage("You're not carrying anything to be identified.", "ja"))
      .toBe("鑑定できるものを持っていない。");
    expect(translateGameMessage("You finish your prayer.", "ja")).toBe("祈りを終えた。");
  });

  it("leaves unknown or compound messages and other languages unchanged", () => {
    for (const message of ["A mysterious message.", "You hit the goblin. You kill it!", "", "constructor", "toString", "__proto__"]) {
      expect(translateGameMessage(message, "ja")).toBe(message);
    }
    expect(translateGameMessage("The door opens.", "en")).toBe("The door opens.");
    expect(translateGameMessage("The door opens.", "fr")).toBe("The door opens.");
  });
});
