#!/usr/bin/env python3
"""
Slack 勤怠記録ボット
チャンネルで「出勤」「退勤」とメンションされた時に勤怠を記録します。

環境変数:
    SLACK_BOT_TOKEN: Slack Bot Token (xoxb-...)
    SLACK_APP_TOKEN: Slack App Token (xapp-...) - Socket Mode用
    GOOGLE_CALENDAR_CREDENTIALS: Google Calendar API認証情報JSONファイルのパス
    ATTENDANCE_CHANNEL_ID: 監視対象のチャンネルID (デフォルト: C0AR1K8DXSP)
    BOT_USER_ID: ボットのユーザーID (デフォルト: U0ARBAGUHBN)
"""

import os
import re
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 環境変数
SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN")
SLACK_APP_TOKEN = os.environ.get("SLACK_APP_TOKEN")
GOOGLE_CREDENTIALS_PATH = os.environ.get("GOOGLE_CALENDAR_CREDENTIALS", "credentials.json")
ATTENDANCE_CHANNEL_ID = os.environ.get("ATTENDANCE_CHANNEL_ID", "C0AR1K8DXSP")
BOT_USER_ID = os.environ.get("BOT_USER_ID", "U0ARBAGUHBN")

# Slack Appの初期化
app = App(token=SLACK_BOT_TOKEN)

# 勤怠状態を保持（ユーザーID -> {calendar_id, clock_in_time}）
attendance_state: Dict[str, Dict[str, Any]] = {}


def get_calendar_service():
    """Google Calendar APIサービスを取得"""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_PATH,
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        return build("calendar", "v3", credentials=credentials)
    except Exception as e:
        logger.error(f"Google Calendar API初期化エラー: {e}")
        return None


def generate_calendar_id(user_id: str) -> str:
    """ユーザーIDからカレンダーIDを生成"""
    hash_obj = hashlib.md5(user_id.encode())
    return hash_obj.hexdigest()[:24]


def format_date_japanese(dt: datetime) -> str:
    """日本語形式で日付をフォーマット"""
    weekdays = ["月", "火", "水", "木", "金", "土", "日"]
    return f"{dt.year}年{dt.month}月{dt.day}日（{weekdays[dt.weekday()]}）"


def format_time(dt: datetime) -> str:
    """時刻をフォーマット（HH:MM）"""
    return dt.strftime("%H:%M")


def calculate_work_duration(start: datetime, end: datetime) -> str:
    """勤務時間を計算して文字列で返す"""
    duration = end - start
    hours, remainder = divmod(duration.seconds, 3600)
    minutes = remainder // 60
    return f"約{hours}時間{minutes}分"


def get_clock_emoji(hour: int) -> str:
    """時刻に応じた時計の絵文字を返す"""
    clock_emojis = [
        ":clock12:", ":clock1:", ":clock2:", ":clock3:",
        ":clock4:", ":clock5:", ":clock6:", ":clock7:",
        ":clock8:", ":clock9:", ":clock10:", ":clock11:"
    ]
    return clock_emojis[hour % 12]


def create_clock_in_message(user_id: str, clock_in_time: datetime, calendar_id: str) -> str:
    """出勤メッセージを作成"""
    emoji = get_clock_emoji(clock_in_time.hour)
    return (
        f"{emoji} _勤怠記録_ {emoji}\n"
        f"日付: {format_date_japanese(clock_in_time)}\n"
        f"出勤: {format_time(clock_in_time)}\n"
        f"担当者: <@{user_id}>\n"
        f"カレンダーID: `{calendar_id}`\n"
        f"_退勤時は「退勤」と送信してください_ *使用して送信されました* <@{BOT_USER_ID}>"
    )


def create_clock_out_message(
    user_id: str,
    clock_in_time: datetime,
    clock_out_time: datetime,
    calendar_id: str
) -> str:
    """退勤メッセージを作成"""
    emoji = get_clock_emoji(clock_out_time.hour)
    duration = calculate_work_duration(clock_in_time, clock_out_time)
    return (
        f"{emoji} _勤怠記録_ {emoji}\n"
        f"日付: {format_date_japanese(clock_out_time)}\n"
        f"出勤: {format_time(clock_in_time)}\n"
        f"退勤: {format_time(clock_out_time)}\n"
        f"勤務時間: {duration}\n"
        f"担当者: <@{user_id}>\n"
        f"カレンダーID: `{calendar_id}`\n"
        f"_お疲れ様でした！_ :wave: *使用して送信されました* <@{BOT_USER_ID}>"
    )


def create_calendar_event(
    service,
    calendar_id: str,
    user_name: str,
    start_time: datetime,
    end_time: Optional[datetime] = None
) -> Optional[str]:
    """Google Calendarにイベントを作成"""
    if service is None:
        return None

    try:
        event = {
            "summary": f"勤務: {user_name}",
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": "Asia/Tokyo"
            },
            "end": {
                "dateTime": (end_time or start_time + timedelta(hours=8)).isoformat(),
                "timeZone": "Asia/Tokyo"
            }
        }

        result = service.events().insert(
            calendarId=calendar_id,
            body=event
        ).execute()

        return result.get("id")
    except Exception as e:
        logger.error(f"カレンダーイベント作成エラー: {e}")
        return None


def update_calendar_event(
    service,
    calendar_id: str,
    event_id: str,
    end_time: datetime
) -> bool:
    """Google Calendarのイベントを更新（退勤時刻を設定）"""
    if service is None:
        return False

    try:
        event = service.events().get(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()

        event["end"] = {
            "dateTime": end_time.isoformat(),
            "timeZone": "Asia/Tokyo"
        }

        service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=event
        ).execute()

        return True
    except Exception as e:
        logger.error(f"カレンダーイベント更新エラー: {e}")
        return False


def is_attendance_message(text: str, bot_id: str) -> tuple[bool, Optional[str]]:
    """
    メッセージが勤怠記録対象かチェック
    Returns: (is_match, action) where action is 'clock_in' or 'clock_out' or None
    """
    # ボットへのメンションを確認
    mention_pattern = f"<@{bot_id}>"
    if mention_pattern not in text:
        return False, None

    # 出勤/退勤キーワードを確認
    if "出勤" in text:
        return True, "clock_in"
    elif "退勤" in text:
        return True, "clock_out"

    return False, None


@app.event("message")
def handle_message(event, say, client):
    """メッセージイベントのハンドラー"""
    # チャンネルIDを確認
    channel_id = event.get("channel")
    if channel_id != ATTENDANCE_CHANNEL_ID:
        return

    # サブタイプがある場合（編集など）はスキップ
    if event.get("subtype"):
        return

    text = event.get("text", "")
    user_id = event.get("user")

    if not user_id:
        return

    # 勤怠メッセージかチェック
    is_match, action = is_attendance_message(text, BOT_USER_ID)
    if not is_match:
        return

    now = datetime.now()
    calendar_id = generate_calendar_id(user_id)

    # ユーザー情報を取得
    try:
        user_info = client.users_info(user=user_id)
        user_name = user_info["user"]["real_name"]
    except Exception:
        user_name = user_id

    if action == "clock_in":
        # 出勤処理
        calendar_service = get_calendar_service()
        event_id = create_calendar_event(
            calendar_service,
            calendar_id,
            user_name,
            now
        )

        # 状態を保存
        attendance_state[user_id] = {
            "calendar_id": calendar_id,
            "clock_in_time": now,
            "event_id": event_id
        }

        message = create_clock_in_message(user_id, now, calendar_id)
        say(message)
        logger.info(f"出勤記録: {user_name} ({user_id})")

    elif action == "clock_out":
        # 退勤処理
        state = attendance_state.get(user_id)

        if state and state.get("clock_in_time"):
            clock_in_time = state["clock_in_time"]
            event_id = state.get("event_id")

            # カレンダーイベントを更新
            if event_id:
                calendar_service = get_calendar_service()
                update_calendar_event(
                    calendar_service,
                    calendar_id,
                    event_id,
                    now
                )

            message = create_clock_out_message(
                user_id,
                clock_in_time,
                now,
                calendar_id
            )

            # 状態をクリア
            del attendance_state[user_id]
        else:
            # 出勤記録がない場合
            message = (
                f":warning: <@{user_id}> さんの出勤記録が見つかりません。\n"
                f"先に「<@{BOT_USER_ID}> 出勤」と送信してください。"
            )

        say(message)
        logger.info(f"退勤記録: {user_name} ({user_id})")


@app.event("app_mention")
def handle_mention(event, say, client):
    """アプリメンションイベントのハンドラー"""
    # メッセージイベントと同様の処理
    handle_message(event, say, client)


def main():
    """メイン関数"""
    if not SLACK_BOT_TOKEN:
        logger.error("SLACK_BOT_TOKEN が設定されていません")
        return

    if not SLACK_APP_TOKEN:
        logger.error("SLACK_APP_TOKEN が設定されていません")
        return

    logger.info("勤怠記録ボットを起動します...")
    logger.info(f"監視チャンネル: {ATTENDANCE_CHANNEL_ID}")
    logger.info(f"ボットID: {BOT_USER_ID}")

    handler = SocketModeHandler(app, SLACK_APP_TOKEN)
    handler.start()


if __name__ == "__main__":
    main()
