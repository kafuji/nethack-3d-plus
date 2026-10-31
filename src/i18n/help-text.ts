import type { SupportedLocale } from "./core";
import hhJapanese from "./data/help-hh-ja.txt?raw";

// NetHack's help files are shown as whole documents in an information window.
// Replace only a recognized document; other texts stay in English.
const documents: readonly { readonly firstLine: RegExp; readonly lastLine: RegExp; readonly translation: string }[] = [
  { firstLine: /^y k u\s+7 8 9\s+Move commands:$/, lastLine: /^Additional commands are available in debug mode/, translation: hhJapanese },
];

const helpMenuItems: Readonly<Record<string, string>> = {
  "About NetHack (version information).": "NetHack について（バージョン情報）。",
  "Long description of the game and commands.": "ゲームとコマンドの詳しい説明。",
  "List of game commands.": "ゲームコマンドの一覧。",
  "Concise history of NetHack.": "NetHack の簡潔な歴史。",
  "Info on a character in the game display.": "ゲーム画面の文字についての情報。",
  "Info on what a given key does.": "指定したキーの働きを表示する。",
  "List of game options.": "ゲームオプションの一覧。",
  "Longer explanation of game options.": "ゲームオプションの詳しい説明。",
  "Full list of keyboard commands.": "キーボードコマンドの全一覧。",
  "List of extended commands.": "拡張コマンドの一覧。",
  "List menu control keys.": "メニューの操作キーを一覧表示する。",
  "Description of NetHack's command line.": "NetHack のコマンドラインの説明。",
  "The NetHack license.": "NetHack のライセンス。",
  "Support information.": "サポート情報。",
  "List of wizard-mode commands.": "ウィザードモードのコマンド一覧。",
  "Select one item:": "項目を1つ選んでください：",
};

/** Translate a recognized help document; returns null otherwise. */
export function translateHelpDocument(lines: readonly string[], locale: SupportedLocale): string | null {
  if (locale !== "ja") return null;
  const content = lines.map((line) => line.trimEnd()).filter((line, index, all) => line || index < all.length - 1);
  const first = content.find((line) => line.trim());
  const last = [...content].reverse().find((line) => line.trim());
  if (!first || !last) return null;
  const document = documents.find((entry) => entry.firstLine.test(first.trim()) && entry.lastLine.test(last.trim()));
  return document ? document.translation.replace(/\n$/, "") : null;
}

/** Help menu entries and title. */
export function translateHelpMenuItem(text: string, locale: SupportedLocale): string {
  if (locale !== "ja") return text;
  const key = text.trim();
  if (Object.prototype.hasOwnProperty.call(helpMenuItems, key)) return helpMenuItems[key];
  const options = /^Using the (.+?) command to set options\.$/.exec(key);
  if (options) return `${options[1].replace(" or ", " または ")} コマンドでオプションを設定する方法。`;
  const port = /^(.+?)-specific help and commands\.$/.exec(key);
  if (port) return `${port[1]} 固有のヘルプとコマンド。`;
  return text;
}
