# デプロイ手順 — 代行の窓口

## オプション1: Render（推奨・無料枠あり）

1. https://render.com にログイン → **New → Blueprint**
2. このリポジトリを選択。`daiko/render.yaml` が検出される（rootDir は `daiko`）。
3. 「Apply」で Web サービス + Postgres がプロビジョニングされる。
4. ダッシュボードで env を設定:
   - `APP_BASE_URL`（Render が割り当てた URL、または独自ドメイン）
5. デプロイ完了後、Render の **Shell** で初期データを投入:
   ```bash
   flask --app wsgi seed
   ```
   → 管理者ログインと、参加業者「エンペラー代行」のドライバーログインが表示されます（控えてください）。
6. `<APP_BASE_URL>/healthz` が `{"status":"ok"}` を返せば成功。

### SMS を本番（実送信）にする
Twilio 契約後、env を更新して再デプロイ:
```
SMS_BACKEND=twilio
DAIKO_OTP_SHOW_IN_RESPONSE=false
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+81XXXXXXXXXX
```

## オプション2: Docker / VPS

```bash
cd daiko
pip install -r requirements.txt
export DAIKO_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
export DATABASE_URL=postgresql://user:pass@host:5432/daiko   # 省略時は SQLite
flask --app wsgi seed
gunicorn -c gunicorn.conf.py wsgi:app
```

## 地図サービスについて
既定は無料の OpenStreetMap 系（タイル/Nominatim/OSRM の公開サーバー）。
**公開サービスは利用ポリシー・レート制限があり、商用本番では自社契約のタイル/ジオコーディング
（例: MapTiler, Mapbox, Google Maps）へ `DAIKO_MAP_TILE_URL` / `DAIKO_NOMINATIM_URL` /
`DAIKO_OSRM_URL` を切り替えてください。**
