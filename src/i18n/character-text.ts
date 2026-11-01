import type { SupportedLocale } from "./core";
import { translateInventoryItem } from "./inventory-text";
import { translatePlayerRank } from "./player-title";
import { translateGameLocation } from "./game-location";
import { translateSkillName } from "./game-skills";
import { translateMonsterName } from "./game-monsters";
import { translateCurrency } from "./currency-text";

// Presentation-only translations for NetHack's enlightenment and SLASH'EM
// base-attributes windows. The unmodified input remains authoritative for
// parsing, highlighting, severity, choices and saved state.
const labels: Readonly<Record<string, string>> = {
  Name: "名前", Role: "職業", Race: "種族", Gender: "性別", Alignment: "属性", Deity: "神",
  Title: "称号", Level: "レベル", Strength: "筋力", Dexterity: "器用さ", Constitution: "耐久力",
  Intelligence: "知力", Wisdom: "判断力", Charisma: "魅力", Lawful: "秩序", Neutral: "中立", Chaotic: "混沌",
};
const sectionTitles: Readonly<Record<string, string>> = {
  overview: "概要", miscellaneous: "その他", deities: "神々", background: "来歴", basics: "基本情報",
  characteristics: "能力値", status: "状態", attributes: "特性", resistances: "耐性", troubles: "異常状態",
  discoveries: "発見物", conduct: "行動記録", "dungeon overview": "ダンジョンの概要",
  "vanquished creatures": "倒した生き物", "vanquished monsters": "倒したモンスター",
  "current status": "現在の状態", "final status": "最終状態", "current attributes": "現在の特性", "final attributes": "最終的な特性",
  "current characteristics": "現在の能力値", "final characteristics": "最終的な能力値",
};
const values: Readonly<Record<string, string>> = {
  lawful: "秩序", neutral: "中立", chaotic: "混沌", male: "男性", female: "女性", neuter: "中性",
  human: "人間", elf: "エルフ", elven: "エルフ", dwarf: "ドワーフ", dwarven: "ドワーフ", gnome: "ノーム", gnomish: "ノーム", orc: "オーク", orcish: "オーク",
  hobbit: "ホビット", doppelganger: "ドッペルゲンガー", drow: "ダークエルフ", lycanthrope: "獣人", vampire: "吸血鬼",
  Archeologist: "考古学者", Barbarian: "蛮族", Caveman: "原始人", Cavewoman: "原始人", Healer: "治療師", Knight: "騎士", Monk: "僧侶",
  Priest: "司祭", Priestess: "女司祭", Rogue: "盗賊", Ranger: "レンジャー", Samurai: "侍", Tourist: "観光客", Valkyrie: "ワルキューレ", Wizard: "魔法使い",
  "Flame Mage": "炎の魔術師", "Ice Mage": "氷の魔術師", Necromancer: "死霊術師", "Undead Slayer": "アンデッド討伐者", Yeoman: "自作農",
};
const deities: Readonly<Record<string, string>> = {
  Thoth: "トート", Ptah: "プタハ", Anhur: "アンフル", "Amaterasu Omikami": "天照大神", Raijin: "雷神", Susanowo: "スサノオ",
  Tyr: "テュール", Odin: "オーディン", Loki: "ロキ", Anu: "アヌ", Ishtar: "イシュタル", Anshar: "アンシャル", Kos: "コス", Mog: "モグ", Issek: "イセク",
};
const exactLines: Readonly<Record<string, string>> = {
  "You have just started your adventure.": "冒険を始めたばかりです。",
  "Your wallet is empty.": "財布は空です。",
  "Autopickup is off.": "自動拾得はオフです。",
  "Autopickup is on for all types.": "自動拾得はオンです（すべての種類）。",
  "You have no energy points (spell power).": "魔力はありません。",
  "You have both energy points (spell power).": "魔力は 2 / 2 です。",
  "You are unencumbered.": "荷物による負担はありません。",
  "You are burdened; movement is slightly slowed.": "荷物が重く、移動が少し遅くなっています。",
  "You are stressed; movement is moderately slowed.": "荷物がかなり重く、移動が遅くなっています。",
  "You are strained; movement is very slowed.": "荷物が非常に重く、移動がとても遅くなっています。",
  "You are overtaxed; movement is extremely slowed.": "荷物が重すぎて、移動が極めて遅くなっています。",
  "You are overloaded; movement is not possible.": "荷物が重すぎて移動できません。",
  "You are burdened.": "荷物が重くなっています。",
  "You are stressed.": "荷物がかなり重くなっています。",
  "You are strained.": "荷物が非常に重くなっています。",
  "You are overtaxed.": "荷物が重すぎます。",
  "You are overloaded.": "荷物が重すぎて動けません。",
  "You are hungry.": "空腹です。", "You are weak from severe hunger.": "ひどい空腹で衰弱しています。", "You are satiated.": "満腹です。",
  "You aren't hungry.": "空腹ではありません。",
  "You are right-handed.": "右利きです。", "You are left-handed.": "左利きです。",
  "You are piously aligned.": "属性への忠実さは最高です。",
  "You are devoutly aligned.": "属性に深く忠実です。",
  "You are fervently aligned.": "属性に強く忠実です。",
  "You are stridently aligned.": "属性に忠実です。",
  "You are aligned.": "属性に従っています。",
  "You are haltingly aligned.": "属性にわずかに従っています。",
  "You are nominally aligned.": "名目上は属性に従っています。",
  "You have strayed.": "属性の道から外れています。",
  "You have sinned.": "属性に背く罪を犯しています。",
  "You have transgressed.": "属性に大きく背いています。",
  "You are warded.": "装備による特殊攻撃への防護があります（MC：1）。",
  "You are guarded.": "装備による特殊攻撃への防護があります（MC：2）。",
  "You are protected.": "装備による特殊攻撃への防護があります（MC：3）。",
  "You can safely pray.": "安全に祈ることができます。",
  "You can't safely pray.": "今は安全に祈ることができません。",
  "You cannot safely pray.": "今は安全に祈ることができません。",
  "You are not wearing any armor.": "防具を何も着けていません。",
  "You do not wear any armor.": "防具を一切着けていません。",
  "You are blind.": "目が見えません。", "You are temporarily blind.": "一時的に目が見えません。", "You are permanently blind.": "恒久的に目が見えません。", "You are innately blind.": "生まれつき目が見えません。", "You are deliberately blind.": "意図的に目を覆っています。",
  "You are deaf.": "耳が聞こえません。", "You are stunned.": "朦朧としています。", "You are confused.": "混乱しています。", "You are hallucinating.": "幻覚を見ています。",
  "You are nauseated.": "吐き気を催しています。", "You are turning to stone.": "石化しつつあります。", "You are turning into slime.": "スライムに変わりつつあります。", "You are being strangled.": "首を絞められています。",
  "You are terminally sick from illness.": "致命的な病気にかかっています。", "You are terminally sick from food poisoning.": "致命的な食中毒にかかっています。",
  "You are levitating.": "浮遊しています。", "You are flying.": "飛行しています。", "You are underwater.": "水中にいます。", "You are swimming.": "泳いでいます。", "You are in water.": "水の中にいます。", "You are walking on water.": "水上を歩いています。", "You are trapped.": "罠にかかっています。",
  "You are empty handed.": "手に何も持っていません。", "You are bare handed.": "素手です。", "You are not wielding anything.": "何も武器にしていません。", "You are wielding two weapons at once.": "二刀流で武器を持っています。",
  "You are fire resistant.": "火への耐性があります。", "You are cold resistant.": "冷気への耐性があります。", "You are sleep resistant.": "睡眠への耐性があります。", "You are disintegration-resistant.": "分解への耐性があります。", "You are shock resistant.": "電撃への耐性があります。", "You are poison resistant.": "毒への耐性があります。", "You are acid resistant.": "酸への耐性があります。", "You are level-drain resistant.": "レベル吸収への耐性があります。", "You are petrification resistant.": "石化への耐性があります。", "You are immune to sickness.": "病気にかかりません。",
  "You are invulnerable.": "無敵です。", "You are magic-protected.": "魔法から守られています。", "You are telepathic.": "テレパシーがあります。", "You are warned.": "危険を察知できます。", "You are stealthy.": "隠密に行動できます。", "You are invisible.": "透明です。", "You are fast.": "素早く動けます。", "You are very fast.": "非常に素早く動けます。", "You have reflection.": "反射能力があります。", "You have free action.": "自由行動の能力があります。", "You have fixed abilities.": "能力値が固定されています。", "You see invisible.": "透明なものが見えます。", "You resist hallucinations.": "幻覚への耐性があります。", "You can recognize detrimental food.": "有害な食べ物を見分けられます。",
  "You are disintegration resistant.": "分解への耐性があります。",
  "You are temporarily acid resistant.": "一時的に酸への耐性があります。",
  "You are temporarily petrification resistant.": "一時的に石化への耐性があります。",
  "You are not subject to light-induced blindness.": "光によって目が見えなくなることはありません。",
  "You will see invisible when not blind.": "目が見えるようになれば透明なものも見えます。",
  "You would see invisible if not blind.": "目が見えれば透明なものも見えるでしょう。",
  "You are warned of undead.": "アンデッドの接近を察知できます。",
  "You have automatic searching.": "自動で探索できます。",
  "You are clairvoyant.": "透視能力があります。",
  "You have infravision.": "赤外線視力があります。",
  "You are sensing the presence of monsters.": "モンスターの存在を感じ取っています。",
  "You will confuse monsters when hitting them.": "攻撃を当てたモンスターを混乱させます。",
  "You are invisible to others.": "他者からは透明に見えます。",
  "You are visible.": "姿が見えています。",
  "You are displaced.": "実際とは違う位置にいるように見えます。",
  "You aggravate monsters.": "モンスターを刺激します。",
  "You cause conflict.": "周囲に争いを引き起こします。",
  "You can jump.": "ジャンプできます。", "You can teleport.": "テレポートできます。",
  "You have teleport control.": "テレポート先を制御できます。",
  "You can cling to the ceiling.": "天井に張りつけます。", "You can walk on water.": "水上を歩けます。",
  "You can swim.": "泳げます。", "You can survive without air.": "空気がなくても生きられます。",
  "You can breathe water.": "水中で呼吸できます。", "You can walk through walls.": "壁を通り抜けられます。",
  "You regenerate.": "体力が再生します。", "You have slower digestion.": "消化が遅くなっています。",
  "You take reduced poison gas damage.": "毒ガスから受けるダメージが減ります。",
  "You are protected from shape changers.": "変身能力を持つ敵から守られています。",
  "You cannot change from your current form.": "現在の姿から変身できません。",
  "You are polymorphing periodically.": "定期的に姿が変わります。",
  "You have polymorph control.": "変身を制御できます。", "You can lay eggs.": "卵を産めます。",
  "You are harmed by silver.": "銀によって傷つきます。", "Your life will be saved.": "命を救われます。",
  "You are lucky.": "運が良いです。", "You are very lucky.": "運がとても良いです。", "You are extremely lucky.": "運が極めて良いです。",
  "You are unlucky.": "運が悪いです。", "You are very unlucky.": "運がとても悪いです。", "You are extremely unlucky.": "運が極めて悪いです。",
  "You have extra luck.": "運に追加の恩恵があります。", "You have reduced luck.": "運に不利な影響があります。",
  "Bad luck does not time out for you.": "悪運は時間が経っても戻りません。", "Good luck does not time out for you.": "幸運は時間が経っても失われません。",
};
const skillLevels: Readonly<Record<string, string>> = {
  no: "なし", unskilled: "未熟練", basic: "基本", skilled: "熟練", expert: "専門家", master: "達人", "grand master": "大達人", "grand-master": "大達人",
};
const own = (dict: Readonly<Record<string, string>>, key: string): string =>
  Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;

/** Alignment, gender, race or role word ("lawful", "human", "Samurai"), or undefined. */
export function translateIdentityWord(word: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(values, word) ? values[word] : undefined;
}

export function translateCharacterFieldLabel(label: string, locale: SupportedLocale): string {
  return locale === "ja" ? own(labels, label) : label;
}

export function translateCharacterSectionTitle(title: string, locale: SupportedLocale): string {
  if (locale !== "ja") return title;
  const whitespace = /^([ \t]*)(.*?)([ \t]*)$/.exec(title);
  if (!whitespace) return title;
  const [, leading, value, trailing] = whitespace;
  const heading = /^(.+?)(:)?$/.exec(value);
  const key = (heading?.[1] ?? value).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(sectionTitles, key)) return `${leading}${sectionTitles[key]}${heading?.[2] ? "：" : ""}${trailing}`;
  const attributes = /^(.+)'s attributes:$/.exec(value);
  if (attributes) {
    const player = /^(.+) the (.+)$/.exec(attributes[1]);
    if (player) {
      const role = own(values, player[2]);
      const rank = role === player[2] ? translatePlayerRank(player[2], locale) : role;
      return `${leading}${player[1]}（${rank}）の能力：${trailing}`;
    }
    return `${leading}${attributes[1]}の能力：${trailing}`;
  }
  return title;
}

export function translateCharacterFieldValue(label: string, value: string, locale: SupportedLocale): string {
  if (locale !== "ja") return value;
  // Name, deity and unknown fields can contain player input or proper names.
  if (/^(?:role|race|gender|alignment)$/i.test(label)) return own(values, value);
  if (/^title$/i.test(label)) return translatePlayerRank(value, locale);
  return value;
}

export function translateCharacterBadge(badge: string, locale: SupportedLocale): string {
  if (locale !== "ja") return badge;
  return badge === "Starting" ? "初期" : badge === "Current" ? "現在" : badge;
}

/** Translate known character information only at the display boundary. */
function translateCharacterContent(line: string, locale: SupportedLocale): string {
  const heading = translateCharacterSectionTitle(line, locale);
  if (heading !== line) return heading;
  const exact = own(exactLines, line);
  if (exact !== line) return exact;
  // Final disclosure uses the same attributes in past tense. Only convert
  // complete, explicitly known statements, preserving any parenthetical.
  const past = /^You (were|had|could|couldn't) (.+)\.$/.exec(line);
  if (past) {
    const verb = past[1] === "were" ? "are" : past[1] === "had" ? "have" : past[1] === "couldn't" ? "can't" : "can";
    const current = `You ${verb} ${past[2]}.`;
    if (Object.prototype.hasOwnProperty.call(exactLines, current)) {
      const translated = exactLines[current].replace(/^今は/, "そのときは");
      return translated.replace(/(ません|ます|です)(（[^）]*）)?。$/, (_, ending: string, detail: string | undefined) =>
        `${ending === "ません" ? "ませんでした" : ending === "ます" ? "ました" : "でした"}${detail ?? ""}。`);
    }
  }
  let m = /^You are an? (.+?), a level (\d+) (?:(male|female|neuter) )?(\S+) (.+)\.$/.exec(line);
  if (m) return `あなたは${translatePlayerRank(m[1], locale)}、レベル${m[2]}の${m[3] ? `${own(values, m[3])}の` : ""}${own(values, m[4])}の${own(values, m[5])}です。`;
  m = /^Total elapsed playing time (?:is|was) (\d+ (?:days?|hours?|minutes?|seconds?)(?:,? (?:and )?\d+ (?:days?|hours?|minutes?|seconds?))*)\.$/.exec(line);
  if (m) {
    const units: Readonly<Record<string, string>> = { day: "日", hour: "時間", minute: "分", second: "秒" };
    const elapsed = [...m[1].matchAll(/(\d+) (day|hour|minute|second)s?/g)]
      .map((part) => `${part[1]}${units[part[2]]}`).join("");
    return `合計プレイ時間：${elapsed}。`;
  }
  m = /^You are (lawful|neutral|chaotic), (currently |now |nominally )?on a mission for (.+)$/.exec(line);
  if (m) {
    const qualifier = m[2] === "currently " || m[2] === "now " ? "現在の" : m[2] === "nominally " ? "名目上の" : "";
    return `${qualifier}属性は${own(values, m[1])}で、${own(deities, m[3])}の使命を受けています。`;
  }
  m = /^who is opposed by (.+?) \((lawful|neutral|chaotic)\) and (.+?) \((lawful|neutral|chaotic)\)\.$/.exec(line);
  if (m) return `敵対する神は${own(deities, m[1])}（${own(values, m[2])}）と${own(deities, m[3])}（${own(values, m[4])}）です。`;
  m = /^You are in (?:the )?(.+), on level (-?\d+)\.$/.exec(line);
  if (m) return `現在地：${translateGameLocation(`${m[1]} ${m[2]}`, locale)}`;
  m = /^You entered the dungeon ([\d,]+) turns? ago\.$/.exec(line);
  if (m) return `${m[1]}ターン前にダンジョンに入りました。`;
  m = /^You have ([\d,]+) experience points?\.$/.exec(line);
  if (m) return `経験値：${m[1]}。`;
  m = /^Your score is ([\d,]+)\.$/.exec(line);
  if (m) return `スコア：${m[1]}。`;
  m = /^You have all (\d+) hit points\.$/.exec(line);
  if (m) return `HP：${m[1]} / ${m[1]}。`;
  m = /^You have (\d+) out of (\d+) hit points?\.$/.exec(line);
  if (m) return `HP：${m[1]} / ${m[2]}。`;
  m = /^You have all (\d+) energy points \(spell power\)\.$/.exec(line);
  if (m) return `魔力：${m[1]} / ${m[1]}。`;
  m = /^You have (\d+) out of (\d+) energy points \(spell power\)\.$/.exec(line);
  if (m) return `魔力：${m[1]} / ${m[2]}。`;
  m = /^Your armor class is (-?\d+)\.$/.exec(line);
  if (m) return `アーマークラス（AC）：${m[1]}。`;
  // insight.c: the wallet line may continue on the next line with
  // "you had 40 more stashed away in your pack."
  m = /^Your wallet (contains|contained) ([\d,]+) (.+?)(\.|, but|, and)$/.exec(line);
  if (m && translateCurrency(m[3]) !== undefined) {
    return `財布には${m[2]}${translateCurrency(m[3])}入って${m[1] === "contains" ? "います" : "いました"}${m[4] === ", but" ? "が、" : "。"}`;
  }
  m = /^Your wallet (is|was) empty(\.|, but)$/.exec(line);
  if (m) return `財布は空${m[1] === "is" ? "です" : "でした"}${m[2] === "." ? "。" : "が、"}`;
  m = /^you (have|had) ([\d,]+) (more|.+?) stashed away in your pack\.$/.exec(line);
  if (m && (m[3] === "more" || translateCurrency(m[3]) !== undefined)) {
    const amount = m[3] === "more" ? `にもさらに${m[2]}枚` : `に${m[2]}${translateCurrency(m[3])}`;
    return `荷物の中${amount}しまって${m[1] === "have" ? "います" : "いました"}。`;
  }
  m = /^Autopickup is on for (.+?)( plus thrown)?(, with exceptions)?\.$/.exec(line);
  if (m) return `自動拾得：オン（対象 ${m[1]}${m[2] ? "、投げた物も含む" : ""}${m[3] ? "、例外あり" : ""}）。`;
  m = /^You (are|were) wielding (some )?(.+)\.$/.exec(line);
  if (m) {
    const some: Readonly<Record<string, string>> = { armor: "鎧", food: "食料", venom: "毒液" };
    const item = m[2] ? some[m[3]] : translateInventoryItem(m[3], locale);
    if (item !== undefined && item !== m[3]) return `${item}を手に持って${m[1] === "are" ? "います" : "いました"}。`;
  }
  m = /^You (have|had) (no|unskilled|basic|skilled|expert|master|grand master|grand-master) skill with (.+?)( and (?:can enhance|could have enhanced) that)?\.$/.exec(line);
  if (m) return `${translateSkillName(m[3], locale)}の技能：${own(skillLevels, m[2])}${m[4] ? m[1] === "have" ? "（上達可能）" : "（上達できた）" : ""}。`;
  m = /^Your items (are|were)( somewhat)? protected from (fire|cold|disintegration|electric shocks|acid)( if surroundings permitted)?\.$/.exec(line);
  if (m) {
    const elements: Readonly<Record<string, string>> = { fire: "炎", cold: "冷気", disintegration: "分解", "electric shocks": "電撃", acid: "酸" };
    return `持ち物は${elements[m[3]]}から${m[2] ? "ある程度" : ""}守られ${m[1] === "were" ? "ていました" : "ています"}${m[4] ? "（周囲の状況が許せば）" : ""}。`;
  }
  m = /^Your spell casting (is|was) (impaired by metallic armor(, mitigated by your robe)?|enhanced by wearing a robe)\.$/.exec(line);
  if (m) {
    const effect = m[2].startsWith("enhanced") ? "ローブを着ているため呪文が唱えやすくなって" : `金属製の鎧のため呪文が唱えにくくなって${m[3] ? "（ローブで緩和されて）" : ""}`;
    return `${effect}${m[1] === "was" ? "いました" : "います"}。`;
  }
  m = /^You (are|were) (unskilled|skilled) in (.+?)( and (?:can enhance|could have enhanced) that)?\.$/.exec(line);
  if (m) return `${translateSkillName(m[3], locale)}の技能：${own(skillLevels, m[2])}${m[4] ? m[1] === "are" ? "（上達可能）" : "（上達できた）" : ""}。`;
  return translateFinalDisclosure(line, locale);
}

const characteristics: Readonly<Record<string, string>> = {
  strength: "筋力", dexterity: "器用さ", constitution: "耐久力", intelligence: "知力", wisdom: "判断力", charisma: "魅力",
};
const counts = (value: string): string =>
  value === "once" ? "1" : value === "twice" ? "2" : value === "thrice" ? "3" : value.replace(/ times$/, "");
const trapNames: Readonly<Record<string, string>> = {
  "bear trap": "トラバサミ", web: "クモの巣", pit: "落とし穴", "spiked pit": "トゲだらけの落とし穴",
};
const combatSizes: Readonly<Record<string, string>> = { small: "小さな", moderate: "中程度の", large: "大きな", huge: "非常に大きな" };

// Final disclosure and enlightenment lines that insight.c assembles at run
// time; present and past tense ("is"/"was", "have"/"had") are both shown.
function translateFinalDisclosure(line: string, locale: SupportedLocale): string {
  const ending = (present: boolean, kind: "iru" | "desu" | "masu" = "iru"): string =>
    kind === "desu" ? (present ? "です" : "でした") : kind === "masu" ? (present ? "ます" : "ました") : present ? "います" : "いました";
  let m = /^Your (strength|dexterity|constitution|intelligence|wisdom|charisma) (is|was) (\S+?)(?: \((current; )?(.+)\))?\.$/.exec(line);
  if (m) {
    const parts = m[5]?.split(", ").map((part) => {
      const field = /^(base|peak|innate limit|limit):(\S+)$/.exec(part);
      if (!field) return undefined;
      const label = { base: "基本値", peak: "最高値", "innate limit": "生来の上限", limit: "上限" }[field[1] as "base"];
      return `${label}：${field[2]}`;
    });
    if (!parts?.includes(undefined)) {
      const detail = parts ? `（${m[4] ? "現在値。" : ""}${parts.join("、")}）` : "";
      return `${characteristics[m[1]]}は${m[3]}${detail}${ending(m[2] === "is", "desu")}。`;
    }
  }
  m = /^You are dead(?: \((\d+)(?:st|nd|rd|th) time!\))?\.$/.exec(line);
  if (m) return `死亡しました${m[1] ? `（${m[1]}回目！）` : ""}。`;
  m = /^You survived after being killed (once|twice|thrice|\d+ times)\.$/.exec(line);
  if (m) return `${counts(m[1])}回殺されましたが、生き延びました。`;
  m = /^You died from (terminal illness|food poisoning)\.$/.exec(line);
  if (m) return `${m[1] === "food poisoning" ? "食中毒" : "致命的な病気"}で死亡しました。`;
  m = /^You (have )?disabled loading( and storing)? of bones levels\.$/.exec(line);
  if (m) return `骨レベルの読み込み${m[2] ? "と保存" : ""}を無効にして${ending(Boolean(m[1]))}。`;
  m = /^You (have )?encountered (\d+) bones levels?\.$/.exec(line);
  if (m) return `骨レベルに${m[2]}回遭遇し${m[1] ? "ています" : "ました"}。`;
  m = /^You (are|were) running in (debug|explore) mode\.$/.exec(line);
  if (m) return `${m[2] === "debug" ? "デバッグ" : "探検"}モードでプレイして${ending(m[1] === "are")}。`;
  m = /^You (are|were) actually (lawful|neutral|chaotic)\.$/.exec(line);
  if (m) return `実際の属性は${own(values, m[2])}${ending(m[1] === "are", "desu")}。`;
  m = /^You (are|were) on the (.+?) level\.$/.exec(line);
  if (m) {
    const where = translateGameLocation(m[2], locale);
    if (where !== m[2]) return `${where}の階に${ending(m[1] === "are")}。`;
  }
  m = /^You (are|were) in (?:the )?(.+), on level (-?\d+), (a primitive area|a very big room)\.$/.exec(line);
  if (m) return `${translateGameLocation(`${m[2]} ${m[3]}`, locale)}（${m[4] === "a primitive area" ? "原始的な場所" : "とても大きな部屋"}）に${ending(m[1] === "are")}。`;
  m = /^There (is|was) a (full|new) moon in effect( when your adventure ended)?\.$/.exec(line);
  if (m) return `${m[3] ? "冒険の終わりには" : ""}${m[2] === "full" ? "満月" : "新月"}の影響があり${ending(m[1] === "is", "masu")}。`;
  m = /^Bad things (can happen|could have happened|happened) on Friday the 13th\.$/.exec(line);
  if (m) return `13日の金曜日には悪いことが${m[1] === "can happen" ? "起こりえます" : m[1] === "happened" ? "起こりました" : "起こったかもしれません"}。`;
  m = /^You (have|had) ([\d,]+) experience points?, (\d+) (?:more )?(?:(?:was|were) )?needed (?:to attain|for) level (\d+)\.$/.exec(line);
  if (m) return `経験値：${m[2]}（レベル${m[4]}まであと${m[3]}）。`;
  m = /^You (have|had) (\d+) hit di(?:ce|e)( \(actually 1\/2\))?\.$/.exec(line);
  if (m) return `ヒットダイスは${m[3] ? "1/2" : m[2]}${ending(m[1] === "have", "desu")}。`;
  m = /^Your armor class (is|was) (-?\d+), the (best|worst) possible\.$/.exec(line);
  if (m) return `アーマークラス（AC）：${m[2]}（${m[3] === "best" ? "最良" : "最悪"}）。`;
  m = /^Autopickup (is|was) on, but temporarily disabled while inside the shop\.$/.exec(line);
  if (m) return `自動拾得はオンですが、店内では一時的に無効${ending(m[1] === "is", "desu")}。`;
  m = /^You (are|were) riding (.+)\.$/.exec(line);
  if (m) return `${translateMonsterName(m[2], locale)}に乗って${ending(m[1] === "are")}。`;
  m = /^You and (.+?) (are|were) (levitating|flying)\.$/.exec(line);
  if (m) return `あなたと${translateMonsterName(m[1], locale)}は${m[3] === "flying" ? "飛行" : "浮遊"}して${ending(m[2] === "are")}。`;
  m = /^You (are|were) (swallowed|engulfed) by (.+?)(?: and (?:(are|were) being digested|(got totally digested)))?\.$/.exec(line);
  if (m) {
    const by = translateMonsterName(m[3], locale);
    const how = m[2] === "swallowed" ? "飲み込まれて" : "包み込まれて";
    if (m[5]) return `${by}に${how}、完全に消化されてしまいました。`;
    return `${by}に${how}${m[4] ? "消化されつつあり" : "い"}${ending(m[1] === "are", "masu")}。`;
  }
  m = /^You (are|were) (trapped in an? (bear trap|web|pit|spiked pit)|stuck in the (floor|ground)|sinking into lava|tethered to something buried)\.$/.exec(line);
  if (m) {
    if (m[2] === "sinking into lava") return `溶岩に沈みつつあり${ending(m[1] === "are", "masu")}。`;
    const state = m[3] ? `${trapNames[m[3]]}にかかって` : m[4] ? "床にはまって" : "埋まった何かにつながれて";
    return `${state}${ending(m[1] === "are")}。`;
  }
  m = /^You (are|were) (chained to a heavy iron ball|punished|transformed|walking on (water|lava))\.$/.exec(line);
  if (m) {
    const state = m[2] === "punished" ? "罰を受けて" : m[2] === "transformed" ? "変身して" : m[3] ? `${m[3] === "lava" ? "溶岩" : "水"}の上を歩いて` : "重い鉄球につながれて";
    return `${state}${ending(m[1] === "are")}。`;
  }
  m = /^You (have|had) (?:a wounded (left|right) (leg|foot)|wounded (legs|feet))\.$/.exec(line);
  if (m) return `${m[2] ? (m[2] === "left" ? "左" : "右") : "両"}${(m[3] ?? m[4]).startsWith("f") ? "足" : "脚"}を負傷して${ending(m[1] === "have")}。`;
  m = /^You (have|had) slippery (fingers|gloves)\.$/.exec(line);
  if (m) return `${m[2] === "gloves" ? "小手" : "指"}が滑りやすくなって${ending(m[1] === "have")}。`;
  m = /^You (take|took) (half|reduced) (physical|spell) damage\.$/.exec(line);
  if (m) return `${m[3] === "spell" ? "呪文" : "物理"}ダメージを${m[2] === "half" ? "半減" : "軽減"}して${ending(m[1] === "take")}。`;
  m = /^You (have|had) an? (small|moderate|large|huge) (?:bonus to hit|penalty to hit|(damage|defense) (bonus|penalty))(?: \(([+-]\d+)\))?(?: due to your (.+))?\.$/.exec(line);
  if (m) {
    const target = m[3] === "damage" ? "ダメージ" : m[3] === "defense" ? "防御" : "命中";
    const bonus = m[4] ? m[4] === "bonus" : / bonus to hit/.test(line);
    const cause = m[6] ? `（${translateInventoryItem(m[6], locale)}のため）` : "";
    return `${target}に${combatSizes[m[2]]}${bonus ? "ボーナス" : "ペナルティ"}${m[5] ? `（${m[5]}）` : ""}があり${ending(m[1] === "have", "masu")}${cause}。`;
  }
  m = /^You (can enhance|could have enhanced) skills? with (.+)\.$/.exec(line);
  if (m) {
    const skills = m[2].split(/, and |, also with | and also | and |, /).map((skill) => skill === "two weapons" ? "二刀流" : translateSkillName(skill, locale));
    return `${skills.join("、")}の技能を上達でき${ending(m[1] === "can enhance", "masu")}。`;
  }
  return line;
}

/** Translate known character information while retaining indentation and line breaks. */
export function translateCharacterLine(line: string, locale: SupportedLocale): string {
  if (locale !== "ja") return line;
  return line.replace(/[^\r\n]+/g, (part) => {
    const whitespace = /^([ \t]*)(.*?)([ \t]*)$/.exec(part);
    if (!whitespace || !whitespace[2]) return part;
    return `${whitespace[1]}${translateCharacterContent(whitespace[2], locale)}${whitespace[3]}`;
  });
}
