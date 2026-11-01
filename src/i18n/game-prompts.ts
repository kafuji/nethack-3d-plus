import type { SupportedLocale } from "./core";
import { translateInventoryItem } from "./inventory-text";
import { translateMonsterName } from "./game-monsters";
import { nethack5ExtraMessages } from "./nethack5-extra-messages";
import { lookupNethack5SourceExact, translateNethack5SourceMessage } from "./nethack5-source-messages";
import { englishLeftover } from "./game-messages";
import { translateAssembledMessage } from "./nethack5-assembled-messages";
import { jnethackMessage } from "../plus/game-text/fallback";

// Prompts are presented separately from their raw values, which determine
// choices, command routing and submitted input. Keep this list exact.
const japanesePrompts: Readonly<Record<string, string>> = {
  "In what direction?": "どの方向ですか？",
  "Really quit?": "本当に終了しますか？",
  "Really quit without saving?": "セーブせずに本当に終了しますか？",
  "Really save?": "本当にセーブしますか？",
  "There is already a game in progress under your name.  Destroy old game?": "同じ名前のゲームが既に進行中です。古いゲームを消去しますか？",
  "You find a trap!  Do you want to try to disarm it?": "罠を発見した！ 解除を試みますか？",
  "There is 1 gold piece here; eat it?": "ここに金貨が1枚あります。食べますか？",
  "Eat it?": "それを食べますか？",
  "Do you know what lives in this water?": "この水の中に何がいるか知っていますか？",
  "What are you looking for?  The exit?": "何を探していますか？ 出口ですか？",
  "What new menucolor pattern?": "新しいメニューの色分けパターンは？",
  "What new autopickup exception pattern?": "自動拾得の新しい例外パターンは？",
  "What new message pattern?": "新しいメッセージパターンは？",
  "Pick an object.": "アイテムを選んでください。",
  "Are you sure you want to pray?": "本当に祈りますか？",
  "Are you sure you want to enter?": "本当に入りますか？",
  "Are you sure you want to eat that?": "本当にそれを食べますか？",
  "Do you want to see the dungeon overview?": "ダンジョンの概要を見ますか？",
  "Do you want to see your conduct?": "あなたの行動記録を見ますか？",
  "Do you want to see your attributes?": "あなたの能力や状態を見ますか？",
  "Do you want your possessions identified?": "持ち物を識別しますか？",
  "Do you want an account of creatures vanquished?": "倒した生き物の一覧を見ますか？",
  "Do you want a list of species genocided?": "抹殺した種族の一覧を見ますか？",
  "Do you want to keep the save file?": "セーブファイルを残しますか？",
  "Do you want to see what you had when you died?": "死亡時の持ち物を見ますか？",
  "Do you want to see what you had when you quit?": "終了時の持ち物を見ますか？",
  "Do you want to enter explore mode?": "探索モードに入りますか？",
  "Do you want a tutorial?": "チュートリアルを始めますか？",
  "Switch from the tutorial back to regular play?": "チュートリアルを終了して通常プレイに戻りますか？",
  "There is a level teleporter here. Trigger it?": "ここに階移動の罠があります。作動させますか？",
  "Really autoselect All?": "本当にすべてを自動選択しますか？",
  "There is already a game in progress under your name.  Do what?": "同じ名前のゲームが既に進行中です。どうしますか？",
  "Do what?": "何をしますか？",
  "Where do you want to cast the spell?": "どこに呪文を唱えますか？",
  "Where do you want to center the explosion?": "どこを爆発の中心にしますか？",
  "Where do you want to hit?": "どこを攻撃しますか？",
  "Where do you want to jump?": "どこへジャンプしますか？",
  "Where do you want to travel to?": "どこへ移動しますか？",
  "That is a bit difficult to engrave with, don't you think?": "それで刻むのは少し難しくありませんか？",
  "This spellbook is too faint to be read any more.": "この魔法書は文字が薄すぎて、もう読めません。",
  "Do you want to try to disarm it?": "解除を試みますか？",
  "Do you want to add to the current engraving?": "今ある刻印に書き足しますか？",
  "Drink the water around you?": "周囲の水を飲みますか？",
  "Drink from the fountain?": "泉の水を飲みますか？",
  "Drink from the sink?": "流しの水を飲みますか？",
  "Do you wish to teleport?": "テレポートしますか？",
  "Which way do you want to teleport?": "どの方向にテレポートしますか？",
  "Name an individual object?": "個別のアイテムに名前を付けますか？",
  "What do you want to do?": "何をしますか？",
  "What do you want to look at:": "何を調べますか：",
  "What do you want to name?": "何に名前を付けますか？",
  "What do you want to call this dungeon level?": "この階を何と呼びますか？",
  "What command?": "どのコマンドですか？",
  "How much will you offer?": "いくら捧げますか？",
  "What tune are you playing?": "どの旋律を演奏しますか？",
  "What monster do you want to genocide?": "どのモンスターを抹殺しますか？",
  "What class of monsters do you wish to genocide?": "どの種類のモンスターを抹殺しますか？",
  "What class of monsters do you want to genocide?": "どの種類のモンスターを抹殺しますか？",
  "What type of monster do you want to genocide?": "どのモンスターを抹殺しますか？",
  "What type of object do you want an inventory of?": "どの種類のアイテムを一覧表示しますか？",
  "What type of things do you want to take off?": "どの種類の装備を外しますか？",
  "Pick a skill to advance:": "上達させる技能を選んでください：",
  "Which spell would you like to cast?": "どの呪文を唱えますか？",
  "Choose which spell to cast": "唱える呪文を選んでください",
  "What would you like to use?": "何を使いますか？",
  "What do you look for?": "何を探しますか？",
  "What do you want to drink?": "何を飲みますか？",
  "What do you want to offer?": "何を捧げますか？",
  "What do you want to call?": "何に呼び名を付けますか？",
  "What do you want to untrap with?": "何を使って罠を解除しますか？",
  "What do you want to force with?": "何を使ってこじ開けますか？",
  "What do you want to grease?": "何に油を塗りますか？",
  "What do you want to read or study?": "何を読みますか？",
  "What do you want to hold?": "何を持ちますか？",
  "What do you want to lick?": "何をなめますか？",
  "Beware, there will be no return!  Still climb?": "気をつけろ、もう戻れないぞ！ それでも登りますか？",
  "What would you like to eat?": "何を食べますか？",
  "What do you want to eat?": "何を食べますか？",
  "What do you want to read?": "何を読みますか？",
  "What do you want to use or apply?": "何を使いますか？",
  "What do you want to wear?": "何を着ますか？",
  "What do you want to put on?": "何を身に着けますか？",
  "What do you want to remove?": "何を外しますか？",
  "What do you want to zap?": "どの杖を振りますか？",
  "What do you want to invoke?": "何の力を呼び起こしますか？",
  "What do you want to rub?": "何をこすりますか？",
  "What do you want to dip?": "何を浸しますか？",
  "What do you want to sacrifice?": "何を生け贄に捧げますか？",
  "What do you want to throw?": "何を投げますか？",
  "What do you want to wield?": "何を手に持ちますか？",
  "What do you want to take off?": "何を外しますか？",
  "What do you want to put in?": "何を入れますか？",
  "What would you like to put in?": "何を入れますか？",
  "What do you want to take out?": "何を取り出しますか？",
  "What would you like to take out?": "何を取り出しますか？",
  "What do you want to ready?": "何を準備しますか？",
  "What do you want to fire?": "何を発射しますか？",
  "What do you want to charge?": "何を充填しますか？",
  "What do you want to adjust?": "何の文字を変更しますか？",
  "What do you want to stash?": "何をしまいますか？",
  "What do you want to pawn?": "何を質に入れますか？",
  "What do you want to pick up?": "何を拾いますか？",
  "What would you like to pick up?": "何を拾いますか？",
  "Pick up what?": "何を拾いますか？",
  "What do you want to drop?": "何を置きますか？",
  "What would you like to drop?": "何を置きますか？",
  "Put in what?": "何を入れますか？",
  "Take out what?": "何を取り出しますか？",
  "What type of objects?": "どの種類のアイテムですか？",
  "Drop what type of items?": "どの種類のアイテムを置きますか？",
  "What do you want to write?": "何を書きますか？",
  "What do you want to write in the dust here?": "ここのほこりに何を書きますか？",
  "What do you want to call this item?": "このアイテムを何と呼びますか？",
  "What do you want?": "何を望みますか？",
  "What would you like to identify first?": "まず何を識別しますか？",
  "What do you want to identify?": "何を識別しますか？",
  "What do you want to quaff?": "何を飲みますか？",
  "What do you want to apply?": "何を使いますか？",
  "What do you want to use?": "何を使いますか？",
  "What do you want to engrave with?": "何を使って刻みますか？",
  "What do you want to write with?": "何を使って書きますか？",
  "What do you want to tin?": "何を缶詰にしますか？",
  "What do you want to tip?": "何を傾けて中身を出しますか？",
  "What do you want to loot?": "何の中身を調べますか？",
  "What do you want to untrap?": "何の罠を解除しますか？",
  "What do you want to name this item?": "このアイテムに何と名前を付けますか？",
  "What do you want to dip into?": "何に浸しますか？",
  "What would you like to dip?": "何を浸しますか？",
  "What would you like to read?": "何を読みますか？",
  "What would you like to drink?": "何を飲みますか？",
  "What would you like to throw?": "何を投げますか？",
  "What would you like to wear?": "何を着ますか？",
  "What would you like to wield?": "何を手に持ちますか？",
};

function translatePromptObject(value: string): string {
  const demonstrative = /^(this|these) (.+)$/.exec(value);
  if (demonstrative) {
    const translated = translateInventoryItem(demonstrative[2], "ja");
    return translated === demonstrative[2] ? value : `${demonstrative[1] === "this" ? "この" : "これらの"}${translated}`;
  }
  return translateInventoryItem(value, "ja");
}

// Anchors avoid rewriting unrelated text or the runtime's choice inputs.
const japanesePromptTemplates: readonly [RegExp, (...values: string[]) => string][] = [
  [/^Really attack ([^?\n]+)\?$/, (value) => `${translateMonsterName(value, "ja")}を本当に攻撃しますか？`],
  [/^Eat ([^?\n]+) anyway\?$/, (value) => `それでも${translateInventoryItem(value, "ja")}を食べますか？`],
  [/^Pick up ([^?\n]+)\?$/, (value) => `${translateInventoryItem(value, "ja")}を拾いますか？`],
  [/^There is ([^?\n]+) here; eat it\?$/, (value) => `ここに${translateInventoryItem(value, "ja")}があります。食べますか？`],
  [/^There are (\d+) gold pieces here; eat them\?$/, (value) => `ここに金貨が${value}枚あります。食べますか？`],
  [/^Pick (\d+) of what\?$/, (value) => `何を${value}個拾いますか？`],
  [/^Do you want to change into ([^?\n]+)\?$/, (value) => `${translateMonsterName(value, "ja")}に変身しますか？`],
  [/^Do you want to remove the saddle from ([^?\n]+)\?$/, (value) => `${translateMonsterName(value, "ja")}から鞍を外しますか？`],
  [/^What do you want to call ([^?\n]+)\?$/, (value) => `${translatePromptObject(value)}を何と呼びますか？`],
  [/^What do you want to name ([^?\n]+)\?$/, (value) => `${translatePromptObject(value)}に何と名前を付けますか？`],
  [/^Do what with ([^?\n]+)\?$/, (value) => `${translatePromptObject(value)}をどうしますか？`],
  [/^This spellbook is (a little |somewhat |rather |quite |very |extremely |too )?difficult to comprehend\.  Continue\?$/, (degree) => {
    const amounts: Readonly<Record<string, string>> = { "": "", "a little ": "少し", "somewhat ": "やや", "rather ": "かなり", "quite ": "かなり", "very ": "とても", "extremely ": "非常に", "too ": "あまりに" };
    return `この魔法書を理解するのは${amounts[degree ?? ""]}難しいです。続けますか？`;
  }],
  [/^You are wielding ([^.!?\n]+)\.  Ready ([^?\n]+) instead\?$/, (current, replacement) => `${translatePromptObject(current)}を手に持っています。代わりに${translatePromptObject(replacement)}を準備しますか？`],
  [/^You have ([^.!?\n]+) readied\.  Wield ([^?\n]+) instead\?$/, (current, replacement) => `${translatePromptObject(current)}を準備しています。代わりに${translatePromptObject(replacement)}を手に持ちますか？`],
  [/^There is a bear trap here \(([^()\n]+)\); eat it\?$/, (state) => `ここにクマ捕り罠があります（${state}）。食べますか？`],
  [/^Unlock it with ([^?\n]+)\?$/, (item) => `${translatePromptObject(item)}で鍵を開けますか？`],
  [/^How much will you offer \(suggested: (\d+) or (\d+)\)\?$/, (first, second) => `いくら捧げますか？（推奨：${first} または ${second}）`],
  [/^That ([^.!?\n]+) will cost you (\d+) (zorkmids?|gold pieces?)\.$/, (item, price, currency) => `${translatePromptObject(item)}の代金は${currency.startsWith("gold") ? `金貨 ${price} 枚` : ` ${price} ゾークミド`}です。`],
  [/^What kinds of thing do you want to (pick up|drop|put in|take out|tip|sell|identify)\?$/, (action) => {
    const actions: Readonly<Record<string, string>> = {
      "pick up": "拾いますか", drop: "置きますか", "put in": "入れますか", "take out": "取り出しますか",
      tip: "出しますか", sell: "売りますか", identify: "識別しますか",
    };
    return `どの種類の物を${actions[action]}？`;
  }],
  [/^Will you accept (\d+) (zorkmids?|gold pieces?) in credit for ([^?\n]+)\?$/, (amount, currency, item) => `${translatePromptObject(item)}の代わりに${currency.startsWith("gold") ? `金貨 ${amount} 枚` : ` ${amount} ゾークミド`}の預け金を受け取りますか？`],
  [/^(.+?) offers( only)? (\d+) gold pieces? for (your items in |the contents of )?(?:your |the )?([^?\n]+?)( and its contents| and items? inside)?\.  Sell (?:it|them)\?$/, (shopkeeper, only, amount, partial, item, contents) => {
    const object = translatePromptObject(item);
    const goods = partial === "your items in " ? `${object}の中の品物` : partial || contents ? `${object}とその中身` : object;
    return `${shopkeeper}は${goods}に${only ? "たった" : ""}金貨 ${amount} 枚を提示した。売りますか？`;
  }],
  [/^Drop the ([^.!?\n]+) corpse without ([^?\n]+) protection on\?$/, (monster, protection) => `${translateMonsterName(`the ${monster}`, "ja")}の死体を${translatePromptObject(protection)}で防護せずに置きますか？`],
];

/**
 * True when a translation copies ordinary English words from the prompt, e.g.
 * "どの種類のものをPut in？". Names and scroll labels stay in English: they are
 * capitalized or upper case and do not start the prompt.
 */
function keepsEnglishWords(original: string, translated: string): boolean {
  const first = /[A-Za-z][A-Za-z'-]*/.exec(original)?.[0];
  const words = new Set(original.match(/[A-Za-z][A-Za-z'-]*/g) ?? []);
  return (translated.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])
    .some((word) => words.has(word) && (word === first || /^[a-z]/.test(word)));
}

/** Translate only the visible prompt; retain choice letters and defaults. */
export function translateGamePrompt(prompt: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !prompt.trim()) return prompt;
  const whitespace = /^(\s*)(.*?)(\s*)$/s.exec(prompt);
  if (!whitespace) return prompt;
  const [, leading, content, trailing] = whitespace;
  // Some runtimes append choice keys and a default to the question. Preserve
  // those bytes exactly; only a recognized question can be translated.
  const choiceSuffix = /^(.*?)(\s+\[[a-zA-Z0-9?*#$,\-/ ]+\](?:\s+\([a-zA-Z0-9?*#]\))?)$/.exec(content);
  const text = choiceSuffix?.[1] ?? content;
  let translated = Object.prototype.hasOwnProperty.call(japanesePrompts, text)
    ? japanesePrompts[text]
    : Object.prototype.hasOwnProperty.call(nethack5ExtraMessages, text) ? nethack5ExtraMessages[text] : undefined;
  if (translated === undefined) {
    for (const [pattern, render] of japanesePromptTemplates) {
      const match = pattern.exec(text);
      if (match) {
        translated = render(...match.slice(1));
        break;
      }
    }
  }
  // Prompts share their wording with the assembled and source message tables;
  // use it only when the rendering leaves no English from the prompt behind.
  if (translated === undefined) {
    const source = translateAssembledMessage(text) ?? lookupNethack5SourceExact(text) ?? translateNethack5SourceMessage(text);
    if (source !== undefined && source !== text && englishLeftover(text, source) === 0) translated = source;
  }
  // Fall back to JNetHack wording for prompts without a curated translation.
  if (translated === undefined) {
    const jnethack = jnethackMessage(text);
    if (jnethack !== undefined && !keepsEnglishWords(text, jnethack)) translated = jnethack;
  }
  return translated === undefined
    ? prompt
    : `${leading}${translated}${choiceSuffix?.[2] ?? ""}${trailing}`;
}
