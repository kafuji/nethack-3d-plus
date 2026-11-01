// Hand-written rules for frequent messages that NetHack assembles at runtime
// (verbs picked in code, so they are not captured as JNetHack templates).
// Wording follows JNetHack's uhitm.c / mhitu.c / mon.c / invent.c.

export interface CoreRuleContext {
  /** Translate a noun phrase (monster/object/pronoun), returning it unchanged if unknown. */
  noun(text: string): string;
  /** Map ".", "!" or "?" to full-width Japanese punctuation. */
  punct(mark: string): string;
}

export interface CoreRule {
  readonly pattern: RegExp;
  translate(match: RegExpExecArray, context: CoreRuleContext): string | null;
}

/** Only accept a rule when the noun translated or is a proper name (e.g. a pet). */
function known(context: CoreRuleContext, text: string): string | null {
  const ja = context.noun(text);
  if (ja !== text) return ja;
  return /^[A-Z][a-z'-]+(?: [A-Z][a-z'-]+)*$/.test(text.trim()) && !/^(?:The|A|An|It|You)\b/.test(text.trim())
    ? text.trim()
    : null;
}

const monsterHitVerbs: Readonly<Record<string, string>> = {
  bites: "は噛みついた",
  kicks: "は蹴とばした",
  stings: "は突きさした",
  butts: "は頭突きをくらわした",
  "touches you": "はあなたに触れた",
  explodes: "は爆発した",
  hits: "の攻撃は命中した",
  "tentacles suck you": "の触手があなたの体液を吸いとった",
};

// Role/race/alignment words in the welcome message (JNetHack role.c).
const characterWords: Readonly<Record<string, string>> = {
  lawful: "秩序の", neutral: "中立の", chaotic: "混沌の", unaligned: "無心の",
  male: "男性の", female: "女性の",
  human: "人間の", elven: "エルフの", elf: "エルフの", dwarvish: "ドワーフの", dwarven: "ドワーフの", dwarf: "ドワーフの",
  gnomish: "ノームの", gnome: "ノームの", orcish: "オークの", orc: "オークの",
  archeologist: "考古学者", barbarian: "野蛮人", caveman: "洞窟人", cavewoman: "洞窟人",
  healer: "薬師", knight: "騎士", monk: "武闘家", priest: "僧侶", priestess: "尼僧",
  ranger: "レンジャー", rogue: "盗賊", samurai: "侍", tourist: "観光客",
  valkyrie: "ワルキューレ", wizard: "魔法使い",
};

function own<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

function describeCharacter(text: string): string {
  const words = text.trim().split(/\s+/);
  if (!words.every((word) => own(characterWords, word.toLowerCase()))) return text;
  return words.map((word) => characterWords[word.toLowerCase()]).join("");
}

// getobj() verbs (JNetHack japanese/jlib.c trans_verb_list, polite form).
const getobjVerbs: Readonly<Record<string, readonly [string, string]>> = {
  adjust: ["どれ", "を調整します"],
  call: ["どれ", "を呼びます"],
  charge: ["どれ", "を充填します"],
  destroy: ["どれ", "を壊します"],
  "dip into": ["どれ", "に浸します"],
  dip: ["どれ", "を浸します"],
  drink: ["どれ", "を飲みます"],
  drop: ["どれ", "を置きます"],
  eat: ["どれ", "を食べます"],
  grease: ["どれ", "に塗ります"],
  identify: ["どれ", "を識別します"],
  invoke: ["ど", "の魔力を使います"],
  name: ["どれ", "を名づけます"],
  open: ["どれ", "を開けます"],
  "put on": ["どれ", "を身につけます"],
  read: ["どれ", "を読みます"],
  ready: ["どれ", "を装填します"],
  remove: ["どれ", "をはずします"],
  rub: ["どれ", "をこすります"],
  "rub on the stone": ["どれ", "を石でこすります"],
  sacrifice: ["どれ", "を捧げます"],
  split: ["どれ", "を分割します"],
  stash: ["どれ", "を入れます"],
  "take off": ["ど", "の装備を解きます"],
  throw: ["どれ", "を投げます"],
  tin: ["どれ", "を缶詰めにします"],
  tip: ["どれ", "をひっくり返します"],
  "untrap with": ["どれ", "を使って解除します"],
  "use or apply": ["どれ", "を使います"],
  wear: ["どれ", "を身につけます"],
  wield: ["どれ", "を手にします"],
  "write on": ["どれ", "に書きます"],
  "write with": ["どれ", "を使って書きます"],
  zap: ["どれ", "を振りかざします"],
  fire: ["どれ", "を発射します"],
  quaff: ["どれ", "を飲みます"],
};

// Shop type names (JNetHack shknam.c).
const shopTypes: Readonly<Record<string, string>> = {
  "general store": "雑貨屋",
  "used armor dealership": "中古鎧商会",
  "second-hand bookstore": "古書店",
  "liquor emporium": "お酒の百貨店",
  "antique weapons outlet": "古武器専門小売店",
  delicatessen: "食品店",
  jewelers: "宝石店",
  "quality apparel and accessories": "おシャレな洋品店",
  "hardware store": "道具屋",
  "rare books": "稀覯書店",
  "health food store": "健康食品の店",
  "lighting store": "照明店",
};

// Hunger and load messages (JNetHack eat.c / pickup.c).
const fixedMessages: Readonly<Record<string, string>> = {
  "You are beginning to feel hungry.": "あなたは空腹感をおぼえはじめた．",
  "You feel hungry.": "あなたは空腹感を感じた．",
  "You only feel hungry now.": "あなたは単に腹ペコ状態になった．",
  "You are beginning to feel weak.": "あなたは衰弱してきたように感じた．",
  "You feel weak.": "あなたは衰弱してきた．",
  "You are still weak.": "あなたはまだ衰弱状態だ．",
  "You are getting the munchies.": "あなたはハラヘリヘリハラ．",
  "In what direction?": "どの方向？",
  "The door is closed.": "扉は閉まっている．",
  "This door is locked.": "この扉には鍵が掛かっている．",
  // End-of-game prompts and headings (JNetHack end.c / insight.c / do.c).
  "Beware, there will be no return! Still climb?": "気をつけろ，戻れないぞ！それでも上る？",
  "Do you want to see your attributes?": "属性を見ますか？",
  "Do you want to see the dungeon overview?": "迷宮の概要を見ますか？",
  "Do you want to see your conduct?": "自発的挑戦を見ますか？",
  "Do you want to see your conduct and achievements?": "自発的挑戦と達成を見ますか？",
  "Final Attributes:": "最終属性:",
  "Final Status:": "最終状態:",
  "Final Characteristics:": "最終特性：",
  "Attributes:": "属性:",
  "Status:": "状態:",
  "Characteristics:": "特性：",
  "You survived.": "あなたは生き延びた．",
  "Your wallet was empty.": "あなたの財布は空っぽだった．",
  "Your wallet is empty.": "あなたの財布は空っぽだ．",
};

// Characteristic names in end-of-game lines, matching the character sheet.
const characteristicNames: Readonly<Record<string, string>> = {
  strength: "腕力",
  dexterity: "器用さ",
  constitution: "耐久力",
  intelligence: "知性",
  wisdom: "賢さ",
  charisma: "魅力",
};

export const coreGameTextRules: readonly CoreRule[] = [
  {
    pattern: /^.+$/,
    translate: (m) => own(fixedMessages, m[0]) ?? null,
  },
  {
    // insight.c characteristics: "Your strength was 11 (limit:18)."
    pattern: /^Your (strength|dexterity|constitution|intelligence|wisdom|charisma) (is|was) (\S+) \(limit:(\S+)\)\.$/,
    translate: (m) =>
      `あなたの${characteristicNames[m[1]!]}は${m[3]}(上限:${m[4]})${m[2] === "is" ? "である" : "であった"}．`,
  },
  {
    pattern: /^Your armor class (is|was) (-?\d+)\.$/,
    translate: (m) => `あなたのACは${m[2]}${m[1] === "is" ? "である" : "であった"}．`,
  },
  {
    pattern: /^You (?:are|were) in (.+?), on level (\d+)\.$/,
    translate: (m, c) => {
      const dungeon = known(c, m[1]!);
      return dungeon ? `あなたは${dungeon}の地下${m[2]}階にいた．` : null;
    },
  },
  {
    // getobj(): "What do you want to eat? [fg or ?*]"
    pattern: /^What do you want to (.+?)\?(\s*\[.*\])?$/,
    translate: (m) => {
      const verb = getobjVerbs[m[1]!];
      return verb ? `${verb[0]}${verb[1]}か？${m[2]?.trim() ?? ""}` : null;
    },
  },
  {
    // shk.c u_entered_shop(): "Hello, Agent!  Welcome to Asidonhopo's general store!"
    pattern: /^"?(Hello|Good day|Good morning|Good evening|Aloha|Salutations|Konnichi wa|Velkommen|Greetings), (.+?)! Welcome( again)? to (.+?)'s? (.+?)!"?$/,
    translate: (m) => {
      const shop = shopTypes[m[5]!];
      if (!shop) return null;
      const hello = m[1] === "Konnichi wa" ? "こんにちは" : m[1] === "Velkommen" ? "ようこそ" : "こんにちは";
      return `「${hello}${m[2]}！${m[4]}の${shop}に${m[3] ? "また来ましたね" : "ようこそ"}！」`;
    },
  },
  {
    pattern: /^You have (a little trouble|trouble) lifting (.+?)\.$/,
    translate: (m, c) => {
      const item = known(c, m[2]!);
      return item ? `${item}を持ったら${m[1] === "trouble" ? "" : "少し"}ふらついた．` : null;
    },
  },
  {
    pattern: /^You stop eating (.+?)\.$/,
    translate: (m, c) => {
      const item = known(c, m[1]!);
      return item ? `あなたは${item}を食べるのを中断した．` : null;
    },
  },
  {
    // dog_eat(): "Your kitten eats a fox corpse."
    pattern: /^(.+?) eats (.+?)\.$/,
    translate: (m, c) => {
      const eater = known(c, m[1]!.replace(/^your /i, ""));
      const food = known(c, m[2]!);
      return eater && food ? `${eater}は${food}を食べた．` : null;
    },
  },
  {
    pattern: /^You finish eating (.+?)\.$/,
    translate: (m, c) => {
      const item = known(c, m[1]!);
      return item ? `あなたは${item}を食べ終えた．` : null;
    },
  },
  {
    pattern: /^This (.+?) is delicious!$/,
    translate: (m, c) => {
      const item = known(c, m[1]!);
      return item ? `この${item}はとてもおいしい！` : null;
    },
  },
  {
    pattern: /^You are now wielding (.+?)\.$/,
    translate: (m, c) => {
      const item = known(c, m[1]!);
      return item ? `あなたは${item}を装備した．` : null;
    },
  },
  {
    // Gold pickup notice: "2 gold pieces."
    pattern: /^(\d+) gold pieces?\.$/,
    translate: (m) => `${m[1]}枚の金貨．`,
  },
  {
    // Pet or monster kills another monster.
    pattern: /^(.+?) (kills|destroys) (.+?)[.!]$/,
    translate: (m, c) => {
      const killer = known(c, m[1]!);
      const victim = known(c, m[3]!);
      return killer && victim ? `${killer}は${victim}を${m[2] === "kills" ? "倒した" : "破壊した"}．` : null;
    },
  },
  {
    pattern: /^You read: "(.+)"\.$/,
    translate: (m) => `あなたは読んだ：「${m[1]}」．`,
  },
  {
    // You hit the jackal!  / You smite the newt.
    pattern: /^You (?:hit|smite|bash|lash|strike) (.+?)([.!])$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `あなたの${target}への攻撃は命中した${c.punct(m[2]!)}` : null;
    },
  },
  {
    // mhitu.c mswings(): "The gnome lord swings his crossbow."
    pattern: /^(.+?) (swings|thrusts|lashes|bashes with) (?:one of )?(?:his|her|its|their) (.+?)\.$/,
    translate: (m, c) => {
      const attacker = known(c, m[1]!);
      const weapon = known(c, m[3]!);
      const verb = { swings: "を振りまわした", thrusts: "を突いた", lashes: "を叩いた", "bashes with": "をなぐりつけた" }[
        m[2] as "swings"
      ];
      return attacker && weapon ? `${attacker}は${weapon}${verb}．` : null;
    },
  },
  {
    // mon.c mon_givit(): intrinsics a monster gains from eating (untranslated
    // in JNetHack itself).
    pattern: /^(.+?) (shivers slightly|looks quite warm|looks wide awake|looks very firm|crackles with static electricity|looks healthy)\.$/,
    translate: (m, c) => {
      const monster = known(c, m[1]!);
      const effects: Readonly<Record<string, string>> = {
        "shivers slightly": "は少し身震いした",
        "looks quite warm": "はとても暖かそうだ",
        "looks wide awake": "はすっかり目が覚めているようだ",
        "looks very firm": "はとても引き締まって見える",
        "crackles with static electricity": "は静電気でパチパチしている",
        "looks healthy": "は健康そうだ",
      };
      return monster ? `${monster}${effects[m[2]!]}．` : null;
    },
  },
  {
    // trap.c: monsters escaping traps (untranslated in JNetHack itself).
    pattern: /^(.+?) climbs (easily )?out of the pit\.$/,
    translate: (m, c) => {
      const monster = known(c, m[1]!);
      return monster ? `${monster}は${m[2] ? "楽々と" : ""}落し穴から這い出た．` : null;
    },
  },
  {
    pattern: /^(.+?) pulls free of the (.+?)\.$/,
    translate: (m, c) => {
      const monster = known(c, m[1]!);
      const trap = known(c, m[2]!);
      return monster && trap ? `${monster}は${trap}から抜け出した．` : null;
    },
  },
  {
    // priest.c intemple(): entering a tended temple.
    pattern: /^You experience (a|an unusual) sense of peace\.$/,
    translate: (m) => `あなたは${m[1] === "a" ? "" : "いつになく"}満ち足りた気持ちになった．`,
  },
  {
    pattern: /^You have a( strange)? forbidding feeling\.\.\.$/,
    translate: (m) => `あなたは${m[1] ? "奇妙な" : ""}近づきがたい気持がした．．．`,
  },
  {
    pattern: /^Pilgrim, you enter a (sacred|desecrated) place!$/,
    translate: (m) => `巡礼者よ，おまえは${m[1] === "sacred" ? "神聖なる" : "不浄の"}地にいる！`,
  },
  {
    pattern: /^You miss (.+?)\.$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `あなたの${target}への攻撃は外れた．` : null;
    },
  },
  {
    pattern: /^You (kill|destroy) (.+?)!$/,
    translate: (m, c) => {
      const target = known(c, m[2]!);
      return target ? `あなたは${target}を${m[1] === "kill" ? "倒した" : "破壊した"}！` : null;
    },
  },
  {
    // The jackal bites!  The newt bites again.
    pattern: /^(.+?) (bites|kicks|stings|butts|touches you|explodes|hits|tentacles suck you)(?: again)?([.!])$/,
    translate: (m, c) => {
      const attacker = known(c, m[1]!.replace(/'s$/, ""));
      return attacker ? `${attacker}${monsterHitVerbs[m[2]!]}${c.punct(m[3]!)}` : null;
    },
  },
  {
    // mhitm.c: "The little dog bites the jackal."
    pattern: /^(.+?) (bites|stings|butts|touches|squeezes|hits|misses) (.+?)([.!])$/,
    translate: (m, c) => {
      if (/^you$/i.test(m[3]!)) return null;
      const attacker = known(c, m[1]!);
      const defender = known(c, m[3]!);
      if (!attacker || !defender) return null;
      const verbs: Readonly<Record<string, string>> = {
        bites: `は${defender}に噛みついた`,
        stings: `は${defender}を突きさした`,
        butts: `は${defender}に頭突きをくらわした`,
        touches: `は${defender}に触れた`,
        squeezes: `は${defender}を絞めた`,
        hits: `の${defender}への攻撃は命中した`,
        misses: `の${defender}への攻撃ははずれた`,
      };
      return `${attacker}${verbs[m[2]!]}${c.punct(m[4]!)}`;
    },
  },
  {
    pattern: /^(.+?) (just )?misses(?: you)?[.!]$/,
    translate: (m, c) => {
      const attacker = known(c, m[1]!);
      return attacker ? `${attacker}の攻撃は${m[2] ? "空を切っ" : "はずれ"}た！` : null;
    },
  },
  {
    pattern: /^(.+?) (?:dies|is killed)!$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `${target}は死んだ！` : null;
    },
  },
  {
    pattern: /^(.+?) is destroyed!$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `${target}は破壊された！` : null;
    },
  },
  {
    // look_here(): "You see here a dagger." / "You feel here ..."
    pattern: /^You (see|feel) here (.+?)\.$/,
    translate: (m, c) => {
      const item = known(c, m[2]!);
      return item ? `${m[1] === "see" ? "" : "手探りで調べると，"}ここには${item}がある．` : null;
    },
  },
  {
    pattern: /^There (?:is|are) (.+?) here\.$/,
    translate: (m, c) => {
      const item = known(c, m[1]!);
      return item ? `ここには${item}がある．` : null;
    },
  },
  {
    // Pickup / inventory notice: "f - an uncursed scroll labeled FOO."
    pattern: /^([A-Za-z$#&]) - (.+?)\.?$/,
    translate: (m, c) => {
      const item = known(c, m[2]!);
      return item ? `${m[1]} - ${item}．` : null;
    },
  },
  {
    pattern: /^You see no objects here\.$/,
    translate: () => "ここには何もない．",
  },
  {
    pattern: /^Things that are here:$/,
    translate: () => "ここにある物：",
  },
  {
    pattern: /^Things that you feel here:$/,
    translate: () => "手探りで調べると，ここにある物：",
  },
  {
    // allmain.c welcome_message()
    pattern: /^(?:Hello|Aloha|Salutations|Konnichi wa|Velkommen|Greetings) (.+?), welcome to NetHack! You are an? (.+?)\.$/,
    translate: (m) => `こんにちは${m[1]}，NetHackの世界へ！このゲームではあなたは${describeCharacter(m[2]!)}だ．`,
  },
  {
    pattern: /^(?:Hello|Aloha|Salutations|Konnichi wa|Velkommen|Greetings) (.+?), the (.+?), welcome back to NetHack!$/,
    translate: (m) => `こんにちは${m[1]}，NetHackの世界へ！あなたは${describeCharacter(m[2]!)}だ．`,
  },
  {
    pattern: /^Be careful! New moon tonight\.$/,
    translate: () => "注意しろ！今晩は新月だ．",
  },
  {
    pattern: /^Unknown command '(.+?)'\.$/,
    translate: (m) => `'${m[1]}'コマンド？`,
  },
  {
    pattern: /^Never mind\.$/,
    translate: () => "気にしないで．",
  },
  {
    pattern: /^You stop\. (.+?) is in your way\.$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `あなたは止まった．${target}が道にいる．` : null;
    },
  },
  {
    pattern: /^You displace (.+?)\.$/,
    translate: (m, c) => {
      // "あなたは" already names the player, so drop "your" from the pet.
      const target = known(c, m[1]!.replace(/^your /i, ""));
      return target ? `あなたは${target}と場所を入れ替わった．` : null;
    },
  },
  {
    pattern: /^You swap places with (.+?)\.$/,
    translate: (m, c) => {
      // "あなたは" already names the player, so drop "your" from the pet.
      const target = known(c, m[1]!.replace(/^your /i, ""));
      return target ? `あなたは${target}と場所を入れ替わった．` : null;
    },
  },
  {
    pattern: /^(.+?) is in your way\.$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `道の途中に${target}がいる．` : null;
    },
  },
];
