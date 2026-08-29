# AIアウトバウンド営業 SaaS

こちらから電話をかけ、AIが営業トークを行い、アポ獲得・興味度判定・フォローアップ管理までを行うマルチテナントSaaS。

## 技術スタック

- Next.js (App Router) / TypeScript / Tailwind CSS / shadcn/ui
- Supabase(RLS・マルチテナント)
- Clerk(組織 = テナント)
- Grok Voice(xAI)による発信 / FABLE(Anthropic)による通話分析
- Vercel デプロイ

## 法令遵守(最初から内蔵)

- **拒否リスト(DNC)**: 断られた番号への再架電をシステムがブロック
- **冒頭名乗りの強制**: 事業者名・通話目的をスクリプトに強制挿入(特定商取引法)
- **架電時間帯制限**: 常識的な時間帯(デフォルト 9〜20時 JST)以外の発信をブロック
- **録音・同意記録**: 全通話の録音URLと同意有無を記録

## セットアップ

```bash
npm install
cp .env.local.example .env.local  # キーを設定
npm run dev
```

- Clerk / Supabase のキーが未設定の場合は**デモモード**で起動します(認証スキップ・インメモリデータ・発信はドライラン)。
- Supabase を使う場合は `supabase/migrations/` の SQL を適用してください。
- Grok Voice の SIP 設定が未設定の場合、発信は常にドライラン(ログのみ)です。

## ディレクトリ

- `app/` — 画面(ダッシュボード・営業リスト・DNC・シナリオ・キャンペーン・架電結果)
- `lib/store/` — データ層(Supabase / インメモリの切替)
- `lib/compliance.ts` — 法令遵守ガードレール
- `lib/voice/` — Grok Voice 発信コネクタ(ドライラン対応)
- `supabase/migrations/` — スキーマ + RLS ポリシー
