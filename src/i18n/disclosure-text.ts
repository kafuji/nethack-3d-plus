// End-of-game disclosure and enlightenment lines (insight.c) that NetHack
// assembles from pieces. Role, rank, race, deity, skill and status words are
// the ones the rest of the interface uses.
import { translateStartupCharacterOption } from "./startup-character";
import { translatePlayerRank } from "./player-title";
import { translateSkillName } from "./game-skills";
import { deityNames } from "./intro-story";
import { translateMessageArgument } from "./nethack5-source-messages";

type Rule = readonly [RegExp, (...captures: string[]) => string | undefined];

const raceAdjectives: Readonly<Record<string, string>> = {
  human: "human", elven: "elf", elvish: "elf", dwarven: "dwarf", dwarvish: "dwarf", gnomish: "gnome", orcish: "orc",
};
const alignmentAdverbs: Readonly<Record<string, string>> = {
  currently: "一時的に", temporarily: "一時的に", now: "今は", belatedly: "今は", nominally: "名目上",
};
const pietyWords: Readonly<Record<string, string>> = {
  piously: "敬虔に", devoutly: "篤く", fervently: "熱心に", stridently: "声高に",
  haltingly: "たどたどしく", nominally: "形ばかり", insufficiently: "不十分に",
};
const hungerStates: Readonly<Record<string, string>> = {
  "not hungry": "空腹ではなかった", hungry: "空腹だった", satiated: "満腹だった",
  "weak from severe hunger": "ひどい空腹で衰弱していた", "fainting due to starvation": "飢えで気絶寸前だった",
  "fainted due to starvation": "飢えで気絶していた",
};
const loads: Readonly<Record<string, string>> = {
  burdened: "重荷", stressed: "圧迫", strained: "限界", overtaxed: "過負荷", overloaded: "超過",
};
const wards: Readonly<Record<string, string>> = { warded: "わずかに", guarded: "", protected: "しっかりと" };
for (const table of [raceAdjectives, alignmentAdverbs, pietyWords, hungerStates, loads, wards]) Object.setPrototypeOf(table, null);

const word = (value: string): string => translateStartupCharacterOption(value, "ja");
const rank = (value: string): string => translatePlayerRank(value, "ja");
const deity = (value: string): string => (Object.prototype.hasOwnProperty.call(deityNames, value) ? deityNames[value] : value);
const past = (verb: string): boolean => !/^(?:is|are|have|has|contains|can)$/.test(verb);
/** Present or past tense ending chosen by the English verb. */
const tense = (verb: string, present: string, pastForm: string): string => (past(verb) ? pastForm : present);
/** A present-tense state from its past form ("空腹だった" -> "空腹だ"). */
const now = (state: string): string => state.replace(/だった$/, "だ").replace(/ていた$/, "ている").replace(/ではなかった$/, "ではない");

const rules: readonly Rule[] = [
  // "You were a Rhizotomist, a level 1 male human Healer."
  [/^You (are|were) an? (.+?), a level (\d+) (?:(male|female|neuter) )?(\S+) (.+?)\.$/, (verb, title, level, gender, race, role) => {
    const adjective = raceAdjectives[race.toLowerCase()];
    if (!adjective) return undefined;
    return `あなたはレベル${level}の${gender ? `${word(gender)}の` : ""}${word(adjective)}の${word(role)}、${rank(title)}${tense(verb, "だ", "だった")}。`;
  }],
  // A rank title equal to the role: "You were a Samurai, level 1 male human."
  [/^You (are|were) an? (.+?), level (\d+) (?:(male|female|neuter) )?(\S+)\.$/, (verb, title, level, gender, race) =>
    `あなたはレベル${level}の${gender ? `${word(gender)}の` : ""}${word(race)}の${rank(title)}${tense(verb, "だ", "だった")}。`],
  // "You were neutral, on a mission for Hermes" (no closing period).
  [/^You (are|were) (lawful|neutral|chaotic|unaligned), (?:(currently|temporarily|now|belatedly|nominally) )?on a mission for (.+?)\.?$/, (verb, alignment, adverb, god) =>
    `あなたは${adverb ? alignmentAdverbs[adverb] : ""}${word(alignment)}で、${deity(god)}のために使命を果たして${tense(verb, "いる", "いた")}。`],
  // " who was opposed by Athena (lawful) and Poseidon (chaotic)."
  [/^who (is|was) opposed by (.+?) \((\w+)\)(?: and (.+?) \((\w+)\))?\.$/, (verb, first, firstAlignment, second, secondAlignment) =>
    `${deity(first)}（${word(firstAlignment)}）${second ? `と${deity(second)}（${word(secondAlignment)}）` : ""}がその敵${tense(verb, "だ", "だった")}。`],
  [/^You (have|had) (?:all (\d+)|(\d+) out of (\d+)) hit points?\.$/, (verb, all, hp, max) =>
    `HPは${all || hp}（最大${all || max}）${tense(verb, "だ", "だった")}。`],
  [/^You (have|had) (?:all (\d+)|(both)|(no)|(\d+) out of (\d+)) energy points \(spell power\)\.$/, (verb, all, both, none, pw, max) => {
    const [value, limit] = all ? [all, all] : both ? ["2", "2"] : none ? ["0", "0"] : [pw, max];
    return `魔力は${value}（最大${limit}）${tense(verb, "だ", "だった")}。`;
  }],
  // "You had 0 experience points, 20 were needed to attain level 2."
  [/^You (have|had) (\d+) experience points?(?:, (\d+) (?:more )?(?:(?:was|were) )?needed (?:to attain|for) level (\d+))?\.$/, (verb, points, more, level) =>
    `経験値は${points}${more ? `で、レベル${level}まであと${more}` : ""}${tense(verb, "だ", "だった")}。`],
  [/^Your score (is|was) (-?\d+)( before end-of-game adjustments)?\.$/, (verb, score, before) =>
    `スコアは${before ? "ゲーム終了時の加算前で" : ""}${score}${tense(verb, "だ", "だった")}。`],
  [/^It (is|was) nighttime\.$/, (verb) => `${tense(verb, "今は夜だ", "夜だった")}。`],
  // "Autopickup was on for '$' plus thrown, with exceptions."
  [/^Autopickup (is|was) (?:(off)|on for (all types|'[^']*')( plus thrown)?(, with exceptions)?)\.$/, (verb, off, types, thrown, exceptions) => {
    if (off) return `自動拾いはオフ${tense(verb, "だ", "だった")}。`;
    const what = `${types === "all types" ? "すべての種類" : types}${thrown ? "と投げた物" : ""}`;
    return `自動拾いは${what}に対してオン${exceptions ? "（例外あり）" : ""}${tense(verb, "だ", "だった")}。`;
  }],
  [/^You (are|were) wielding (.+?)\.$/, (verb, item) => {
    const name = translateMessageArgument(item);
    return name !== item ? `${name}を構えて${tense(verb, "いる", "いた")}。` : undefined;
  }],
  // "You had basic skill with knife." / "You were unskilled in dagger."
  [/^You (?:(have|had) (no|basic|expert|master|grand master) skill with|(are|were) (unskilled|skilled) in) (.+?)\.$/, (have, level, are, levelIn, skill) => {
    const name = translateSkillName(skill, "ja");
    if (name === skill) return undefined;
    const shown = level === "no" ? "なし" : translateSkillName(level || levelIn, "ja");
    return `${name}の技能は${shown}${tense(have || are, "だ", "だった")}。`;
  }],
  [/^You (are|were) (piously|devoutly|fervently|stridently|haltingly|nominally|insufficiently) aligned\.$/, (verb, piety) =>
    `あなたは${pietyWords[piety]}信仰して${tense(verb, "いる", "いた")}。`],
  [/^You (are|were) (normally )?(right|left)-handed\.$/, (verb, normally, hand) =>
    `あなたは${normally ? "本来は" : ""}${hand === "right" ? "右" : "左"}利き${tense(verb, "だ", "だった")}。`],
  [/^Your wallet (contains|contained) (\d+) zorkmids?\.$/, (verb, amount) =>
    `財布には${amount}ゾークミド入って${tense(verb, "いる", "いた")}。`],
  // Magic cancellation from worn armor.
  [/^You (are|were) (warded|guarded|protected)\.$/, (verb, ward) =>
    `あなたは魔法から${wards[ward]}守られて${tense(verb, "いる", "いた")}。`],
  // Hunger: "You weren't hungry." / "You were weak from severe hunger."
  [/^You (?:(are|were) (not hungry|hungry|satiated|weak from severe hunger|fainting due to starvation|fainted due to starvation)|(aren't|weren't) hungry)\.$/, (verb, state, negated) => {
    const shown = hungerStates[negated ? "not hungry" : state];
    return `あなたは${past(negated === "aren't" ? "are" : negated ? "were" : verb) ? shown : now(shown)}。`;
  }],
  [/^You (are|were) unencumbered\.$/, (verb) => `荷物は重く${tense(verb, "ない", "なかった")}。`],
  // "You were burdened; movement was slightly slowed."
  [/^You (are|were) (burdened|stressed|strained|overtaxed|overloaded); movement (?:is|was) .+?\.$/, (verb, load) =>
    `荷物の重さは「${loads[load]}」で、動きが遅くなって${tense(verb, "いる", "いた")}。`],
  [/^The stairs are solidly fixed to the floor\.$/, () => "階段は床にしっかりと固定されている。"],
];

/** One disclosure or enlightenment sentence, or undefined when it is not one. */
export function translateDisclosureLine(sentence: string): string | undefined {
  for (const [pattern, render] of rules) {
    const match = pattern.exec(sentence);
    if (!match) continue;
    const result = render(...match.slice(1).map((value) => value ?? ""));
    if (result !== undefined) return result;
  }
  return undefined;
}
