import { describe, expect, it } from "vitest";
import { translateGameMenuItem } from "./game-menu";
import { translateGamePrompt } from "./game-prompts";
import { translateHelpDocument } from "./help-text";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
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
  ["Dirk's ghost touches you!", "ディルクの幽霊があなたに触れた！"],
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
  ["The priest of Moloch casts a spell!", "モロクの司祭が呪文を唱えた！"],
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
  ["You have 50 zorkmids credit at Asidonhopo's general store.", "アシドンホポの雑貨店に50ゾークミドの信用がある。"],
  ["\"Don't Panic\"", "「あわてるな」"],
  // Generated names, in katakana wherever they appear.
  ["You enter Izchak's lighting store!", "イズチャクの照明店に入った！"],
  ["You do not owe Sipaliwini anything.", "シパリウィニには何の借りもない。"],
  ["Aothog of Aothaiakh wields a long sword!", "アオスアイアクのアオスオグがロングソードを手に持った！"],
  ["Ai-goru of Aothaiakh is suddenly moving faster.", "アオスアイアクのアイ・ゴルウの動きは突然すばやくなった。"],
  ["The vial crashes on Aothog of Aothaiakh's head and breaks into shards.", "ガラス瓶がアオスアイアクのアオスオグの頭に当たって割れ、破片になった。"],
  ["Mike the Traveler hits!", "旅行者のマイクが攻撃を命中させた！"],
  ["coyote - Hungrii Flea-Bagius", "コヨーテ - ハングリイ・フリーバギウス"],
  ["You miss Madame.", "マダムへの攻撃は外れた。"],
  ["peaceful Izchak", "友好的なイズチャク"],
  // Rays, liquids and traps as a hallucinating hero sees them.
  ["The blast of salt misses the homunculus.", "塩の爆風はホムンクルスに当たらなかった。"],
  ["The wolf is killed by the blast of leaves!", "オオカミは木の葉の爆風で殺された！"],
  ["You splash some mulled wine around.", "ホットワインをあたりにはね散らした。"],
  ["box and stick trap", "箱と棒の罠"],
  // Shop talk and other sentences the bot met.
  ["A brass lantern, price 16 zorkmids, superb craftsmanship!", "真鍮のランタン、お値段16ゾークミド。見事な出来ばえだ！"],
  ["The priest of Moloch hurls a potion of blindness!", "モロクの司祭が盲目のポーションを投げつけた！"],
  ["Your help is urgently needed at Orion's camp!", "オリオンの野営地であなたの助けが緊急に必要だ！"],
  ["Use the command #monster to spin a web.", "#monster コマンドで巣を張れる。"],
  ["Your rear limb feels better.", "あなたの後肢は具合がよくなった。"],
  // Assembled from the source's word tables.
  ["adjust: adjust inventory letters", "adjust: 持ち物の文字を整理する"],
  ["So, Agent, you dare return to Asidonhopo's general store?!", "Agentよ、アシドンホポの雑貨店によくも戻って来られたな！"],
  ["You enter Asidonhopo's general store again!", "アシドンホポの雑貨店に再び入った！"],
  ["You owe Asidonhopo 50 zorkmids for goods lost.", "アシドンホポに失われた品物の代金として50ゾークミドの借りがある。"],
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
  // Left in English once JNetHack's translation was no longer used.
  ["You ascend to the status of Demigod...", "あなたは昇天し、半神の地位に上った…"],
  ["You ascend to the status of Demigoddess...", "あなたは昇天し、半女神の地位に上った…"],
  ["You reveal 2 secret corridors!", "隠し通路2個をあらわにした！"],
  ["You fail to unleash something.", "何かのリードを外し損ねた。"],
  ["The Key feels very warm!", "鍵はとても温かい！"],
  ["You hear a voice say, \"They're dead, Jim.\"", "「死んでいるよ、ジム」という声が聞こえた。"],
  ["\"Hello stranger, who are you?\" -", "「やあ、見知らぬ人よ、お前は誰だ？」 -"],
];

// Each line as a text window shows it: report rendering, then message rendering.
const windowLines: ReadonlyArray<readonly [string, string]> = [
  ["      Completed quest for Lord Sato.", "      佐藤卿のクエストを達成した。"],
  ["      Stairs down to the Gnomish Mines.", "      ノームの鉱山への下り階段。"],
  ["      The castle (play C D E F G to open or close drawbridge).", "      城（「C D E F G」を奏でると跳ね橋が開閉する）。"],
  ["You dissolved in the lava in Gehennom on dungeon level 40 with 2 points,", "あなたはゲヘナの地下40階で溶岩に溶けた（2ポイント）、"],
  ["       3 worthless pieces of colored glass,", "       価値のない色ガラス3個、"],
  ["The Amulet of Yendor (worth 30000 zorkmids and 30000 points)", "イェンダーの魔除け（30000ゾークミド、30000ポイント相当）"],
  ["Extinct species:", "絶滅した種族："],
  ["You aggravated monsters.", "モンスターを刺激していました。"],
  ["you, crushed to death underneath a drawbridge.", "あなた（跳ね橋の下敷きになって死んだ）。"],
  ["you, killed by touching a cockatrice corpse bare-handed.", "あなた（コカトリスの死体を素手で触ったことに殺された）。"],
];

const prompts: ReadonlyArray<readonly [string, string]> = [
  ["Do you want a list of extinct species?", "絶滅した種族の一覧を見ますか？"],
  ["Do you want a list of species genocided and extinct?", "抹殺または絶滅した種族の一覧を見ますか？"],
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

  it.each(windowLines)("translates the window line %s", (english, japanese) => {
    expect(presentGameMessage(translateReportLine(english, "ja"), "ja").text).toBe(japanese);
  });

  it.each(prompts)("translates the prompt %s", (english, japanese) => {
    expect(translateGamePrompt(english, "ja")).toBe(japanese);
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

