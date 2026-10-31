import { describe, expect, it } from "vitest";
import { translateGameMessage } from "./game-messages";
import { translateGamePrompt } from "./game-prompts";
import { translateStatusBadgeLabel } from "./status-text";

const ja = (message: string): string => translateGameMessage(message, "ja");

describe("assembled NetHack 5 messages", () => {
  it("translates combat with runtime verbs and punctuation", () => {
    expect(ja("The jackal bites again!")).toBe("ジャッカルが再び噛みついた！");
    expect(ja("You hit the newt!")).toBe("イモリに攻撃が命中した！");
    expect(ja("You smite the jackal.")).toBe("ジャッカルを打ち据えた。");
    expect(ja("The dagger hits the jackal.")).toBe("短剣がジャッカルに当たった。");
    expect(ja("The 2 arrows miss the newt.")).toBe("矢 ×2はイモリに当たらなかった。");
    expect(ja("The sleep ray misses the gnome.")).toBe("睡眠光線はノームに当たらなかった。");
    expect(ja("The arrow misses you.")).toBe("矢はあなたに当たらなかった。");
    expect(ja("The hill orc shoots 2 arrows!")).toBe("丘オークが矢 ×2を放った！");
    expect(ja("The jackal is killed!")).toBe("ジャッカルは倒された！");
    expect(ja("You kill the poor little dog!")).toBe("かわいそうな子犬を倒した！");
  });

  it("translates shops, item lines and the restore greeting", () => {
    expect(ja("Hello, Kafujinho!  Welcome again to Asidonhopo's general store!"))
      .toBe("こんにちは、Kafujinho！ Asidonhopoの雑貨店へまたようこそ！");
    expect(ja("\"For you, good sir; only 78 zorkmids for this shrieker corpse.\""))
      .toBe("「お客様には、このシュリーカーの死体がたったの 78 ゾークミドです」");
    expect(ja("a green gem (for sale, 3750 zorkmids)")).toBe("緑色の宝石（売り物、3750 ゾークミド）");
    expect(ja("Konnichi wa Kafujinho, the human Samurai, welcome back to NetHack!"))
      .toBe("こんにちは、Kafujinho！ 人間の侍として、NetHackへおかえりなさい。");
  });

  it("translates erosion, engraving, prayer and occupations", () => {
    expect(ja("The goblin's orcish helm rusts further!")).toBe("ゴブリンのオークの兜がさらに錆びた！");
    expect(ja("You write in the dust with your fingertip.")).toBe("指先でほこりに書いた。");
    expect(ja("There is an altar to Amaterasu Omikami (lawful) here.")).toBe("ここには天照大神の祭壇（秩序）がある。");
    expect(ja("You stop eating the jackal corpse.")).toBe("ジャッカルの死体を食べるのをやめた。");
    expect(ja("This newt corpse tastes terrible!")).toBe("このイモリの死体はひどい味だ！");
  });

  it("translates thefts, totals, look descriptions and container menus", () => {
    expect(ja("$ - 5 gold pieces (13 in total).")).toBe("$ - 金貨 ×5（合計 13）。");
    expect(ja("B - a partly used candle (lit).")).toBe("B - 使いかけのろうそく（点灯中）。");
    expect(ja("The sleep ray bounces!")).toBe("睡眠光線が跳ね返った！");
    expect(ja("The water nymph removes your coral ring (from right hand).")).toBe("水のニンフはあなたのサンゴの指輪（右手から）を外した。");
    expect(ja("The beautiful water nymph seduces you and you start taking off your mail.")).toBe("美しい水のニンフに誘惑され、あなたは鎧を脱ぎ始めた。");
    expect(ja("You have a little trouble lifting C - a tin opener.")).toBe("C - 缶切りを持ち上げるのに少し苦労した。");
    expect(ja("Move cursor to monster of interest:")).toBe("カーソルを注目するモンスターに移動してください：");
    expect(ja("tame little dog called Hachi")).toBe("Hachiという飼いならされた子犬");
    expect(ja("human samurai called Kafujinho")).toBe("Kafujinhoという人間の侍");
    expect(ja("The large box is empty.  Do what with it?")).toBe("大きな箱は空だ。どうしますか？");
    expect(ja("stash one item into the large box")).toBe("大きな箱に1つしまう");
  });

  it("translates quoted speech, piles and globs", () => {
    expect(ja("\"Irasshaimase, Kafujinho!  Welcome again to Kittamagh's second-hand bookstore!\""))
      .toBe("「いらっしゃいませ、Kafujinho！ Kittamaghの古本屋へまたようこそ！」");
    expect(ja("This food really hits the spot!")).toBe("この食べ物は本当においしい！");
    expect(ja("You hear rumbling nearby.")).toBe("近くでゴロゴロという音が聞こえた。");
    expect(ja("There are several objects here.")).toBe("ここには物が数個ある。");
    expect(ja("There is a small glob of gray ooze here.")).toBe("ここには小さな灰色ウーズの塊がある。");
  });

  it("handles collapsed spacing, epitaphs, scrolls and menus", () => {
    expect(ja("Klunk! The pipes vibrate noisily.")).toBe("ゴン！ パイプが大きな音を立てて振動した。");
    expect(ja("You learn \"haste self\".")).toBe("「自己加速」を習得した。");
    expect(ja("Something is engraved here on the headstone.")).toBe("ここの墓石に何かが刻まれている。");
    expect(ja("You read: \"Don't forget to stop and smell the roses\".")).toBe("「立ち止まってバラの香りをかぐのを忘れずに」と読んだ。");
    expect(ja("You read: \"Elbereth\".")).toBe("You read: \"Elbereth\".");
    expect(ja("The water nymph wakes up!")).toBe("水のニンフが目を覚ました！");
    expect(ja("Such creatures do not exist in this world.")).toBe("そのような生き物はこの世界に存在しない。");
    expect(ja("Take out what type of objects?")).toBe("どの種類の物を取り出しますか？");
    expect(ja("2 sprigs of wolfsbane")).toBe("トリカブトの小枝 ×2");
  });

  it("translates colors, category lines and suffix-ordered monster actions", () => {
    expect(ja("Your hands begin to glow red.")).toBe("両手が赤色に光り始めた。");
    expect(ja("Your katana glows blue for a moment.")).toBe("刀が一瞬青色に光った。");
    expect(ja("Some magenta liquid flows from the faucet.")).toBe("蛇口から赤紫色の液体が流れ出た。");
    expect(ja("A newt suddenly appears!")).toBe("イモリが突然現れた！");
    expect(ja("Blecch! Rotten food!")).toBe("うえっ！ 腐った食べ物だ！");
    expect(ja("You hear the shrill sound of guards' whistles.")).toBe("警備兵の甲高い笛の音が聞こえた。");
    expect(ja("Gems/Stones")).toBe("宝石・石");
    expect(ja("Auto-select every relevant item")).toBe("該当する物をすべて自動選択");
    expect(ja("Your katana glows octarine for a moment.")).toBe("Your katana glows octarine for a moment.");
  });

  it("keeps joined or unknown messages unchanged", () => {
    expect(ja("You hit the goblin. You kill it!")).toBe("You hit the goblin. You kill it!");
    expect(ja("You stop doing something odd.")).toBe("You stop doing something odd.");
  });

  it("recognizes prompts with gold in the choice list and status words", () => {
    expect(translateGamePrompt("What do you want to throw? [$b or ?*]", "ja")).toBe("何を投げますか？ [$b or ?*]");
    expect(translateStatusBadgeLabel("Hungry", "ja")).toBe("空腹");
    expect(translateStatusBadgeLabel("Hungry", "en")).toBe("Hungry");
  });
});
