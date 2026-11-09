# 内蔵画像生成器による試作（2026-11-09）

内蔵の画像生成器で各1枚を生成。元のPixelHack画像を構図の参照、既存の高解像度画像を画風の参照に指定した。APIの生成コマンドは使用していない。

| 試作 | 出力先（`public/assets/hires/pixelhack-hd/obj/`） | 画風の参照 |
|---|---|---|
| 羽根付き兜 | `plumed_helmet__helmet.png`（旧128pxを置換） | `plate_mail.png` |
| ランプ | `lamp__oil_lamp.png`、`lamp__magic_lamp.png`（同一画像） | `plate_mail.png` |
| 乳白色の薬 | `milky__gain_level.png` | `white__acid.png` |

生成原画は `.hires-tmp/objects/raw_<name>.png` に保存。`items.json` の `fit.matchRef`、`outline: 1.4`、`relief: { contrast: 0.2, contrastRadius: 0.06 }` を使って256×256の透過PNGへ加工する。生成時に透過を指定し、加工後もアルファを保持する。

[比較用コンタクトシート](pilot-contact-sheet.png)には、元絵（256pxに拡大）、加工後256px、暗い背景・明るい背景の48px表示を並べる。ゲーム内の見た目はユーザーが確認する。

## 実際の生成プロンプト

各画像の構図参照は `items.json` の `ref` に対応する `.hires-tmp/pixelhack-split/obj/<key>.png`。以下は内蔵生成器へ渡した完全なプロンプト。

### 羽根付き兜

```text
Use case: stylized-concept. Asset type: transparent game inventory icon, single square tile.
Hand-painted, realistic dark-fantasy game art in the manner of a gritty tactical RPG: believable materials, painterly but precise, strong value contrast. Shapes readable at 48 pixels.
Image 1 is the pixel-art composition reference. Image 2 is ONLY a style/material-quality reference of an existing finished icon; do not include its armor body.
Repaint Image 1 as a plumed helmet. Keep exactly the original placement, facing direction (faces RIGHT), angle, view and proportions, including empty space above and to the left. A worn olive-bronze steel helmet in right-facing side / slight three-quarter profile, rounded dome, a circular riveted side boss on its left visible side, projecting brow and cheek guards framing a dark opening facing right, a short upright crest support topped by a broad small fan of deep crimson-red feathers. Preserve the original silhouette, red plume position and scale. No head or person inside, only the empty helmet. Soft light from upper left. Fully transparent background; no table, ground, cast shadow, text, frame, labels, sparkle marks or extra objects. Paint realistic smooth hand-painted textures, not blocky pixel art.
```

### ランプ

```text
Use case: stylized-concept. Asset type: transparent game inventory icon, single square tile.
Hand-painted, realistic dark-fantasy game art in the manner of a gritty tactical RPG: believable metal, painterly but precise, strong value contrast. Shapes must remain readable at 48 pixels.
Image 1 is the pixel-art composition reference. Image 2 is ONLY an existing finished icon's painting / material style reference. Do not include its armor.
Repaint Image 1 as an ordinary brass oil lamp. Keep exactly its placement in the LOWER HALF of the square canvas, orientation, angle, view and proportions, with large empty space above it. A low rounded golden brass reservoir on a small flared pedestal foot, a long tapering spout pointing LEFT and slightly upward, a tall curved loop handle on the RIGHT, and a small raised filler cap in the center. Preserve the broad squat silhouette and the original slight three-quarter side view. Worn warm brass with subtle hammered texture, clear edge highlights and dark seams. Unlit: no flame, smoke, magic, aura, jewels, ornate markings or decoration revealing identity. Exactly this ordinary image is shared by an oil lamp and a magic lamp. Soft light from upper left. Fully transparent background: no table, ground, cast shadow, text, frame, labels or extra objects. Not pixel art.
```

### 乳白色の薬

```text
undefined
```

