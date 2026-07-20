# 画像アセットの置き場所と命名ルール（Web版）

ここに画像を置き、`index.html` 内の `IMG = { ... }` にパスを書くと、絵文字→画像に切り替わります。
未設定の項目は絵文字のままなので、揃ったものから順に差し込めます。

## 推奨フォーマット
- PNG（背景透過推奨）
- 正方形に近い比率が扱いやすい（表示時は縦横フィット）
- 目安サイズ: 512×512px 前後（メイン顔は 768〜1024px 推奨）

## ファイル名 → 用途 の対応

| 用途 | ファイルパス | `index.html` の設定 |
|---|---|---|
| 動物 たぬき顔 | `assets/animals/tanuki.png` | `IMG.animals.tanuki` |
| 動物 きつね顔 | `assets/animals/kitsune.png` | `IMG.animals.kitsune` |
| 動物 犬顔 | `assets/animals/inu.png` | `IMG.animals.inu` |
| 動物 猫顔 | `assets/animals/neko.png` | `IMG.animals.neko` |
| 動物 うさぎ顔 | `assets/animals/usagi.png` | `IMG.animals.usagi` |
| 動物 リス顔 | `assets/animals/risu.png` | `IMG.animals.risu` |
| 動物 鹿顔 | `assets/animals/shika.png` | `IMG.animals.shika` |
| 動物 狼顔 | `assets/animals/ookami.png` | `IMG.animals.ookami` |
| 動物 ハムスター顔 | `assets/animals/hamster.png` | `IMG.animals.hamster` |
| 動物 ライオン顔 | `assets/animals/lion.png` | `IMG.animals.lion` |
| 動物結果のメイン顔（20番） | `assets/hero_face.png` | `IMG.heroFace` |
| ソース顔（結果） | `assets/type_sauce.png` | `IMG.sauce` |
| 醤油顔（結果） | `assets/type_shoyu.png` | `IMG.shoyu` |
| メニューのアイコン（任意・item id 別） | `assets/icon_<id>.png` | `IMG.items.<id>` |
| ％項目の結果メイン（任意・item id 別） | `assets/hero_<id>.png` | `IMG.heroItems.<id>` |

item id: `animal` / `babyface` / `sm` / `menhera` / `shoyu_sauce` / `psychopath`

## 動物結果画面の構成（先方指定）
`IMG.heroFace`（顔20番）をメインに大きく表示し、判定された動物イラストを右下に重ねます。
「顔20番＋周囲に各動物を配置」の詳細レイアウトは、素材が揃った段階で調整します。

## 差し込み手順（例）
1. `assets/animals/tanuki.png` … を配置
2. `index.html` の `IMG` を編集:
   ```js
   const IMG = {
     items: {}, heroItems: {},
     animals: { tanuki:"assets/animals/tanuki.png", kitsune:"assets/animals/kitsune.png", /* ... */ },
     heroFace: "assets/hero_face.png",
     shoyu: "assets/type_shoyu.png", sauce: "assets/type_sauce.png",
   };
   ```
