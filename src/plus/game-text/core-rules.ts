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
  human: "人間の", elven: "エルフの", elf: "エルフの", dwarvish: "ドワーフの", dwarf: "ドワーフの",
  gnomish: "ノームの", gnome: "ノームの", orcish: "オークの", orc: "オークの",
  archeologist: "考古学者", barbarian: "野蛮人", caveman: "洞窟人", cavewoman: "洞窟人",
  healer: "薬師", knight: "騎士", monk: "武闘家", priest: "僧侶", priestess: "尼僧",
  ranger: "レンジャー", rogue: "盗賊", samurai: "侍", tourist: "観光客",
  valkyrie: "ワルキューレ", wizard: "魔法使い",
};

function describeCharacter(text: string): string {
  const words = text.trim().split(/\s+/);
  if (!words.every((word) => characterWords[word.toLowerCase()])) return text;
  return words.map((word) => characterWords[word.toLowerCase()]).join("");
}

export const coreGameTextRules: readonly CoreRule[] = [
  {
    // You hit the jackal!  / You smite the newt.
    pattern: /^You (?:hit|smite|bash|lash|strike) (.+?)([.!])$/,
    translate: (m, c) => {
      const target = known(c, m[1]!);
      return target ? `あなたの${target}への攻撃は命中した${c.punct(m[2]!)}` : null;
    },
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
