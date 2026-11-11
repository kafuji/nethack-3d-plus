# 完成分のコンタクトシート

2026-11-11。武器以外の完成済み335出力項目（412キー）。各画像は大きい表示と48pxの暗色・明色背景の表示を並べている。1つの出力を複数キーで共有する場合は代表キーを表示する。武器71キーは既存の完成品で、この一覧には含めない。

パック全体は **483/483キー完成**、未作成・旧128px・検査エラーはすべて0。[監査結果](../validation.json) / [抜粋](../production-overview.png) / [最後の14点と描き直した死者の書](../completion-contact-sheet.png)。

画素由来の段差を修正した13原画（共有先を含む16キー）も反映済み。[修正前後の比較と生成記録](../contour-review/README.md)。三角形・7本の枝・十字・胸の図柄・K/Cなどの識別しやすい記号は維持した。

- [一覧 1](final-01.png)
- [一覧 2](final-02.png)
- [一覧 3](final-03.png)
- [一覧 4](final-04.png)
- [一覧 5](final-05.png)
- [一覧 6](final-06.png)
- [一覧 7](final-07.png)
- [一覧 8](final-08.png)
- [一覧 9](final-09.png)
- [一覧 10](final-10.png)
- [一覧 11](final-11.png)
- [一覧 12](final-12.png)
- [一覧 13](final-13.png)
- [一覧 14](final-14.png)
- [一覧 15](final-15.png)
- [一覧 16](final-16.png)
- [一覧 17](final-17.png)

再生成:

```powershell
node tools/hires-art/objects/review-lists.cjs
& ./tools/hires-art/objects/contact-sheets.ps1 -InputJson .hires-tmp/objects/review-list.json -OutDir tools/hires-art/objects/contact-sheets -Mode final
```

