# 5分でデプロイ — 電子契約ツール

## オプション1: Render (推奨, 無料枠あり)

1. https://render.com にログイン → New → Blueprint
2. このリポジトリを選択 → `render.yaml` が自動検出される
3. 「Apply」 で Web + Postgres がプロビジョニング
4. ダッシュボードで以下の env を設定:
   - `APP_BASE_URL` (Render が割り当てた URL)
   - `ECONTRACT_COMPANY_NAME`
   - `ECONTRACT_DEFAULT_FROM` (メール差出人)
   - `SENDGRID_API_KEY`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_HOSTED_DOMAIN`
5. Google OAuth リダイレクトURIに `<APP_BASE_URL>/auth/google/callback` を登録
6. 自動ビルド完了 → `<APP_BASE_URL>/healthz` が `{"status":"ok"}` を返せば成功
7. Render Shell で `flask --app econtract.wsgi seed` を1回実行 (サンプルテンプレ投入)

## オプション2: Docker (自社サーバー / VPS)

```bash
docker build -t econtract .
docker compose up -d  # docker-compose.yml は別途用意してください (Postgres + econtract)
```

## オプション3: Vercel
`api/index.py` + `vercel.json` で Vercel の Python serverless にデプロイできます
(手順は `VERCEL.md`)。デフォルトのままプレビュー起動しますが、サーバーレスは
永続ストレージを持たないため、生成した PDF は永続化されず、DB も外部 Postgres
(`DATABASE_URL`) が必須です。PDF保管・永続ストレージ・バックグラウンド処理を
そのまま使うなら Render か Docker を推奨します。
