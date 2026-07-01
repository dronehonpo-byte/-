# JSFA 小顔矯正 Before/After 顔解析Webアプリ

日本小顔矯正認定協会（JSFA）向けの、施術前後（Before/After）の顔の変化を数値で可視化する Web アプリです。
要件定義書 v1.0（2026-07-01）に基づいて実装しています。

## 特長

- **1ファイル完結**：`index.html` に HTML/CSS/JS をすべてインライン記述。ビルド不要。
- **CDNのみ**：解析は [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) の FaceLandmarker を CDN 経由で利用。
- **完全ローカル処理**：撮影画像・解析データは端末内（ブラウザ内）でのみ処理し、外部サーバーへ送信しません。
- **オフライン対応**：Service Worker により、初回読み込み後は Wi-Fi なしでも動作。

## 動作環境

- 必須：**iPad Air 11インチ（M4）／ Safari（最新）／ HTTPS**
- その他ブラウザ・デバイスは動作保証対象外（要件定義書 5 章準拠）

## 画面フロー

`ホーム → Before撮影 → Before確認 → After撮影(Before半透明重ね) → After確認 → 解析中 → 結果表示 → 保存 →（次の人へ）`

## 解析4指標

| 指標 | 算出ロジック |
|---|---|
| 顔面積変化率(%) | 顔輪郭ランドマークを Shoelace 公式でポリゴン面積化し `(Before-After)/Before×100` |
| 総合スコア(100点) | 3指標を重み付き平均（面積50%・FL30%・左右差20%）→ 変化率0%=50点／10%改善=100点で線形換算 |
| 左右差改善率(%) | 顔中心線からの左右頬（Index 234/454）距離差の縮小率 |
| フェイスライン改善率(%) | 下顎ライン周囲長の短縮率 |

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体（単一ファイル） |
| `sw.js` | Service Worker（オフラインキャッシュ） |
| `manifest.json` / `icon.svg` | PWA（ホーム画面追加）用 |
| `vercel.json` | Vercel デプロイ設定 |
| `manual.html` | スタッフ向け操作マニュアル（A4・PDF化用） |

## ローカルで試す

HTTPS もしくは `localhost` が必要です（カメラ API のため）。

```bash
cd jsfa-face-analysis
python3 -m http.server 8000
# → http://localhost:8000 を開く（実カメラ検証は iPad + HTTPS 推奨）
```

## Vercel へのデプロイ

1. このディレクトリ（`jsfa-face-analysis/`）を Vercel の対象に指定
2. フレームワークプリセット：**Other**（静的サイト）
3. デプロイ後に発行される `https://…` URL を iPad Safari で開く

> 静的ファイルのみのため追加のビルド設定は不要です。ルートを `jsfa-face-analysis` に設定するか、当ディレクトリ単独を Vercel プロジェクトとして取り込んでください。

## 備考

- 納品物のうち「動作確認動画(mp4)」は実機（iPad Air M4）での画面収録が必要なため、本リポジトリには含めていません。実機納品時に別途作成してください。
- ロゴ画像が提供された場合は、`index.html` ヘッダーの `JSFA Small Face Analysis` 表記を `<img>` に差し替えて組み込めます（要件 2 章「△ロゴ組み込み」）。
