#!/usr/bin/env python3
"""
勤怠管理Slackボット
- 「出勤」メッセージで出勤時刻を記録
- 「退勤」メッセージで退勤時刻を記録し、Googleカレンダーにイベント作成

必要な環境変数:
- SLACK_BOT_TOKEN: Slack Bot OAuth Token
- SLACK_SIGNING_SECRET: Slack Signing Secret
- GOOGLE_CREDENTIALS_PATH: Google Calendar API認証情報JSONファイルのパス
- GOOGLE_CALENDAR_ID: 記録先のGoogleカレンダーID
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 日本時間
JST = timezone(timedelta(hours=9))

# 出勤記録を保持（user_id -> clock_in_time）
attendance_records: dict[str, datetime] = {}

# 永続化用ファイル
RECORDS_FILE = Path(__file__).parent / "attendance_records.json"


def load_records():
    """永続化された出勤記録を読み込む"""
    global attendance_records
    if RECORDS_FILE.exists():
        with open(RECORDS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            attendance_records = {
                uid: datetime.fromisoformat(ts) for uid, ts in data.items()
            }
        logger.info(f"Loaded {len(attendance_records)} attendance records")


def save_records():
    """出勤記録を永続化する"""
    with open(RECORDS_FILE, "w", encoding="utf-8") as f:
        data = {uid: dt.isoformat() for uid, dt in attendance_records.items()}
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_google_calendar_service():
    """Google Calendar APIサービスを取得"""
    credentials_path = os.environ.get("GOOGLE_CREDENTIALS_PATH")
    if not credentials_path:
        raise ValueError("GOOGLE_CREDENTIALS_PATH environment variable is not set")

    credentials = service_account.Credentials.from_service_account_file(
        credentials_path,
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    return build("calendar", "v3", credentials=credentials)


def create_calendar_event(
    user_id: str,
    user_name: str,
    clock_in: datetime,
    clock_out: datetime
):
    """Googleカレンダーに勤怠イベントを作成"""
    calendar_id = os.environ.get("GOOGLE_CALENDAR_ID", "primary")

    service = get_google_calendar_service()

    # 勤務時間を計算
    duration = clock_out - clock_in
    hours, remainder = divmod(duration.total_seconds(), 3600)
    minutes = remainder // 60

    event = {
        "summary": f"勤務: {user_name}",
        "description": (
            f"Slack User ID: {user_id}\n"
            f"担当者: {user_name}\n"
            f"出勤: {clock_in.strftime('%H:%M')}\n"
            f"退勤: {clock_out.strftime('%H:%M')}\n"
            f"勤務時間: {int(hours)}時間{int(minutes)}分"
        ),
        "start": {
            "dateTime": clock_in.isoformat(),
            "timeZone": "Asia/Tokyo"
        },
        "end": {
            "dateTime": clock_out.isoformat(),
            "timeZone": "Asia/Tokyo"
        }
    }

    created_event = service.events().insert(
        calendarId=calendar_id,
        body=event
    ).execute()

    logger.info(f"Created calendar event: {created_event.get('htmlLink')}")
    return created_event


def get_user_info(client, user_id: str) -> dict:
    """Slackユーザー情報を取得"""
    try:
        result = client.users_info(user=user_id)
        return result["user"]
    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        return {"real_name": user_id, "profile": {"display_name": user_id}}


# Slack App初期化
app = App(
    token=os.environ.get("SLACK_BOT_TOKEN"),
    signing_secret=os.environ.get("SLACK_SIGNING_SECRET")
)


@app.message("出勤")
def handle_clock_in(message, say, client):
    """出勤メッセージを処理"""
    user_id = message["user"]
    now = datetime.now(JST)

    # ユーザー情報取得
    user_info = get_user_info(client, user_id)
    user_name = user_info.get("real_name") or user_info.get("profile", {}).get("display_name", user_id)

    # 既に出勤記録がある場合
    if user_id in attendance_records:
        prev_time = attendance_records[user_id]
        say(
            f":warning: <@{user_id}> さんは既に出勤済みです\n"
            f"出勤時刻: {prev_time.strftime('%Y年%m月%d日 %H:%M')}\n"
            f"先に「退勤」を送信してください"
        )
        return

    # 出勤記録
    attendance_records[user_id] = now
    save_records()

    day_of_week = ["月", "火", "水", "木", "金", "土", "日"][now.weekday()]

    say(
        f":clock1: _勤怠記録_ :clock1:\n"
        f"日付: {now.strftime('%Y年%m月%d日')}（{day_of_week}）\n"
        f"出勤: {now.strftime('%H:%M')}\n"
        f"担当者: <@{user_id}>\n"
        f"_退勤時は「退勤」と送信してください_"
    )

    logger.info(f"Clock in: {user_id} ({user_name}) at {now}")


@app.message("退勤")
def handle_clock_out(message, say, client):
    """退勤メッセージを処理"""
    user_id = message["user"]
    now = datetime.now(JST)

    # ユーザー情報取得
    user_info = get_user_info(client, user_id)
    user_name = user_info.get("real_name") or user_info.get("profile", {}).get("display_name", user_id)

    # 出勤記録がない場合
    if user_id not in attendance_records:
        say(
            f":warning: <@{user_id}> さんの出勤記録がありません\n"
            f"先に「出勤」を送信してください"
        )
        return

    clock_in = attendance_records[user_id]
    clock_out = now

    # 勤務時間計算
    duration = clock_out - clock_in
    hours, remainder = divmod(duration.total_seconds(), 3600)
    minutes = remainder // 60

    # Googleカレンダーに記録
    try:
        event = create_calendar_event(user_id, user_name, clock_in, clock_out)
        calendar_link = event.get("htmlLink", "")
        calendar_msg = f"\n:calendar: Googleカレンダーに記録しました"
    except Exception as e:
        logger.error(f"Failed to create calendar event: {e}")
        calendar_msg = f"\n:warning: Googleカレンダーへの記録に失敗しました: {e}"

    # 出勤記録を削除
    del attendance_records[user_id]
    save_records()

    day_of_week = ["月", "火", "水", "木", "金", "土", "日"][clock_in.weekday()]

    say(
        f":clock1: _勤怠記録_ :clock1:\n"
        f"日付: {clock_in.strftime('%Y年%m月%d日')}（{day_of_week}）\n"
        f"出勤: {clock_in.strftime('%H:%M')}\n"
        f"退勤: {clock_out.strftime('%H:%M')}\n"
        f"勤務時間: {int(hours)}時間{int(minutes)}分\n"
        f"担当者: <@{user_id}>\n"
        f"Slack User ID: {user_id}"
        f"{calendar_msg}"
    )

    logger.info(f"Clock out: {user_id} ({user_name}) at {now}, worked {hours}h {minutes}m")


@app.event("app_mention")
def handle_mention(event, say):
    """メンション時のヘルプ"""
    say(
        ":information_source: *勤怠管理ボットの使い方*\n"
        "• `出勤` - 出勤時刻を記録します\n"
        "• `退勤` - 退勤時刻を記録し、Googleカレンダーに登録します"
    )


def main():
    """メイン関数"""
    load_records()

    # Socket Modeで起動
    socket_token = os.environ.get("SLACK_APP_TOKEN")
    if socket_token:
        handler = SocketModeHandler(app, socket_token)
        logger.info("Starting Slack bot in Socket Mode...")
        handler.start()
    else:
        # HTTP modeで起動（webhook用）
        logger.info("Starting Slack bot in HTTP mode on port 3000...")
        app.start(port=3000)


if __name__ == "__main__":
    main()
