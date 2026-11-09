# 完成分のコンタクトシート

2026-11-09。武器以外の完成済み321出力項目。各画像は大きい表示と48pxの暗色・明色背景の表示を並べている。1つの出力を複数キーで共有する場合は代表キーを表示する。武器71キーは既存の完成品で、この一覧には含めない。

パック全体は **469/483キー完成**、未作成14、旧128pxは0。[監査結果](../validation.json) / [未作成14件と保留の調整1件](../pending-native.json) / [抜粋](../production-overview.png)。死者の書の紋章調整は利用上限のため保留中で、ここには初稿を掲載している。

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

