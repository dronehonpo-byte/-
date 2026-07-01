# 🎻 バイオリン楽譜 弦色・指番号・半音マーク表示Webアプリ

楽譜画像をアップロードすると、Claude Vision API が楽譜を解析し、各音符に
**弦色（色付き円）・指番号・半音マーク** をオーバーレイ表示します。
元の楽譜の印刷内容はそのまま残す「オーバーレイ方式」です。

## 主な機能（実装済み）

### Phase 1（必須）
- 楽譜画像のアップロード（ドラッグ＆ドロップ / ファイル選択 / スマホカメラ撮影）
- Claude `claude-sonnet-4-6` Vision API による楽譜解析
- 音符への弦色オーバーレイ（G=茶 `#8B4513` / D=緑 `#228B22` / A=ピンク `#E05C5C` / E=黄 `#FFD700`）
- 指番号（0〜4）表示 ― 配置ルール ①〜④ をすべて実装
  - ①高音域で上にスペースが無い → 下側
  - ②元楽譜で指番号が下に印字 → 以降も下側
  - ③重音の下の音 → 下側
  - ④最優先距離ルール（符頭から80px以上 → 近い側／松葉・強弱記号と重なるなら上）
- 半音マーク（`^` / `v`、青 `#1E90FF`）
- 表示モード切替（弦色のみ / ＋指番号 / ＋半音マーク）
- PNG 保存

### Phase 2
- 手動修正（弦・指番号・半音マークON/OFF・上下切替） ― localStorage に保存
- 音源再生（Tone.js FMSynth・バイオリン風）＋テンポ調整（40〜200 BPM）＋再生中ハイライト
- PDF 保存（A4）
- 解析モード A（おまかせ）/ B（開放弦優先・第4指を最小限）

## 技術スタック
- Next.js (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude `claude-sonnet-4-6` Vision API
- Tone.js（ブラウザ内シンセ）
- html2canvas + jsPDF（画像/PDF 保存）

## セットアップ

```bash
cd violin-score-app
npm install
cp .env.local.example .env.local   # ANTHROPIC_API_KEY を設定
npm run dev
```

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

API キーはサーバーサイド（Next.js API Route `app/api/analyze/route.ts`）でのみ
使用され、フロントエンドには露出しません。

## ディレクトリ構成
```
violin-score-app/
├── app/
│   ├── page.tsx                # アップロード画面
│   ├── result/page.tsx         # 解析結果・表示画面
│   └── api/analyze/route.ts    # Claude Vision API 呼び出し
├── components/
│   ├── ScoreCanvas.tsx         # 楽譜画像 + オーバーレイ
│   ├── NoteOverlay.tsx         # 弦色・指番号・半音マーク描画(SVG)
│   ├── AudioPlayer.tsx         # Tone.js 音源プレイヤー
│   ├── ManualEditor.tsx        # 手動修正UI
│   ├── ExportButtons.tsx       # PNG/PDF 保存
│   ├── DisplayModeToggle.tsx   # 表示モード切替
│   └── Tutorial.tsx            # 初回チュートリアル
├── lib/
│   ├── fingeringRules.ts       # 弦・指番号判定ロジック（ルール1〜5）
│   ├── halfStepDetector.ts     # 半音判定
│   ├── overlay.ts              # 指番号配置ルール①〜④ + オーバーレイ計算
│   ├── audioGenerator.ts       # 音符→再生スケジュール
│   ├── prompt.ts               # Vision API システムプロンプト
│   ├── colors.ts               # 弦色定義
│   └── storage.ts              # session/localStorage
└── types/score.ts              # 型定義
```

## Vercel デプロイ

このアプリはリポジトリ直下の `violin-score-app/` サブディレクトリにあります。
Vercel プロジェクト作成時に **Root Directory を `violin-score-app`** に設定し、
環境変数 `ANTHROPIC_API_KEY` を登録してください。

## 既知の制限・メモ
- **PDF 入力は未対応**：現状は画像（JPG / PNG / WebP）のみ。PDF はページを画像化してからアップロードしてください。
- 座標精度は Claude Vision の推定に依存します。ずれは手動修正で調整できます。
- 送信画像は長辺 1600px に自動縮小されます（精度と速度のバランス）。
- `npm audit` に jspdf / next / postcss の勧告が残りますが、いずれも本アプリの
  使用形態（自前生成した canvas 画像のみを PDF 化、信頼できない入力を渡さない）では
  実害がないもの、または現時点で修正版が未リリースのものです。
```
