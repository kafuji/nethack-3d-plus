import { describe, expect, it } from "vitest";
import { translateRuntimeText } from "./runtime-text";

describe("runtime diagnostic presentation", () => {
  it("translates the lock-only startup failure while retaining its name and path", () => {
    const text = 'Failed to start local NetHack runtime: Autosave "Kafujinho" has only lock-file checkpoint data (/save/0Kafujinho.0 (4 bytes)). NetHack has not written a recoverable checkpoint yet.';
    expect(translateRuntimeText(text, "ja")).toBe('NetHack の起動に失敗しました：「Kafujinho」のオートセーブのチェックポイントにはロック用データしかありません（/save/0Kafujinho.0 (4 バイト)）。復元可能なチェックポイントはまだ保存されていません。');
    expect(translateRuntimeText(text, "en")).toBe(text);
  });

  it("retains unfamiliar diagnostic details while translating the startup prefix", () => {
    expect(translateRuntimeText("Failed to start local NetHack runtime: Unexpected failure", "ja"))
      .toBe("NetHack の起動に失敗しました：Unexpected failure");
    expect(translateRuntimeText("An unknown diagnostic", "ja")).toBe("An unknown diagnostic");
    expect(translateRuntimeText("Player at (58, 16) - NetHack 3D", "ja"))
      .toBe("プレイヤー位置 (58, 16) - NetHack 3D");
    expect(translateRuntimeText('Autosave "A" does not have a recoverable checkpoint file yet.', "ja"))
      .toBe("「A」のオートセーブには、復元可能なチェックポイントファイルがまだありません。");
  });
});
