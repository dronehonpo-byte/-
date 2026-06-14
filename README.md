# Miyabee — ローンチ・ティザー動画 (Remotion)

マーケティング用のローンチ・ティザー（ビジョン予告編）を [Remotion](https://www.remotion.dev/) で
1本まるごと構成したプロジェクトです。**実プロダクトとは別物**の、世界観を伝えるための予告編です。

- 解像度: **1080×1920（縦 9:16）**
- フレームレート: **30fps**
- 長さ: **約49秒**（本編47秒 + エンドカード）
- 書き出し: **MP4 / H.264**
- トーン: 高級感のあるダーク基調・白の細いテキスト・静かなフェード
- フォント: **Inter**（英数字）＋ **Noto Sans JP**（日本語）をサブセット化して埋め込み済み
- テキストはすべて日本語。実在ロゴ・他社名は不使用

---

## 構成（タイムライン）

| # | 時間 | 内容 | 素材 |
|---|------|------|------|
| 1 | 0:00–0:07 | 「みんなが帰ったあとも。」 | `shot1.mp4` |
| 2 | 0:07–0:14 | 「24時間。文句も言わない。」 | `shot2.mp4` |
| 3 | 0:14–0:21 | 「教育もいらない。」 | `shot3.mp4` |
| 4 | 0:21–0:28 | 「中小企業に、“はじめての”AI社員を。」 | `shot4.mp4` |
| 5 | 0:28–0:35 | 「AI社員に特化したサービス。」 | `shot5.mp4` |
| 6 | 0:35–0:46 | **コードで描く UI アニメ**（社員カード／指示タイプ／稼働フィード／タスクカード／日報／白ブルーム） | コード（動画不要） |
| 7 | 0:46–0:49 | エンドカード（白→ロゴ／日付／ウェイトリスト／URL・QR スロット） | コード |

> クリップ 6 は仕様どおり **動画ではなくコードで描画** しています（`shot6.mp4` は使用しません）。

各ショット（1〜5）は `/public` の動画を再生します。**動画が無い場合は黒背景＋ファイル名のプレースホルダ**を表示するので、素材なしでもそのままレンダリングできます。

---

## 必要環境

- Node.js 18 以上（開発環境では Node 22 で確認）

```bash
npm install
```

---

## 素材の差し込み方

すべて任意です。ファイルを `public/` に置くだけで自動的に使われます（無ければプレースホルダ／無音でレンダリング）。

| 用途 | 置き場所 | 補足 |
|------|----------|------|
| 本編ショット | `public/shot1.mp4` … `public/shot5.mp4` | 縦 9:16 推奨。`object-fit: cover` で全面表示 |
| BGM | `public/music.mp3` | `<Audio>` で再生（volume 0.7）。無ければ無音 |
| ロゴ | `public/logo.png`（`.svg` / `.jpg` も可） | エンドカードのワードマークを置き換え。無ければ「Miyabee」テキスト |
| QR コード | `public/qr.png`（`.svg` / `.jpg` も可） | エンドカードの QR スロットに表示。無ければ「QR スロット」プレースホルダ |

エンドカードの **URL 文言** はコード内のスロットを編集してください:
`src/components/EndCard.tsx` の `miyabee.example.com` を実際の URL に変更します。

---

## プレビュー（Remotion Studio）

```bash
npm run studio
```

ブラウザでタイムラインをスクラブしながら確認・微調整できます。

---

## レンダリング（MP4 書き出し）

```bash
# 既定の出力先 out/teaser.mp4
npm run render

# もしくは直接
npx remotion render Teaser out/teaser.mp4
```

成功すると **1080×1920・H.264 の `out/teaser.mp4`** が生成されます。

よく使うオプション:

```bash
# 出力先を指定
npx remotion render Teaser path/to/launch_teaser.mp4

# 高画質寄り（CRF を下げる。既定は 18）
npx remotion render Teaser out/teaser.mp4 --crf=16
```

---

## フォントについて

`Inter` と `Noto Sans JP` を **動画内で使う文字だけにサブセット化** し、base64 として
`src/fontData.ts` に埋め込んでいます。これによりレンダリング時にネットワーク／
フォントサーバーへのアクセスが一切不要になり、`npx remotion render` だけで完結します。

オンスクリーンの**テキストを変更した場合**は、サブセットに新しい文字を含めるため
フォントを再生成してください（要 Python + `fonttools`）:

```bash
pip install fonttools brotli

# 1) 可変フォント（TTF）をダウンロード
curl -sSL -o /tmp/Inter.ttf \
  "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
curl -sSL -o /tmp/NotoSansJP.ttf \
  "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf"

# 2) ソース中の文字を集めてサブセット化
cat src/*.ts src/*.tsx src/components/*.tsx > /tmp/corpus.txt
for f in Inter NotoSansJP; do
  pyftsubset /tmp/$f.ttf \
    --text-file=/tmp/corpus.txt \
    --unicodes="U+0020-007E,U+00A0,U+2026,U+2192,U+25CB,U+2713,U+203A,U+FF05,U+FF0B,U+3000-3002,U+300C-300F,U+201C-201D,U+2018-2019,U+2014,U+2013" \
    --layout-features='*' --flavor=woff2 \
    --output-file=public/fonts/$f.woff2
done

# 3) base64 を src/fontData.ts に書き出し
python3 - <<'PY'
import base64, pathlib
out = ["// AUTO-GENERATED. Subsetted Inter + Noto Sans JP as base64 woff2 data URIs.", ""]
for name, var in [("Inter","INTER_WOFF2"),("NotoSansJP","NOTO_SANS_JP_WOFF2")]:
    b = pathlib.Path(f"public/fonts/{name}.woff2").read_bytes()
    out += [f"export const {var} =", f'  "data:font/woff2;base64,{base64.b64encode(b).decode()}";', ""]
pathlib.Path("src/fontData.ts").write_text("\n".join(out))
PY
```

---

## プロジェクト構成

```
src/
  index.ts                 registerRoot
  Root.tsx                 Composition 定義（Teaser / 1080x1920 / 30fps）
  Teaser.tsx               全体のタイムライン組み立て + <Audio>
  theme.ts                 配色・尺・テキスト・フォント読み込み
  fontData.ts              埋め込みフォント（base64・自動生成）
  components/
    ShotClip.tsx           ショット1〜5（動画 or 黒＋プレースホルダ＋字幕）
    UISegment.tsx          コードで描く UI アニメ（クリップ6）
    EndCard.tsx            エンドカード（ロゴ／日付／URL・QR スロット）
public/
  fonts/                   サブセット woff2（Inter / Noto Sans JP）
  shot1.mp4 …              ショット素材（任意で差し込み）
  music.mp3                BGM（任意）
  logo.png / qr.png        ロゴ・QR（任意）
remotion.config.ts         コーデック/CRF/タイムアウト設定
```
