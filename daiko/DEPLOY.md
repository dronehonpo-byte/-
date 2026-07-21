# 本番デプロイ手順 — 代行の窓口

構成: **Render**（Webサービス＋永続Postgres＋永続ディスク）／SMSは当面 **console**（画面表示）／**独自ドメイン**運用。

---

## 1. Render にデプロイ
1. https://render.com にログイン → **New → Blueprint**
2. このリポジトリを選択。`daiko/render.yaml` が検出される（rootDir は `daiko`、`daiko-db`(Postgres) と永続ディスクも一緒に作成される）。
3. **Apply** でプロビジョニング。
4. Web サービスの **Environment** で次を設定:
   - `DAIKO_ADMIN_PASSWORD` … 管理者ログインの本番パスワード（推測されにくい値・必須）
   - `APP_BASE_URL` … 後述の独自ドメイン（未取得ならまず Render の `https://daiko-xxxx.onrender.com` を入れ、ドメイン確定後に更新）
   - `DAIKO_SECRET_KEY` / `DATABASE_URL` … 自動設定（変更不要）
5. デプロイ時に `flask --app wsgi init-db` が走り、テーブルは自動作成される。
6. 初回のみ Render の **Shell** で管理者と参加業者を投入:
   ```bash
   flask --app wsgi seed
   ```
   → 管理者ログインと、テスト業者「エンペラー代行」のドライバーログイン（電話番号＋自動生成パスワード）が表示される。**必ず控える。**
7. `<APP_BASE_URL>/healthz` が `{"status":"ok"}` を返せば成功。

## 2. 独自ドメインの接続
1. ドメインを取得（例: `daiko-madoguchi.jp`。お名前.com / ムームードメイン / Cloudflare 等）。
2. Render の Web サービス → **Settings → Custom Domains → Add** でドメインを追加。
3. 表示される指示どおり、ドメイン側の DNS に **CNAME（サブドメイン）** または **A レコード（ルート）** を設定。
4. 証明書（HTTPS）が自動発行されるのを待つ（数分〜）。
5. `APP_BASE_URL` を独自ドメインに更新して再デプロイ。
6. ドメイン確定後、**正式版QRコード**（お客様用／ドライバー用）を作成してお渡しします。

## 3. お客様の入口URL（ドメイン確定後の例）
- お客様用 : `https://<ドメイン>/`
- ドライバー・業者用 : `https://<ドメイン>/driver`
- 管理者用 : `https://<ドメイン>/staff`

---

## ⚠️ 公開前に必ず確認（重要）
- **SMS認証は現在 console モード**＝認証コードが画面に表示される簡易方式です。**テスト・限定パイロット向け**で、一般公開（誰でも登録可）には不向きです。本番公開前に Twilio へ切り替えてください。
  ```
  SMS_BACKEND=twilio
  DAIKO_OTP_SHOW_IN_RESPONSE=false
  TWILIO_ACCOUNT_SID=...
  TWILIO_AUTH_TOKEN=...
  TWILIO_FROM_NUMBER=+81XXXXXXXXXX
  ```
- **地図サービス**: 既定は無料の OpenStreetMap 系（タイル/Nominatim/OSRM 公開サーバー）。利用ポリシー・レート制限があり、商用本番では自社契約のサービスへ切り替え推奨:
  `DAIKO_MAP_TILE_URL` / `DAIKO_NOMINATIM_URL` / `DAIKO_OSRM_URL`
- **利用規約・プライバシーポリシー・特定商取引法に基づく表記**の掲載（運営者情報は env で設定済み）。

---

## 付録: Docker / VPS で動かす場合
```bash
cd daiko
pip install -r requirements.txt
export DAIKO_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
export DAIKO_ADMIN_PASSWORD='＜本番パスワード＞'
export DATABASE_URL=postgresql://user:pass@host:5432/daiko   # 省略時は SQLite
flask --app wsgi seed
gunicorn -c gunicorn.conf.py wsgi:app
```
