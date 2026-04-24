# KUHAKU LP

株式会社Miyabeeが提供するAIコンサルティング／業務自動化支援サービス「KUHAKU」のランディングページ。

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Vercel デプロイ前提

## ページ構成

- `/` ランディングページ本体
- `/ai-shindan` 30秒AI診断
- `/legal/terms` 利用規約
- `/legal/specified-commercial-transactions` 特定商取引法に基づく表記
- `/legal/privacy-policy` プライバシーポリシー

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000

## 環境変数

`.env.local` を作成：

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_LINE_URL=https://lin.ee/your-line
NEXT_PUBLIC_TIMEREX_URL=https://timerex.net/s/your-page
```

## 会社情報

- 社名: 株式会社Miyabee
- 住所: 東京都千代田区神田須田町1丁目7番地8 VORT秋葉原2F
- 電話: 070-9190-9320
- メール: info@dronehonpo.jp
