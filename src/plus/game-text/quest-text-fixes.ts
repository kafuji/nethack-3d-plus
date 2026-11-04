// Quest texts whose JNetHack translation does not fit the NetHack 5 English:
// it uses a substitution code the English text does not set (%i, %H, %s,
// ...), or it translates an older version of the text (most of these are
// the rewritten Tourist quest). Keyed by the English with whitespace runs
// collapsed to one space, as compileQuestTexts() compares it.
export const questTextFixes: Readonly<Record<string, string>> = {
  [`"You have returned from your vision quest, %p. Thank %d. "We are in dire need of your help, my %S. "But first, I must see if you are yet capable of the quest I would ask you to undertake."`]:
    "「幻視の旅から戻ったか、%pよ。%dに感謝せよ。\n\n「我が%Sよ、我らはお前の助けをひどく必要としている。\n\n「だがまず、私が頼もうとしているクエストをお前が果たせるかどうか、\n  確かめねばならぬ。」",

  [`%lC glimpses %o in your possession. He smiles and says: You have done it! We are saved. But I fear that %o will always be a target for %C forces who will want it for their own. To prevent further trouble, I would like you, %p, to take %o away with you. It will help you as you quest for the Amulet of Yendor.`]:
    "%lはあなたが持っている%oをちらっと見ると、微笑み\nながら話しかけた：\n\n    見事なしとげたか！我らは助かった。しかし私は、%oが\n    それを我が物にせんとする%Cの勢力に、いつまでも狙われることを\n    恐れている。\n\n    これ以上の災いを避けるため、%pよ、お前に%oを\n    持っていってほしい。それはお前がイェンダーの魔除けを\n    探す冒険の助けになるだろう。",

  [`Again, you stand at the entrance to %ns lair.`]:
    "再びあなたは%nの隠れ家の入口に立っている。",

  [`"Hah! Another puny %c seeks death. I shall dine well tonight, then tomorrow, %H shall fall!"`]:
    "「ふはは！またしても非力な%cが死を求めてきたか。今夜はごちそうだ。\n  そして明日には%Hが落ちるのだ！」",

  [`"Yes, you've become a great %c since I last saw you. "Sadly, things haven't been going so well here in %H. A new %nt was appointed, and he hosted a dinner to meet other civic leaders. At the door, one of his henchmen offered to look after my wallet. "I know what you're thinking: 'How kind!' But it turns out that even in the Thieves' Guild, there are people you can't trust. My wallet contained -- you know the Royal Mint has been trialing credit cards, so we won't have to carry bags of gold around? Most of the prototypes haven't worked, and are only good for picking locks. This one, %o, is one of a kind. As the highest spending and most often mugged resident of %H, it was entrusted to me. But when I got my wallet back, the Card was missing. I appealed to the Patrician, and he said the matter fell under the doctrine of _detectores custodes_. "We believe %n has the Card, and that he's holed himself up in %i. With the power of %o, the Thieves are bolder than ever. Citizens are frightened, and tourism is down. We need somebody to find their way into %i and recover the Card before there are no %cp left! "So, %p, are you ready for a little Detour?"`]:
    "「やあ、前に会ったときからずいぶん立派な%cになったね。\n\n" +
    "「残念ながら、ここ%Hではあまりうまくいっていないんだ。新しい\n" +
    "  %nが任命されて、ほかの町の有力者と顔を合わせる夕食会を開いた。\n" +
    "  その入口で、奴の手下の一人が私の財布を預かろうと申し出てくれたんだ。\n\n" +
    "「君の考えていることは分かるよ。『なんて親切な！』だろう？だが\n" +
    "  盗賊ギルドの中にさえ、信用できない者はいるものなんだ。私の財布には……\n" +
    "  王立造幣局が、金貨の袋を持ち歩かずに済むようにクレジットカードを\n" +
    "  試しているのは知っているかい？試作品のほとんどは役に立たず、\n" +
    "  錠前を開けるのにしか使えない。だがこの%oは\n" +
    "  唯一無二の品なんだ。%Hで一番金を使い、一番よく強盗に遭う\n" +
    "  住人として、私がそれを預かっていた。ところが財布が戻ってきたとき、\n" +
    "  カードがなくなっていた。パトリシアンに訴えたが、その件は\n" +
    "  『デテクトーレス・クストーデス』の原則にあたると言われてしまった。\n\n" +
    "「%nがカードを持っていて、%iに立てこもっていると\n" +
    "  我々は考えている。%oの力を得て、\n" +
    "  盗賊たちはかつてないほど大胆になっている。市民はおびえ、観光客も\n" +
    "  減っている。誰かが%iに乗り込んでカードを取り戻さなければ、\n" +
    "  %cは一人もいなくなってしまう！\n\n" +
    "「さて%p、ちょっとした寄り道をする準備はいいかい？」",

  [`"%pC, you're still only %ra. I don't think you're prepared to take on %n yet. "Carry on with your Tour. Explore. Take photos. Learn things. Come back when you're a %R, and you might stand a chance. %nC will still be here when you're ready for him."`]:
    "「%p、君はまだ%rにすぎない。%nに立ち向かう準備が\n  できているとは思えないな。\n\n「旅を続けたまえ。探検して、写真を撮って、いろいろ学ぶんだ。\n  %Rになったら戻ってきたまえ。そうすれば勝ち目があるかもしれない。\n  %nは君の準備ができるまで、ここで待っていてくれるさ。」",

  [`You feel a rich contentment as you pick up %o. That'll do nicely! You'd better return it to %l as soon as possible.`]:
    "%oを拾い上げると、深い満足感がこみ上げてきた。\nこれで申し分ない！できるだけ早く%lのもとへ返したほうがいい。",

  [`"%pC! And you found the Amulet of Yendor? Amazing! "But you can't keep it here in %H. It won't be safe! "Besides, the Amulet isn't for us %cp, it's for %d. I've heard %dh has a temple on the Astral Plane, which incidentally is a gorgeous place to visit this time of year. Find your way there, then offer it to %d on %dj high altar. %dH'll be delighted to have it to %dIself at last! Safe journey, %p."`]:
    "「%p！それにイェンダーの魔除けを見つけたって？すごいじゃないか！\n\n" +
    "「でも、ここ%Hに置いておくわけにはいかない。安全じゃないからね！\n\n" +
    "「それに、魔除けは我々%cのためのものじゃない。%dのためのものだ。\n" +
    "  聞いたところでは、%dは天上界に神殿をお持ちだそうだ。ちなみにそこは、\n" +
    "  この時期に訪れるには素晴らしい場所なんだ。そこへたどり着いて、\n" +
    "  %dの高位の祭壇にそれを捧げるといい。ついにそれを手にできて、\n" +
    "  %dもさぞお喜びになるだろう！\n\n" +
    "よい旅を、%p。」",

  [`"I hope you've prepared yourself this time."`]:
    "「今度こそ、準備はできているだろうね。」",

  [`This isn't the friendliest part of town. There are Thieves' marks everywhere, and %ns flunkies creep along the alleyways.`]:
    "ここは町でも物騒な地区だ。そこらじゅうに盗賊の印があり、\n%nの手下どもが路地をこそこそと歩き回っている。",

  [`"So, %p, %l thinks you're gonna take %o from me. How cute is that? "He sends %ra to defeat me. Me! When this is over, I'll put you in cement shoes and throw you onto the river!"`]:
    "「ほう、%p。%lはお前ごときが私から\n  %oを奪えると思っているのか。かわいいものだな。\n\n「この私を倒すのに%rをよこすとはな。この私をだぞ！片がついたら、\n  お前の足をコンクリートで固めて川に放り込んでやる！」",

  [`"These meetings are starting to bore me. You're eating into my precious scheming time. "If you don't run away now, I'm gonna make you suffer so bad that %l will feel guilty for sending you here."`]:
    "「こうして会うのにも飽きてきたぞ。お前のせいで、大事な\n  悪だくみの時間が削られているんだ。\n\n「今すぐ逃げ出さないなら、ひどく苦しめてやる。%lが\n  お前をここへよこしたことを後悔するほどにな。」",

  [`%lC takes %o and flexes it in his hand, then looks up and smiles. "%pC, while you were away, %d appeared to me, and suggested I transfer %o to you. Carry it with you on your quest for the Amulet of Yendor, and you'll travel in good company. "Remember -- there are some things gold can buy. For everything else, there's %o."`]:
    "%lは%oを受け取ると\n手の中で曲げてみせ、顔を上げて微笑んだ。\n\n" +
    "「%p、君の留守中に%dが私の前に現れて、\n" +
    "  %oを君に譲ってはどうかとおっしゃったんだ。イェンダーの\n" +
    "  魔除けを探す旅に持っていきたまえ。きっと頼もしい道連れになる。\n\n" +
    "「覚えておきたまえ。金で買えるものもある。それ以外のすべてには、\n" +
    "  %oがある。」",

  [`"Just look at you, %p! Tell me all about your Tour. Did you find the Amulet of Yendor yet?"`]:
    "「見違えたよ、%p！旅の話をすっかり聞かせてくれたまえ。\n  イェンダーの魔除けはもう見つけたのかい？」",

  [`As you approach, %l rises and touches %o. "You may take %o with you, %p. I have removed from it the power to foretell the future, for that power no mortal should have. Its other abilities, however, you have at your disposal. "You must now begin in %ds name to search for the Amulet of Yendor. May your steps be guided by %d, my %S."`]:
    "あなたが近づくと、%lは立ちあがり、%oに触れた。\n\n" +
    "「%pよ。%oを持っていきなさい。わたしは%oから、\n" +
    "  定命の者の手に触れてはならぬ未来を告げる力を取り除きました。\n" +
    "  しかしながら%oの他の力は、あなたの思い通りにしてかまいません。\n\n" +
    "「あなたは%dの名のもとイェンダーの魔除けを探さねばなりません。\n" +
    "  あなたの進む道が%dの導きにより開かれますように。\n" +
    "  わたしの%Sよ。」",
};
Object.setPrototypeOf(questTextFixes, null);
