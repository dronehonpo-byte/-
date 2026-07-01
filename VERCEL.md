# Vercel へのデプロイ (電子契約 Web アプリ)

このリポジトリは Vercel の Python サーバーレス環境で動作するよう構成されています。

- エントリポイント: `api/index.py` (Flask WSGI アプリ `app` を Vercel が自動検出)
- ルーティング: `vercel.json` の rewrites で全パスを `api/index` へ転送
- 依存関係: リポジトリ直下の `requirements.txt` (`-r econtract/requirements.txt`)

## デプロイ手順

1. Vercel でこのリポジトリを Import (GitHub 連携)
2. Framework Preset は **Other**、Root Directory は **リポジトリ直下** のまま
3. Deploy を実行 → ビルド (pip install) が通り、デプロイが完了します

デフォルト設定のままでもプレビューとして起動します (揮発性 SQLite + コンソール
メール + 一時 SECRET_KEY)。ログイン・登録も試せます。

## 本番運用で必ず設定する環境変数 (Vercel ダッシュボード)

| 変数 | 説明 |
| :-- | :-- |
| `ECONTRACT_SECRET_KEY` | 安定した秘密鍵。未設定だとコールドスタートごとに再生成され、セッションが切れます。`python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | 外部 Postgres 接続URL。**必須** — サーバーレスの SQLite は揮発性で、リクエスト間・インスタンス間で共有されません。 |
| `APP_BASE_URL` | 公開URL (例 `https://<project>.vercel.app`) |
| `ECONTRACT_COMPANY_NAME` | 自社名 |
| `EMAIL_BACKEND` | `sendgrid` / `smtp` / `console` |
| `SENDGRID_API_KEY` | `EMAIL_BACKEND=sendgrid` のとき |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_HOSTED_DOMAIN` | Google OAuth を使う場合 |

`DATABASE_URL` を設定した場合、テーブル作成 (マイグレーション) は別途実行が必要です:

```bash
flask --app econtract.wsgi db upgrade
```

## サーバーレスの制約 (重要)

Vercel は本アプリ本来の想定 (Render / Docker) とは異なり、以下の制約があります:

- **ファイルシステムは読み取り専用** (書き込みは `/tmp` のみ、かつインスタンス間で共有されず揮発)。
  そのため生成した契約 PDF / 署名画像は**永続化されません**。永続化には S3 等の外部
  オブジェクトストレージ対応が別途必要です (現状のコードはローカルFS前提)。
- **バックグラウンド処理は不可** (関数はリクエスト単位で実行)。
- SQLite は揮発するため、実運用では必ず外部 Postgres (`DATABASE_URL`) を使用してください。

永続ストレージ・PDF 保管・バックグラウンド処理をそのまま使いたい場合は、
`DEPLOY.md` に記載の **Render** または **Docker** を推奨します。
