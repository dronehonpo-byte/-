# 電子契約クラウドツール (社内向け)

社内スタッフが PDF / 本文ベースの契約書を作り、外部の取引先へメールリンク経由で
署名してもらう、自社ホスティング前提の Flask アプリです。

- ✅ Google Workspace OAuth (社内ドメイン制限) でスタッフがログイン
- ✅ 取引先(外部) はアカウント不要、メール内リンクで署名
- ✅ PDF への可視署名 (手書き/タイプ) + タイムスタンプ + HMAC-SHA256 ハッシュ
- ✅ 監査ログ (作成・送信・閲覧・署名・締結・取消)
- ✅ 締結証明書 PDF を自動生成
- ✅ メール通知 (SendGrid / SMTP / コンソール の3バックエンド)
- ✅ 契約書テンプレート (NDA・業務委託・雇用・SaaS規約・売買 etc) + 変数差込
- ✅ Render Blueprint 一発デプロイ / Dockerfile 同梱

> **正本性について**: 本ツールが付与するハッシュは「内容の改ざん検知」を目的とした
> HMAC-SHA256 で、e-Sign / 電子署名法 上の「特定認証業務」(認定タイムスタンプ付与)
> ではありません。グループ会社内・取引先との簡易的な合意形成や、書面リプレース用途を
> 想定しています。法的に厳格な真正性が必要な場合は、外部のタイムスタンプ局
> (TSA) を併用してください。

---

## ローカルで動かす

```bash
git clone https://github.com/dronehonpo-byte/-.git
cd -
python -m venv .venv && source .venv/bin/activate
pip install -r econtract/requirements.txt

# 環境変数 (最低限)
cp econtract/.env.example econtract/.env
# .env を編集 — ローカル試験は EMAIL_BACKEND=console のままで OK

# DB 初期化 + サンプルデータ
flask --app econtract.wsgi db upgrade
flask --app econtract.wsgi seed

# 開発サーバー
flask --app econtract.wsgi run --debug
# → http://127.0.0.1:5000
# 初期ログイン: admin@example.com / admin1234
```

---

## Render に本番デプロイ (推奨)

リポジトリに `render.yaml` を入れてあるので、Render の Blueprint からそのまま立ち上げられます。

### 1. Render アカウントとリポジトリ連携
1. https://render.com/ にサインアップ
2. New → Blueprint → このリポジトリを選択
3. `render.yaml` が読み込まれ、Web Service + Postgres が自動でプロビジョニングされます

### 2. 環境変数を Render の Dashboard で設定

| キー | 例 | 説明 |
|---|---|---|
| `APP_BASE_URL` | `https://econtract.onrender.com` | デプロイ後の自分の URL (独自ドメインに変えたら更新) |
| `ECONTRACT_COMPANY_NAME` | `株式会社Miyabee` | 自社名 (PDF とメールに表示) |
| `ECONTRACT_DEFAULT_FROM` | `noreply@miyabee.jp` | メール差出人アドレス |
| `ECONTRACT_DEFAULT_FROM_NAME` | `Miyabee 電子契約` | 差出人表示名 |
| `SENDGRID_API_KEY` | `SG.xxx...` | SendGrid のフルアクセスキー |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | OAuth クライアントID (下記参照) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | OAuth クライアントシークレット |
| `GOOGLE_HOSTED_DOMAIN` | `miyabee.jp` | 許可する Workspace ドメイン |

`ECONTRACT_SECRET_KEY` は `generateValue: true` で Render が自動採番します。

### 3. Google OAuth クライアント発行 (1回限り)

1. Google Cloud Console → 「APIとサービス」→「認証情報」
2. 「OAuth クライアント ID を作成」→ ウェブアプリケーション
3. 承認済みリダイレクト URI に **`https://<Render の URL>/auth/google/callback`** を追加
   - 独自ドメインを後から付けるなら、そっちも追加 (`https://econtract.miyabee.jp/auth/google/callback`)
4. クライアント ID/シークレットを Render の env に貼る
5. (OAuth 同意画面で「内部」を選択しておくと、Workspace のメンバー以外を弾けて安全)

### 4. SendGrid 設定 (1回限り)
1. https://signup.sendgrid.com で無料アカウント (12,000通/月まで無料)
2. Email API → Single Sender か Domain Authentication で送信元検証
   - 独自ドメインで送るなら Domain Authentication 推奨 (DKIM/SPF が自動で揃う)
3. Settings → API Keys → 新規作成 → 「Full Access」
4. Render の `SENDGRID_API_KEY` に入れる

### 5. デプロイ

```bash
git push
```

push すると Render が自動でビルド → `flask db upgrade` 実行 → gunicorn 起動。
`/healthz` で 200 が返れば成功。

### 6. 初回管理者の作成
```bash
# Render の Shell (Web Service の右上から開く) で実行
flask --app econtract.wsgi seed
```
これでサンプル管理者 `admin@example.com / admin1234` と各種テンプレートが投入されます。
**本番ではログイン後すぐに `/auth/register` または DB で安全なパスワードに変えるか、
このアカウントを削除し Google OAuth のみで運用してください。**

---

## Docker で動かす場合 (社内 VPS など)

```bash
docker build -t econtract .
docker run -d --name econtract \
  -p 8000:8000 \
  -e ECONTRACT_SECRET_KEY="$(openssl rand -hex 32)" \
  -e DATABASE_URL=postgresql://user:pass@db:5432/econtract \
  -e APP_BASE_URL=https://econtract.example.com \
  -e GOOGLE_CLIENT_ID=... \
  -e GOOGLE_CLIENT_SECRET=... \
  -e GOOGLE_HOSTED_DOMAIN=miyabee.jp \
  -e SENDGRID_API_KEY=... \
  -e EMAIL_BACKEND=sendgrid \
  -v econtract-storage:/app/econtract/storage \
  econtract
```

リバースプロキシ (Caddy / nginx) 配下で TLS を当ててください。

---

## 機能フロー

```
[社内スタッフ]                             [外部取引先]
     │ Google OAuth ログイン
     ▼
┌────────────┐
│ 契約書作成   │  ─ PDFをアップロード or 本文+テンプレ
│ 署名者を追加 │  ─ name + email + 会社
└──────┬─────┘
       │ [送信]
       ▼
   メール送信 ───────────────────►  メール受信 + リンククリック
                                        │
                                        ▼
                                   [署名画面]
                                  PDF を確認
                                  手書きor タイプで署名
                                  同意 → 提出
                                        │
                                        ▼
   全員署名済み判定                  完了画面
       │
       ├─ 署名証明ページ付きPDF生成
       ├─ 監査ログ記録
       └─ 完了通知メール (社内 + 外部)
```

---

## CLI コマンド

```bash
flask --app econtract.wsgi db upgrade        # マイグレーション適用
flask --app econtract.wsgi db migrate -m "..." # 新マイグレーション (モデル変更時)
flask --app econtract.wsgi seed              # サンプルテンプレ + 管理者投入
```

---

## テスト

```bash
PYTHONPATH=. pytest econtract/tests -v
```

---

## ディレクトリ

```
econtract/
├── __init__.py            # Application Factory
├── config.py              # 環境変数からの設定
├── extensions.py          # db / login / migrate / oauth
├── models.py              # User / Template / Contract / Signer / AuditLog
├── wsgi.py                # gunicorn エントリ
├── gunicorn.conf.py
├── cli.py                 # flask seed
├── blueprints/
│   ├── auth.py            # email+pw / Google OAuth
│   ├── contracts.py       # 内部用: 作成/編集/送信/再送
│   ├── sign.py            # 外部用: 公開URL署名
│   └── main.py            # ダッシュボード/監査ログ
├── services/
│   ├── pdf.py             # reportlab で日本語PDF生成
│   ├── signing.py         # ハッシュ + 署名画像 + PDFスタンプ
│   └── email.py           # SendGrid / SMTP / console
├── templates/             # Jinja2 (HTML + email)
├── static/
├── storage/               # 契約PDF + 署名画像 (本番では永続ディスク)
└── migrations/            # Alembic
```

---

## ライセンス & お問い合わせ

社内利用想定。商用ライセンスや改変についてはリポジトリ管理者まで。
