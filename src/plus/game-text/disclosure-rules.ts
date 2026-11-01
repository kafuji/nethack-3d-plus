// End-of-game disclosure and enlightenment lines (insight.c) that NetHack
// assembles from pieces. Wording follows JNetHack's insight.c; role, rank,
// race, deity and skill names reuse the project's curated vocabulary
// (src/i18n) so they match the rest of the interface.
import type { CoreRule } from "./core-rules";
import { translateStartupCharacterOption } from "../../i18n/startup-character";
import { translatePlayerRank } from "../../i18n/player-title";
import { translateSkillName } from "../../i18n/game-skills";
import { deityNames } from "../../i18n/intro-story";

const raceAdjectives: Readonly<Record<string, string>> = {
  human: "human",
  elven: "elf",
  elvish: "elf",
  dwarven: "dwarf",
  dwarvish: "dwarf",
  gnomish: "gnome",
  orcish: "orc",
};

const word = (value: string): string => translateStartupCharacterOption(value, "ja");
const rank = (value: string): string => translatePlayerRank(value, "ja");
const deity = (value: string): string => deityNames[value] ?? value;
/** Present vs past tense ending chosen by the English verb. */
const tense = (verb: string, present: string, past: string): string =>
  /^(?:is|are|have|has|contains|can)$/.test(verb) ? present : past;

const alignmentAdverbs: Readonly<Record<string, string>> = {
  currently: "一時的に",
  temporarily: "一時的に",
  now: "現在",
  belatedly: "現在",
  nominally: "名義上",
};

const pietyWords: Readonly<Record<string, string>> = {
  piously: "敬虔な",
  devoutly: "信心深い",
  fervently: "熱心な",
  stridently: "大げさな",
  haltingly: "不完全な",
  nominally: "形だけの",
  insufficiently: "不十分な",
};
// Text such as "constructor" must not find Object.prototype members.
for (const table of [raceAdjectives, alignmentAdverbs, pietyWords]) Object.setPrototypeOf(table, null);

export const disclosureRules: readonly CoreRule[] = [
  {
    // "You were a Rhizotomist, a level 1 male human Healer."
    pattern: /^You (are|were) an? (.+?), a level (\d+) (?:(male|female|neuter) )?(\S+) (.+?)\.$/,
    translate: (m) => {
      const race = raceAdjectives[m[5]!.toLowerCase()];
      if (!race) return null;
      const gender = m[4] ? `${word(m[4])}の` : "";
      return `あなたはレベル${m[3]}の${gender}${word(race)}の${word(m[6]!)}の${rank(m[2]!)}${tense(m[1]!, "である", "であった")}．`;
    },
  },
  {
    // Rank title equal to the role: "You were a Samurai, level 1 male human."
    pattern: /^You (are|were) an? (.+?), level (\d+) (?:(male|female|neuter) )?(\S+)\.$/,
    translate: (m) => {
      const gender = m[4] ? `${word(m[4])}の` : "";
      return `あなたはレベル${m[3]}の${gender}${word(m[5]!)}の${rank(m[2]!)}${tense(m[1]!, "である", "であった")}．`;
    },
  },
  {
    // "You were neutral, on a mission for Hermes" (no closing period).
    pattern: /^You (are|were) (lawful|neutral|chaotic|unaligned), (?:(currently|temporarily|now|belatedly|nominally) )?on a mission for (.+?)\.?$/,
    translate: (m) =>
      `あなたは${word(m[2]!)}で、${m[3] ? alignmentAdverbs[m[3]] : ""}${deity(m[4]!)}のための任務を行って${tense(m[1]!, "いる", "いた")}．`,
  },
  {
    // " who was opposed by Athena (lawful) and Poseidon (chaotic)."
    pattern: /^who (is|was) opposed by (.+?) \((\w+)\)(?: and (.+?) \((\w+)\))?\.$/,
    translate: (m) => {
      const first = `${deity(m[2]!)}(${word(m[3]!)})`;
      const second = m[4] ? `および${deity(m[4])}(${word(m[5]!)})` : "";
      return `あなたは${first}${second}と対立して${tense(m[1]!, "いる", "いた")}．`;
    },
  },
  {
    pattern: /^You (have|had) (?:all (\d+)|(\d+) out of (\d+)) hit points?\.$/,
    translate: (m) => {
      const hp = m[2] ?? m[3];
      const max = m[2] ?? m[4];
      return `あなたは${hp}ヒットポイント(最大:${max})をもって${tense(m[1]!, "いる", "いた")}．`;
    },
  },
  {
    pattern: /^You (have|had) (?:all (\d+)|(both)|(no)|(\d+) out of (\d+)) energy points \(spell power\)\.$/,
    translate: (m) => {
      const [pw, max] = m[2] ? [m[2], m[2]] : m[3] ? ["2", "2"] : m[4] ? ["0", "0"] : [m[5], m[6]];
      return `あなたは${pw}魔力ポイント(最大:${max})をもって${tense(m[1]!, "いる", "いた")}．`;
    },
  },
  {
    // "You had 0 experience points, 20 were needed to attain level 2."
    pattern: /^You (have|had) (\d+) experience points?(?:, (\d+) (?:more )?(?:(?:was|were) )?needed (?:to attain|for) level (\d+))?\.$/,
    translate: (m) => {
      const next = m[3] ? `(レベル${m[4]}まで${m[3]}ポイント)` : "";
      return `あなたは経験値${m[2]}ポイント${next}をもって${tense(m[1]!, "いる", "いた")}．`;
    },
  },
  {
    pattern: /^Your score (is|was) (-?\d+)( before end-of-game adjustments)?\.$/,
    translate: (m) =>
      `あなたのスコアは${m[3] ? "ゲーム終了時の調整前は" : ""}${m[2]}${tense(m[1]!, "である", "であった")}．`,
  },
  {
    pattern: /^It (is|was) nighttime\.$/,
    translate: (m) => `時間帯は夜${tense(m[1]!, "だ", "だった")}．`,
  },
  {
    // "Autopickup was on for '$' plus thrown, with exceptions."
    pattern: /^Autopickup (is|was) (?:(off)|on for (all types|'[^']*')( plus thrown)?(, with exceptions)?)\.$/,
    translate: (m) => {
      const setting = m[2]
        ? "オフ"
        : `${m[3] === "all types" ? "全ての種類" : m[3]}${m[4] ? "に加えて投げるもの" : ""}${m[5] ? "(例外あり)" : ""}に対してオン`;
      return `自動拾い設定は${setting}${tense(m[1]!, "である", "であった")}．`;
    },
  },
  {
    pattern: /^You (are|were) wielding (.+?)\.$/,
    translate: (m, c) => {
      const item = c.noun(m[2]!);
      return item !== m[2] ? `あなたは${item}を装備して${tense(m[1]!, "いる", "いた")}．` : null;
    },
  },
  {
    // "You had basic skill with knife." / "You were unskilled in dagger."
    pattern: /^You (?:(have|had) (no|basic|expert|master|grand master) skill with|(are|were) (unskilled|skilled) in) (.+?)\.$/,
    translate: (m) => {
      const verb = m[1] ?? m[3]!;
      const level = m[2] === "no" ? "制限" : translateSkillName(m[2] ?? m[4]!, "ja");
      const skill = translateSkillName(m[5]!, "ja");
      if (skill === m[5]) return null;
      return `あなたは${skill}の${level}スキルをもって${tense(verb, "いる", "いた")}．`;
    },
  },
  {
    pattern: /^You (are|were) (piously|devoutly|fervently|stridently|haltingly|nominally|insufficiently) aligned\.$/,
    translate: (m) => `あなたは${pietyWords[m[2]!]}信仰心をもって${tense(m[1]!, "いる", "いた")}．`,
  },
  {
    pattern: /^You (are|were) (normally )?(right|left)-handed\.$/,
    translate: (m) =>
      `あなたは${m[2] ? "通常" : ""}${m[3] === "right" ? "右" : "左"}利き${tense(m[1]!, "である", "であった")}．`,
  },
  {
    pattern: /^Your wallet (contains|contained) (\d+) zorkmids?\.$/,
    translate: (m) => `あなたの財布には${m[2]}ゾークミド入って${tense(m[1]!, "いる", "いた")}．`,
  },
  {
    // Magic cancellation from worn armor (JNetHack you_are_ing()).
    pattern: /^You (are|were) (warded|guarded|protected)\.$/,
    translate: (m) => {
      const state = { warded: "衛られて", guarded: "護られて", protected: "守られて" }[m[2] as "warded"];
      return `あなたは${state}${tense(m[1]!, "いる", "いた")}．`;
    },
  },
  {
    // Hunger: "You weren't hungry." / "You were weak from severe hunger."
    pattern: /^You (?:(are|were) (not hungry|hungry|satiated|weak from severe hunger|fainting due to starvation|fainted due to starvation)|(aren't|weren't) hungry)\.$/,
    translate: (m) => {
      const verb = m[1] ?? (m[3] === "aren't" ? "are" : "were");
      const state = m[3]
        ? "空腹でない"
        : ({
            "not hungry": "空腹でない",
            hungry: "ぺこぺこ",
            satiated: "満腹",
            "weak from severe hunger": "衰弱",
            "fainting due to starvation": "ふらふら",
            "fainted due to starvation": "卒倒",
          } as Record<string, string>)[m[2]!];
      return `あなたは${state}状態${tense(verb, "である", "であった")}．`;
    },
  },
  {
    pattern: /^You (are|were) unencumbered\.$/,
    translate: (m) => `あなたは荷物は邪魔にならない状態${tense(m[1]!, "である", "であった")}．`,
  },
  {
    // "You were burdened; movement was slightly slowed."
    pattern: /^You (are|were) (burdened|stressed|strained|overtaxed|overloaded); movement (?:is|was) .+?\.$/,
    translate: (m) => {
      const load = { burdened: "よろめき", stressed: "圧迫", strained: "限界", overtaxed: "荷重", overloaded: "超過" }[
        m[2] as "burdened"
      ];
      return `あなたは荷物によって${load}状態${tense(m[1]!, "である", "であった")}．`;
    },
  },
  {
    pattern: /^The stairs are solidly fixed to the floor\.$/,
    translate: () => "階段は床にしっかりと固定されている．",
  },
];
