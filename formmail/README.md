# formmail — Formspreeライク + メルマガ配信

Formspree のような **HTMLフォーム受付サービス** と、シンプルな **メルマガ配信** を1つにまとめた小さな Flask アプリです。

## 主な機能

### フォーム受付 (Formspree互換)
- ログインユーザがフォームを作成すると、固有のエンドポイント `https://<host>/f/<key>` が発行されます
- 任意のサイトの `<form>` からそのURLにPOSTすると、送信内容を**指定のメールアドレスに転送**
- `application/x-www-form-urlencoded` と `application/json` の両方を受け付け
- `Accept: application/json` または `X-Requested-With: XMLHttpRequest` の場合は JSON 応答 (AJAX 用)、それ以外は thanks ページ or 指定の `redirect_url`
- CORS 対応 (`Access-Control-Allow-Origin: *`)
- 隠しフィールド (`_gotcha`) によるハニーポット式スパム判定
- 送信元 (`email` 等) を自動検出して `Reply-To` に設定
- 管理画面で送信履歴を閲覧

### メルマガ配信
- 配信リスト (Subscriber List) を作成し、購読者を管理
- 公開購読URL `/subscribe/<public_key>` を任意サイトに貼って読者を集める
- ダブルオプトイン (確認メール) 対応
- CSV インポート (1列目: メール, 2列目: 名前)
- キャンペーン (件名 + HTML/テキスト本文) を作成し、ボタン1つで一斉配信
- 全メールに**配信停止リンクと `List-Unsubscribe` ヘッダ**を自動付与
- 配信停止トークンは HMAC で署名 (DB ルックアップ不要、改ざん検知)

## ローカル起動

```bash
python3 -m venv .venv
.venv/bin/pip install -r formmail/requirements.txt

# 環境変数 (最低限)
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(32))")
export DATABASE_URL=sqlite:///formmail.db
export APP_BASE_URL=http://localhost:5000

# 開発時はSMTP接続せずログに出すモード
export MAIL_DEBUG_LOG=true

# DBテーブル作成
.venv/bin/flask --app formmail.wsgi init-db

# 起動
.venv/bin/python -m formmail.wsgi
# → http://localhost:5000
```

## 本番設定 (SMTP)

```bash
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USER=apikey
export SMTP_PASSWORD=SG.xxxxxxxx
export SMTP_USE_TLS=true
export MAIL_DEFAULT_FROM="Acme <noreply@acme.example>"
export MAIL_DEBUG_LOG=false
```

## デプロイ (gunicorn)

```bash
gunicorn -b 0.0.0.0:8000 formmail.wsgi:app
```

DB マイグレーションが要らない初回起動なら `flask --app formmail.wsgi init-db` を一度実行してください。

## HTMLフォームの例

```html
<form action="https://your-host/f/abcd1234" method="POST">
  <input type="email"    name="email"    placeholder="メール">
  <textarea              name="message"  placeholder="本文"></textarea>
  <!-- ハニーポット -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">送信</button>
</form>
```

AJAX で送る場合は `Accept: application/json` ヘッダを付ければ JSON で結果が返ります。

## 注意 / 既知の制約
- 送信処理は**リクエスト中に同期で SMTP 送信**します。大規模配信を行う場合は Celery 等のジョブキューへの切り替えを推奨。
- 開封・クリック追跡、バウンス処理、再試行は未実装。
- 認証は単一管理者用途を想定したシンプルな email+password。
