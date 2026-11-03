import { describe, expect, it } from "vitest";
import { presentGameMessage } from "./message-presentation";
import { translateGamePrompt } from "./game-prompts";
import { colorAdjective, colorAdverb } from "./color-text";

const ja = (message: string): string => presentGameMessage(message, "ja").text;

describe("object and monster verb messages", () => {
  it.each([
    ["Your wand of wishing glows feebly blue for a moment.", "あなたの願いのワンドは一瞬弱々しく青色に輝いた。"],
    ["Your wand of wishing violently glows silver for a while, then evaporates.", "あなたの願いのワンドはしばらく激しく銀色に輝き、蒸発した。"],
    ["Your long sword softly glows amber.", "あなたの長い剣は柔らかく琥珀色に輝いた。"],
    ["Your diluted potion of object detection dilutes further.", "あなたの薄められた物体探知のポーションはさらに薄まった。"],
    ["Your potion of healing dilutes.", "あなたの回復のポーションは薄まった。"],
    ["Your 2 scrolls of light catch fire and burn.", "あなたの光の巻物 ×2は火がついて燃えた。"],
    ["All of your potions of healing freeze and shatter!", "あなたの回復のポーションはすべて凍って砕け散った！"],
    ["The jackal's leather armor looks completely rusted.", "ジャッカルの革の鎧は完全に錆びついたようだ。"],
    ["The gnome lord's helmet glows black for a moment.", "ノームの領主の兜は一瞬黒く輝いた。"],
    ["Your candle goes out.", "あなたのろうそくの火が消えた。"],
    ["Your candles are getting short.", "あなたのろうそくは短くなってきた。"],
    ["The little dog yelps!", "子犬はキャンと鳴いた！"],
    ["The jackal growls!", "ジャッカルはうなった！"],
    ["The bat flies next to you.", "コウモリが飛んですぐ隣に来た。"],
    ["The jackal staggers for a moment.", "ジャッカルは一瞬よろめいた。"],
    ["The water nymph tries to steal your boots but gives up.", "水のニンフはあなたのブーツを盗もうとしたが、あきらめた。"],
    ["\"Take off your boots; let me rub your feet.\"", "「ブーツを脱いで。足をさすってあげる」"],
    ["The high priestess of Amaterasu Omikami gives you two bits for an ale.", "天照大神の高尼僧はあなたにエール代として2ビットくれた。"],
    ["Your pony moves the boulder.", "あなたの子馬は岩を動かした。"],
  ])("translates %s", (english, japanese) => {
    expect(ja(english)).toBe(japanese);
  });

  it("translates the seducer's armor prompt", () => {
    expect(translateGamePrompt("\"Shall I remove your boots, sweetheart?\" [yn] (n)", "ja"))
      .toBe("「かわいい人、ブーツを脱がせてあげましょうか？」 [yn] (n)");
    expect(translateGamePrompt("\"Shall I remove your gloves, lover?\"", "ja"))
      .toBe("「愛しい人、手袋を脱がせてあげましょうか？」");
  });

  it("renders glow colors, including hallucinatory ones", () => {
    expect(colorAdverb("light blue")).toBe("水色に");
    expect(colorAdverb("salty")).toBe("しょっぱく");
    expect(colorAdverb("plaid")).toBe("格子縞に");
    expect(colorAdverb("dancing")).toBe("踊るように");
    expect(colorAdjective("amber")).toBe("琥珀色の");
    expect(colorAdverb("unknown")).toBeUndefined();
  });
});
