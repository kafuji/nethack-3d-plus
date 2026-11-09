# 残りのアイテム制作

2026-11-09。マニュアルにある既存見本の作風を尊重し、内蔵画像生成器で制作する。APIキーや外部画像生成APIは使用しない。

**制作途中: 469/483 キー完成、旧 128px は 0、残り 14。** 内蔵生成器の利用上限に達した。リセット予定はツールの応答では 2026-11-10 15:43:44 JST。[残りの対象と実行用プロンプト](pending-native.json)、[監査結果](validation.json)、[完成分の一覧](contact-sheets/README.md) を保存した。

未作成は royal jelly 1 種と杖 13 種。royal jelly は初回生成が拒否され、杖の途中で利用上限に達した。完成済みの死者の書には、四角い紋章を自然な髑髏の絵へ調整する作業が 1 点残る。この描き直しも利用上限で生成されなかったため、現行の完成 PNG は初稿のまま保持している。

spec の `model` / `quality` は既存の外部API用設定として残している。今回の内蔵生成器のモデル名・品質設定を示すものではない。

## 原画と仕様

[items.json](items.json) に残りの全アイテムの仕様を登録した。仕様の登録と画像の完成は別で、完成状況は実ファイルの寸法と透過、および `audit.mjs` で確認する。

- `ref` に対応する元のPixelHack画像を Image 1（構図の参照）として渡す。
- `styleRef` の完成見本を Image 2（画風のみの参照）として渡す。防具は `plate_mail`、指輪は `ruby__conflict`、護符は `circular__amulet_of_esp`、道具は `bag__sack`、食べ物は `food_ration`、薬は `purple_red__healing`、巻物は `zelgo_mer__enchant_armor`、魔法書は `red__force_bolt`、杖は `oak__nothing`、石類は `boulder`。
- 画像ごとに内蔵生成器を1回呼び、`transparent_background: true` を指定。原画は `.hires-tmp/objects/raw_<name>.png`、実際のプロンプトは同じ場所の `prompt_<name>.txt` に保存。
- プロンプトは `style`、`rules.item`、各項目の `refNote`、`prompt` を空行で連結し、末尾に下の共通補足を付ける。Image 1の構図・色と、Image 2の画風を明確に区別する。
- `builtinExtraPrompt` がある項目では、共通補足の後にその文を空行で追加する。刻印付き兜は右向きを明示して描き直した。鉄球も余分な台座を除くため描き直し、防具の金属見本を参照した。指輪の一部は元絵の画素の段差を歯車状の金具として描いてしまったため、自然な曲線の輪と楕円形の穴を明示して描き直した。

```text
Use Image 1's colours unless a magenta colour key is explicitly requested. No decorative identity marks not present on the reference. Ignore any background-coloured streaks, identification dashes, floor or water behind Image 1's object. Transparent background throughout.
```

`terrain-gen.mjs build` で `fit.matchRef`、輪郭1.4、relief（contrast 0.2 / contrastRadius 0.06）を適用し、256×256の透過PNGをパックへ保存する。ドラゴンの鱗鎧・鱗、金属表紙の本、4種のglobはマゼンタ部分を既存処理で色替えする。共有対象は同一原画を同一処理で書き出す。元絵が同じ2種のconical hatも同一画像を共有する。

一般アイコン16種は既存の完成画像から `derive` で作り、追加生成しない。

対象は武器以外412キー、原画247枚と一般アイコンへの流用16項目。うち16枚は既存見本と最初の試作なので、この続きでは231種類の原画を新しく制作する。色替えと共有により1枚の原画から複数のキーを書き出す。灰色のドラゴン鱗鎧・鱗は銀色との差を保つため、出力の `tint: [0.66, 0.66, 0.68]` で暗くする（`tint` は色文字列ではなくRGBの倍率）。

## 確認方法

```powershell
npm run hires:manifest
node tools/hires-art/objects/audit.mjs
```

監査は483キーの画像の存在、256×256、透過と描画内容の存在、仕様のキーの重複・漏れ、輪郭・relief・配置設定、共有画像24組の完全一致、マニフェストを確認する。24組には同一の色指定で別々の出力項目に置かれた宝石・ガラス玉も含む。制作途中の欠落・旧128px画像を数える場合は `--allow-incomplete` を付ける。制作途中は新しいPNGの追加後にマニフェストを更新してから監査する。

見た目はコンタクトシートで元絵の構図、分類内の見分けやすさ、暗い背景と明るい背景の48px表示、色替え部分を確認する。ゲーム起動やアプリのビルドは行わない。

## 目視で調整した箇所

- 刻印付き兜の向きを右向きに修正。
- 鉄球の余分な台座・突起を除去し、球だけの形に修正。
- 指輪19種で画素の段差を滑らかな曲線に修正。材質・宝石・元絵の位置と大きさは維持。
- figurine は直方体の積み木状になった初稿を、丸い頭と自然な肩を持つ素朴な木彫りの像に修正。
- parchment / vellum の表紙は四角い印・水玉を自然な革や紙の質感に修正。shining の表紙は画素状の色面を滑らかな反射光に修正。
- 灰色のドラゴン鱗鎧・鱗の明度を下げ、銀色との違いを確保。

描き直しの追加指示は各項目の `builtinExtraPrompt` に保存。上のプロンプト組み立て方で、採用した原画の指示を再構成できる。

## 上限解除後の再開

1. [pending-native.json](pending-native.json) の `jobs` 14 件を、各 `references` と `prompt` を使い内蔵生成器で 1 件ずつ生成する。参照パスはリポジトリルートからの相対パス。`transparent_background: true`。外部 API 用の `gen` は使用しない。
2. ツールの保存先から `rawDestination` へコピーし、`finishCommand` で仕上げる。生成元は残す。完了した項目を pending 一覧から取り除く。
3. `refinements` の死者の書 1 件を同じ手順で描き直し、採用時に `additionalPrompt` を該当 item の `builtinExtraPrompt` とプロンプト記録へ保存する。
4. `npm run hires:manifest` と `node tools/hires-art/objects/audit.mjs` を実行。**483/483、旧 0、欠落 0、エラー 0** を確認してから完了とする。
5. 確認用一覧とこの制作状況、README、validation.json、pending-native.json を更新する。

現時点では 483 件すべての完成を主張しない。完成分は 321 出力項目のコンタクトシート 17 枚にまとめ、共有キーの重複を代表キーで示している。

