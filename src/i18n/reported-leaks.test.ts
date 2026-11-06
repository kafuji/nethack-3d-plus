import { beforeAll, describe, expect, it } from "vitest";
import { translateGameMenuItem } from "./game-menu";
import { translateHelpDocument } from "./help-text";
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
  ["The priest of Moloch casts a spell!", "モロクの僧侶が呪文を唱えた！"],
  ["(2north,3east): doorway.", "（2北、3東）：戸口"],
  ["<17,6>   %  an uncursed apple", "<17,6> % 呪われていないリンゴ"],
  ["Portal to The Quest: 12", "クエストへのポータル：12階"],
  ["You have been killed twice.", "あなたは2回殺されたことがある。"],
  // The first pass over dat/ and the source's assembled sentences.
  ["Priestesses aren't able to use two weapons at once.", "女司祭は二つの武器を同時に使えない。"],
  ["The Dalek hits!", "ダーレクが攻撃を命中させた！"],
  ["The succubus of Set hits!", "セトのサキュバスが攻撃を命中させた！"],
  ["Added hilite hunger/changed/red&italic", "強調表示を追加した：空腹／変化時／赤＆斜体"],
  ["title/\"Adept\"/light-green&underline", "称号／「熟達者」／明るい緑＆下線"],
  ["cond_blind", "cond_blind（盲目）"],
  ["pickup_types          [\$]  (for autopickup)", "pickup_types [$]（自動拾い用）"],
  ["`role'               - your starting role (e.g., Barbarian, Valkyrie),", "`role' - 開始時の職業（例：Barbarian、Valkyrie）、"],
  ["'m' prefix has no effect for the look command.", "「m」接頭辞は #look コマンドに効果がない。"],
  ["\"Thou art doomed, wittol!\"", "「汝の運命は尽きた、間抜けめ！」"],
  ["You turn into a female silver dragon!", "シルバードラゴンに変化した！"],
  ["The design features toucans on an abstract background.", "抽象的な背景にオオハシの柄が描かれている。"],
  ["The voice of Thoth booms out: Thou hast angered me.", "トートの声が響いた：「汝は我を怒らせた。」"],
  ["You have 50 zorkmids credit at Asidonhopo's general store.", "Asidonhopoの雑貨店に50ゴールドの信用がある。"],
  ["\"Don't Panic\"", "「あわてるな」"],
  // Assembled from the source's word tables.
  ["adjust: adjust inventory letters", "adjust: 持ち物の文字を整理する"],
  ["So, Agent, you dare return to Asidonhopo's general store?!", "Agentよ、Asidonhopoの雑貨店によくも戻って来られたな！"],
  ["You enter Asidonhopo's general store again!", "Asidonhopoの雑貨店に再び入った！"],
  ["You owe Asidonhopo 50 zorkmids for goods lost.", "Asidonhopoに失われた品物の代金として50ゴールドの借りがある。"],
  ["The massive hammer hits!  Lightning strikes the jackal!", "巨大なハンマーが命中した！稲妻がジャッカルを撃った！"],
  ["Your dagger glows brown.", "あなたのダガーが茶色に光った。"],
  ["Your long sword softly glows amber and is now as good as new.", "あなたのロングソードが琥珀色に光った。新品同様になった。"],
  ["You feel like marching.", "行進したい気分だ。"],
  ["You begin bashing monsters with your bare hands.", "素手でモンスターを殴り始めた。"],
  ["You see a little dog drop out of your pack!", "子犬が背負い袋から出てくるのが見えた！"],
  ["A viridian glow surrounds you.", "ビリジアン色の光があなたを包んだ。"],
  ["The fiery blade burns the jackal!", "炎の刃がジャッカルを焼いた！"],
  ["You consume smoked newt.", "燻製のイモリの肉を食べた。"],
  ["There is a chest here.  Check it for traps?", "ここに宝箱がある。罠を調べますか？"],
];

const reportLines: ReadonlyArray<readonly [string, string]> = [
  ["you, killed by a falling rock.", "あなた（落石に殺された）。"],
  ["you, killed by kicking a wall.", "あなた（壁を蹴ったことに殺された）。"],
  ["you, killed by a jackal, while praying.", "あなた（祈っている間にジャッカルに殺された）。"],
  ["you, killed by overexertion.", "あなた（過労に殺された）。"],
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

  it.each([
    ["Welcome to NetHack!                ( description of version 3.6 )", "Have Fun, and Happy Hacking!", "NetHack へようこそ"],
    ["Debug-Mode Quick Reference:", "[Opt] = conditionally available depending upon build-time settings", "デバッグモード早見表"],
    ["How dynamically setting options works:", "those saved ones.", "ゲーム中のオプション設定"],
    ["This is a terse description of nethack's command line arguments.", "or can be viewed via 'nethack --usage | more' at the shell prompt.", "コマンドライン引数"],
    ["NetHack History file for release 5.0", "Ingo Paschke              Mike Engber               Yitzhak Sapir", "NetHack リリース 5.0 の歴史"],
    ["Menu control keys:", "Escape   Cancel menu without making any choice(s)", "メニューの操作キー"],
  ])("recognizes the help document starting %s", (first, last, japanese) => {
    expect(translateHelpDocument([first, "", last], "ja")).toContain(japanese);
  });

  it("translates the #version document's feature list but keeps Lua's license", () => {
    const document = translateHelpDocument([
      "Unix NetHack Version 5.0.0-0 post-release - last build Sep 23 2026 12:47:25",
      "",
      "Options compiled into this edition:",
      "    color, data librarian, save and bones files accepted from version 5.0.0 only, and",
      "    basic NetHack features.",
      "",
      "NetHack 5.0.* uses the 'Lua' interpreter to process some data:",
      "    \"Permission is hereby granted, free of charge,",
    ], "ja");
    expect(document).toContain("カラー、データライブラリアン、バージョン 5.0.0 のセーブファイルと骨ファイルに対応、NetHack の基本機能。");
    expect(document).toContain("Permission is hereby granted");
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
