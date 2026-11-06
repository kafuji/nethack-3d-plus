import { beforeAll, describe, expect, it } from "vitest";
import { translateGameMenuItem } from "./game-menu";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { loadJapaneseDictionary } from "./load-japanese-dictionary";
import { presentGameMessage } from "./message-presentation";
import { translateReportLine } from "./report-text";

const messages: ReadonlyArray<readonly [string, string]> = [
  ["Your vision seems to flatten for a moment but is normal now.", "視界が一瞬平らになったようだが、今は元に戻った。"],
  ["Your vision seems to dim for a moment but is happier now.", "視界が一瞬暗くなったようだが、今はなんだか楽しげだ。"],
  ["The yellow light floats between the iron bars.", "黄色い光は鉄格子の間をふわふわとすり抜けた。"],
  ["The ghost passes through the iron bars.", "幽霊は鉄格子をすり抜けた。"],
  ["You already found a monster.  Use 'm' prefix to force another search.", "すでにモンスターを見つけている。それでも探索するには「m」を前に付ける。"],
  ["You already found a monster. Use 'm' prefix to force another search.", "すでにモンスターを見つけている。それでも探索するには「m」を前に付ける。"],
  ["The giant zombie swings wildly and misses!", "巨人のゾンビはやみくもに殴りかかったが、外れた！"],
  ["The newt snaps wildly and misses!", "イモリはやみくもに噛みついたが、外れた！"],
  ["The incubus cajoles you.", "インキュバスはあなたをなだめすかした。"],
  ["The succubus comes on to you.", "サキュバスはあなたに言い寄ってきた。"],
  ["Some water gets into your bag of holding!", "水が保持の袋に入り込んだ！"],
  ["Well done, mortal!", "よくやった、定命の者よ！"],
  ["But now thou must face the final Test...", "だが今こそ、最後の試練に立ち向かわねばならぬ……"],
  ["Prove thyself worthy or perish!", "己の価値を示すか、さもなくば滅びよ！"],
  ["You notice that there is no gravity here.", "ここには重力がないことに気づいた。"],
  ["What a strange feeling!", "なんて奇妙な感覚だ！"],
  ["The Archon gazes at the earth elemental...", "アルコンは大地の精霊をにらんだ……"],
  ["The blinded Archon gazes toward it...", "盲目のアルコンはそれの方をにらんだ……"],
  // Found by scripts/i18n/play-bot.mjs.
  ["Something casts a spell at you!", "何かはあなたに呪文を唱えた！"],
  ["Dirk's ghost touches you!", "Dirkの幽霊があなたに触れた！"],
  ["The vampire bat's bite was poisoned!", "吸血コウモリの牙には毒が塗られていた！"],
  ["Its sting was poisoned!", "その針には毒が塗られていた！"],
  ["You detect 15 unseen monsters!", "見えないモンスターを15匹探知した！"],
  ["wall (no travel path)", "壁（移動経路なし）"],
  ["Unknown direction: 'p' (use 'h', 'j', 'k', 'l' or '.').", "「p」は方向キーではない（'h', 'j', 'k', 'l'、'.' を使ってください）。"],
  ["You ready: a - a +1 dagger.", "a - +1 ダガーを準備した。"],
  ["* elven bow (runed bow)", "＊ エルフの弓（ルーンの刻まれた弓）"],
  ["potion (fizzy)", "泡のあるポーション"],
  ["force bolt             1   attack         0%  91%-100%", "衝撃　レベル1　攻撃　失敗率0%　保持率91%-100%"],
  ["A board beneath you squeaks a B note loudly.", "足元の床板がBの音できしんだ。"],
  ["You don't have anything to use or apply.", "使えるものを持っていない。"],
  ["M-p     pray          pray to the gods for help", "M-p     pray          神に助けを祈る"],
  [".       wait          rest one move while doing nothing", ".       wait          何もせず1ターン休む"],
  ["Oops!  The Amulet of Yendor drops to the floor!", "おっと！ イェンダーの魔除けが床に落ちた！"],
  ["You are hit by the 2nd elven arrow!", "2本目のエルフの矢が当たった！"],
  ["You hear a lieutenant incant ZELGO MER.", "中尉が「ZELGO MER」と唱えるのが聞こえた。"],
  ["stone (no travel path)", "石（移動経路なし）"],
  ["The blast of gravy hits you!", "グレイビーソースの爆風があなたに当たった！"],
  ["The priest of Moloch casts a spell!", "モロクの僧侶は呪文を唱えた！"],
  ["(2north,3east): doorway.", "（2北、3東）：戸口"],
  ["<17,6>   %  an uncursed apple", "<17,6> % 呪われていないリンゴ"],
  ["Portal to The Quest: 12", "クエストへのポータル：12階"],
  ["You have been killed twice.", "あなたは2回殺されたことがある。"],
];

const reportLines: ReadonlyArray<readonly [string, string]> = [
  ["you, killed by a falling rock.", "あなた（落石に殺された）。"],
  ["you, killed by kicking a wall.", "あなた（壁を蹴ったことに殺された）。"],
];

const items: ReadonlyArray<readonly [string, string]> = [
  ["a candelabrum (0 of 7 candles attached)", "燭台（ろうそく 0/7本）"],
  ["the uncursed Candelabrum of Invocation (0 of 7 candles attached)", "呪われていない招来の燭台（ろうそく 0/7本）"],
  ["the blessed Candelabrum of Invocation (7 of 7 candles, lit)", "祝福された招来の燭台（ろうそく 7/7本、点灯中）"],
  ["a set of black dragon scales", "黒いドラゴンの鱗 1組"],
  ["an uncursed set of gold dragon scales", "呪われていない金色のドラゴンの鱗 1組"],
  ["a male jackal corpse", "雄のジャッカルの死体"],
  ["an uncursed tin of boiled newt meat", "呪われていないゆでたイモリの肉の缶詰"],
];

function reportedLeaks(): void {
  it.each(messages)("translates %s", (english, japanese) => {
    expect(presentGameMessage(english, "ja").text).toBe(japanese);
  });

  it.each(items)("translates the item %s", (english, japanese) => {
    expect(translateInventoryItem(english, "ja")).toBe(japanese);
  });

  it.each(reportLines)("translates the report line %s", (english, japanese) => {
    expect(translateReportLine(english, "ja")).toBe(japanese);
  });

  it("translates a menu sentence that ends in an item name", () => {
    expect(translateGameMenuItem("Name this specific egg", "", "ja")).toBe("この卵に名前を付ける");
    expect(translateGameMenuItem("Just picked up: an uncursed apple", "", "ja")).toBe("直前に拾った物：呪われていないリンゴ");
  });

  it("translates the object menu's special rows", () => {
    expect(translateGameMenuItem("(list everything)", "", "ja")).toBe("（すべて表示）");
    expect(translateGameMenuItem("(list likely candidates)", "", "ja")).toBe("（候補を表示）");
    expect(translateInventoryCategory("Special", "ja")).toBe("特殊");
  });
}

describe("reported leaks", reportedLeaks);

describe("reported leaks with the JNetHack dictionary loaded", () => {
  beforeAll(loadJapaneseDictionary, 40000);
  reportedLeaks();
});
