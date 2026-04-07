# 勤怠管理Slackボット セットアップガイド

## 概要
- Slackで「出勤」と入力 → 出勤時刻を記録
- Slackで「退勤」と入力 → 退勤時刻とGoogleカレンダーにイベント作成

## 1. Slack Appの作成

### 1.1 Slack Appを作成
1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」
3. App名を入力（例: 勤怠管理ボット）
4. ワークスペースを選択

### 1.2 Bot Token Scopesを設定
「OAuth & Permissions」→「Scopes」→「Bot Token Scopes」に以下を追加:
- `chat:write` - メッセージ送信
- `users:read` - ユーザー情報取得
- `app_mentions:read` - メンション検知

### 1.3 Event Subscriptionsを設定
「Event Subscriptions」→「Enable Events」をオン
「Subscribe to bot events」に以下を追加:
- `message.channels` - パブリックチャンネルのメッセージ
- `message.groups` - プライベートチャンネルのメッセージ
- `app_mention` - メンション

### 1.4 Socket Modeを有効化（推奨）
「Socket Mode」→「Enable Socket Mode」をオン
App-Level Tokenを生成（`connections:write` scope付き）

### 1.5 アプリをインストール
「Install App」→「Install to Workspace」
Bot User OAuth Tokenをコピー

## 2. Google Calendar APIの設定

### 2.1 Google Cloud Projectを作成
1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクトを作成

### 2.2 Google Calendar APIを有効化
1. 「APIとサービス」→「ライブラリ」
2. 「Google Calendar API」を検索して有効化

### 2.3 サービスアカウントを作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. サービスアカウント名を入力して作成
4. キーを作成（JSON形式）してダウンロード

### 2.4 カレンダーを共有
1. Googleカレンダーを開く
2. 使用するカレンダーの設定→「特定のユーザーとの共有」
3. サービスアカウントのメールアドレス（xxx@xxx.iam.gserviceaccount.com）を追加
4. 権限を「変更および共有の管理権限」に設定

## 3. 環境変数の設定

```bash
# Slack設定
export SLACK_BOT_TOKEN="xoxb-xxxx"  # Bot User OAuth Token
export SLACK_SIGNING_SECRET="xxxx"  # Signing Secret
export SLACK_APP_TOKEN="xapp-xxxx"  # App-Level Token (Socket Mode用)

# Google Calendar設定
export GOOGLE_CREDENTIALS_PATH="/path/to/credentials.json"
export GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
```

## 4. 起動

```bash
# 依存関係インストール
pip install -r requirements.txt

# 起動
python attendance_bot.py
```

## 5. 使い方

### 出勤
チャンネルで「出勤」と送信

### 退勤
チャンネルで「退勤」と送信

### ヘルプ
ボットをメンション（@勤怠管理ボット）

## 記録される情報
- Slack User ID
- ユーザー名
- 出勤時刻
- 退勤時刻
- 勤務時間
