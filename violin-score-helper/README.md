# バイオリン楽譜ヘルパー（violin-score-helper）

バイオリンの楽譜**スキャン（PDF・スキャナ画像）**をアップロードすると、**①使う弦の色分け／②指番号／③半音マーク(^ / v)** を自動付与し、**④テンポ調整付きの練習音源**を鳴らし、**⑤タップで手動修正／⑥PNG・PDF保存**できる、スマホ・PC対応のレスポンシブWebアプリです。

対象：バイオリン初級〜中級の生徒／指導者。方針は「100%全自動」ではなく **「自動判定＋手動修正」**。

> **スキャン専用**：スマホ撮影の写真は認識精度が安定しないため非対応です。対応形式は **PDF・スキャナ由来の PNG/JPEG**。楽譜認識は **OSS の Audiveris**（外部AI/従量課金APIは不使用）で行います。

> 正典：[`要件定義書_バイオリン楽譜アプリ.md`](./要件定義書_バイオリン楽譜アプリ.md) ／ 実装指示：[`ClaudeCodeプロンプト書_バイオリン楽譜アプリ.md`](./ClaudeCodeプロンプト書_バイオリン楽譜アプリ.md)

---

## 技術スタック

- **Next.js 14（App Router）+ TypeScript + Tailwind CSS**（Vercel デプロイ想定）
- **OMR（楽譜読み取り）**：**OSS の Audiveris** をコンテナ化した別サービスで スキャン→MusicXML。アプリ側は MusicXML を音符データへ変換（`lib/musicXml.ts`）。外部AI/Vision APIは不使用＝**従量課金なし**
- **判定ロジック**：`lib/` の純粋関数モジュール（弦判定・指番号配置・半音マーク）＋ Vitest ユニットテスト
- **描画**：元画像の上に SVG オーバーレイ（座標ベース）。弦色は乗算合成の半透明で符頭が透ける
- **音源**：Tone.js（Web Audio）、テンポスライダー
- **書き出し**：Canvas→PNG、jsPDF→PDF

## ディレクトリ構成

```
violin-score-helper/
├─ app/
│  ├─ page.tsx              画面オーケストレーション（状態管理）
│  ├─ layout.tsx
│  └─ api/omr/route.ts      認識サービスへ転送＋MusicXML変換（サーバー）
├─ lib/
│  ├─ constants.ts          ★調整用の定数集約（色・閾値・ローマ数字対応 等）
│  ├─ music.ts              音高⇔弦・指の計算（第1ポジション中心）
│  ├─ musicXml.ts           MusicXML→音符データ変換（座標換算 CALIBRATION）
│  ├─ scanQuality.ts        スキャン品質の簡易判定（撮影写真の警告）
│  ├─ stringJudge.ts        ★弦判定ルールエンジン（§4.4 R1〜R5）
│  ├─ fingering.ts          指番号ラベルの上/下配置（§4.6）
│  ├─ semitone.ts           半音マーク 向き・色（§4.7）
│  ├─ pipeline.ts           変換→判定→配置→半音 の合成／手動修正の再計算
│  └─ exporter.ts           PNG / PDF 書き出し
├─ components/              Uploader / ScoreOverlay / Controls / EditPopover /
│                           AudioControls / SaveButtons / Tutorial / DebugJson
├─ services/omr/            ★OSS楽譜認識サービス（Audiveris + Node ラッパー / Docker）
├─ types/score.ts           データモデル（正典）
└─ __tests__/               ユニットテスト（35件）
```

## セットアップ

```bash
npm install
cp .env.example .env.local   # OMR_SERVICE_URL を認識サービスのURLにする
npm run dev                  # http://localhost:3000

# 別途、楽譜認識サービス（Audiveris）を起動しておく（services/omr/README.md）
docker build -t violin-omr services/omr
docker run --rm -p 8080:8080 violin-omr      # OMR_SERVICE_URL=http://localhost:8080
```

### 環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `OMR_SERVICE_URL` | ✅ | OSS楽譜認識サービス（Audiveris）のベースURL。例: Cloud Run のURL、ローカルは `http://localhost:8080`。APIキーは不要。 |

> 認識サービスの構築・デプロイ（Cloud Run 推奨・スケール0で実質無料）は [`services/omr/README.md`](./services/omr/README.md) を参照。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルド／起動 |
| `npm test` | ユニットテスト（弦判定・半音・配置） |
| `npm run typecheck` | 型チェック |

## デプロイ

**アプリ（Vercel）**
1. リポジトリを Vercel に接続（Root Directory を `violin-score-helper` に指定）。
2. 環境変数 `OMR_SERVICE_URL` に認識サービスのURLを設定。
3. デプロイ。OMR ルートは Node ランタイム（`app/api/omr/route.ts`）で動作（転送＋変換のみ）。

**認識サービス（Cloud Run 等）**
- `services/omr/` を Docker ビルドしてデプロイ。手順・スケール0での実質無料運用は [`services/omr/README.md`](./services/omr/README.md)。

---

## 運用・調整ポイント（引き継ぎ）

顧客が今後調整しうる値は **`lib/constants.ts` に集約**しています。

| 調整したいもの | 変更箇所 |
|---|---|
| 弦の色 | `STRING_COLOR` |
| 弦ハイライトの透け具合 | `STRING_HIGHLIGHT_OPACITY` |
| 半音マークの色 | `SEMITONE_COLOR` |
| ローマ数字→弦 の対応 | `ROMAN_TO_STRING` |
| 指番号の上/下 距離しきい値 | `FINGER_LABEL_DISTANCE_THRESHOLD_PX` |
| テンポの初期/範囲 | `TEMPO_*` |
| 弦判定ルール本体 | `lib/stringJudge.ts`（R1〜R5・純粋関数） |
| MusicXML→座標の換算 | `lib/musicXml.ts` の `CALIBRATION`（実スキャンで微調整） |
| 撮影写真の警告しきい値 | `lib/scanQuality.ts` の `SCAN_THRESHOLDS` |
| 認識サービス（Audiveris） | `services/omr/`（Dockerfile / ラッパー） |

弦判定を変えたら **必ず `npm test`** を通してください（R3「0 vs 4」の必須ケースが回帰防止に入っています）。

## 既知の仕様補足・要確認事項

**重要**：`DESIGN_NOTES.md` に、要件定義書の記載と実装差分（レ(D)の第4指の弦の誤記など）や、精度・将来機能の前提を整理しています。実装前に一読ください。
