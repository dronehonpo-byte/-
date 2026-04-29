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
# 公開（クライアントから参照）
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_LINE_URL=https://lin.ee/your-line
NEXT_PUBLIC_TIMEREX_URL=https://timerex.net/s/your-page

# お問い合わせフォーム送信先（デフォルト: dronehonpo@gmail.com）
CONTACT_TO_EMAIL=dronehonpo@gmail.com

# SMTP（未設定時はサーバーログに記録のみ：開発／プレビュー用フォールバック）
# Gmail を使う場合は「アプリパスワード」を発行して SMTP_PASS に設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sender@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=your-sender@gmail.com
SMTP_SECURE=false
```

### お問い合わせフォーム

- 送信先: `CONTACT_TO_EMAIL`（デフォルト `dronehonpo@gmail.com`）
- 実装: `app/api/contact/route.ts`（POST）
- SMTP 環境変数が揃っていれば nodemailer で実送信。未設定時は payload を
  サーバーログに出力して 200 を返すため、UI 動線は壊れません（プレビュー想定）。
- Honeypot フィールド（`website`）と簡易バリデーションで bot を排除。

## 会社情報

- 社名: 株式会社Miyabee
- 住所: 東京都千代田区神田須田町1丁目7番地8 VORT秋葉原2F
- 電話: 070-9190-9320
- メール: info@dronehonpo.jp
