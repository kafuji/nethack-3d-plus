import type { SupportedLocale } from "./core";
import { translateMonsterName } from "./game-monsters";
import { jnethackItem } from "../plus/game-text/fallback";
// Used only at call time (game-messages imports this module too).
import { translateGameMessage } from "./game-messages";
import { keepsEnglishRun } from "./message-presentation";

// These are presentation strings only. Never use the result for identifying an
// item, choosing an action, resolving a glyph, or submitting a menu selection.
const categories: Readonly<Record<string, string>> = {
  "Weapons": "武器", "Armor": "防具", "Rings": "指輪", "Amulets": "お守り",
  "Tools": "道具", "Comestibles": "食料", "Potions": "ポーション", "Scrolls": "巻物",
  "Spellbooks": "魔法書", "Wands": "ワンド", "Coins": "硬貨", "Gems/Stones": "宝石・石",
  "Gems": "宝石", "Boulders/Statues": "岩・彫像", "Iron balls": "鉄球", "Chains": "鎖",
  "Venoms": "毒液", "Items in a bag": "袋の中身", "Items in a box": "箱の中身",
  "Unpaid items": "未払いの品", "Unpaid items already used up": "使用済みの未払いの品",
  "All types": "すべての種類", "All worn and wielded types": "身に着けている・手に持っているすべての種類",
  "Auto-select every relevant item": "該当する物をすべて自動選択", "Auto-select every item being worn or wielded": "身に着けている・手に持っている物をすべて自動選択",
  "(ignored unless some other choices are also picked)": "（ほかの選択肢も選んだときだけ有効）", "(if no other choices are picked, 'a' is implied)": "（ほかに何も選ばなければ 'a' とみなす）",
  "Items known to be Blessed": "祝福されているとわかっている物", "Items known to be Cursed": "呪われているとわかっている物",
  "Items known to be Uncursed": "呪われていないとわかっている物", "Items of unknown Bless/Curse status": "祝福・呪いの状態が不明な物",
  "Items you just picked up": "直前に拾った物",
};

// Entries must describe exactly what the runtime revealed. For example, the
// randomized appearance "pink potion" must never imply an identified effect.
const itemNames: Readonly<Record<string, string>> = {
  "arrow": "矢", "arrows": "矢", "crossbow bolt": "クロスボウの矢", "crossbow bolts": "クロスボウの矢",
  "dart": "投げ矢", "darts": "投げ矢", "dagger": "短剣", "daggers": "短剣",
  "elven dagger": "エルフの短剣", "elven daggers": "エルフの短剣", "orcish dagger": "オークの短剣", "orcish daggers": "オークの短剣",
  "knife": "ナイフ", "knives": "ナイフ", "spear": "槍", "spears": "槍", "javelin": "投げ槍", "javelins": "投げ槍",
  "short sword": "短い剣", "long sword": "長い剣", "broadsword": "幅広の剣", "two-handed sword": "両手剣",
  "elven short sword": "エルフの短い剣", "orcish short sword": "オークの短い剣", "dwarvish short sword": "ドワーフの短い剣",
  "elven arrow": "エルフの矢", "orcish arrow": "オークの矢", "silver arrow": "銀の矢", "ya": "矢",
  "elven bow": "エルフの弓", "orcish bow": "オークの弓", "yumi": "弓",
  "scimitar": "三日月刀", "katana": "刀", "axe": "斧", "battle-axe": "戦斧", "mace": "メイス", "club": "こん棒",
  "quarterstaff": "杖", "bow": "弓", "crossbow": "クロスボウ", "sling": "投石器",
  "small shield": "小さな盾", "large shield": "大きな盾", "shield of reflection": "反射の盾", "elven shield": "エルフの盾", "orcish shield": "オークの盾",
  "leather armor": "革の鎧", "studded leather armor": "鋲付き革鎧", "ring mail": "リングメイル", "chain mail": "鎖かたびら",
  "scale mail": "スケイルメイル", "splint mail": "スプリントメイル", "plate mail": "プレートメイル",
  "helmet": "兜", "helm of brilliance": "英知の兜", "cloak of protection": "防御のクローク", "cloak of magic resistance": "魔法耐性のクローク",
  "elven leather helm": "エルフの革兜", "orcish helm": "オークの兜", "dwarvish iron helm": "ドワーフの鉄兜",
  "cloak of invisibility": "透明化のクローク", "cloak of displacement": "幻影のクローク", "orcish cloak": "オークのクローク", "dwarvish cloak": "ドワーフのクローク",
  "leather cloak": "革のクローク", "elven cloak": "エルフのクローク", "robe": "ローブ", "leather gloves": "革の手袋", "low boots": "短靴", "high boots": "長靴",
  "food ration": "食料", "food rations": "食料", "cram ration": "保存食", "cram rations": "保存食", "lembas wafer": "レンバス", "lembas wafers": "レンバス",
  "apple": "リンゴ", "apples": "リンゴ", "orange": "オレンジ", "oranges": "オレンジ", "pear": "洋ナシ", "pears": "洋ナシ",
  "carrot": "ニンジン", "carrots": "ニンジン", "banana": "バナナ", "bananas": "バナナ", "tripe ration": "臓物の食料", "tripe rations": "臓物の食料",
  "potion of water": "水のポーション", "potion of healing": "回復のポーション", "potion of extra healing": "上級回復のポーション", "potion of full healing": "完全回復のポーション",
  "potion of holy water": "聖水のポーション", "potion of unholy water": "邪水のポーション",
  "potion of gain energy": "魔力上昇のポーション", "potion of gain level": "レベル上昇のポーション", "potion of speed": "加速のポーション",
  "potion of sickness": "病気のポーション", "potion of paralysis": "麻痺のポーション", "potion of blindness": "盲目のポーション", "potion of confusion": "混乱のポーション",
  "potion of gain ability": "能力上昇のポーション", "potion of restore ability": "能力回復のポーション", "potion of levitation": "浮遊のポーション",
  "potion of hallucination": "幻覚のポーション", "potion of invisibility": "透明化のポーション", "potion of see invisible": "透明視のポーション",
  "potion of enlightenment": "自己認識のポーション", "potion of monster detection": "モンスター探知のポーション", "potion of object detection": "物体探知のポーション",
  "potion of sleeping": "睡眠のポーション", "potion of polymorph": "変身のポーション", "potion of booze": "酒のポーション", "potion of fruit juice": "果汁のポーション", "potion of acid": "酸のポーション", "potion of oil": "油のポーション",
  "scroll of identify": "識別の巻物", "scroll of remove curse": "解呪の巻物", "scroll of enchant weapon": "武器強化の巻物", "scroll of enchant armor": "防具強化の巻物",
  "scroll of teleportation": "テレポートの巻物", "scroll of magic mapping": "魔法の地図の巻物", "scroll of light": "光の巻物", "scroll of blank paper": "白紙の巻物",
  "scroll of destroy armor": "防具破壊の巻物", "scroll of confuse monster": "モンスター混乱の巻物", "scroll of scare monster": "モンスター威嚇の巻物", "scroll of create monster": "モンスター生成の巻物",
  "scroll of taming": "手なずけの巻物", "scroll of genocide": "抹殺の巻物", "scroll of gold detection": "金貨探知の巻物", "scroll of food detection": "食料探知の巻物",
  "scroll of amnesia": "健忘の巻物", "scroll of fire": "炎の巻物", "scroll of earth": "大地の巻物", "scroll of punishment": "罰の巻物", "scroll of charging": "充填の巻物", "scroll of stinking cloud": "悪臭の雲の巻物",
  "spellbook of force bolt": "魔法の矢の魔法書", "spellbook of magic missile": "魔法のミサイルの魔法書", "spellbook of sleep": "睡眠の魔法書", "spellbook of healing": "回復の魔法書",
  "spellbook of extra healing": "上級回復の魔法書", "spellbook of light": "光の魔法書", "spellbook of identify": "識別の魔法書", "spellbook of remove curse": "解呪の魔法書",
  "spellbook of fireball": "火球の魔法書", "spellbook of cone of cold": "冷気の魔法書", "spellbook of dig": "掘削の魔法書", "spellbook of teleport away": "テレポートの魔法書",
  "spellbook of magic mapping": "魔法の地図の魔法書", "spellbook of blank paper": "白紙の魔法書", "spellbook of detect monsters": "モンスター探知の魔法書", "spellbook of detect food": "食料探知の魔法書",
  "wand of light": "光のワンド", "wand of digging": "掘削のワンド", "wand of fire": "炎のワンド", "wand of cold": "冷気のワンド", "wand of lightning": "稲妻のワンド",
  "wand of striking": "打撃のワンド", "wand of teleportation": "テレポートのワンド", "wand of cancellation": "無効化のワンド", "wand of wishing": "願いのワンド",
  "wand of locking": "施錠のワンド", "wand of opening": "開錠のワンド", "wand of probing": "探査のワンド", "wand of sleep": "睡眠のワンド", "wand of death": "死のワンド",
  "wand of magic missile": "魔法のミサイルのワンド", "wand of polymorph": "変身のワンド", "wand of create monster": "モンスター生成のワンド", "wand of secret door detection": "隠し扉探知のワンド",
  "ring of protection": "防御の指輪", "ring of regeneration": "再生の指輪", "ring of teleportation": "テレポートの指輪", "ring of invisibility": "透明化の指輪",
  "ring of polymorph": "変身の指輪", "ring of polymorph control": "変身制御の指輪", "ring of protection from shape changers": "変身生物よけの指輪",
  "ring of levitation": "浮遊の指輪", "ring of free action": "自由行動の指輪", "ring of fire resistance": "火炎耐性の指輪", "ring of cold resistance": "冷気耐性の指輪", "ring of poison resistance": "毒耐性の指輪",
  "amulet of reflection": "反射のお守り", "amulet of life saving": "生命保護のお守り", "amulet of ESP": "ESPのお守り",
  "Amulet of Yendor": "イェンダーの魔除け",
  "Bell of Opening": "開門の鐘", "Candelabrum of Invocation": "招来の燭台", "Book of the Dead": "死者の書",
  "sack": "袋", "oilskin sack": "油布の袋", "bag of holding": "保持の袋", "bag of tricks": "手品の袋", "large box": "大きな箱", "chest": "宝箱",
  "skeleton key": "万能鍵", "lock pick": "開錠具", "credit card": "クレジットカード", "tinning kit": "缶詰製造キット", "tin opener": "缶切り",
  "towel": "タオル", "blindfold": "目隠し", "mirror": "鏡", "magic marker": "魔法のマーカー", "stethoscope": "聴診器", "whistle": "笛", "magic whistle": "魔法の笛",
  "oil lamp": "油のランプ", "magic lamp": "魔法のランプ", "brass lantern": "真鍮のランタン", "candle": "ろうそく", "candles": "ろうそく",
  "pick-axe": "つるはし", "unicorn horn": "一角獣の角", "touchstone": "試金石", "luckstone": "幸運の石", "loadstone": "重荷の石", "flint stone": "火打石", "flint stones": "火打石",
  "rock": "石", "rocks": "石", "gold piece": "金貨", "gold pieces": "金貨",
  "shuriken": "手裏剣", "shurikens": "手裏剣", "boomerang": "ブーメラン", "trident": "三叉槍", "silver dagger": "銀の短剣",
  "athame": "アサメ", "scalpel": "メス", "stiletto": "スティレット", "worm tooth": "ワームの牙", "worm teeth": "ワームの牙", "crysknife": "クリスナイフ",
  "elven spear": "エルフの槍", "orcish spear": "オークの槍", "dwarvish spear": "ドワーフの槍", "silver spear": "銀の槍",
  "silver saber": "銀のサーベル", "elven broadsword": "エルフの幅広の剣", "tsurugi": "剣", "runesword": "ルーンソード",
  "partisan": "パルチザン", "ranseur": "ランサー", "spetum": "スぺタム", "glaive": "グレイブ", "lance": "ランス", "halberd": "ハルバード",
  "bardiche": "バルディッシュ", "voulge": "ヴォウジェ", "dwarvish mattock": "ドワーフのつるはし", "fauchard": "フォシャール", "guisarme": "ギザルム",
  "bill-guisarme": "ビルギザルム", "lucern hammer": "ルツェルンハンマー", "bec de corbin": "ベク・ド・コルバン", "morning star": "モーニングスター", "war hammer": "戦槌", "flail": "フレイル", "bullwhip": "むち", "aklys": "アクリュス", "rubber hose": "ゴムホース",
  "fedora": "中折れ帽", "cornuthaum": "円錐帽", "dunce cap": "愚者の帽子", "dented pot": "へこんだ鍋", "helm of opposite alignment": "属性反転の兜", "helm of telepathy": "テレパシーの兜",
  "crystal plate mail": "水晶のプレートメイル", "bronze plate mail": "青銅のプレートメイル", "banded mail": "バンデッドメイル", "dwarvish mithril-coat": "ドワーフのミスリル鎧", "elven mithril-coat": "エルフのミスリル鎧", "orcish chain mail": "オークの鎖かたびら", "orcish ring mail": "オークのリングメイル", "leather jacket": "革の上着", "Hawaiian shirt": "アロハシャツ", "T-shirt": "Tシャツ",
  "mummy wrapping": "ミイラの包帯", "oilskin cloak": "油布のクローク", "alchemy smock": "錬金術師の上着", "Uruk-hai shield": "ウルク＝ハイの盾", "dwarvish roundshield": "ドワーフの丸盾",
  "gauntlets of fumbling": "不器用の小手", "gauntlets of power": "剛力の小手", "gauntlets of dexterity": "器用さの小手", "iron shoes": "鉄の靴", "speed boots": "加速のブーツ", "water walking boots": "水上歩行のブーツ", "jumping boots": "跳躍のブーツ", "elven boots": "エルフのブーツ", "kicking boots": "蹴りのブーツ", "fumble boots": "不器用のブーツ", "levitation boots": "浮遊のブーツ",
  "ring of adornment": "装飾の指輪", "ring of gain strength": "腕力上昇の指輪", "ring of gain constitution": "耐久力上昇の指輪", "ring of increase accuracy": "命中率上昇の指輪", "ring of increase damage": "ダメージ増加の指輪", "ring of searching": "探索の指輪", "ring of stealth": "隠密の指輪", "ring of sustain ability": "能力維持の指輪", "ring of hunger": "空腹の指輪", "ring of aggravate monster": "モンスター挑発の指輪", "ring of conflict": "争いの指輪", "ring of warning": "警告の指輪", "ring of shock resistance": "電撃耐性の指輪", "ring of slow digestion": "消化遅延の指輪", "ring of teleport control": "テレポート制御の指輪", "ring of see invisible": "透明視の指輪",
  "amulet of strangulation": "窒息のお守り", "amulet of restful sleep": "安眠のお守り", "amulet versus poison": "毒よけのお守り", "amulet of change": "変化のお守り", "amulet of unchanging": "不変のお守り", "amulet of magical breathing": "魔法呼吸のお守り", "cheap plastic imitation of the Amulet of Yendor": "イェンダーの魔除けの安っぽいプラスチック製の偽物",
  "spellbook of finger of death": "死の指の魔法書", "spellbook of knock": "開錠の魔法書", "spellbook of confuse monster": "モンスター混乱の魔法書", "spellbook of cure blindness": "盲目治療の魔法書", "spellbook of drain life": "生命吸収の魔法書", "spellbook of slow monster": "モンスター減速の魔法書", "spellbook of wizard lock": "魔法の施錠の魔法書", "spellbook of create monster": "モンスター生成の魔法書", "spellbook of cause fear": "恐怖の魔法書", "spellbook of clairvoyance": "透視の魔法書", "spellbook of cure sickness": "病気治療の魔法書", "spellbook of charm monster": "モンスター魅了の魔法書", "spellbook of haste self": "自己加速の魔法書", "spellbook of detect unseen": "不可視探知の魔法書", "spellbook of levitation": "浮遊の魔法書", "spellbook of restore ability": "能力回復の魔法書", "spellbook of invisibility": "透明化の魔法書", "spellbook of detect treasure": "宝物探知の魔法書", "spellbook of turn undead": "アンデッド退散の魔法書", "spellbook of polymorph": "変身の魔法書", "spellbook of create familiar": "使い魔召喚の魔法書", "spellbook of cancellation": "無効化の魔法書", "spellbook of protection": "防御の魔法書", "spellbook of jumping": "跳躍の魔法書", "spellbook of stone to flesh": "石の肉化の魔法書",
  "wand of enlightenment": "自己認識のワンド", "wand of nothing": "何も起こらないワンド", "wand of make invisible": "透明化のワンド", "wand of slow monster": "モンスター減速のワンド", "wand of speed monster": "モンスター加速のワンド", "wand of undead turning": "アンデッド退散のワンド",
  "tallow candle": "獣脂のろうそく", "wax candle": "蜜ろうのろうそく", "expensive camera": "高級カメラ", "crystal ball": "水晶玉", "lenses": "レンズ", "saddle": "鞍", "leash": "リード", "can of grease": "グリース缶", "figurine": "小像", "land mine": "地雷", "beartrap": "トラバサミ",
  "tin whistle": "ブリキの笛", "wooden flute": "木のフルート", "magic flute": "魔法のフルート", "tooled horn": "加工された角笛", "frost horn": "冷気の角笛", "fire horn": "炎の角笛", "horn of plenty": "豊穣の角笛", "wooden harp": "木のハープ", "magic harp": "魔法のハープ", "bell": "ベル", "bugle": "ラッパ", "leather drum": "革の太鼓", "drum of earthquake": "地震の太鼓",
  "egg": "卵", "eggs": "卵", "meatball": "ミートボール", "meat stick": "肉の棒", "huge chunk of meat": "大きな肉塊", "kelp frond": "昆布の葉", "eucalyptus leaf": "ユーカリの葉", "melon": "メロン", "sprig of wolfsbane": "トリカブトの小枝", "clove of garlic": "ニンニクのひとかけ", "slime mold": "粘菌", "lump of royal jelly": "ローヤルゼリーの塊", "cream pie": "クリームパイ", "candy bar": "キャンディーバー", "fortune cookie": "フォーチュンクッキー", "pancake": "パンケーキ", "K-ration": "Kレーション", "C-ration": "Cレーション", "tin": "缶詰", "tin of spinach": "ほうれん草の缶詰",
  "dilithium crystal": "ダイリチウム結晶", "diamond": "ダイヤモンド", "ruby": "ルビー", "jacinth": "ジルコン", "sapphire": "サファイア", "black opal": "ブラックオパール", "emerald": "エメラルド", "turquoise": "トルコ石", "citrine": "シトリン", "aquamarine": "アクアマリン", "amber": "琥珀", "topaz": "トパーズ", "jet": "ジェット", "opal": "オパール", "chrysoberyl": "クリソベリル", "garnet": "ガーネット", "amethyst": "アメジスト", "jasper": "ジャスパー", "fluorite": "蛍石", "obsidian": "黒曜石", "agate": "瑪瑙", "jade": "翡翠",
  "gray stone": "灰色の石",
  "boulder": "大岩", "boulders": "大岩", "statue": "石像", "corpse": "死体", "flint": "火打石", "grappling hook": "鉤縄", "heavy iron ball": "重い鉄球", "iron chain": "鉄の鎖",
  "novel": "小説", "scroll of mail": "郵便の巻物", "shimmering dragon scale mail": "きらめくドラゴンの鱗鎧", "shimmering dragon scales": "きらめくドラゴンの鱗",
  "spellbook of flame sphere": "炎の球の魔法書", "spellbook of freeze sphere": "氷の球の魔法書", "strange object": "奇妙な物体",
  // NetHack 5.0 names. Randomized descriptions remain separate below.
  "silver mace": "銀のメイス", "helm of caution": "警戒の兜", "shield of drain resistance": "生命吸収耐性の盾", "shield of shock resistance": "電撃耐性の盾", "amulet of guarding": "守護のお守り", "amulet of flying": "飛行のお守り", "wand of stasis": "停止のワンド", "spellbook of chain lightning": "連鎖雷撃の魔法書", "enormous meatball": "巨大なミートボール", "ice box": "アイスボックス",
  "wakizashi": "脇差", "nunchaku": "ヌンチャク", "shito": "刺刀", "yugake": "弓懸", "osaku": "オサク", "gunyoki": "軍用食", "meat ring": "肉の輪",
  "splash of venom": "毒液の飛沫", "splash of blinding venom": "目くらましの毒液の飛沫", "splash of acid venom": "酸性の毒液の飛沫",
  // Proper artifact names are translated only when the name itself is shown;
  // arbitrary user-supplied `named`/`called` labels are kept verbatim.
  "Excalibur": "エクスカリバー", "Stormbringer": "ストームブリンガー", "Mjollnir": "ミョルニル", "Cleaver": "クリーヴァー", "Grimtooth": "グリムトゥース", "Orcrist": "オルクリスト", "Sting": "つらぬき丸", "Magicbane": "マジックベイン", "Frost Brand": "フロストブランド", "Fire Brand": "ファイアブランド", "Dragonbane": "ドラゴンベイン", "Demonbane": "デーモンベイン", "Werebane": "ウェアベイン", "Grayswandir": "グレイスワンディール", "Giantslayer": "ジャイアントスレイヤー", "Ogresmasher": "オーガスマッシャー", "Trollsbane": "トロルズベイン", "Vorpal Blade": "ヴォーパルブレード", "Snickersnee": "スニッカースニー", "Sunsword": "サンソード",
  "Orb of Detection": "探知の宝珠", "Heart of Ahriman": "アーリマンの心臓", "Sceptre of Might": "力の王笏", "Staff of Aesculapius": "アスクレピオスの杖", "Magic Mirror of Merlin": "マーリンの魔法の鏡", "Eyes of the Overworld": "異界の眼", "Mitre of Holiness": "聖なる司教冠", "Longbow of Diana": "ディアナの長弓", "Master Key of Thievery": "盗賊の万能鍵", "Tsurugi of Muramasa": "村正の剣", "Platinum Yendorian Express Card": "プラチナ・イェンダー・エクスプレスカード", "Orb of Fate": "運命の宝珠", "Eye of the Aethiopica": "エチオピカの眼",
  "glob of gray ooze": "灰色ウーズの塊", "glob of brown pudding": "茶色プディングの塊", "glob of green slime": "緑色スライムの塊", "glob of black pudding": "黒色プディングの塊",
  "gray dragon scales": "灰色のドラゴンの鱗", "gold dragon scales": "金色のドラゴンの鱗", "silver dragon scales": "銀色のドラゴンの鱗", "red dragon scales": "赤いドラゴンの鱗", "white dragon scales": "白いドラゴンの鱗", "orange dragon scales": "オレンジ色のドラゴンの鱗", "black dragon scales": "黒いドラゴンの鱗", "blue dragon scales": "青いドラゴンの鱗", "green dragon scales": "緑色のドラゴンの鱗", "yellow dragon scales": "黄色いドラゴンの鱗",
  "gray dragon scale mail": "灰色のドラゴンの鱗鎧", "gold dragon scale mail": "金色のドラゴンの鱗鎧", "silver dragon scale mail": "銀色のドラゴンの鱗鎧", "red dragon scale mail": "赤いドラゴンの鱗鎧", "white dragon scale mail": "白いドラゴンの鱗鎧", "orange dragon scale mail": "オレンジ色のドラゴンの鱗鎧", "black dragon scale mail": "黒いドラゴンの鱗鎧", "blue dragon scale mail": "青いドラゴンの鱗鎧", "green dragon scale mail": "緑色のドラゴンの鱗鎧", "yellow dragon scale mail": "黄色いドラゴンの鱗鎧",
};

const appearances: Readonly<Record<string, string>> = {
  "ruby": "ルビー色", "pink": "桃色", "orange": "オレンジ色", "yellow": "黄色", "emerald": "エメラルド色", "dark green": "濃緑色", "cyan": "青緑色",
  "sky blue": "空色", "brilliant blue": "鮮やかな青色", "magenta": "赤紫色", "purple-red": "紫がかった赤色", "puce": "暗赤色", "milky": "乳白色",
  "swirly": "渦模様", "bubbly": "泡立った", "smoky": "煙のような", "cloudy": "濁った", "effervescent": "発泡した", "black": "黒色", "golden": "金色", "brown": "茶色", "fizzy": "泡のある", "dark": "暗色", "white": "白色", "murky": "不透明な", "clear": "透明な",
};

// Randomized appearances are intentionally independent of the item's effect.
const appearanceParts: Readonly<Record<string, string>> = {
  perforated: "穴の開いた", cubical: "立方体の", redwood: "セコイア材", checkered: "格子模様の",
  wooden: "木製", granite: "花崗岩", opal: "オパール", clay: "粘土", coral: "サンゴ", "black onyx": "黒瑪瑙", moonstone: "月長石", "tiger eye": "虎目石", jade: "翡翠", bronze: "青銅", agate: "瑪瑙", topaz: "トパーズ", sapphire: "サファイア", ruby: "ルビー", diamond: "ダイヤモンド", pearl: "真珠", iron: "鉄", brass: "真鍮", copper: "銅", twisted: "ねじれた", steel: "鋼鉄", silver: "銀", gold: "金", ivory: "象牙", emerald: "エメラルド", wire: "針金", engagement: "婚約", shiny: "光沢のある",
  glass: "ガラス", balsa: "バルサ材", crystal: "水晶", maple: "カエデ材", pine: "松材", oak: "オーク材", ebony: "黒檀", marble: "大理石", tin: "スズ", platinum: "白金", iridium: "イリジウム", zinc: "亜鉛", aluminum: "アルミニウム", uranium: "ウラン", hexagonal: "六角形", short: "短い", runed: "ルーンの刻まれた", long: "長い", curved: "曲がった", forked: "二股の", spiked: "とげのある", jeweled: "宝石の付いた",
  circular: "円形", spherical: "球形", oval: "楕円形", triangular: "三角形", pyramidal: "ピラミッド形", square: "四角形", concave: "くぼんだ形", octagonal: "八角形",
  parchment: "羊皮紙の", vellum: "子牛皮紙の", ragged: "ぼろぼろの", "dog eared": "折れ目の付いた", mottled: "まだら模様の", stained: "しみのある", cloth: "布製の", leathery: "革のような", white: "白い", pink: "桃色の", red: "赤い", orange: "オレンジ色の", yellow: "黄色い", velvet: "ビロードの", "light green": "薄緑色の", "dark green": "濃緑色の", turquoise: "青緑色の", cyan: "シアン色の", "light blue": "水色の", "dark blue": "濃青色の", indigo: "藍色の", magenta: "赤紫色の", purple: "紫色の", violet: "すみれ色の", tan: "黄褐色の", plaid: "格子模様の", "light brown": "薄茶色の", "dark brown": "濃茶色の", gray: "灰色の", wrinkled: "しわのある", dusty: "ほこりをかぶった", glittering: "きらめく", shining: "輝く", dull: "くすんだ", thin: "薄い", thick: "厚い", plain: "無地の", paperback: "ペーパーバックの", papyrus: "パピルスの", canvas: "キャンバス地の", hardcover: "ハードカバーの",
};

// The second term only describes the visible class, never a hidden identity.
const appearanceClasses: Readonly<Record<string, string>> = {
  ring: "指輪", rings: "指輪", wand: "ワンド", wands: "ワンド", amulet: "お守り", amulets: "お守り", spellbook: "魔法書", spellbooks: "魔法書",
};

const gemColors: Readonly<Record<string, string>> = {
  white: "白", blue: "青", red: "赤", "yellowish brown": "黄褐", orange: "オレンジ", yellow: "黄", black: "黒", green: "緑", violet: "すみれ",
};

const genericAppearances: Readonly<Record<string, string>> = {
  "cloak": "クローク", "helmet": "兜", "shield": "盾", "shirt": "シャツ", "suit": "鎧", "armor": "鎧",
  "wooden shield": "木製の盾", "crystal helmet": "水晶の兜", "bag": "袋",
  "little dart": "小さな投げ矢", "vulgar polearm": "ありふれた長柄武器", "hilted polearm": "柄のある長柄武器", "forked polearm": "二股の長柄武器", "single-edged polearm": "片刃の長柄武器", "angled poleaxe": "角ばった長柄斧", "long poleaxe": "長い長柄斧", "pole cleaver": "長柄の鉈", "pole sickle": "長柄の鎌", "pruning hook": "剪定用の鉤", "hooked polearm": "鉤状の長柄武器", "pronged polearm": "先端が枝分かれした長柄武器", "beaked polearm": "くちばし状の長柄武器", "broad pick": "幅広いつるはし", "thonged club": "ひも付きのこん棒", "silver bell": "銀の鈴", "boots": "ブーツ",
  "runed arrow": "ルーンの刻まれた矢", "crude arrow": "粗末な矢", "bamboo arrow": "竹の矢", "throwing star": "投げ星", "runed spear": "ルーンの刻まれた槍", "crude spear": "粗末な槍", "stout spear": "頑丈な槍", "throwing spear": "投げ槍", "runed dagger": "ルーンの刻まれた短剣", "crude dagger": "粗末な短剣", "double-headed axe": "両刃の斧", "runed short sword": "ルーンの刻まれた短い剣", "crude short sword": "粗末な短い剣", "broad short sword": "幅広の短い剣", "curved sword": "曲がった剣", "runed broadsword": "ルーンの刻まれた幅広の剣", "samurai sword": "侍の剣", "long samurai sword": "長い侍の剣", "runed bow": "ルーンの刻まれた弓", "crude bow": "粗末な弓", "long bow": "長弓", "staff": "杖", "leather hat": "革の帽子", "iron skull cap": "鉄の頭巾", "hard hat": "硬い帽子", "conical hat": "円錐形の帽子", "plumed helmet": "羽飾りの兜", "etched helmet": "模様のある兜", "crested helmet": "飾りのある兜", "visored helmet": "面頬付きの兜", "crude chain mail": "粗末な鎖かたびら", "crude ring mail": "粗末なリングメイル", "faded pall": "色あせた外套", "coarse mantelet": "粗い外套", "hooded cloak": "フード付きの外套", "slippery cloak": "滑りやすい外套", "apron": "エプロン", "tattered cape": "ぼろぼろのケープ", "opera cloak": "オペラ用の外套", "ornamental cope": "装飾された外套", "piece of cloth": "布切れ", "blue and green shield": "青と緑の盾", "white-handed shield": "白い手の盾", "red-eyed shield": "赤い目の盾", "large round shield": "大きな丸盾", "polished silver shield": "磨かれた銀の盾", "old gloves": "古い手袋", "padded gloves": "厚手の手袋", "riding gloves": "乗馬用手袋", "fencing gloves": "フェンシング用手袋", "walking shoes": "歩行靴", "hard shoes": "硬い靴", "jackboots": "乗馬靴", "combat boots": "戦闘靴", "jungle boots": "ジャングルブーツ", "hiking boots": "登山靴", "mud boots": "泥の付いたブーツ", "buckled boots": "留め金付きのブーツ", "riding boots": "乗馬ブーツ", "snow boots": "雪用ブーツ", "key": "鍵", "lamp": "ランプ", "looking glass": "手鏡", "glass orb": "ガラス玉", "flute": "フルート", "horn": "角笛", "harp": "ハープ", "drum": "太鼓", "potion": "ポーション", "potions": "ポーション", "scroll": "巻物", "scrolls": "巻物", "ring": "指輪", "rings": "指輪", "amulet": "お守り", "amulets": "お守り", "wand": "ワンド", "wands": "ワンド", "spellbook": "魔法書", "spellbooks": "魔法書",
};

const modifiers: Readonly<Record<string, string>> = {
  blessed: "祝福された", uncursed: "呪われていない", cursed: "呪われた",
  unblessed: "祝福されていない", locked: "施錠された", unlocked: "鍵のかかっていない", trapped: "罠の仕掛けられた", broken: "壊れた",
  rusty: "錆びた", corroded: "腐食した", burnt: "焦げた", rotted: "腐った", greased: "油を塗った",
  poisoned: "毒を塗った", erodeproof: "腐食しない", rustproof: "錆びない", fireproof: "燃えない", fixed: "損傷しない", empty: "空の", diluted: "薄められた", "partly eaten": "食べかけの", "partly used": "使いかけの", "very rusty": "ひどく錆びた", "thoroughly rusty": "完全に錆びた", "very corroded": "ひどく腐食した", "thoroughly corroded": "完全に腐食した", "very burnt": "ひどく焦げた", "thoroughly burnt": "完全に焦げた", "very rotted": "ひどく腐った", "thoroughly rotted": "完全に腐った", wet: "濡れた",
};

const statuses: Readonly<Record<string, string>> = {
  "weapon in hand": "装備中", "weapon in hands": "両手に装備中", "wielded in other hand": "もう一方の手に装備中",
  "weapon in right hand": "右手に装備中", "weapon in left hand": "左手に装備中", "weapon in other hand": "もう一方の手に装備中", "off-hand weapon": "利き手でない手に装備中",
  "at the ready": "使用準備中",
  "alternate weapon; not wielded": "予備武器・未装備", "alternate weapons; not wielded": "予備武器・未装備", "being worn": "着用中", "being worn; slippery": "着用中・滑りやすい", "being donned": "着用中（着替えの途中）", "being doffed": "脱いでいる途中", "embedded in your skin": "皮膚に埋め込まれている", "wielded": "手に持っている", "wielded in right hand": "右手に装備中", "wielded in left hand": "左手に装備中", "tethered to right hand": "右手につながれている", "tethered to left hand": "左手につながれている", "on left hand": "左手に装備中", "on right hand": "右手に装備中", "from left hand": "左手から", "from right hand": "右手から", "in quiver": "矢筒にセット中", "in quiver pouch": "矢筒の小袋にセット中", "lit": "点灯中", "chained to you": "あなたにつながれている", "attached to you": "あなたに取り付けられている", "unpaid": "未払い", "no charge": "無料",
};

function own(map: Readonly<Record<string, string>>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

export function translateInventoryCategory(text: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  const match = /^(\s*)(.*?)(\s*)$/s.exec(text);
  if (!match) return text;
  const translated = own(categories, match[2]);
  return translated === undefined ? text : `${match[1]}${translated}${match[3]}`;
}

let translatingMenuRow = false;

/**
 * nh3d-plus: menu rows can be item names or plain options such as "All types"
 * or "Items of unknown Bless/Curse status"; try both.
 */
export function translateMenuItemText(text: string, locale: SupportedLocale): string {
  const item = translateInventoryItem(text, locale);
  if (locale !== "ja" || item !== text || !text.trim() || translatingMenuRow) return item;
  const leading = text.slice(0, text.length - text.trimStart().length);
  const trailing = text.slice(text.trimEnd().length);
  // pickup.c offers the last picked-up item as its own menu choice.
  const justPickedUp = /^Just picked up(?:: (.+))?$/.exec(text.trim());
  if (justPickedUp) {
    const picked = justPickedUp[1] === undefined ? "" : translateInventoryItem(justPickedUp[1], locale);
    if (picked !== justPickedUp[1]) return `${leading}直前に拾った物${picked ? `：${picked}` : ""}${trailing}`;
  }
  // translateGameMessage calls back into the item translator for item phrases.
  translatingMenuRow = true;
  try {
    const message = translateGameMessage(text.trim(), locale);
    return message !== text.trim() && !keepsEnglishRun(text, message) ? `${leading}${message}${trailing}` : text;
  } finally {
    translatingMenuRow = false;
  }
}

/** Translate only fully recognized item descriptions; otherwise retain the original. */
export function translateInventoryItem(text: string, locale: SupportedLocale): string {
  const curated = translateCuratedInventoryItem(text, locale);
  if (locale !== "ja" || curated !== text || !text.trim()) return curated;
  // Not recognized by the curated tables: try JNetHack's object names.
  const leading = text.slice(0, text.length - text.trimStart().length);
  const trailing = text.slice(text.trimEnd().length);
  const jnethack = jnethackItem(text.trim());
  if (jnethack !== undefined) return `${leading}${jnethack}${trailing}`;
  return text;
}

function translateCuratedInventoryItem(text: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !text.trim()) return text;
  const whitespace = /^(\s*)(.*?)(\s*)$/s.exec(text);
  if (!whitespace) return text;
  let item = whitespace[2];
  const statusParts: string[] = [];
  // Optional price-quote suffix, e.g. " {buy 10-20 sell 5}".
  const quote = / \{(?:buy (\d+(?:-\d+)?))?(?: ?sell (\d+(?:-\d+)?))?\}$/.exec(item);
  if (quote && (quote[1] || quote[2])) {
    const quoteParts = [quote[1] ? `買値 ${quote[1]}` : "", quote[2] ? `売値 ${quote[2]}` : ""].filter(Boolean);
    statusParts.unshift(`｛${quoteParts.join(" ")}｝`);
    item = item.slice(0, -quote[0].length);
  }
  for (;;) {
    const statusMatch = / \(([^()]*)\)$/.exec(item);
    if (!statusMatch) break;
    let detail = statusMatch[1];
    // NetHack may append the weight ("aum") inside an existing parenthesis.
    const weight = /^(?:(.*), )?(\d+) aum$/.exec(detail);
    const weightText = weight ? `${weight[2]} aum` : "";
    if (weight) detail = weight[1] ?? "";
    const translatedStatus = detail ? own(statuses, detail) : "";
    // Preserve the native recharge:charges notation without interpreting it.
    const price = /^(unpaid|contents|for sale), (\d+) (zorkmids?)$/.exec(detail);
    const priceLabel: Readonly<Record<string, string>> = { unpaid: "未払い", contents: "中身", "for sale": "売り物" };
    const join = (text: string): string => [text, weightText].filter(Boolean).join("、");
    const attachedTo = /^attached to ([^()\r\n]+)$/.exec(detail);
    const total = /^(\d+) in total$/.exec(detail);
    if (translatedStatus !== undefined) statusParts.unshift(`（${join(translatedStatus)}）`);
    else if (/^\d+:-?\d+$/.test(detail)) statusParts.unshift(weightText ? ` (${detail}, ${weightText})` : ` (${detail})`);
    else if (price) statusParts.unshift(`（${join(`${priceLabel[price[1]]}、${price[2]} ゾークミド`)}）`);
    else if (attachedTo) statusParts.unshift(`（${join(`${attachedTo[1]}につながれている`)}）`);
    else if (total) statusParts.unshift(`（合計 ${total[1]}）`);
    else return text;
    item = item.slice(0, -statusMatch[0].length);
  }
  // NetHack 5 reports the number of occupied item slots in known containers.
  const contentsMatch = /^(.+?) containing (\d+) items?$/.exec(item);
  const contents = contentsMatch ? `（中身：${contentsMatch[2]}枠）` : "";
  if (contentsMatch) item = contentsMatch[1];
  // Preserve user-supplied item names and calls exactly. Only display a
  // translation when the remaining item is independently recognized.
  const labelMatch = /^(.+?) (named|called) (.+)$/.exec(item);
  const label = labelMatch ? `（${labelMatch[2] === "named" ? "名前" : "呼び名"}：${labelMatch[3]}）` : "";
  if (labelMatch) item = labelMatch[1];
  const quantity = /^(a|an|the|The|\d+) (.+)$/.exec(item);
  if (quantity) item = quantity[2];
  const descriptions: string[] = [];
  // Recognize modifiers individually but do not translate any substring of an
  // unknown name or a user-provided inscription.
  const takeModifiers = (): void => {
    for (;;) {
      const part = /^(\+\d+|-\d+|blessed|unblessed|uncursed|cursed|locked|unlocked|trapped|broken|very rusty|thoroughly rusty|very corroded|thoroughly corroded|very burnt|thoroughly burnt|very rotted|thoroughly rotted|partly eaten|partly used|rusty|corroded|burnt|rotted|greased|poisoned|erodeproof|rustproof|fireproof|fixed|empty|diluted|wet) (.+)$/.exec(item);
      if (!part) break;
      descriptions.push(own(modifiers, part[1]) ?? part[1]);
      item = part[2];
    }
  };
  takeModifiers();
  const pairMatch = /^pairs? of (.+)$/.exec(item);
  if (pairMatch) {
    item = pairMatch[1];
    takeModifiers();
  }
  let name = own(itemNames, item);
  if (name === undefined && item.endsWith("s")) {
    name = own(itemNames, item.slice(0, -1));
  }
  if (name === undefined) {
    const pluralOf = /^(potions|scrolls|spellbooks|wands|rings|amulets) of (.+)$/.exec(item);
    if (pluralOf) name = own(itemNames, `${pluralOf[1].slice(0, -1)} of ${pluralOf[2]}`);
  }
  if (name === undefined) {
    // "2 sprigs of wolfsbane", "cloves of garlic", "lumps of royal jelly"
    const measure = /^(\S+?)s of (.+)$/.exec(item);
    if (measure) name = own(itemNames, `${measure[1]} of ${measure[2]}`);
  }
  if (name === undefined) name = own(genericAppearances, item);
  if (name === undefined && item.endsWith("s")) name = own(genericAppearances, item.slice(0, -1));
  if (name === undefined) {
    const appearance = /^(.*?) (rings?|wands?|amulets?|spellbooks?)$/.exec(item);
    const descriptor = appearance && own(appearanceParts, appearance[1]);
    const itemClass = appearance && own(appearanceClasses, appearance[2]);
    if (descriptor && itemClass) {
      name = `${descriptor}${/[いのたくる]$/.test(descriptor) ? "" : "の"}${itemClass}`;
    }
  }
  if (name === undefined) {
    const potion = /^(.*?) potions?$/.exec(item);
    const appearance = potion && own(appearances, potion[1]);
    if (appearance) name = `${appearance}${/[いなのたくる]$/.test(appearance) ? "" : "の"}ポーション`;
  }
  if (name === undefined) {
    // Scroll inscriptions describe appearance, not the magical effect.
    const labeledScroll = /^scrolls? labeled ([A-Z][A-Z0-9 ]*)$/.exec(item);
    if (labeledScroll) name = `「${labeledScroll[1]}」と書かれた巻物`;
    else if (/^(?:unlabeled|unlabelled) scrolls?$/.test(item)) name = "ラベルのない巻物";
    else if (/^stamped scrolls?$/.test(item)) name = "切手の貼られた巻物";
  }
  if (name === undefined) {
    const unknownGem = /^(white|blue|red|yellowish brown|orange|yellow|black|green|violet) gems?$/.exec(item);
    const worthlessGlass = /^worthless pieces? of (white|blue|red|yellowish brown|orange|yellow|black|green|violet) glass$/.exec(item);
    if (unknownGem) name = `${gemColors[unknownGem[1]]}色の宝石`;
    else if (worthlessGlass) name = `価値のない${gemColors[worthlessGlass[1]]}色のガラス片`;
  }
  if (name === undefined) {
    // These descriptions explicitly reveal the species. Translate only a
    // recognized complete species; retain unknown and player-supplied names.
    const remains = /^([^()]+?) (corpse|corpses|egg|eggs)$/.exec(item);
    if (remains) {
      const creature = translateMonsterName(`the ${remains[1]}`, locale);
      const visibleCreature = creature === `the ${remains[1]}` ? remains[1] : creature;
      name = `${visibleCreature}の${remains[2].startsWith("corpse") ? "死体" : "卵"}`;
    }
  }
  if (name === undefined) {
    const glob = /^(small |medium |large |very large )?globs? of (gray ooze|brown pudding|green slime|black pudding)$/.exec(item);
    if (glob) {
      const sizes: Readonly<Record<string, string>> = { "small ": "小さな", "medium ": "中くらいの", "large ": "大きな", "very large ": "とても大きな" };
      name = `${glob[1] ? sizes[glob[1]] : ""}${own(itemNames, `glob of ${glob[2]}`) ?? glob[2]}`;
    }
  }
  if (name === undefined) {
    const tin = /^tin of (.+?) meat$/.exec(item);
    if (tin) {
      const creature = translateMonsterName(`the ${tin[1]}`, locale);
      name = `${creature === `the ${tin[1]}` ? tin[1] : creature}の肉の缶詰`;
    }
  }
  if (name === undefined) {
    const likeness = /^(statue|figurine) of ((?:a|an|the) .+)$/.exec(item);
    if (likeness) {
      const creature = translateMonsterName(likeness[2], locale);
      if (creature !== likeness[2]) name = `${creature}の${likeness[1] === "statue" ? "石像" : "置物"}`;
    }
  }
  if (name === undefined) return text;
  const count = pairMatch
    ? ` ${quantity && /^\d+$/.test(quantity[1]) ? quantity[1] : "1"}組`
    : quantity && /^\d+$/.test(quantity[1]) ? ` ×${quantity[1]}` : "";
  // Japanese modifiers join directly; enchantments keep surrounding spaces.
  const prefix = descriptions.length
    ? `${descriptions.map((part, index) => /^[+-]\d/.test(part) ? `${index ? " " : ""}${part} ` : part).join("").replace(/\s+$/, "")}${/^[+-]\d/.test(descriptions[descriptions.length - 1]) ? " " : ""}`
    : "";
  return `${whitespace[1]}${prefix}${name}${count}${label}${contents}${statusParts.join("")}${whitespace[3]}`;
}
