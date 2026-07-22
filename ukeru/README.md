# UKERU — AI コールセンター SaaS

UKERU は AI が電話応対を支援するコールセンター SaaS です。着信の自動応答、通話ログの
記録・文字起こし、ナレッジベースを活用した回答生成を一つのダッシュボードで管理します。

## 技術スタック

- **Next.js** (App Router / TypeScript)
- **Tailwind CSS**
- **shadcn/ui** — UI コンポーネント
- **Supabase** (`@supabase/supabase-js`) — データベース
- **Clerk** (`@clerk/nextjs`) — 認証
- **lucide-react** — アイコン
- **recharts** — グラフ / ダッシュボード可視化
- **date-fns** — 日付ユーティリティ

> ℹ️ `create-next-app@latest` で生成したため、実際に導入されたのは Next.js 16 /
> Tailwind CSS v4 系です（`@latest` の現行版）。Next.js 14 / Tailwind v3 に固定
> したい場合は `create-next-app@14` などバージョンを指定して再生成してください。

## ブランドカラー

| 役割       | カラー          | HEX       |
| ---------- | --------------- | --------- |
| プライマリ | ディープネイビー | `#0F1B2D` |
| アクセント | ゴールド         | `#C9A84C` |

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集して各種キーを設定

# 開発サーバー起動
npm run dev
```

`http://localhost:3000` を開くと `/dashboard` にリダイレクトされます。

## 環境変数

`.env.local.example` を参照してください。

| 変数名                              | 用途                        |
| ----------------------------------- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase プロジェクト URL   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase 匿名キー           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公開キー              |
| `CLERK_SECRET_KEY`                  | Clerk シークレットキー      |
| `XAI_API_KEY`                       | xAI (Grok) API キー         |
| `SLACK_WEBHOOK_URL`                 | Slack 通知用 Webhook URL    |

> Clerk のキーが未設定でも開発サーバーは起動します（`layout.tsx` でガード済み）。

## 画面構成

サイドバーナビゲーションから以下のセクションにアクセスできます。

- **ダッシュボード** (`/dashboard`) — 稼働状況の統計と着信ボリュームのグラフ
- **通話ログ** (`/call-logs`)
- **エージェント** (`/agents`)
- **ナレッジ** (`/knowledge`)
- **電話番号** (`/phone-numbers`)
- **設定** (`/settings`)
