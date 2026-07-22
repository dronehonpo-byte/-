# 顔タイプ診断アプリ v2 — Web版デモ

株式会社Miyabee／クライアント大島様向け「顔診断アプリ v2」の Web デモ実装です。
既存 GitHub Pages デモ（`gh-pages` ブランチ）の続きとして、v2 要件を満たす完成版に仕上げたものです。

- **単一ファイル構成**: `index.html`（HTML/CSS/JS バニラ・ビルド不要）
- **顔解析**: MediaPipe FaceLandmarker（ブラウザ内 WASM／写真は端末外に送信・保存しない）
- **スコアリング**: クライアントサイド JavaScript・決定論（同じ写真→同じ結果）
- **課金/広告/シェア**: Web デモ用モック（本番ネイティブ化は別工程 §0-2）

## 動作確認

ローカルで開くだけで動きます（顔解析エンジンのみ CDN からロード）。

```bash
cd face-diagnosis-v2
python3 -m http.server 8000   # または任意の静的サーバ
# → http://localhost:8000/ を iOS Safari / Android Chrome で開く
```

`?debug` を付けると結果画面に特徴量ダンプを表示します（校正用）。

## 画面（全10画面）

1. スプラッシュ/トップ → 2. ユーザー情報入力（任意・スキップ可） → 3. 診断項目一覧（明るめ背景）
→ 4. 撮影/アップロード → 5. 診断中 → 6. 広告視聴（無料のみ） → 7. 診断結果（再診断・SNSシェア）
→ 8. 課金案内（買い切り¥480・復元購入） → 9. 設定 → 10. 利用規約/プライバシーポリシー

## 診断項目（6種）

| 項目 | 種別 | 表示 |
|---|---|---|
| 動物顔 | 10種分類 | タイプ名＋マッチ率（段階分けなし） |
| 童顔度 | 単一% | 5段階 |
| メンヘラ度 | 単一% | 5段階 |
| サイコパス度 | 単一% | 5段階 |
| ソース/醤油顔 | 表裏% | ソース顔度／醤油顔度を並列表示・各5段階 |
| S/M度 | 表裏% | S顔度／M顔度を並列表示・各5段階 |

結果文はすべて先方確定版（§5）をそのまま埋め込み済み。%は 0〜100% にスプレッド（`PCT_GAIN`）。

## 画像の差し込み方（§8）

今回は画像を実装せず、全参照箇所を単一の `assets/images/placeholder.svg` に向けています。
各 `<img>` には `data-image-slot="..."` と直前に `<!-- TODO(image): 説明 / パス -->` を付与済み。

後日の一括差し替えは **`index.html` 内の `REAL_IMAGES` にパスを入れるだけ**：

```js
const REAL_IMAGES = {
  "animal-tanuki": "assets/images/animals/tanuki.png",
  "source-3":      "assets/images/source-soy/source-3.png",
  // ... スロット定義は IMAGE_SLOTS を参照
};
```

スロット一覧（`IMAGE_SLOTS`）:
`main-face-20` / `animal-{tanuki…lion}`(10) / `source-1..5` / `soy-1..5` /
`mental-1..5` / `psycho-1..5` / `s-1..5` / `m-1..5` / `youthful-1..5` / `deco-1,2`

配置先ディレクトリは `assets/images/{animals,source-soy,mental,psycho,sm,youthful,decorations}/`。

> 注: §8-1 の一覧は `placeholder.png` 表記ですが、§8-3 が SVG を許容しているため、
> テキスト表示が鮮明な `placeholder.svg` を採用しています。

## デプロイ（GitHub Pages）

`face-diagnosis-v2/` の中身（`index.html` と `assets/`）を `gh-pages` ブランチのルートへ
コピーすれば既存デモ URL を更新できます。相対パス構成なのでサブディレクトリ配信でも動作します。

## 未確定事項（§12・要クライアント確認）

- **アプリ名**（`APP_NAME`）: 暫定「顔タイプ診断（仮）」
- **メインカラー**（CSS `--brand-a` / `--brand-b`）: 暫定パステル（ピンク×パープル）
- **お問い合わせ先**（`CONTACT_EMAIL`）: 暫定 `support@example.com`
- **各段階のイラスト割当**: スロットは 5段階×診断で用意済み。素材紐付けは差し替え時に確定
- **利用規約/プライバシーポリシー本文**: 審査要件の骨格のみ実装、本文は後日 Miyabee 側で差し替え
