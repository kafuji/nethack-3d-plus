// Names the game gives its characters from fixed tables, shown in katakana.
// They reach the text inside sentences, so they are replaced in the finished
// rendering rather than looked up as messages.

// shknam.c: place names and reversed names of the shopkeepers.
const shopkeepers: Readonly<Record<string, string>> = {
  // Liquor
  Njezjin: "ニェジン", Tsjernigof: "チェルニゴフ", Ossipewsk: "オシペフスク", Gorlowka: "ゴルロフカ", Gomel: "ゴメリ",
  Konosja: "コノシャ", "Weliki Oestjoeg": "ヴェリキー・ウスチュグ", Syktywkar: "スィクティフカル", Sablja: "サブリャ",
  Narodnaja: "ナロードナヤ", Kyzyl: "クズル", Walbrzych: "ヴァウブジフ", Swidnica: "シフィドニツァ", Klodzko: "クウォツコ",
  Raciborz: "ラチブシュ", Gliwice: "グリヴィツェ", Brzeg: "ブジェク", Krnov: "クルノフ", "Hradec Kralove": "フラデツ・クラーロヴェー",
  Leuk: "ロイク", Brig: "ブリーク", Brienz: "ブリエンツ", Thun: "トゥーン", Sarnen: "ザルネン", Burglen: "ビュルグレン",
  Elm: "エルム", Flims: "フリムス", Vals: "ファルス", Schuls: "シュルス", "Zum Loch": "ツム・ロッホ",
  // Books
  Skibbereen: "スキバリーン", Kanturk: "カンタク", "Rath Luirc": "ラス・ルアーク", Ennistymon: "エニスタイモン", Lahinch: "ラヒンチ",
  Kinnegad: "キネガド", Lugnaquillia: "ラグナキリア", Enniscorthy: "エニスコーシー", Gweebarra: "グウィーバラ", Kittamagh: "キタマー",
  Nenagh: "ニーナ", Sneem: "スニーム", Ballingeary: "バリンギアリー", Kilgarvan: "キルガーヴァン", Cahersiveen: "カハーシヴィーン",
  Glenbeigh: "グレンベイ", Kilmihil: "キルミヒル", Kiltamagh: "キルタマー", "Droichead Atha": "ドロヘド・アハ", Inniscrone: "イニスクローン",
  Clonegal: "クロネガル", Lisnaskea: "リスナスキー", Culdaff: "カルダフ", Dunfanaghy: "ダンファナヒー", Inishbofin: "イニシュボフィン", Kesh: "ケシュ",
  // Armor
  Demirci: "デミルジ", Kalecik: "カレジク", Boyabai: "ボヤバイ", Yildizeli: "ユルドゥゼリ", Gaziantep: "ガズィアンテプ", Siirt: "シイルト",
  Akhalataki: "アハルタキ", Tirebolu: "ティレボル", Aksaray: "アクサライ", Ermenak: "エルメナク", Iskenderun: "イスケンデルン",
  Kadirli: "カディルリ", Siverek: "シヴェレク", Pervari: "ペルヴァリ", Malasgirt: "マラスギルト", Bayburt: "バイブルト", Ayancik: "アヤンジュク",
  Zonguldak: "ゾングルダク", Balya: "バルヤ", Tefenni: "テフェンニ", Artvin: "アルトヴィン", Kars: "カルス", Makharadze: "マハラゼ",
  Malazgirt: "マラズギルト", Midyat: "ミディヤト", Birecik: "ビレジク", Kirikkale: "クルッカレ", Alaca: "アラジャ", Polatli: "ポラトル", Nallihan: "ナルハン",
  // Wands
  "Yr Wyddgrug": "ア・ウィズグリグ", Trallwng: "トラッルング", Mallwyd: "マスルイド", Pontarfynach: "ポンタルヴァナッハ", Rhaeader: "ライアダー",
  Llandrindod: "スランドリンドッド", "Llanfair-ym-muallt": "スランヴァイル・アム・ミアスト", "Y-Fenni": "ア・ヴェニ", Maesteg: "マイステグ",
  Rhydaman: "フリダマン", Beddgelert: "ベズゲラート", Curig: "キリグ", Llanrwst: "スランルースト", Llanerchymedd: "スラネルヒメズ", Caergybi: "カイルギビ",
  Nairn: "ネアン", Turriff: "タリフ", Inverurie: "インヴァルーリー", Braemar: "ブレーマー", Lochnagar: "ロッホナガー", Kerloch: "ケルロッホ",
  "Beinn a Ghlo": "ベン・ア・グロー", Drumnadrochit: "太鼓ナドロヒット", Morven: "モーヴェン", Uist: "ウイスト", Storr: "ストー",
  "Sgurr na Ciche": "スグール・ナ・キーヘ", Cannich: "カニッヒ", Gairloch: "ゲアロッホ", Kyleakin: "カイラキン", Dunvegan: "ダンヴェガン",
  // Rings
  Feyfer: "フェイフェル", Flugi: "フルーギ", Gheel: "ヘール", Havic: "ハーヴィック", Haynin: "ハイニン", Hoboken: "ホーボーケン", Imbyze: "インバイゼ",
  Juyn: "ユイン", Kinsky: "キンスキー", Massis: "マシス", Matray: "マトレイ", Moy: "モイ", Olycan: "オリカン", Sadelin: "サデリン", Svaving: "スヴァヴィング",
  Tapper: "タッパー", Terwen: "テルウェン", Wirix: "ウィリックス", Ypey: "イペイ", Rastegaisa: "ラステガイサ", "Varjag Njarga": "ヴァリャグ・ニャルガ",
  Kautekeino: "カウトケイノ", Abisko: "アビスコ", Enontekis: "エノンテキス", Rovaniemi: "ロヴァニエミ", Avasaksa: "アヴァサクサ", Haparanda: "ハパランダ",
  Lulea: "ルレオ", Gellivare: "イェリヴァレ", Oeloe: "オエロエ", Kajaani: "カヤーニ", Fauske: "ファウスケ",
  // Food
  Djasinga: "ジャシンガ", Tjibarusa: "チバルサ", Tjiwidej: "チウィデイ", Pengalengan: "ペンガレンガン", Bandjar: "バンジャール", Parbalingga: "パルバリンガ",
  Bojolali: "ボヨラリ", Sarangan: "サランガン", Ngebel: "ンゲベル", Djombang: "ジョンバン", Ardjawinangun: "アルジャウィナングン", Berbek: "ベルベク",
  Papar: "パパール", Baliga: "バリガ", Tjisolok: "チソロック", Siboga: "シボガ", Banjoewangi: "バニュワンギ", Trenggalek: "トレンガレク",
  Karangkobar: "カランコバル", Njalindoeng: "ニャリンドゥン", Pasawahan: "パサワハン", Pameunpeuk: "パムンプク", Patjitan: "パチタン", Kediri: "ケディリ",
  Pemboeang: "プンブアン", Tringanoe: "トレンガヌ", Makin: "マキン", Tipor: "ティポル", Semai: "スマイ", Berhala: "ブルハラ", Tegal: "テガル", Samoe: "サモエ",
  // Weapons
  Voulgezac: "ヴルジェザック", Rouffiac: "ルフィアック", Lerignac: "レリニャック", Touverac: "トゥヴェラック", Guizengeard: "ギザンジャール", Melac: "メラック",
  Neuvicq: "ヌーヴィック", Vanzac: "ヴァンザック", Picq: "ピック", Urignac: "ユリニャック", Corignac: "コリニャック", Fleac: "フレアック", Lonzac: "ロンザック",
  Vergt: "ヴェール", Queyssac: "ケサック", Liorac: "リオラック", Echourgnac: "エシュルニャック", Cazelon: "カズロン", Eypau: "エイポー", Carignan: "カリニャン",
  Monbazillac: "モンバジヤック", Jonzac: "ジョンザック", Pons: "ポン", Jumilhac: "ジュミヤック", Fenouilledes: "フヌイエード", Laguiolet: "ラギオレ",
  Saujon: "ソージョン", Eymoutiers: "エイムティエ", Eygurande: "エギュランド", Eauze: "エオーズ", Labouheyre: "ラブエール",
  // Tools
  Ymla: "イムラ", "Eed-morra": "イード・モラ", "Elan Lapinski": "エラン・ラピンスキー", Cubask: "キュバスク", Nieb: "ニーブ", "Bnowr Falr": "ブナウル・ファルル",
  Sperc: "スパーク", Noskcirdneh: "ノスクシルドネ", Yawolloh: "ヤウォロー", Hyeghu: "ヘイグー", Niskal: "ニスカル", Trahnil: "トラニル", Htargcm: "ハターグシム",
  Enrobwem: "エンロブウェム", "Kachzi Rellim": "カチジ・レリム", Regien: "レジエン", Donmyar: "ドンミャー", Yelpur: "イェルパー", Nosnehpets: "ノスネペッツ",
  Stewe: "ステュー", Renrut: "レンルット", "Senna Hut": "セナ・ハット", Zlaw: "ズロー", Nosalnef: "ノサルネフ", Rewuorb: "レウオーブ", Rellenk: "レレンク",
  Yad: "ヤド", "Cire Htims": "シーア・ハティムズ", "Y-crad": "ワイ・クラッド", Nenilukah: "ネニルカ", Corsh: "コルシュ", Aned: "アネド", "Dark Eery": "ダーク・エアリー",
  Niknar: "ニクナー", Lapu: "ラプ", Lechaim: "レハイム", "Rebrol-nek": "レブロル・ネク", "AlliWar Wickson": "アリウォー・ウィクソン", Oguhmk: "オグムク",
  "Telloc Cyaj": "テロック・キャージ",
  // Lighting
  Izchak: "イズチャク", Zarnesti: "ザルネシュティ", Slanic: "スラニク", Nehoiasu: "ネホイアス", Ludus: "ルドゥシュ", Sighisoara: "シギショアラ", Nisipitu: "ニシピトゥ",
  Razboieni: "ラズボイェニ", Bicaz: "ビカズ", Dorohoi: "ドロホイ", Vaslui: "ヴァスルイ", Fetesti: "フェテシュティ", "Tirgu Neamt": "トゥルグ・ネアムツ",
  Babadag: "ババダグ", Zimnicea: "ジムニチャ", Zlatna: "ズラトナ", Jiu: "ジウ", Eforie: "エフォリエ", Mamaia: "ママイア", Silistra: "シリストラ", Tulovo: "トゥロヴォ",
  Panagyuritshte: "パナギュリシテ", Smolyan: "スモリャン", Kirklareli: "クルクラレリ", Pernik: "ペルニク", Lom: "ロム", Haskovo: "ハスコヴォ", Dobrinishte: "ドブリニシュテ",
  Varvara: "ヴァルヴァラ", Oryahovo: "オリャホヴォ", Troyan: "トロヤン", Lovech: "ロヴェチ", Sliven: "スリヴェン",
  // General stores
  Hebiwerie: "ヘビウェリー", Possogroenoe: "ポソグルーヌ", Asidonhopo: "アシドンホポ", Manlobbi: "マンロビ", Adjama: "アジャマ", "Pakka Pakka": "パッカ・パッカ",
  Kabalebo: "カバレボ", Wonotobo: "ウォノトボ", Akalapi: "アカラピ", Sipaliwini: "シパリウィニ", Annootok: "アヌートク", Upernavik: "ウペルナビク",
  Angmagssalik: "アンマサリク", Aklavik: "アクラヴィク", Inuvik: "イヌヴィク", Tuktoyaktuk: "トゥクトヤクトゥク", Chicoutimi: "シクティミ", Ouiatchouane: "ウィアチュアン",
  Chibougamau: "シブガモー", Matagami: "マタガミ", Kipawa: "キパワ", Kinojevis: "キノジェヴィス", Abitibi: "アビティビ", Maganasipi: "マガナシピ", Akureyri: "アークレイリ",
  Kopasker: "コーパスケル", Budereyri: "ブーザレイリ", Akranes: "アクラネス", Bordeyri: "ボルデイリ", Holmavik: "ホルマヴィーク",
  // Health food
  "Ga'er": "ガエル", Zhangmu: "ジャンムー", Rikaze: "リカツェ", Jiangji: "ジャンジ", Changdu: "チャンドゥ", Linzhi: "リンジ", Shigatse: "シガツェ", Gyantse: "ギャンツェ",
  Ganden: "ガンデン", Tsurphu: "ツルプ", Lhasa: "ラサ", Tsedong: "ツェタン", Drepung: "デプン", Azura: "アズーラ", Blaze: "ブレイズ", Breanna: "ブリアナ", Breezy: "ブリージー",
  Dharma: "ダルマ", Feather: "フェザー", Jasmine: "ジャスミン", Luna: "ルナ", Melody: "メロディ", Moonjava: "ムーンジャヴァ", Petal: "ペタル", Rhiannon: "リアノン",
  Starla: "スターラ", Tranquilla: "トランキラ", Windsong: "ウィンドソング", Zennia: "ゼニア", Zoe: "ゾーイ", Zora: "ゾーラ",
};

// do_name.c: a coyote's mock Latin name, shown when it is looked at.
const coyotes: Readonly<Record<string, string>> = {
  "Carnivorous Vulgaris": "カルニヴォルス・ヴルガリス", "Road-Runnerus Digestus": "ロードランネルス・ディゲストゥス", "Eatibus Anythingus": "エアティブス・エニシングス",
  "Famishus-Famishus": "ファミシュス・ファミシュス", "Eatibus Almost Anythingus": "エアティブス・オルモスト・エニシングス", "Eatius Birdius": "エアティウス・バーディウス",
  "Famishius Fantasticus": "ファミシウス・ファンタスティクス", "Eternalii Famishiis": "エテルナリイ・ファミシイス", "Famishus Vulgarus": "ファミシュス・ヴルガルス",
  "Famishius Vulgaris Ingeniusi": "ファミシウス・ヴルガリス・インゲニウシ", "Eatius-Slobbius": "エアティウス・スロビウス", "Hardheadipus Oedipus": "ハードヘディプス・オエディプス",
  "Carnivorous Slobbius": "カルニヴォルス・スロビウス", "Hard-Headipus Ravenus": "ハードヘディプス・ラヴェヌス", "Evereadii Eatibus": "エヴェレアディイ・エアティブス",
  "Apetitius Giganticus": "アペティティウス・ギガンティクス", "Hungrii Flea-Bagius": "ハングリイ・フリーバギウス", "Overconfidentii Vulgaris": "オーヴァーコンフィデンティイ・ヴルガリス",
  "Caninus Nervous Rex": "カニヌス・ネルウォス・レックス", "Grotesques Appetitus": "グロテスケス・アペティトゥス", "Nemesis Ridiculii": "ネメシス・リディクリイ", "Canis latrans": "カニス・ラトランス",
};

// mplayer.c: player monsters are named after the people who wrote the game.
const playerMonsters: Readonly<Record<string, string>> = {
  Alex: "アレックス", Andy: "アンディ", Bill: "ビル", Chris: "クリス", Dave: "デイヴ", Dean: "ディーン", Derek: "デレク", Dion: "ディオン", Eric: "エリック", Gregg: "グレッグ",
  Helge: "ヘルゲ", Izchak: "イズチャク", Janet: "ジャネット", Janne: "ヤンネ", Jessie: "ジェシー", Jon: "ジョン", Jonathan: "ジョナサン", Joshua: "ジョシュア", Keizo: "ケイゾウ",
  Ken: "ケン", Keni: "ケニ", Kevin: "ケヴィン", Marvin: "マーヴィン", Michael: "マイケル", Mike: "マイク", Olaf: "オラフ", Pasi: "パシ", Pat: "パット", Patric: "パトリック",
  Paul: "ポール", Richard: "リチャード", Ron: "ロン", Sean: "ショーン", Stephen: "スティーヴン", Steve: "スティーヴ", Timo: "ティモ", Wang: "ワン", Warwick: "ウォリック", Yitzhak: "イツハク",
};

/** The katakana of a player monster's name; other names are kept as typed. */
export function playerMonsterName(name: string): string {
  return Object.prototype.hasOwnProperty.call(playerMonsters, name) ? playerMonsters[name] : name;
}

/** role.c homebase and intermed: where each quest starts and its middle level. */
export const questPlaces: Readonly<Record<string, string>> = {
  "the College of Archeology": "考古学大学", "the Tomb of the Toltec Kings": "トルテカ王の墓所",
  "the Camp of the Duali Tribe": "デュアリ族の野営地", "the Duali Oasis": "デュアリのオアシス",
  "the Caves of the Ancestors": "祖先の洞窟", "the Dragon's Lair": "竜の巣",
  "the Temple of Epidaurus": "エピダウロス神殿", "the Temple of Coeus": "コイオス神殿",
  "Camelot Castle": "キャメロット城", "the Isle of Glass": "ガラスの島",
  "the Monastery of Chan-Sune": "チャン・スー修道院", "the Monastery of the Earth-Lord": "大地の王の修道院",
  "the Great Temple": "大神殿", "the Temple of Nalzok": "ナルゾクの神殿",
  "Orion's camp": "オリオンの野営地", "the cave of the wumpus": "ワンパスの洞窟",
  "the Thieves' Guild Hall": "盗賊ギルド会館", "the Assassins' Guild Hall": "暗殺者ギルド会館",
  "the Castle of the Taro Clan": "太郎一族の城", "the Shogun's Castle": "将軍の城",
  "Ankh-Morpork": "アンク・モルポーク",
  "the Shrine of Destiny": "運命の祠", "the cave of Surtur": "スルトの洞窟",
  "the Lonely Tower": "孤独の塔", "the Tower of Darkness": "闇の塔",
};

/** questpgr.c %O: a quest artifact's name shortened to its first noun. */
export const questArtifactShortNames: Readonly<Record<string, string>> = {
  "the Orb": "宝珠", "the Heart": "心臓", "the Sceptre": "王笏", "the Staff": "杖", "the Mirror": "鏡", "the Eyes": "眼",
  "the Mitre": "司教冠", "the Longbow": "長弓", "the Master Key": "万能鍵", "the Tsurugi": "剣", "the Card": "カード", "the Eye": "眼",
};

// tower1.lua: the vampire ladies of Vlad's Tower.
const vampires: Readonly<Record<string, string>> = { Madame: "マダム", Marquise: "侯爵夫人", Countess: "伯爵夫人" };

/** pray.c hallu_gods: the gods a hallucinating hero hears about. */
export const hallucinatedDeities: Readonly<Record<string, string>> = {
  "the Flying Spaghetti Monster": "空飛ぶスパゲッティ・モンスター", Eris: "エリス", "the Martians": "火星人", Xom: "ゾム", "AnDoR dRaKoN": "アンドール・ドラコン",
  "the Central Bank of Yendor": "イェンダー中央銀行", "Tooth Fairy": "歯の妖精", Om: "オム", Yawgmoth: "ヨーグモス", Morgoth: "モルゴス", Cthulhu: "クトゥルフ", "the Ori": "オーライ",
  destiny: "運命", "your Friend the Computer": "あなたの友コンピューター",
};

// do_name.c: the names ghosts are given. Common first names, so only replaced
// next to the word for ghost; anywhere else they may be the player's own.
const ghosts: Readonly<Record<string, string>> = {
  Adri: "アドリ", Andries: "アンドリース", Andreas: "アンドレアス", Bert: "ベルト", David: "デイヴィッド", Dirk: "ディルク", Emile: "エミール", Frans: "フランス",
  Fred: "フレッド", Greg: "グレッグ", Hether: "ヘザー", Jay: "ジェイ", John: "ジョン", Jon: "ジョン", Karnov: "カルノフ", Kay: "ケイ", Kenny: "ケニー", Kevin: "ケヴィン",
  Maud: "モード", Michiel: "ミヒール", Mike: "マイク", Peter: "ペーター", Robert: "ロバート", Ron: "ロン", Tom: "トム", Wilmar: "ウィルマー", "Nick Danger": "ニック・デンジャー",
  Phoenix: "フェニックス", Jiro: "ジロー", Mizue: "ミズエ", Stephan: "シュテファン", "Lance Braccus": "ランス・ブラッカス", Shadowhawk: "シャドウホーク", Murphy: "マーフィー",
};

// do_name.c, rndorcname(): every orc name is built from these syllables.
const orcSyllables: Readonly<Record<string, string>> = {
  a: "ア", ai: "アイ", og: "オグ", u: "ウ", gor: "ゴル", gris: "グリス", un: "ウン", bane: "ベイン", ruk: "ルク", oth: "オス", ul: "ウル", z: "ズ", thos: "ソス", akh: "アク", hai: "ハイ",
};
const syllablesLongestFirst = Object.keys(orcSyllables).sort((a, b) => b.length - a.length);

/** The katakana of a generated orc name, or undefined when it is not one. */
function orcName(name: string): string | undefined {
  const spell = (rest: string): string | undefined => {
    if (rest === "") return "";
    for (const syllable of syllablesLongestFirst) {
      if (!rest.startsWith(syllable)) continue;
      const tail = spell(rest.slice(syllable.length));
      if (tail !== undefined) return orcSyllables[syllable] + tail;
    }
    return undefined;
  };
  const parts = name.toLowerCase().split("-").map(spell);
  return parts.includes(undefined) ? undefined : parts.join("・");
}

const alternation = (names: Iterable<string>): string =>
  [...names].sort((a, b) => b.length - a.length).map((name) => name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|");
const fixedNames: Readonly<Record<string, string>> = { ...shopkeepers, ...coyotes, ...vampires };
const fixedName = new RegExp(`(?<![A-Za-z'-])(${alternation(Object.keys(fixedNames))})(?![A-Za-z-])`, "g");
const ghostName = new RegExp(`(?<![A-Za-z'-])(${alternation(Object.keys(ghosts))})の幽霊`, "g");
const orcFullName = /(?<![A-Za-z'-])([A-Z][a-z-]*) of ([A-Z][a-z-]*)(?![A-Za-z-])/g;

/** The same sentence with its generated names in katakana, ready to translate. */
export function withKatakanaNames(text: string): string {
  if (!/[A-Z]/.test(text)) return text;
  return text
    .replace(orcFullName, (all: string, name: string, gang: string) => {
      const shownName = orcName(name), shownGang = orcName(gang);
      return shownName === undefined || shownGang === undefined ? all : `${shownGang}の${shownName}`;
    })
    .replace(fixedName, (_all, name: string) => fixedNames[name])
    .replace(ghostName, (_all, name: string) => `${ghosts[name]}の幽霊`);
}

/** Replace the game's generated names in a finished rendering. */
export function withJapaneseProperNames(text: string): string {
  return withKatakanaNames(text).replace(/(?<=[ァ-ヶー])'s(?![a-z]) ?/g, "の");
}
