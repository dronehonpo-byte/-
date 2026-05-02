# 電子契約クラウド (econtract)

社内利用向けの電子契約管理ツール。マネーフォワード クラウド契約のように、契約書の起票
（テンプレート / 自由入力 / PDF アップロード）から複数署名者への送信、ブラウザ上での
電子署名、締結、監査ログ、締結証明書の発行までをワンストップで提供する Flask アプリです。

## 主な機能

- 📄 **契約起票**
  - テンプレート（NDA / 業務委託 / 雇用 / SaaS / 売買）から変数を埋めて作成
  - 自由入力モード／PDF アップロード対応
- 👥 **マルチパーティ署名**
  - 取引先・社内決裁者・立会人を任意人数追加
  - 署名者ごとにユニークな署名 URL を発行（メール送付想定）
- ✍️ **電子署名**
  - ブラウザ上の手書き署名パッド + テキスト署名
  - 署名時の IP・User-Agent・タイムスタンプを記録
  - 文書ハッシュ＋署名者情報＋時刻に対して **HMAC-SHA256** 署名値を生成
- ✅ **締結フロー**
  - 全員の署名完了で自動的にステータスを「締結完了」に
  - 署名情報ページを差し込んだ「署名済み PDF」を自動生成
  - 監査ログ込みの「締結証明書 PDF」をダウンロード可能
- 🔍 **監査ログ**
  - 作成・編集・送信・署名・拒否・取消・締結のすべてを時系列で記録
- 🛡️ **アクセス制御**
  - 一般ユーザーは自分の契約のみ閲覧、管理者は全契約を閲覧

## ディレクトリ構成

```
econtract/
├── __init__.py            アプリファクトリ
├── config.py              設定
├── extensions.py          Flask 拡張
├── models.py              SQLAlchemy モデル
├── cli.py                 init-db / seed コマンド
├── wsgi.py                エントリポイント
├── blueprints/            画面別ルーティング
│   ├── auth.py
│   ├── contracts.py
│   ├── main.py            ダッシュボード・監査
│   └── sign.py            公開署名ページ
├── services/
│   ├── pdf.py             契約書 / 締結証明書 PDF 生成
│   └── signing.py         署名値生成・署名済 PDF 結合
├── templates/             Jinja2 テンプレート
├── static/                CSS / JS（手書き署名パッド）
├── storage/               生成 PDF / 署名画像
├── instance/              SQLite DB
├── requirements.txt
├── run.sh                 開発用ワンコマンド起動
└── README.md
```

## セットアップ

```bash
cd econtract
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
```

## 起動

```bash
./run.sh
# もしくは:
export FLASK_APP=econtract.wsgi
flask init-db
flask seed
flask run --host=0.0.0.0 --port=5000
```

ブラウザで `http://localhost:5000` を開いてください。

### シードユーザー（`flask seed` 実行後）

| 役割     | メール              | パスワード   |
| -------- | ------------------- | ------------ |
| 管理者   | admin@example.com   | admin1234    |
| 法務担当 | legal@example.com   | legal1234    |

## 環境変数

| 変数 | 既定値 | 説明 |
|------|--------|------|
| `ECONTRACT_SECRET_KEY` | `dev-...` | セッション秘密鍵（本番では必須で変更） |
| `ECONTRACT_DATABASE_URI` | SQLite | SQLAlchemy 接続文字列 |
| `ECONTRACT_COMPANY_NAME` | `株式会社サンプル` | 自社名（PDF 等に表示） |

## 想定する署名フロー

1. 起案者が契約書を起票（テンプレート or 自由入力 or PDF）
2. 署名者を1名以上追加（取引先 / 社内決裁 / 立会人）
3. 「署名依頼を送信」で発行された署名 URL を各担当者へ共有（メール送信は要連携）
4. 各署名者がブラウザで内容確認 → 同意チェック → 手書き or テキスト署名
5. 全員署名完了で自動締結 → 署名済 PDF と締結証明書 PDF が利用可能

## 注意

- 法律上の電子署名法／電子帳簿保存法対応のためには、本実装に加えて
  タイムスタンプ局（TSA）連携、長期署名 PAdES、本人確認(eKYC) 等の組み合わせが必要です。
  本ツールは社内ワークフローのデモ実装としてご利用ください。
