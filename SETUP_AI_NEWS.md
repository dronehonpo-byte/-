# AI ニュース自動収集スクリプト セットアップ手順

## 概要

RSSフィードからAI関連ニュースを自動取得し、Claude APIで分析して
Google Sheetsに蓄積するスクリプトです。

## 必要なもの

1. Python 3.10 以上
2. Anthropic API キー
3. Google Cloud サービスアカウント
4. Google スプレッドシート

---

## セットアップ手順

### 1. ライブラリのインストール

```bash
pip install -r requirements_ai_news.txt
```

### 2. Anthropic API キーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. API Keys ページでキーを作成
3. キーをコピーしておく

### 3. Google Sheets API の設定

#### 3-1. Google Cloud プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成

#### 3-2. API を有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. 以下の2つを有効化:
   - **Google Sheets API**
   - **Google Drive API**

#### 3-3. サービスアカウント作成

1. 「APIとサービス」→「認証情報」→「認証情報を作成」
2. 「サービスアカウント」を選択
3. 名前を入力して作成
4. 「キー」タブ →「鍵を追加」→「新しい鍵を作成」→ JSON を選択
5. ダウンロードされた JSON ファイルを `credentials.json` としてスクリプトと同じフォルダに配置

#### 3-4. スプレッドシートの共有

1. Google Sheets で新しいスプレッドシートを作成
2. `credentials.json` 内の `client_email` の値をコピー
3. スプレッドシートの「共有」からそのメールアドレスを **編集者** として追加
4. スプレッドシートのURLから ID をコピー
   - URL例: `https://docs.google.com/spreadsheets/d/【この部分がID】/edit`

### 4. 環境変数の設定

```bash
# .env.example をコピーして .env を作成
cp .env.example .env
```

`.env` を編集:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx（取得したキー）
SPREADSHEET_ID=xxxxx（スプレッドシートのID）
GOOGLE_SHEETS_CREDENTIALS_FILE=credentials.json
```

---

## 実行方法

```bash
python ai_news_collector.py
```

### 定期実行（cron 設定例）

毎日朝8時に自動実行する場合:

```bash
# crontab -e で以下を追加
0 8 * * * cd /path/to/project && /path/to/python ai_news_collector.py
```

---

## Google Sheets のカラム構成

| カラム | 内容 |
|--------|------|
| date | 取得日時 |
| source | ニュースソース名 |
| title | 記事タイトル |
| url | 記事URL |
| summary | 3行要約 |
| importance_score | 重要度（1〜5） |
| category | カテゴリ |
| why_it_matters | なぜ重要か |
| business_use_case | 実務での活用法 |
| sales_automation_relevance | 営業自動化との関連性 |
| content_idea | 発信ネタ3つ |
| action | 今すぐ試すべきか |

---

## RSSフィードのカスタマイズ

`ai_news_collector.py` 内の `RSS_FEEDS` リストを編集して
対象フィードを追加・変更できます:

```python
RSS_FEEDS = [
    {"name": "フィード名", "url": "https://example.com/feed"},
    # ... 追加
]
```

---

## トラブルシューティング

| 問題 | 対処法 |
|------|--------|
| `ANTHROPIC_API_KEY が設定されていません` | `.env` ファイルにキーを設定 |
| `Google Sheets接続エラー` | `credentials.json` のパスとスプレッドシートの共有設定を確認 |
| `フィード解析エラー` | そのRSSフィードのURLが有効か確認 |
| `JSON解析エラー` | Claude APIの応答形式の問題。ログを確認 |
