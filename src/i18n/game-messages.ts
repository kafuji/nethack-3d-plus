import type { SupportedLocale } from "./core";
import { translateInventoryCategory, translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { translateGroundObject } from "./game-ground";
import { nethack5ExtraMessages } from "./nethack5-extra-messages";
import engravingsSource from "./data/engravings-ja.tsv?raw";
import { lookupNethack5SourceExact, translateNethack5SourceMessage } from "./nethack5-source-messages";
import { translateAssembledMessage } from "./nethack5-assembled-messages";
import { translateRumor } from "./oracle-text";

// NetHack produces prose rather than stable message IDs. Translate only known,
// complete messages and narrowly defined templates; leave everything else
// intact. In particular, never feed translated text back to the game engine.
const japaneseMessages: Readonly<Record<string, string>> = {
  "A cloud.": "雲。",
  "A curse upon thee for sitting upon this most holy throne!": "この神聖なる玉座に座るとは、呪われるがよい！",
  "A little goes a long way.": "少しでも長持ちする。",
  "A splash tetra you are not.": "あなたはスプラッシュテトラではない。",
  "A tangled mass of plumbing remains below the sink.": "流しの下には絡み合った配管が残っている。",
  "A throne.": "玉座。",
  "Are you waiting to get hit?": "殴られるのを待っているのか？",
  "Do chunks miss?": "破片は外れるか？",
  "Do you want to call panic() after impossible()?": "impossible() の後で panic() を呼び出しますか？",
  "Do you want to call panic() and end your game?": "panic() を呼び出してゲームを終了しますか？",
  "Do you want to start fuzz testing?": "ファズテストを開始しますか？",
  "I am a Valkyrie.  If you see me running, try to keep up.": "私はワルキューレ。走っているのを見たら、ついてくるといい。",
  "I am an alchemist; if you see me running, try to catch up...": "私は錬金術師。走っているのを見たら、追いつけるものなら追いついてみろ……。",
  "I am in your debt.  I will grant one wish!": "恩に着る。願いを一つかなえてやろう！",
  "I beg you, help me satisfy this growing craving!": "お願いだ、この募る渇望を満たすのを手伝ってくれ！",
  "I believe it not!": "信じられぬ！",
  "I bestow upon thee a blessing.": "汝に祝福を授けよう。",
  "I can stand this craving no longer!": "もうこの渇望には耐えられない！",
  "I can't see a trap there.": "そこに罠は見えない。",
  "I can't see!": "目が見えない！",
  "I can't win, and neither will you!": "私が勝てないなら、お前も勝たせない！",
  "I couldn't afford this T-shirt so I stole it!": "このＴシャツを買う金がなかったから盗んだ！",
  "I crown thee...  The Hand of Elbereth!": "汝を……エルベレスの手に任じよう！",
  "I don't know you.": "お前のことは知らない。",
  "I don't take bribes from scum like you!": "お前のような奴から賄賂は受け取らん！",
  "I explored the Dungeons of Doom and all I got was this lousy T-shirt!": "運命の大迷宮を探検したのに、手に入ったのはこのくだらないＴシャツだけ！",
  "I find myself growing a little weary.": "少し疲れてきたようだ。",
  "I give up.  Sorry.": "もうお手上げだ。すまない。",
  "I hate this job!": "こんな仕事は大嫌いだ！",
  "I only drink... potions.": "私が飲むのは……ポーションだけだ。",
  "I see no monster there.": "そこにモンスターは見えない。",
  "I shall return.": "また戻ってくるぞ。",
  "I thank thee for thy contribution.": "汝の寄付に感謝する。",
  "I want to live forever or die in the attempt.": "永遠に生きるか、それを目指して死にたい。",
  "I won't stock that.  Take it out of here!": "そんなものは扱わない。ここから持って出ていけ！",
  "I'll be back when you're ready to speak to me!": "話す気になったらまた来るぞ！",
  "I'll be back.": "また戻ってくるぞ。",
  "I'll take care of that; please move along.": "それはこちらで対処する。先へ進んでくれ。",
  "I'll take that; now get moving.": "それは預かる。さあ、行った行った。",
  "I'm confused!": "混乱している！",
  "I'm finally free!": "やっと自由になれた！",
  "I'm free!": "自由だ！",
  "I'm hungry.": "お腹が空いた。",
  "I'm late!": "遅刻だ！",
  "I'm making SCIENCE!": "科学の実験中だ！",
  "I'm trapped!": "閉じ込められた！",
  "I've never heard of such monsters.": "そんなモンスターは聞いたことがない。",
  "I've never heard of such things.": "そんなものは聞いたことがない。",
  "It can't become that.": "それには変われない。",
  "It felt good to get out of the rain.": "雨をしのげて気分がよかった。",
  "It is about time!": "やっとか！",
  "It is about time.": "そろそろ潮時だ。",
  "It's like talking to a wall.": "壁に向かって話しているようだ。",
  "It's not the size of your sword, it's how #enhance'd you are with it.": "大事なのは剣の大きさではなく、その技能をどれだけ #enhance で強化したかだ。",
  "It's not too late.": "まだ遅くない。",
  "It's not very comfortable...": "あまり座り心地はよくない……。",
  "It's obscene!": "なんて卑猥なんだ！",
  "It's on the house!": "店のおごりだ！",
  "It's probably not a good time for a picnic...": "ピクニックにはあまりよい時ではなさそうだ……。",
  "It's squishy...": "ぐにゃぐにゃしている……。",
  "No boulder was released.": "大岩は出てこなかった。",
  "No boundary for Wizard's Tower?": "魔法使いの塔の境界がありません。",
  "No more rects...": "矩形をこれ以上確保できません……。",
  "No need for unicorn horn?": "一角獣の角は必要ありませんか？",
  "No random god name?": "ランダムな神の名前がありません。",
  "No start/end room loc in join_map.": "join_map に開始または終了する部屋の位置がありません。",
  "No window types supported?": "対応するウィンドウ形式がありません。",
  "No charge.": "料金はかからない。",
  "No checks, no credit, no problem.": "小切手も掛け売りもなし。それでよし。",
  "No chronicled events.": "記録された出来事はない。",
  "No display macro issues detected.": "表示マクロの問題は検出されなかった。",
  "No mere dungeon adventurer could write that.": "ただのダンジョン冒険者にはそれを書けない。",
  "No monster difficulty discrepancies were detected.": "モンスターの難易度に不一致は検出されなかった。",
  "No monsters currently migrating.": "現在、移動中のモンスターはいない。",
  "No objects buried.": "埋められた物はない。",
  "No objects here or adjacent to bury.": "ここにも隣にも埋める物はない。",
  "No portal found.": "ポータルが見つからない。",
  "No thanks, I'd hang onto that if I were you.": "遠慮しておこう。私ならそれを手放さないがね。",
  "No timed properties.": "時間制限のある能力はない。",
  "No, mortal!  That will not be done.": "ならぬ、人の子よ！ それはかなえられぬ。",
  "Suddenly, the dungeon collapses.": "突然、ダンジョンが崩れ落ちた。",
  "That seemed remarkably uneventful.": "驚くほど何も起こらなかったようだ。",
  "That should do.  Now beat it!": "それでいい。さあ、失せろ！",
  "That was a scroll of mail?": "あれは郵便の巻物だったのか？",
  "That was all.": "それで全部だ。",
  "That was pure chewing satisfaction!": "噛み応えは申し分なかった！",
  "That was smooth!": "実に滑らかだった！",
  "That would be an interesting topological exercise.": "それは面白い位相幾何学の問題になりそうだ。",
  "That's in addition to the cost of the potion, of course.": "もちろんポーションの代金は別だ。",
  "That's not enough, coward!": "それでは足りんぞ、臆病者！",
  "The bars go much deeper than your pit.": "鉄格子はあなたのいる穴よりずっと深くまで続いている。",
  "The candy bar's wrapper is blank.": "キャンディーの包み紙には何も書かれていない。",
  "The coin miraculously lands on its edge!": "奇跡的にコインが立った！",
  "The dungeon capitulates.": "ダンジョンは降参した。",
  "The exchequer accepts your contribution.": "会計係はあなたの寄付を受け取った。",
  "The food's not fit for Orcs!": "こんな食べ物はオークですら食べられない！",
  "The fuzz tester will make NetHack execute random keypresses.": "ファズテスターは NetHack にランダムなキー入力を実行させます。",
  "The leash would just fall off.": "リードは外れてしまうだろう。",
  "The low-life wants to talk, eh?": "この下劣な奴が話をしたいだと？",
  "The throne is covered in acid!": "玉座は酸に覆われている！",
  "There is no underlying support for 'idlecheckpoint' compiled in.": "'idlecheckpoint' に必要な機能が組み込まれていません。",
  "There's a tiger in your tank.": "あなたのタンクには虎がいる。",
  "They shriek!": "彼らは悲鳴を上げた！",
  "They won't hear you out there.": "そこからでは声は届かない。",
  "This game is void.": "このゲームは無効です。",
  "This is my hunting ground that you dare to prowl!": "ここは私の狩場だ。よくもうろつきに来たな！",
  "This junk mail is less than satisfying.": "この迷惑メールはあまり食べ応えがない。",
  "This looks like it might be interesting to read.": "読んだら面白そうだ。",
  "This tastes just like chicken!": "まるで鶏肉のような味だ！",
  "This tastes like castor oil.": "ひまし油のような味がする。",
  "This throne was not meant for those such as you!": "この玉座はお前のような者のためのものではない！",
  "This tripe ration is surprisingly good!": "この臓物の食料は意外とうまい！",
  "This will teach you not to disturb me!": "私の邪魔をするとどうなるか思い知らせてやる！",
  "What a groovy feeling!": "なんて最高の気分だ！",
  "What a pity that you cannot read it!": "読めないとは残念だ！",
  "What a trippy feeling!": "なんて幻覚的な気分だ！",
  "What lousy pay we're getting here!": "なんてひどい給料なんだ！",
  "What would you write?  \"Jonah was here\"?": "何を書く？ 「ヨナ参上」とでも？",
  "What you perform is quite far from music...": "あなたの演奏は音楽とはほど遠い……。",
  "What's going on here?": "ここで何が起きている？",
  "Where are your ball and chain?": "鉄球と鎖はどこだ？",
  "Where is shopdoor?": "店のドアが見つかりません。",
  "Which commands autocomplete?": "どのコマンドを自動補完しますか？",
  "Which intrinsics?": "どの生得能力ですか？",
  "You are surrounded by twisty little passages, all alike.": "似たような曲がりくねった細い通路に囲まれている。",
  "You bite right into the metal tin...": "金属の缶にかじりついた……。",
  "You desecrate this place by your presence!": "お前がいるだけでこの場所が汚される！",
  "You disturbed me, fool!": "私の邪魔をしたな、愚か者！",
  "You feel extremely out of place.": "自分が場違いであると強く感じる。",
  "You feel materially poor.": "物質的に貧しいと感じる。",
  "You feel worried about your future financial situation.": "将来の経済状況が心配になった。",
  "You freed me!": "自由にしてくれたのだな！",
  "You get the heebie jeebies.": "ぞっとした。",
  "You irradiate yourself with pure energy!": "自分自身に純粋なエネルギーを照射した！",
  "You made the top ten list!": "ベスト10入りした！",
  "You may specify 'nothing' to explicitly decline this wish.": "願いを明示的に断るには 'nothing' と入力できます。",
  "You now prefer mimicking yourself.": "自分自身の姿に化けることにした。",
  "You seem no deader than before.": "前より死に近づいた様子はない。",
  "You set it, you buy it!": "罠を仕掛けたら買い取りだ！",
  "You still have the munchies.": "まだ何か食べたい。",
  "You take a walk on your web.": "自分の巣の上を歩いた。",
  "You tin it, you bought it!": "缶詰にしたら買い取りだ！",
  "You'll regret this infamous offense!": "この許しがたい罪を後悔するがよい！",
  "You're dog meat!": "お前は犬の餌だ！",
  "You're engraving with an illegal object!": "使えない物で刻もうとしている！",
  "You're joking!  In this weather?": "冗談だろう！ この天気で？",
  "You're killing me!": "勘弁してくれ！",
  "You've attracted the tree's former occupants!": "木の元の住人たちが集まってきた！",
  "You've been warned, knave!": "警告したぞ、悪党め！",
  "You've got to be kidding!": "冗談だろう！",
  "Your rind escaped intact.": "皮は無事だった。",
  "Your stomach acid melts straight through the ice!": "胃酸が氷を溶かして突き抜けた！",
  "The door opens.": "ドアが開いた。",
  "The door closes.": "ドアが閉まった。",
  "The door resists!": "ドアはびくともしない！",
  "The door is locked.": "ドアには鍵がかかっている。",
  "The door is already open.": "ドアはすでに開いている。",
  "The door is already closed.": "ドアはすでに閉まっている。",
  "You see no door there.": "そこにドアは見当たらない。",
  "The door unlocks!": "ドアの鍵が開いた！",
  "The door locks!": "ドアに鍵がかかった！",
  "The door crashes open!": "ドアが勢いよく開いた！",
  "The door splinters!": "ドアが砕け散った！",
  "The door disintegrates!": "ドアが消滅した！",
  "The door freezes and shatters!": "ドアが凍りついて砕け散った！",
  "The door is consumed in flames!": "ドアが炎に包まれて燃え尽きた！",
  "The door swings shut, and locks!": "ドアが閉まり、鍵がかかった！",
  "The broken door reassembles and locks!": "壊れたドアが元に戻り、鍵がかかった！",
  "You break through the door.": "ドアを破って通り抜けた。",
  "You break through a secret door!": "隠し扉を破って通り抜けた！",
  "A door appears in the wall!": "壁にドアが現れた！",
  "You're too small to pull the door open.": "体が小さすぎてドアを引いて開けられない。",
  "You're too small to push the door closed.": "体が小さすぎてドアを押して閉められない。",
  "It won't come off the hinges.": "蝶番から外れない。",
  "As you kick the door, it crashes open!": "ドアを蹴ると、勢いよく開いた！",
  "As you kick the door, it shatters to pieces!": "ドアを蹴ると、粉々に砕け散った！",
  "You descend the stairs.": "階段を下りた。",
  "You climb up the stairs.": "階段を上った。",
  "You can't go down here.": "ここでは下りられない。",
  "You can't go up here.": "ここでは上れない。",
  "You hear a door open.": "ドアが開く音が聞こえた。",
  "You hear a door close.": "ドアが閉まる音が聞こえた。",
  "You hear someone counting money.": "誰かがお金を数える音が聞こえた。",
  "You hear the footsteps of a guard on patrol.": "巡回中の見張りの足音が聞こえた。",
  "You hear a slow drip.": "水滴がゆっくり落ちる音が聞こえた。",
  "You hear bubbling water.": "水が泡立つ音が聞こえた。",
  "You hear water falling on coins.": "硬貨の上に水が落ちる音が聞こえた。",
  "You hear hissing gas.": "ガスが噴き出す音が聞こえた。",
  "You hear a mumbled curse.": "誰かが呪いの言葉をつぶやくのが聞こえた。",
  "You hear drilling!": "何かを掘る音が聞こえた！",
  "You hear crackling!": "パチパチとはじける音が聞こえた！",
  "You smell the odor of meat.": "肉のにおいがする。",
  "You smell a delicious smell.": "おいしそうなにおいがする。",
  "You feel better.": "気分が良くなった。",
  "You feel much better.": "ずっと気分が良くなった。",
  "You feel stronger!": "力が強くなった気がする！",
  "You feel weaker!": "力が弱くなった気がする！",
  "You feel faster!": "体が速くなった気がする！",
  "You are suddenly moving much faster.": "急に体がずっと速く動くようになった。",
  "You feel slower!": "体が遅くなった気がする！",
  "You feel more agile!": "身軽になった気がする！",
  "You feel less agile!": "身軽さが失われた気がする！",
  "You feel wise!": "賢くなった気がする！",
  "You feel foolish!": "愚かになった気がする！",
  "You feel tough!": "丈夫になった気がする！",
  "You feel fragile!": "もろくなった気がする！",
  "You feel hungry.": "お腹が空いた。",
  "You feel weak.": "力が入らない。",
  "You feel faint.": "気が遠くなりそうだ。",
  "You are beginning to feel hungry.": "お腹が空いてきた。",
  "You are beginning to feel weak.": "力が入らなくなってきた。",
  "You are beginning to feel faint.": "気が遠くなりそうになってきた。",
  "You feel full of energy.": "元気がみなぎってきた。",
  "You feel tired.": "疲れを感じる。",
  "You feel less confused now.": "混乱が収まった。",
  "You can see again.": "再び目が見えるようになった。",
  "You can hear again.": "再び耳が聞こえるようになった。",
  "You can move again.": "再び動けるようになった。",
  "You wake up.": "目を覚ました。",
  "You regain consciousness.": "意識を取り戻した。",
  "You are conscious again.": "再び意識が戻った。",
  "You regain your composure.": "落ち着きを取り戻した。",
  "You awake with a headache.": "頭痛とともに目が覚めた。",
  "You are slowing down.": "体の動きが遅くなってきた。",
  "Your limbs are stiffening.": "手足がこわばってきた。",
  "Your limbs have turned to stone.": "手足が石になった。",
  "You have turned to stone.": "体が石になった。",
  "You turn to stone!": "体が石になった！",
  "You no longer seem to be petrifying.": "石化は止まったようだ。",
  "You can no longer breathe.": "息ができなくなった。",
  "You find it hard to breathe.": "息苦しい。",
  "You're gasping for air.": "息を切らしている。",
  "You suffocate.": "窒息した。",
  "You're still drowning.": "まだ溺れている。",
  "You're still burning.": "まだ燃えている。",
  "You're enveloped in flames.": "炎に包まれた。",
  "You've set yourself afire!": "自分に火がついてしまった！",
  "You're covered in frost.": "霜に覆われた。",
  "You're covered in frost!": "霜に覆われた！",
  "You feel dizzy for a moment, but the sensation passes.": "一瞬めまいを感じたが、すぐに収まった。",
  "Your consciousness is fading.": "意識が遠のいていく。",
  "You feel threatened.": "危険を感じる。",
  "You feel tremors.": "振動を感じる。",
  "You feel limber!": "体が柔らかくなった気がする！",
  "You feel more limber.": "体がより柔らかくなった気がする。",
  "Your skin itches.": "肌がかゆい。",
  "Your bones itch.": "骨がうずく。",
  "You are in full health.": "体力は全快している。",
  "You are still in a pit.": "まだ穴の中にいる。",
  "You start to feel bloated.": "お腹が張ってきた。",
  "You are feeling rather flabby.": "体がずいぶんたるんだ気がする。",
  "You stop searching.": "探索をやめた。",
  "You stop eating.": "食べるのをやめた。",
  "You stop waiting.": "待つのをやめた。",
  "You finish eating.": "食べ終わった。",
  "You finish your prayer.": "祈りを終えた。",
  "You finish your dressing maneuver.": "着替えを終えた。",
  "You finish engraving.": "刻み終えた。",
  "You finish scrawling.": "書きなぐり終えた。",
  "You finish writing in the dust.": "ほこりへの書き込みを終えた。",
  "You read the scroll.": "巻物を読んだ。",
  "You easily open the tin.": "缶を簡単に開けた。",
  "You succeed in opening the tin.": "缶を開けることに成功した。",
  "It is not so easy to open this tin.": "この缶を開けるのは簡単ではない。",
  "It contains spinach.": "中にはほうれん草が入っている。",
  "It tasted bad.": "まずかった。",
  "It seems quite tasty.": "なかなかおいしそうだ。",
  "It turns out to be empty.": "中は空だった。",
  "The potion turns out to be empty.": "ポーションの瓶は空だった。",
  "Entering the tutorial.": "チュートリアルに入ります。",
  "Something is engraved here on the floor.": "ここの床に何かが刻まれている。",
  "Not carrying anything.": "何も持っていない。",
  "Looks like you're getting hungry.  You'll starve to death, unless you eat something.": "お腹が空いてきたようです。何か食べなければ餓死してしまいます。",
  "You feel slightly dizzy.": "少しめまいを感じた。",
  "You feel dizzier.": "めまいがさらにひどくなった。",
  "You feel feverish.": "熱っぽく感じる。",
  "You seem to have some trouble breathing.": "少し息苦しいようだ。",
  "Your illness feels worse.": "病気が悪化したようだ。",
  "Your illness is severe.": "病気が重くなっている。",
  "You are at Death's door.": "死の淵に立っている。",
  "You die from your illness.": "病気で死亡した。",
  "You drown.": "溺れた。",
  "You sink below the surface and die.": "水面下に沈み、死亡した。",
  "You die.": "死亡した。",
  "You turn to stone...": "体が石に変わっていく……。",
  "A secret door is revealed.": "隠し扉が見つかった。",
  "A secret corridor is revealed.": "隠し通路が見つかった。",
  "There is no command available to repeat.": "繰り返せるコマンドがない。",
  "Nothing else happens.": "ほかには何も起こらなかった。",
  "The air here seems foul.": "ここの空気は淀んでいるようだ。",
  "It is lit here now.": "ここは明るくなった。",
  "It passes harmlessly through you.": "それは無害なままあなたを通り抜けた。",
  "It doesn't hurt.": "痛くない。",
  "It tumbles away.": "それは転がっていった。",
  "You materialize on a different level!": "別の階に実体化した！",
  "You learn more about your items by comparing them.": "アイテムを比べて、さらに詳しいことが分かった。",
  "You already found a monster.": "すでにモンスターを見つけた。",
  "That feels like a boulder.": "大岩のような感触だ。",
  "As you read the scroll, it disappears.": "巻物を読むと、それは消えた。",
  "A ball and chain appears, then falls away.": "鉄球と鎖が現れたが、すぐに外れた。",
  "A cloud of dust springs up and assembles itself into a door!": "砂ぼこりが舞い上がり、集まってドアになった！",
  "A feeling of loss comes over you.": "何かを失ったような気がする。",
  "A few ice cubes drop from the wand.": "ワンドからいくつかの氷のかけらが落ちた。",
  "A greasy liquid sprays all over you!": "油っぽい液体を全身に浴びた！",
  "A large bubble rises to the surface and pops.": "大きな泡が水面に浮かび、はじけた。",
  "A mysterious force moves the gold into the vault.": "不思議な力が金貨を金庫へ移した。",
  "A terrible drone fills your head!": "恐ろしいうなりが頭に響く！",
  "An energized cloud of dust begins to coalesce.": "力を帯びた砂ぼこりが集まり始めた。",
  "An invisible choir chants, and you are bathed in darkness...": "見えない聖歌隊が歌い、あなたは闇に包まれた……。",
  "An invisible choir sings, and you are bathed in radiance...": "見えない聖歌隊が歌い、あなたは光に包まれた……。",
  "As the hand retreats, the fountain disappears!": "手が引っ込むと、泉が消えた！",
  "As you sit on the throne, your body and mind start to warp.": "玉座に座ると、体と心が歪み始めた。",
  "As your mind turns inward on itself, you forget everything else.": "意識が内側へ向かい、それ以外のすべてを忘れた。",
  "It doesn't seem at all sickening, though...": "しかし、まったく気分は悪くならないようだ……。",
  "It invokes nightmarish images in your mind...": "頭の中に悪夢のような光景が浮かぶ……。",
  "It is missed.": "それには当たらなかった。",
  "It leaves an oily film on the basin.": "それは流しに油の膜を残した。",
  "It rings! ... But no-one answers.": "呼び出し音が鳴る！……しかし誰も出ない。",
  "It seems even darker in here than before.": "ここは以前よりさらに暗くなったようだ。",
  "It shrieks!": "それが悲鳴を上げた！",
  "It tries to move where you are hiding.": "それはあなたが隠れている場所へ移動しようとした。",
  "It's empty.": "中は空だ。",
  "It's hard to walk in thin air.": "空中を歩くのは難しい。",
  "No applicable objects.": "使えるアイテムがない。",
  "No count allowed with this command.": "このコマンドには回数を指定できない。",
  "No creatures have been vanquished.": "倒した生き物はいない。",
  "No travel destination set.": "移動先が設定されていない。",
  "Something happens.": "何かが起こった。",
  "Suddenly a bolt of lightning comes down at you from the heavens!": "突然、天から稲妻が落ちてきた！",
  "Suddenly the rolling boulder disappears!": "突然、転がる大岩が消えた！",
  "Suddenly you are frozen in place!": "突然、体が動かなくなった！",
  "Suddenly you are transparent, but there!": "突然、体が透けたが、そこにいる！",
  "Suddenly you wake up!": "突然、目が覚めた！",
  "Suddenly, a section of the wall closes up!": "突然、壁の一部が閉じた！",
  "Suddenly, the shop door reappears!": "突然、店のドアが再び現れた！",
  "That debt is partially offset by your credit.": "その借金の一部はあなたの預け金と相殺された。",
  "That drawbridge is up!": "その跳ね橋は上がっている！",
  "That was probably a bad idea...": "それはまずい考えだったかもしれない……。",
  "That's enough tries!": "もう十分試した！",
  "That's enough tries.": "もう十分試した。",
  "That's too insubstantial to tin.": "それは実体が薄すぎて缶詰にできない。",
  "The Amulet is bestowing a wish upon you!": "魔除けが願いをかなえてくれる！",
  "The barbs stick to you!": "とげが体に刺さった！",
  "The bullwhip slips free.": "むちが抜けた。",
  "The ice, is gonna BREAK!": "氷が割れそうだ！",
  "There's a trapdoor beneath you; it shatters.": "足元に落とし戸があり、砕けた。",
  "There's not enough room here to use that.": "ここではそれを使う場所が足りない。",
  "There's not enough room to kick down here.": "ここでは下を蹴る場所が足りない。",
  "There's not enough room to kick in here.": "ここでは蹴る場所が足りない。",
  "This bottle turns out to be empty.": "この瓶は空だった。",
  "This calls for swimming, not jumping!": "ここでは飛ぶのではなく泳ぐ必要がある！",
  "This door is broken.": "このドアは壊れている。",
  "This door is safely open.": "このドアは安全に開いている。",
  "This door was not trapped.": "このドアには罠はなかった。",
  "This is a scroll of fire!": "これは炎の巻物だ！",
  "This is a vault teleport, usable once only.": "これは一度だけ使える金庫へのテレポートだ。",
  "This leash is not attached to that creature.": "この首ひもはその生き物につながっていない。",
  "This ring is indigestible!": "この指輪は消化できない！",
  "This spellbook is too faint to be read any more.": "この魔法書は文字が薄すぎて、もう読めない。",
  "This spellbook is too faint to read even once.": "この魔法書は文字が薄すぎて、一度も読めない。",
  "This tree seems to be petrified.": "この木は石化しているようだ。",
  "You've fallen, and you can't get up.": "倒れてしまい、起き上がれない。",
  "You've got the glop off.": "べたべたしたものを取り除いた。",
  "For some reason, you feel your presence is known.": "なぜか自分の存在が知られているような気がする。",
  "You're not carrying anything to be identified.": "鑑定できるものを持っていない。",
  "You have hidden gold.": "隠し持っている金貨がある。",
  "You still have hidden gold.  Drop it now.": "まだ金貨を隠し持っている。今すぐ置きなさい。",
  "You're too strained to do that.": "荷物が重すぎてそれはできない。",
  "You cannot fight while so heavily loaded.": "荷物が重すぎて戦えない。",
  "Your concentration falters from carrying so much.": "荷物が重すぎて集中できない。",
  "Your concentration falters while carrying so much stuff.": "荷物が重すぎて集中できない。",
  "It's too heavy.": "重すぎる。",
  "There is an obstacle there.": "そこには障害物がある。",
  "A boulder blocks your path.": "大岩が行く手をふさいでいる。",
  "There is a spider web here.": "ここにはクモの巣がある。",
  "A monster is there that you couldn't see.": "そこには見えていなかったモンスターがいる。",
  "A monster appears.": "モンスターが現れた。",
  "A trapdoor appears beneath you.": "足元に落とし戸が現れた。",
  "A trap door opens up under you!": "足元に落とし戸が開いた！",
  "A chasm opens up under you!": "足元に深い裂け目が開いた！",
  "There's a gaping hole under you!": "足元に大きな穴が開いている！",
  "An arrow shoots out at you!": "矢があなたに向かって飛んできた！",
  "A little dart shoots out at you!": "小さな矢があなたに向かって飛んできた！",
  "A cloud of gas puts you to sleep!": "ガスの雲に包まれて眠りに落ちた！",
  "An alarm sounds!": "警報が鳴った！",
  "A web bursts into flames!": "クモの巣が燃え上がった！",
  "A mysterious force prevents you from descending.": "不思議な力に阻まれて下りられない。",
  "A mysterious force prevents you from teleporting!": "不思議な力に阻まれてテレポートできない！",
  "You make an opening in the wall.": "壁に穴を開けた。",
  "You succeed in cutting away some rock.": "岩を削ることに成功した。",
  "The boulder falls apart.": "大岩が砕けた。",
  "The statue shatters.": "石像が砕けた。",
  "Ouch!  You bump into a door.": "いたっ！ ドアにぶつかった。",
  "Your limbs are getting oozy.": "手足がどろどろになってきた。",
  "Your skin begins to peel away.": "皮膚が剥がれ始めた。",
  "Your skin feels warm for a moment.": "一瞬、肌が温かく感じた。",
  "Your skin glows then fades.": "肌が光り、やがて光が消えた。",
  "Your hair stands up!": "髪の毛が逆立った！",
  "Your blood is having trouble reaching your brain.": "脳に血が回りにくくなっている。",
  "You have a sense of deja vu.": "どこかで見たことがあるような気がする。",
  "You feel like you've been here before.": "以前ここに来たことがあるような気がする。",
  "You feel something shatter.": "何かが砕けるのを感じた。",
  "You feel the wand heat up.": "ワンドが熱くなるのを感じた。",
  "You feel the ice shift beneath you!": "足元の氷が動いた！",
  "You feel a lack of something.": "何かが足りないような気がする。",
  "You feel too overwhelmed to continue!": "圧倒されて、もう続けられない！",
  "You float slightly lower.": "少し低く浮かんだ。",
  "You revive.": "生き返った。",
  "You are a statue.": "あなたは石像だ。",
  "You pull free.": "引き抜くことができた。",
  "You cut down the tree.": "木を切り倒した。",
  "You sense movement on the other side.": "向こう側で何かが動く気配を感じた。",
  "You clear some debris from between the pits.": "穴と穴の間のがれきを取り除いた。",
  "You move within the chain's reach.": "鎖の届く範囲内に移動した。",
  "You move over some lava.": "溶岩の上を移動した。",
  "You sink deeper into the lava.": "溶岩にさらに深く沈んだ。",
  "You survived that attempt on your life.": "命を狙われたが、生き延びた。",
  "You finish burning your message into the floor.": "床への焼き付けを終えた。",
  "You finish melting your message into the ice.": "氷を溶かして文字を書き終えた。",
  "You finish your weird engraving.": "奇妙な刻印を彫り終えた。",
  "You cannot write any more.": "これ以上は書けない。",
  "You fail to transform!": "変身に失敗した！",
  "You can't write such a weird scroll!": "そんな奇妙な巻物は書けない！",
  "You don't deserve to win!": "あなたに勝利する資格はない！",
  "The ice seems very soft and slushy.": "氷はとても柔らかく、シャーベット状に見える。",
  "The ice crackles and melts.": "氷が音を立てて溶けた。",
  "The trapdoor beneath you shatters.": "足元の落とし戸が砕けた。",
  "The slime disappears.": "スライムが消えた。",
  "The slime disappears!": "スライムが消えた！",
  "The slime burns away!": "スライムが燃え尽きた！",
  "The slime that covers you is burned away!": "体を覆っていたスライムが燃え尽きた！",
  "The water evaporates.": "水が蒸発した。",
  "The engraving beneath you fades.": "足元の刻印が消えた。",
  "The rock glows then fades.": "岩が光り、やがて光が消えた。",
  "The ground vibrates as you pass it.": "通り過ぎると地面が振動した。",
  "The tree's roots glow then fade.": "木の根が光り、やがて光が消えた。",
  "The ladder is unaffected.": "はしごには何の影響もなかった。",
  "The dungeon acoustics noticeably change.": "ダンジョンの音の響きが明らかに変わった。",
  "The foundation is too hard to dig through from this angle.": "土台は硬すぎて、この角度からは掘り進められない。",
  "The explosion awakens you!": "爆発で目が覚めた！",
  "The combat suddenly awakens you.": "戦いの物音で突然目が覚めた。",
  "The wand shoots an apparently harmless beam at you.": "ワンドから無害そうな光線が飛んできた。",
  "The wand unsuccessfully fights your attempt to write!": "ワンドは書くのを妨げようとしたが、失敗した！",
  "The tin opens like magic!": "缶が魔法のように開いた！",
  "An angel appears near you.": "近くに天使が現れた。",
  "A cloud of darkness falls upon you.": "闇の雲に包まれた。",
  "A wave of psychic energy pours out.": "念力の波が放たれた。",
  "A wave of psychic energy pours over you!": "念力の波を浴びた！",
  "A field of force surrounds you!": "力場に包まれた！",
  "A wall of force smashes down around you!": "力場の壁が周囲に打ち下ろされた！",
  "A pillar of fire strikes all around you!": "周囲に炎の柱が降り注いだ！",
  "A bolt of lightning strikes down at you from above!": "頭上から稲妻が落ちてきた！",
  "A sudden geyser slams into you from nowhere!": "突然、どこからともなく間欠泉が噴きつけてきた！",
  "A hail of magic missiles narrowly misses you!": "魔法のミサイルの雨がすんでのところで外れた！",
  "A wide-angle disintegration beam hits you!": "広角の分解光線が命中した！",
  "A mysterious force momentarily surrounds you...": "不思議な力に一瞬包まれた……。",
  "A voice booms out...": "声がとどろいた……。",
  "A huge hole opens up...": "大きな穴が開いた……。",
  "A wisp of vapor escapes the fountain...": "泉から一筋の蒸気が立ち上った……。",
  "A foul stench makes you feel a little nauseated.": "ひどい悪臭で少し吐き気がした。",
  "A corpse is resuscitated.": "死体が生き返った。",
  "An image forms in your mind.": "頭の中に映像が浮かんだ。",
  "A map coalesces in your mind!": "頭の中に地図が浮かび上がった！",
  "It doesn't seem to hurt you.": "それはあなたに害を与えていないようだ。",
  "It seems not to affect you.": "それはあなたに効かないようだ。",
  "It gets stuck on you.": "それが体にくっついた。",
  "It comes loose.": "それが外れた。",
  "It doesn't come loose.": "それは外れない。",
  "It feels quite soothing.": "とても心地よく感じる。",
  "It seems even stronger than before.": "以前よりさらに強くなったようだ。",
  "It suddenly gets dark.": "突然、暗くなった。",
  "It blinds you!": "それで目が見えなくなった！",
  "It constricts your throat!": "それが喉を締めつける！",
  "It is destroyed!": "それは破壊された！",
  "It is burned!": "それは燃えた！",
  "It sinks without a trace!": "それは跡形もなく沈んだ！",
  "It misses.": "それは外れた。",
  "It is fatal.": "それは致命的だ。",
  "Ouch!  That hurts!": "いたっ！ 痛い！",
  "Ouch!  You've been slimed!": "いたっ！ スライムに覆われた！",
  "What a strange direction!": "なんて奇妙な方向だ！",
  "Boing!": "ボヨン！",
  "Nothing interesting happens.": "特に何も起こらなかった。",
  "Nothing seems to happen.": "何も起こらなかったようだ。",
  "Nothing happens.": "何も起こらなかった。",
  "Never mind.": "やめておこう。",
  "You die...": "あなたは死んだ……。",
  "Game ended.": "ゲームが終了した。",
  "No recent NetHack message to reopen.": "再表示できる最近のメッセージはない。",
};

type Template = readonly [RegExp, (...parts: string[]) => string];

// The runtime's role.c supplies these words separately in the welcome line.
// Only exact known values are translated; names and unknown variant values
// remain verbatim. Several SLASH'EM roles contain spaces.
const welcomeAlignments: Readonly<Record<string, string>> = {
  lawful: "秩序属性", neutral: "中立属性", chaotic: "混沌属性",
};
const welcomeGenders: Readonly<Record<string, string>> = {
  male: "男性", female: "女性", neuter: "中性",
};
const welcomeRaces: Readonly<Record<string, string>> = {
  human: "人間", elven: "エルフ", dwarven: "ドワーフ", gnomish: "ノーム",
  orcish: "オーク", doppelganger: "ドッペルゲンガー", droven: "ダークエルフ",
  hobbit: "ホビット", lycanthropic: "獣人", vampiric: "吸血鬼",
};
const welcomeRoles: Readonly<Record<string, string>> = {
  Archeologist: "考古学者", Barbarian: "蛮族", Caveman: "原始人", Cavewoman: "原始人",
  Healer: "治療師", Knight: "騎士", Monk: "僧侶", Priest: "司祭", Priestess: "女司祭",
  Rogue: "盗賊", Ranger: "レンジャー", Samurai: "侍", Tourist: "観光客",
  Valkyrie: "ワルキューレ", Wizard: "魔法使い", "Flame Mage": "炎の魔術師",
  "Ice Mage": "氷の魔術師", Necromancer: "死霊術師", "Undead Slayer": "アンデッド討伐者",
  Yeoman: "自作農",
};
const welcomeGreetings: Readonly<Record<string, string>> = {
  Hello: "こんにちは", Salutations: "ごきげんよう", "Konnichi wa": "こんにちは",
  Aloha: "アロハ", Velkommen: "ようこそ",
};

function welcomeWord(words: Readonly<Record<string, string>>, value: string): string {
  return Object.prototype.hasOwnProperty.call(words, value) ? words[value] : value;
}

function translateWelcomeIdentity(identity: string): string {
  const parts = /^an? (\S+) (?:(male|female|neuter) )?(\S+) (.+)$/.exec(identity);
  if (!parts) return identity;
  const [, alignment, gender, race, role] = parts;
  const identityParts = [welcomeWord(welcomeAlignments, alignment)];
  if (gender) identityParts.push(welcomeWord(welcomeGenders, gender));
  identityParts.push(welcomeWord(welcomeRaces, race), welcomeWord(welcomeRoles, role));
  return identityParts.join("の");
}

// "the [adrift] [alignment] [gender] race role" from the restore greeting.
function translateWelcomeBackIdentity(identity: string): string {
  const parts = /^(?:(adrift) )?(?:(lawful|neutral|chaotic) )?(?:(male|female|neuter) )?(\S+) (.+)$/.exec(identity);
  if (!parts) return identity;
  const [, adrift, alignment, gender, race, role] = parts;
  if (!Object.prototype.hasOwnProperty.call(welcomeRaces, race)) return identity;
  const words: string[] = [];
  if (alignment) words.push(`${adrift ? "漂流する" : ""}${welcomeWord(welcomeAlignments, alignment)}`);
  if (gender) words.push(welcomeWord(welcomeGenders, gender));
  words.push(welcomeWord(welcomeRaces, race), welcomeWord(welcomeRoles, role));
  return words.join("の");
}

// NetHack 5.0's tutorial engravings are generated by tut-1.lua. Translate only
// fully recognized text; keep the actual configured keys verbatim. Player-made
// or damaged engravings that do not match are left unchanged.
const tutorialEngravings: Readonly<Record<string, string>> = {
  "Some actions may require multiple tries before succeeding": "行動によっては成功するまで何度か試す必要があります",
  "Open the door by moving into it": "ドアに向かって移動すると開きます",
  "You can leave the tutorial via the magic portal.": "魔法のポータルからチュートリアルを出られます。",
  "Wrong secret": "違う隠し場所",
  "Behind this door is a dark corridor": "このドアの先には暗い通路があります",
  "There are four traps next to you! Search for them.": "隣に罠が4つあります！ 探索して見つけてください。",
  "Hit monsters by walking into them.": "モンスターに向かって移動すると攻撃します。",
  "Now you know the very basics. You can leave the tutorial via the magic portal.": "これで基本操作を覚えました。魔法のポータルからチュートリアルを出られます。",
  "Step into this portal to leave the tutorial": "このポータルに入るとチュートリアルを終了します",
  "Push boulders by moving into them": "大岩に向かって移動すると押せます",
  "Some items have shuffled descriptions, different each game": "一部のアイテムの見た目はゲームごとに変わります",
  "Another magic portal, a way to leave this tutorial": "ここにもチュートリアルを出るための魔法のポータルがあります",
  "Avoid being burdened, it slows you down": "荷物が重くなりすぎると動きが遅くなります",
  "You can drop partial stacks by prefixing the item slot letter with a number": "アイテムの文字の前に個数を入力すると、一部だけを置けます",
  "Missiles, such as rocks, work better when fired from appropriate launcher": "石などの飛び道具は、適切な発射器で撃つとより効果的です",
  "Wield the sling": "スリングを手に持ってください",
  "UNDER CONSTRUCTION": "作成中",
  "Can't get through?  You're carrying too much.": "通り抜けられませんか？ 荷物を持ちすぎています。",
  "Spellcasting": "呪文の使い方",
  "Unfortunately you don't have enough energy to cast spells.": "残念ながら呪文を唱えるための魔力が足りません。",
};

const tutorialKeyPatterns: readonly [RegExp, (key: string) => string][] = [
  [/^Move around with (.+)$/, (key) => `${key} で移動します`],
  [/^Move diagonally with (.+)$/, (key) => `${key} で斜めに移動します`],
  [/^Note: Outside the tutorial, Ctrl-key combinations are shown prefixed with a caret, like '\^([^'\n]+)'$/, (key) => `注：チュートリアルの外では、Ctrl キーとの組み合わせを '^${key}' のように表示します`],
  [/^Knights can jump with '([^'\n]+)'$/, (key) => `騎士は '${key}' でジャンプできます`],
  [/^Close the door with '([^'\n]+)'$/, (key) => `'${key}' でドアを閉めます`],
  [/^This door is locked\. Kick it with '([^'\n]+)'$/, (key) => `このドアには鍵がかかっています。'${key}' で蹴ってください`],
  [/^Look around the map with '([^'\n]+)', press ESC when you're done$/, (key) => `'${key}' で周囲を調べ、終わったら ESC を押します`],
  [/^Use '([^'\n]+)' to search for secret doors$/, (key) => `'${key}' で隠し扉を探索します`],
  [/^Some traps can be disabled with '([^'\n]+)'$/, (key) => `一部の罠は '${key}' で解除できます`],
  [/^Pick up items with '([^'\n]+)'$/, (key) => `'${key}' でアイテムを拾います`],
  [/^Wear armor with '([^'\n]+)'$/, (key) => `'${key}' で防具を着用します`],
  [/^Wield weapons with '([^'\n]+)'$/, (key) => `'${key}' で武器を手に持ちます`],
  [/^Take off armor with '([^'\n]+)'$/, (key) => `'${key}' で防具を外します`],
  [/^Pick up this scroll, read it with '([^'\n]+)', and try to remove the armor again$/, (key) => `この巻物を拾い、'${key}' で読んでから、もう一度防具を外してみてください`],
  [/^Drop items with '([^'\n]+)'$/, (key) => `'${key}' でアイテムを置きます`],
  [/^Throw items with '([^'\n]+)'$/, (key) => `'${key}' でアイテムを投げます`],
  [/^Use '([^'\n]+)' to fire missiles with the wielded launcher$/, (key) => `'${key}' で手に持った発射器から飛び道具を撃ちます`],
  [/^Firing launches items from your quiver; Use '([^'\n]+)' to put items in it$/, (key) => `射撃では矢筒に用意した物を撃ちます。'${key}' で矢筒に入れます`],
  [/^You can wait a turn with '([^'\n]+)'$/, (key) => `'${key}' で1ターン待てます`],
  [/^You loot containers with '([^'\n]+)'$/, (key) => `'${key}' で容器の中身を出し入れします`],
  [/^Containers can also be emptied with '([^'\n]+)'$/, (key) => `'${key}' でも容器の中身を空けられます`],
  [/^Magic wands are used with '([^'\n]+)'$/, (key) => `魔法のワンドは '${key}' で使います`],
  [/^You can run by prefixing a movement key with '([^'\n]+)'$/, (key) => `移動キーの前に '${key}' を押すと走れます`],
  [/^Travel across the level with '([^'\n]+)'$/, (key) => `'${key}' で階内の目的地へ移動します`],
  [/^Use '([^'\n]+)' to eat edible things$/, (key) => `'${key}' で食べ物を食べます`],
  [/^Use '([^'\n]+)' to use two weapons at once$/, (key) => `'${key}' で二刀流を使います`],
  [/^Swap weapons quickly with '([^'\n]+)'$/, (key) => `'${key}' で武器を素早く切り替えます`],
  [/^Put on accessories with '([^'\n]+)'$/, (key) => `'${key}' で装飾品を身に着けます`],
  [/^Remove accessories with '([^'\n]+)'$/, (key) => `'${key}' で装飾品を外します`],
  [/^Use '([^'\n]+)' to go down the stairs$/, (key) => `'${key}' で階段を下ります`],
  [/^Pick up the spellbook with '([^'\n]+)'$/, (key) => `'${key}' で魔法書を拾います`],
  [/^Read the spellbook with '([^'\n]+)'$/, (key) => `'${key}' で魔法書を読みます`],
  [/^Use '([^'\n]+)' to cast a spell$/, (key) => `'${key}' で呪文を唱えます`],
  [/^You "quaff" potions with '([^'\n]+)'$/, (key) => `'${key}' でポーションを飲みます`],
];

// Random engravings and epitaphs from NetHack's data files. Only intact text
// is recognized; degraded engravings and magic words stay as written.
const randomEngravings = new Map<string, string>(
  engravingsSource.split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t") as [string, string])
    .filter((entry) => entry.length === 2 && entry[0] && entry[1]),
);

function translateTutorialEngraving(text: string): string | null {
  if (Object.prototype.hasOwnProperty.call(tutorialEngravings, text)) return tutorialEngravings[text];
  const random = randomEngravings.get(text);
  if (random !== undefined) return random;
  for (const [pattern, render] of tutorialKeyPatterns) {
    const match = pattern.exec(text);
    if (match) return render(match[1]);
  }
  return null;
}

// Complete 5.0 monster-action suffixes; the subject remains the exact visible
// name if it is a named pet or another unrecognized creature.
const monsterActions: Readonly<Record<string, string>> = {
  "appears before you.": "が目の前に現れた。", "appears!": "が現れた！", "appears.": "が現れた。",
  "appears confused.": "は混乱しているようだ。", "attacks a spot beside you.": "はあなたの隣を攻撃した。",
  "blocks the way!": "が道を塞いでいる！", "blocks your path.": "が道を塞いでいる。",
  "dies!": "は死んだ！", "is killed.": "は倒された。", "falls asleep.": "は眠りに落ちた。",
  "falls from the tree!": "は木から落ちた！", "falls into a chasm!": "は深い裂け目に落ちた！",
  "escapes downstairs!": "は階段を下りて逃げた！", "escapes upstairs!": "は階段を上って逃げた！",
  "escapes down the ladder!": "ははしごを下りて逃げた！", "escapes up the ladder!": "ははしごを上って逃げた！",
  "escapes the dungeon!": "はダンジョンから脱出した！", "is about to die.": "は今にも死にそうだ。",
  "is blinded.": "は目が見えなくなった。", "is blinded by the flash!": "は閃光で目が見えなくなった！",
  "is blinded by your flash of light!": "はあなたの閃光で目が見えなくなった！",
  "is burning to a crisp!": "はこんがり燃えている！", "is being crushed.": "は押しつぶされている。",
  "is choked by the leash!": "はリードで首を絞められている！", "is covered in frost!": "は霜に覆われた！",
  "is confused from hunger.": "は空腹で混乱している。", "is enraged...": "は激怒している……。",
  "is eating noisily.": "は音を立てて食べている。", "is frightened.": "はおびえている。",
  "is frightened by its reflection.": "は自分の映った姿を見ておびえている。",
  "is frightened to death, and unable to move.": "は死ぬほどおびえ、動けなくなっている。",
  "is frozen by its reflection.": "は自分の映った姿を見て動けなくなった。",
  "is frozen by you!": "はあなたによって動けなくなった！", "is frozen by you.": "はあなたによって動けなくなった。",
  "is frozen by your gaze!": "はあなたの視線で動けなくなった！",
  "is furious!": "は激怒している！", "is infuriated!": "は怒り狂っている！",
  "is hit by a falling piercer (you)!": "に、落下したピアサー（あなた）が当たった！",
  "is illuminated.": "が照らされた。", "is in your way.": "があなたの邪魔になっている。", "is in the way.": "が邪魔になっている。",
  "is jolted with electricity!": "は電撃を受けた！", "is jolted with your electricity!": "はあなたの電撃を受けた！",
  "is knocked back!": "は後ろへ吹き飛ばされた！", "is not affected.": "には効かなかった。",
  "is no longer constricted!": "はもう締め付けられていない！", "is no longer in your clutches.": "はあなたの拘束から逃れた。",
  "is not interested.": "は興味がないようだ。", "is not saddled.": "には鞍が付いていない。",
  "is not transformed.": "は変身しなかった。", "is released!": "は解放された！", "is resurrected!": "は生き返った！",
  "is slowing down.": "の動きが遅くなっている。", "is still eating.": "はまだ食べている。", "is suddenly very cold!": "は突然とても冷たくなった！", "is suddenly very hot!": "は突然とても熱くなった！",
  "is still in a pit.": "はまだ穴の中にいる。", "is stuck in a trap.": "は罠にはまっている。",
  "is trapped!": "は罠にかかった！", "is turned to stone!": "は石に変わった！", "is unaffected.": "には効かなかった。",
  "is uninjured.": "は無傷だ。", "is zapped!": "は魔法の光線を浴びた！",
  "looks better.": "の具合が良くなったようだ。", "looks completely healed.": "は完全に回復したようだ。",
  "looks confused.": "は混乱しているようだ。", "looks healthier.": "は健康になったようだ。",
  "looks healthy.": "は健康そうだ。", "looks much better!": "の具合がずっと良くなったようだ！",
  "looks much better.": "の具合がずっと良くなったようだ。", "looks puzzled for a moment.": "は一瞬戸惑ったようだ。",
  "looks rather ill.": "はかなり具合が悪そうだ。", "looks uneasy.": "は落ち着かない様子だ。",
  "looks unharmed.": "は無傷のようだ。", "looks very angry.": "はとても怒っているようだ。",
  "looks wide awake.": "はすっかり目が覚めたようだ。", "opens a door.": "がドアを開けた。",
  "pretends to be friendly.": "は友好的なふりをしている。", "seems disoriented.": "は方向感覚を失っているようだ。",
  "seems famished.": "はひどく空腹のようだ。", "seems healthier.": "は健康になったようだ。",
  "seems healthy enough.": "は十分健康そうだ。", "seems disoriented for a moment.": "は一瞬方向感覚を失ったようだ。",
  "seems lethargic.": "はだるそうだ。", "seems more experienced.": "は経験を積んだようだ。",
  "seems to have indigestion.": "は消化不良を起こしたようだ。", "seems to flinch.": "はひるんだようだ。",
  "seems to shimmer for a moment.": "は一瞬ちらついたようだ。", "seems to grimace.": "は顔をしかめたようだ。",
  "seems not to notice you.": "はあなたに気づいていないようだ。", "seems unaffected.": "には効かなかったようだ。",
  "seems unharmed.": "は無傷のようだ。", "seems unhurt.": "は傷ついていないようだ。",
  "shrieks.": "は悲鳴を上げた。", "slows down.": "の動きが遅くなった。", "suddenly appears!": "が突然現れた！",
  "suddenly explodes!": "が突然爆発した！", "suddenly falls asleep!": "は突然眠りに落ちた！",
  "suddenly mutates!": "は突然変異した！", "suddenly seems weaker!": "は突然弱くなったようだ！",
  "suddenly seems more animated.": "は突然、動きが活発になったようだ。", "suddenly aches painfully!": "が突然痛み出した！",
  "suddenly vanishes!": "は突然姿を消した！", "turns to stone!": "は石になった！", "turns to stone.": "は石になった。",
  "turns transparent!": "は透明になった！", "wakes up!": "が目を覚ました！", "screams!": "が悲鳴を上げた！", "screams.": "が悲鳴を上げた。", "vanishes into the aether!": "は虚空へ消え去った！", "wakes up.": "は目を覚ました。",
};

// Longer suffixes first: "suddenly appears!" must win over "appears!".
const monsterActionsLongestFirst = Object.entries(monsterActions).sort(([a], [b]) => b.length - a.length);

// Body parts in these runtime messages are already visible descriptions. Keep
// unknown forms unchanged so names, quantities and state are not fabricated.
const bodyParts: Readonly<Record<string, string>> = {
  arm: "腕", arms: "両腕", back: "背中", body: "体", ears: "耳", eye: "目", eyes: "両目", face: "顔", finger: "指", fingers: "指", foot: "足", feet: "両足", hand: "手", hands: "両手", head: "頭", leg: "脚", legs: "両脚", mouth: "口", neck: "首", nose: "鼻", skin: "肌", stomach: "胃", throat: "喉", tongue: "舌", teeth: "歯", toes: "足の指", wings: "翼",
};
const translateBodyPart = (text: string): string =>
  Object.prototype.hasOwnProperty.call(bodyParts, text) ? bodyParts[text] : text;
const translateVisibleMonster = (text: string): string => {
  if (text === "you") return "あなた";
  const translated = translateMonsterName(`the ${text}`, "ja");
  return translated === `the ${text}` ? text : translated;
};
const translateItemReference = (text: string): string =>
  text === "it" ? "それ" : text === "them" ? "それら" : translateInventoryItem(text, "ja");
const visibleSubstances: Readonly<Record<string, string>> = {
  acid: "酸", blood: "血", dust: "ほこり", fire: "炎", fog: "霧", gas: "ガス", grease: "油", ice: "氷", lava: "溶岩", mud: "泥", oil: "油", poison: "毒", sand: "砂", sewage: "汚水", smoke: "煙", water: "水", black: "黒い", blue: "青い", brown: "茶色い", green: "緑色の", grey: "灰色の", orange: "オレンジ色の", pink: "桃色の", red: "赤い", white: "白い", yellow: "黄色い",
};
const translateSubstance = (text: string): string =>
  Object.prototype.hasOwnProperty.call(visibleSubstances, text) ? visibleSubstances[text] : translateInventoryItem(text, "ja");
const translateSurface = (text: string): string => text === "ceiling" ? "天井" : translateGroundObject(text, "ja");

const japaneseTemplates: readonly Template[] = [
  [/^You swap places with ([^.!?\n]+)\.$/, (target) => `${translateMonsterName(target, "ja")}と位置を入れ替えた。`],
  [/^You displace ([^.!?\n]+)\.$/, (target) => `${translateMonsterName(target, "ja")}と位置を入れ替えた。`],
  [/^([A-Za-z$]) - (.+)\.$/, (key, item) => {
    const translated = translateInventoryItem(item, "ja");
    return translated === item ? `${key} - ${item}.` : `${key} - ${translated}。`;
  }],
  [/^([^.!?\n]+) eats ([^.!?\n]+)\.$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を食べた。`],
  [/^([^.!?\n]+) eats ([^.!?\n]+)!$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を食べた！`],
  [/^([^.!?\n]+) picks up (?:some|the) gold\.$/, (subject) => `${translateMonsterName(subject, "ja")}が金貨を拾った。`],
  [/^([^.!?\n]+) steals some gold from ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}から金貨を盗んだ。`],
  [/^([^.!?\n]+) turns to flee\.$/, (subject) => `${translateMonsterName(subject, "ja")}は逃げ出した。`],
  [/^([^.!?\n]+) swaps places with you\.\.\.$/, (subject) => `${translateMonsterName(subject, "ja")}があなたと位置を入れ替えた……。`],
  [/^([^.!?\n]+) wields ([^.!?\n]+)([.!])$/, (subject, item, punctuation) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を手に持った${punctuation === "!" ? "！" : "。"}`],
  [/^([^.!?\n]+) (thrusts|swings) (his|her|its|their|your|the) ([^.!?\n]+)\.$/, (subject, action, owner, item) => {
    const possessive = owner === "your" ? "あなたの" : owner === "the" ? "" : "自分の";
    return `${translateMonsterName(subject, "ja")}が${possessive}${translateInventoryItem(item, "ja")}を${action === "thrusts" ? "突き出した" : "振り回した"}。`;
  }],
  [/^([^.!?\n]+) bites ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}に噛みついた。`],
  [/^([^.!?\n]+) misses ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}の攻撃は${translateMonsterName(target, "ja")}に当たらなかった。`],
  [/^([^.!?\n]+) hits ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}に当たった。`],
  [/^([^.!?\n]+) stings ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}を刺した。`],
  [/^([^.!?\n]+) kicks ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}を蹴った。`],
  [/^([^.!?\n]+) strikes at ([^.!?\n]+)!$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}に攻撃を仕掛けた！`],
  [/^([^.!?\n]+) casts a spell at ([^.!?\n]+)!$/, (subject, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}に呪文を唱えた！`],
  [/^([^.!?\n]+) casts a spell!$/, (subject) => `${translateMonsterName(subject, "ja")}が呪文を唱えた！`],
  [/^([^.!?\n]+) is hit by ([^.!?\n]+)!$/, (subject, source) => `${translateMonsterName(subject, "ja")}に${translateInventoryItem(source, "ja")}が当たった！`],
  [/^([^.!?\n]+) is blinded by ([^.!?\n]+)\.$/, (subject, source) => `${translateMonsterName(subject, "ja")}は${translateInventoryItem(source, "ja")}で目が見えなくなった。`],
  [/^([^.!?\n]+) is put to sleep by ([^.!?\n]+)\.$/, (subject, source) => `${translateMonsterName(subject, "ja")}は${translateMonsterName(source, "ja")}によって眠らされた。`],
  [/^([^.!?\n]+) is put to sleep by you!$/, (subject) => `${translateMonsterName(subject, "ja")}はあなたに眠らされた！`],
  [/^([^.!?\n]+) is frozen by ([^.!?\n]+)\.$/, (subject, source) => `${translateMonsterName(subject, "ja")}は${translateMonsterName(source, "ja")}によって動けなくなった。`],
  [/^([^.!?\n]+) steals ([^.!?\n]+) from ([^.!?\n]+)!$/, (subject, item, target) => `${translateMonsterName(subject, "ja")}が${translateMonsterName(target, "ja")}から${translateInventoryItem(item, "ja")}を盗んだ！`],
  [/^([^.!?\n]+) steals ([^.!?\n]+)!$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を盗んだ！`],
  [/^([^.!?\n]+) drinks ([^.!?\n]+)!$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を飲んだ！`],
  [/^([^.!?\n]+) reads ([^.!?\n]+)!$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を読んだ！`],
  [/^([^.!?\n]+) zaps you with a ([^.!?\n]+)!$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}をあなたに向けて振った！`],
  [/^([^.!?\n]+) falls into the ([^.!?\n]+)!$/, (subject, terrain) => `${translateMonsterName(subject, "ja")}が${translateGroundObject(terrain, "ja")}に落ちた！`],
  [/^([^.!?\n]+) is caught in the ([^.!?\n]+)!$/, (subject, trap) => `${translateMonsterName(subject, "ja")}が${translateGroundObject(trap, "ja")}にかかった！`],
  [/^([^.!?\n]+) hits you with the ([^.!?\n]+) corpse\.$/, (subject, corpse) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(`a ${corpse} corpse`, "ja")}であなたを殴った。`],
  [/^([^.!?\n]+) takes off your ([^.!?\n]+)\.$/, (subject, item) => `${translateMonsterName(subject, "ja")}があなたの${translateInventoryItem(item, "ja")}を外した。`],
  [/^A chill runs down your ([^.!?\n]+)\.$/, (part) => `${translateBodyPart(part)}に寒気が走った。`],
  [/^A shiver runs down your ([^.!?\n]+)\.$/, (part) => `${translateBodyPart(part)}がぞくりとした。`],
  [/^A shiver runs up and down your ([^.!?\n]+)!$/, (part) => `${translateBodyPart(part)}に震えが走った！`],
  [/^A strange tingling runs up your ([^.!?\n]+)\.$/, (part) => `${translateBodyPart(part)}に奇妙なうずきが走った。`],
  [/^The pressure on your ([^.!?\n]+) increases\.$/, (part) => `${translateBodyPart(part)}にかかる圧力が強くなった。`],
  [/^The tether comes off your ([^.!?\n]+)\.$/, (part) => `${translateBodyPart(part)}からつなぎ紐が外れた。`],
  [/^The hole fills with ([^.!?\n]+)!$/, (material) => `穴が${translateGroundObject(material, "ja")}で埋まった！`],
  [/^As you dig, the hole fills with ([^.!?\n]+)!$/, (material) => `掘っているうちに穴が${translateGroundObject(material, "ja")}で埋まった！`],
  [/^A trap door above ([^.!?\n]+) opens, but nothing falls out!$/, (target) => `${target === "you" ? "あなた" : translateMonsterName(target, "ja")}の上の落とし戸が開いたが、何も落ちてこなかった！`],
  [/^There's a trap on ([^.!?\n]+)\.$/, (target) => `${translateGroundObject(target, "ja")}に罠が仕掛けられている。`],
  [/^The ([^.!?\n]+) cools and solidifies\.$/, (object) => `${translateGroundObject(object, "ja")}が冷えて固まった。`],
  [/^The ([^.!?\n]+) freezes\.$/, (object) => `${translateGroundObject(object, "ja")}が凍った。`],
  [/^The ([^.!?\n]+) is filled in\.$/, (object) => `${translateGroundObject(object, "ja")}が埋められた。`],
  [/^The ([^.!?\n]+) vanishes\.$/, (object) => `${translateGroundObject(object, "ja")}が消えた。`],
  [/^Smoke rises from ([^.!?\n]+)\.$/, (object) => `${translateGroundObject(object, "ja")}から煙が上がった。`],
  [/^Steam rises from ([^.!?\n]+)\.$/, (object) => `${translateGroundObject(object, "ja")}から蒸気が上がった。`],
  [/^A cloud of noxious gas billows from ([^.!?\n]+)\.$/, (object) => `${translateGroundObject(object, "ja")}から有毒ガスの雲が噴き出した。`],
  [/^A cloud of ([^.!?\n]+) gas billows from ([^.!?\n]+)\.$/, (gas, object) => `${translateGroundObject(object, "ja")}から${translateSubstance(gas)}のガスの雲が噴き出した。`],
  [/^A cloud of ([^.!?\n]+) smoke surrounds you\.\.\.$/, (color) => `${translateSubstance(color)}煙に包まれた……。`],
  [/^A ([^.!?\n]+) ooze gushes up from the drain!$/, (color) => `${translateSubstance(color)}ヘドロが排水口から噴き上がった！`],
  [/^A rock is dislodged from the ([^.!?\n]+) and falls on your ([^.!?\n]+)\.$/, (surface, part) => `${translateSurface(surface)}から岩が外れ、あなたの${translateBodyPart(part)}に落ちてきた。`],
  [/^Some ([^.!?\n]+) gets into your ([^.!?\n]+)!$/, (substance, part) => `${translateSubstance(substance)}があなたの${translateBodyPart(part)}に入った！`],
  [/^Some of the grease gets all over your ([^.!?\n]+)\.$/, (part) => `あなたの${translateBodyPart(part)}に油がべっとり付いた。`],
  [/^Scales cover your ([^.!?\n]+)!$/, (part) => `あなたの${translateBodyPart(part)}が鱗で覆われた！`],
  [/^Your right ([^.!?\n]+) tingles\.$/, (part) => `右の${translateBodyPart(part)}がうずいた。`],
  [/^Your ([^.!?\n]+) is becoming constricted\.$/, (part) => `${translateBodyPart(part)}が締め付けられ始めた。`],
  [/^Your ([^.!?\n]+) stop itching\.$/, (part) => `${translateBodyPart(part)}のかゆみが収まった。`],
  [/^The pages feel ([^.!?\n]+)\.$/, (texture) => `ページは${translateSubstance(texture)}ような手触りだ。`],
  [/^This tastes like ([^.!?\n]+)\.$/, (flavor) => `${translateSubstance(flavor)}のような味がする。`],
  [/^It smells like ([^.!?\n]+)\.$/, (smell) => `${translateSubstance(smell)}のようなにおいがする。`],
  [/^This burns like ([^.!?\n]+)!$/, (burn) => `${translateSubstance(burn)}のようにひりひりする！`],
  [/^You are covered in ([^.!?\n]+)!  It burns!$/, (substance) => `${translateSubstance(substance)}に覆われた！ 焼けるように痛い！`],
  [/^You're covered in ([^.!?\n]+)!  It burns!$/, (substance) => `${translateSubstance(substance)}に覆われた！ 焼けるように痛い！`],
  [/^You're covered in ([^.!?\n]+), but it seems harmless\.$/, (substance) => `${translateSubstance(substance)}に覆われたが、害はなさそうだ。`],
  [/^The ([^.!?\n]+) is not blank!$/, (item) => `${translateInventoryItem(item, "ja")}は白紙ではない！`],
  [/^That ([^.!?\n]+) is not blank!$/, (item) => `その${translateInventoryItem(item, "ja")}は白紙ではない！`],
  [/^That ([^.!?\n]+) was not trapped\.$/, (item) => `その${translateGroundObject(item, "ja")}に罠はなかった。`],
  [/^This ([^.!?\n]+) contains toxic wastes!$/, (item) => `この${translateInventoryItem(item, "ja")}には有毒な廃棄物が入っている！`],
  [/^This ([^.!?\n]+) gives you bad breath!$/, (item) => `この${translateInventoryItem(item, "ja")}のせいで息が臭くなった！`],
  [/^This ([^.!?\n]+) has no label\.$/, (item) => `この${translateInventoryItem(item, "ja")}にはラベルがない。`],
  [/^This ([^.!?\n]+) has no oil\.$/, (item) => `この${translateInventoryItem(item, "ja")}には油が入っていない。`],
  [/^This ([^.!?\n]+) is a wand of digging!$/, (item) => `この${translateInventoryItem(item, "ja")}は掘削のワンドだ！`],
  [/^This ([^.!?\n]+) is a wand of fire!$/, (item) => `この${translateInventoryItem(item, "ja")}は炎のワンドだ！`],
  [/^This ([^.!?\n]+) is a wand of lightning!$/, (item) => `この${translateInventoryItem(item, "ja")}は稲妻のワンドだ！`],
  [/^This ([^.!?\n]+) is already leashed\.$/, (target) => `この${translateVisibleMonster(target)}にはすでにリードが付いている。`],
  [/^You decipher the label on ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}のラベルを解読した。`],
  [/^You make, but cannot pick up, ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を作ったが、拾えない。`],
  [/^You catch the ([^.!?\n]+)!$/, (item) => `${translateInventoryItem(item, "ja")}を受け止めた！`],
  [/^You catch, but drop, ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を受け止めたが、落としてしまった。`],
  [/^You juggle and drop ([^.!?\n]+)!$/, (item) => `${translateInventoryItem(item, "ja")}をお手玉して、落としてしまった！`],
  [/^You snatched but dropped ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}をひったくったが、落としてしまった。`],
  [/^You can't tip ([^.!?\n]+) while carrying so much\.$/, (item) => `荷物が多すぎて${translateInventoryItem(item, "ja")}を傾けられない。`],
  [/^You need to remove any unpaid items from that ([^.!?\n]+) and buy them separately\.$/, (item) => `その${translateInventoryItem(item, "ja")}から未払いの品を取り出し、別々に買う必要がある。`],
  [/^You burn ([^,!\n]+), you bought ([^.!?\n]+)!$/, (item, object) => `${translateItemReference(item)}を燃やしたな、${translateItemReference(object)}は買い取りだ！`],
  [/^Your ([^.!?\n]+) crumbles and turns to dust!$/, (item) => `${translateInventoryItem(item, "ja")}が崩れて塵になった！`],
  [/^Your ([^.!?\n]+) crumbles away!$/, (item) => `${translateInventoryItem(item, "ja")}が崩れ去った！`],
  [/^Your ([^.!?\n]+) crumbles into tiny threads and falls apart!$/, (item) => `${translateInventoryItem(item, "ja")}が細い糸になってばらばらに崩れた！`],
  [/^Your ([^.!?\n]+) turns to dust and is blown away!$/, (item) => `${translateInventoryItem(item, "ja")}が塵になって吹き飛ばされた！`],
  [/^Your ([^.!?\n]+) disintegrate!$/, (item) => `${translateInventoryItem(item, "ja")}が消滅した！`],
  [/^Your ([^.!?\n]+) vanish!$/, (item) => `${translateInventoryItem(item, "ja")}が消えた！`],
  [/^One of ([^.!?\n]+) gets dull\.$/, (item) => `${translateInventoryItem(item, "ja")}の一つが切れなくなった。`],
  [/^You totally digest ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を完全に消化した。`],
  [/^Magic spreads through your body as you digest the ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を消化すると、魔力が体に広がった。`],
  [/^Touching ([^.!?\n]+) is a fatal mistake\.\.\.$/, (item) => `${translateInventoryItem(item, "ja")}に触れたのは致命的な間違いだった……。`],
  [/^Touching ([^.!?\n]+) is a fatal mistake\.$/, (item) => `${translateInventoryItem(item, "ja")}に触れたのは致命的な間違いだった。`],
  [/^([^.!?\n]+) escapes from ([^.!?\n]+)!$/, (subject, trap) => `${translateMonsterName(subject, "ja")}が${translateGroundObject(trap, "ja")}から逃れた！`],
  [/^Your ([^.!?\n]+) catches light!$/, (item) => `${translateInventoryItem(item, "ja")}に火がついた！`],
  [/^([^.!?\n]+) is destroyed!$/, (subject) => `${translateMonsterName(subject, "ja")}は破壊された！`],
  [/^([^.!?\n]+) pretends to be friendly to ([^.!?\n]+)\.$/, (subject, target) => `${translateMonsterName(subject, "ja")}は${translateMonsterName(target, "ja")}に友好的なふりをした。`],
  [/^(Konnichi wa|\S+) ([^,!?\n]+), welcome to NetHack! {1,2}You are (an? [^.!?\n]+)\.$/,
    (greeting, name, identity) => `${welcomeWord(welcomeGreetings, greeting)}、${name}！ NetHackへようこそ。あなたは${translateWelcomeIdentity(identity)}です。`],
  [/^(Konnichi wa|\S+) ([^,!?\n]+), the ([^,!?\n]+), welcome back to NetHack!$/,
    (greeting, name, identity) => `${welcomeWord(welcomeGreetings, greeting)}、${name}！ ${translateWelcomeBackIdentity(identity)}として、NetHackへおかえりなさい。`],
  [/^You hit ([^.!?\n]+)\.$/, (target) => `${translateMonsterName(target, "ja")}に攻撃が命中した。`],
  [/^You miss ([^.!?\n]+)\.$/, (target) => `${translateMonsterName(target, "ja")}への攻撃は外れた。`],
  [/^You kill ([^.!?\n]+)!$/, (target) => `${translateMonsterName(target, "ja")}を倒した！`],
  [/^You destroy ([^.!?\n]+)!$/, (target) => `${translateMonsterName(target, "ja")}を破壊した！`],
  [/^You see here ([^.!?\n]+)\.$/, (item) => `ここには${translateGroundObject(item, "ja")}がある。`],
  [/^There is ([^.!?\n]+) here\.$/, (item) => `ここには${translateGroundObject(item, "ja")}がある。`],
  [/^There are ([^.!?\n]+) here\.$/, (item) => `ここには${translateGroundObject(item, "ja")}がある。`],
  [/^You finish taking off your ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を脱ぎ終えた。`],
  [/^You drop one ([^.!?\n]+)!$/, (item) => `${translateInventoryItem(item, "ja")}を1個落とした！`],
  [/^You drop ([^.!?\n]+)!$/, (item) => `${translateInventoryItem(item, "ja")}を落とした！`],
  [/^You kick ([^.!?\n]+)\.$/, (item) => `${translateInventoryItem(item, "ja")}を蹴った。`],
  [/^You can't reach the ([^.!?\n]+)\.$/, (target) => `${translateGroundObject(target, "ja")}に手が届かない。`],
  [/^This scroll is marked "([^"\n]+)"\.$/, (label) => `この巻物には「${label}」と書かれている。`],
  [/^([^.!?\n]+) bites!$/, (subject) => `${translateMonsterName(subject, "ja")}が噛みついた！`],
  [/^([^.!?\n]+) stings!$/, (subject) => `${translateMonsterName(subject, "ja")}が刺した！`],
  [/^([^.!?\n]+) kicks!$/, (subject) => `${translateMonsterName(subject, "ja")}が蹴った！`],
  [/^([^.!?\n]+) touches you!$/, (subject) => `${translateMonsterName(subject, "ja")}があなたに触れた！`],
  [/^([^.!?\n]+) attacks you by surprise!$/, (subject) => `${translateMonsterName(subject, "ja")}が不意打ちを仕掛けてきた！`],
  [/^([^.!?\n]+) picks up ([^.!?\n]+)\.$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を拾った。`],
  [/^([^.!?\n]+) drops ([^.!?\n]+)\.$/, (subject, item) => `${translateMonsterName(subject, "ja")}が${translateInventoryItem(item, "ja")}を落とした。`],
  [/^([^.!?\n]+) hits!$/, (subject) => `${translateMonsterName(subject, "ja")}の攻撃が命中した！`],
  [/^([^.!?\n]+) misses!$/, (subject) => `${translateMonsterName(subject, "ja")}の攻撃は外れた！`],
  [/^Welcome to experience level (\d+)\.$/, (level) => `経験レベルが${level}になった。`],
  [/^Comestibles are eaten with '([^'\n]+)'$/, (key) => `食べ物は '${key}' で食べます。`],
];

/** Number of English words from the original still present in a translation. */
export function englishLeftover(original: string, translated: string): number {
  const words = new Set(original.match(/[A-Za-z][A-Za-z'-]+/g) ?? []);
  return (translated.match(/[A-Za-z][A-Za-z'-]+/g) ?? []).filter((word) => words.has(word)).length;
}

/** First candidate with no English left, else the earliest with the fewest English words. */
function leastEnglish(original: string, candidates: ReadonlyArray<() => string | undefined>): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const text = candidate();
    if (text === undefined) continue;
    const score = englishLeftover(original, text);
    if (score === 0) return text;
    if (score < bestScore) {
      best = text;
      bestScore = score;
    }
  }
  return best;
}

/** Translate for presentation only; unsupported text and locales remain English. */
export function translateGameMessage(message: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !message.trim()) return message;
  const match = /^(\s*)(.*?)(\s*)$/s.exec(message);
  if (!match) return message;
  const [, leading, content, trailing] = match;
  const engraving = /^You (read|feel the words): "([\s\S]+)"(\.)?$/.exec(content);
  if (engraving) {
    const translated = translateTutorialEngraving(engraving[2]) ?? translateRumor(engraving[2]);
    if (translated !== null) {
      const action = engraving[1] === "read" ? "と読んだ" : "の文字を指で感じた";
      return `${leading}「${translated.replace(/^「(.*)」$/s, "$1")}」${action}。${trailing}`;
    }
  }
  const rumor = translateRumor(content);
  if (rumor !== null) return `${leading}${rumor}${trailing}`;
  let translated = Object.prototype.hasOwnProperty.call(japaneseMessages, content)
    ? japaneseMessages[content]
    : Object.prototype.hasOwnProperty.call(nethack5ExtraMessages, content) ? nethack5ExtraMessages[content] : lookupNethack5SourceExact(content);
  if (translated === undefined) {
    // nh3d-plus: the generic layers below can match a sentence whose pieces
    // they do not understand ("Somehow, the jackal" as a monster), so a later,
    // more specific layer may still give a rendering without English left.
    translated = leastEnglish(content, [
      () => {
        for (const [action, result] of monsterActionsLongestFirst) {
          if (content.endsWith(` ${action}`)) {
            const subject = content.slice(0, -action.length - 1);
            if (!subject || /[.!?\n]/.test(subject)) continue;
            return `${translateMonsterName(subject, "ja")}${result}`;
          }
        }
        return undefined;
      },
      () => translateAssembledMessage(content),
      () => {
        for (const [pattern, render] of japaneseTemplates) {
          const parts = pattern.exec(content);
          if (parts) return render(...parts.slice(1));
        }
        return undefined;
      },
      () => translateNethack5SourceMessage(content),
    ]);
  }
  if (translated === undefined) {
    // verbalize() wraps speech in double quotes.
    const speech = /^"([^"]+)"$/.exec(content);
    if (speech) {
      const inner = translateGameMessage(speech[1], locale);
      if (inner !== speech[1]) translated = `「${inner.replace(/^「(.*)」$/s, "$1")}」`;
    }
  }
  if (translated === undefined) {
    // Category and selection lines of object menus.
    const category = translateInventoryCategory(content, locale);
    if (category !== content) translated = category;
  }
  if (translated === undefined && /^(?:a|an|the|\d+) /.test(content)) {
    // Pile listings and look-here windows show bare object descriptions.
    const item = translateInventoryItem(content, "ja");
    if (item !== content) translated = item;
  }
  if (translated === undefined && /[.!?] \S/.test(content) && !/[.!?]  \S/.test(content)) {
    // Some displays collapse NetHack's two spaces between sentences.
    const doubled = content.replace(/([.!?]) (?=\S)/g, "$1  ");
    const retry = translateGameMessage(doubled, locale);
    if (retry !== doubled) translated = retry;
  }
  return translated === undefined ? message : `${leading}${translated}${trailing}`;
}
