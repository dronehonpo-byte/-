# バイオリン楽譜ヘルパー（violin-score-helper）

バイオリンの楽譜写真をアップロードすると、**①使う弦の色分け／②指番号／③半音マーク(^ / v)** を自動付与し、**④テンポ調整付きの練習音源**を鳴らし、**⑤タップで手動修正／⑥PNG・PDF保存**できる、スマホ・PC対応のレスポンシブWebアプリです。

対象：バイオリン初級〜中級の生徒／指導者。方針は「100%全自動」ではなく **「自動判定＋手動修正」**。

> 正典：[`要件定義書_バイオリン楽譜アプリ.md`](./要件定義書_バイオリン楽譜アプリ.md) ／ 実装指示：[`ClaudeCodeプロンプト書_バイオリン楽譜アプリ.md`](./ClaudeCodeプロンプト書_バイオリン楽譜アプリ.md)

---

## 技術スタック

- **Next.js 14（App Router）+ TypeScript + Tailwind CSS**（Vercel デプロイ想定）
- **OMR（楽譜読み取り）**：Vision対応モデルの**実API**で画像→構造化JSON化（モック不使用）
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
│  └─ api/omr/route.ts      OMR 実API呼び出し（サーバー）
├─ lib/
│  ├─ constants.ts          ★調整用の定数集約（色・閾値・ローマ数字対応 等）
│  ├─ music.ts              音高⇔弦・指の計算（第1ポジション中心）
│  ├─ stringJudge.ts        ★弦判定ルールエンジン（§4.4 R1〜R5）
│  ├─ fingering.ts          指番号ラベルの上/下配置（§4.6）
│  ├─ semitone.ts           半音マーク 向き・色（§4.7）
│  ├─ pipeline.ts           OMR→判定→配置→半音 の合成／手動修正の再計算
│  ├─ omrPrompt.ts          OMR 用プロンプト
│  └─ exporter.ts           PNG / PDF 書き出し
├─ components/              Uploader / ScoreOverlay / Controls / EditPopover /
│                           AudioControls / SaveButtons / Tutorial / DebugJson
├─ types/score.ts           データモデル（正典）
└─ __tests__/               ユニットテスト（26件）
```

## セットアップ

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を実キーに書き換える
npm run dev                  # http://localhost:3000
```

### 環境変数（APIキー設定）

| 変数 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | OMR に使う Vision対応モデルのAPIキー。**コードに直書きせず** `.env.local`（gitignore済み）で管理。BYOK または Miyabee 管理。 |
| `OMR_MODEL` | 任意 | 使用モデル名（省略時 `claude-sonnet-4-5`）。 |

> APIキーはサーバー側（`app/api/omr/route.ts`）でのみ使用し、ブラウザには渡しません。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルド／起動 |
| `npm test` | ユニットテスト（弦判定・半音・配置） |
| `npm run typecheck` | 型チェック |

## Vercel デプロイ

1. リポジトリを Vercel に接続（Root Directory を `violin-score-helper` に指定）。
2. 環境変数 `ANTHROPIC_API_KEY`（必要なら `OMR_MODEL`）を設定。
3. デプロイ。OMR ルートは Node ランタイム（`app/api/omr/route.ts`）で動作。

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
| OMR プロンプト | `lib/omrPrompt.ts` |

弦判定を変えたら **必ず `npm test`** を通してください（R3「0 vs 4」の必須ケースが回帰防止に入っています）。

## 既知の仕様補足・要確認事項

**重要**：`DESIGN_NOTES.md` に、要件定義書の記載と実装差分（レ(D)の第4指の弦の誤記など）や、精度・将来機能の前提を整理しています。実装前に一読ください。
