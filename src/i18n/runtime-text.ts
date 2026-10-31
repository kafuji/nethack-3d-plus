import type { SupportedLocale } from "./core";

const japaneseStatus: Readonly<Record<string, string>> = {
  "Starting local NetHack runtime...": "NetHack を起動しています…",
  "Local NetHack runtime started": "NetHack が起動しました",
  "Failed to start local NetHack runtime": "NetHack の起動に失敗しました",
  "Runtime error": "NetHack の実行エラー",
  "Game ended": "ゲームが終了しました",
};

// Translate runtime diagnostics only at the display boundary; the underlying
// error and paths remain unchanged for the engine and logs.
export function translateRuntimeText(text: string, locale: SupportedLocale): string {
  if (locale !== "ja" || !text) return text;
  if (Object.prototype.hasOwnProperty.call(japaneseStatus, text)) return japaneseStatus[text];

  const position = /^Player at \((-?\d+), (-?\d+)\) - NetHack 3D$/.exec(text);
  if (position) return `プレイヤー位置 (${position[1]}, ${position[2]}) - NetHack 3D`;

  const startupPrefix = "Failed to start local NetHack runtime: ";
  const startupFailure = text.startsWith(startupPrefix);
  const detail = startupFailure ? text.slice(startupPrefix.length) : text;
  let translatedDetail: string | undefined;

  const lockOnly = /^Autosave "([^"\r\n]+)" has only lock-file checkpoint data \((.+)\)\. NetHack has not written a recoverable checkpoint yet\.$/.exec(detail);
  if (lockOnly) {
    const paths = lockOnly[2].replace(/\((\d+) bytes\)/g, "($1 バイト)");
    translatedDetail = `「${lockOnly[1]}」のオートセーブのチェックポイントにはロック用データしかありません（${paths}）。復元可能なチェックポイントはまだ保存されていません。`;
  }
  const missingCheckpoint = /^Autosave "([^"\r\n]+)" does not have a recoverable checkpoint file yet\.$/.exec(detail);
  if (missingCheckpoint) {
    translatedDetail = `「${missingCheckpoint[1]}」のオートセーブには、復元可能なチェックポイントファイルがまだありません。`;
  }
  if (translatedDetail !== undefined) {
    return startupFailure ? `NetHack の起動に失敗しました：${translatedDetail}` : translatedDetail;
  }
  return startupFailure ? `NetHack の起動に失敗しました：${detail}` : text;
}
