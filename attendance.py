#!/usr/bin/env python3
"""
勤怠管理システム - Googleカレンダー連携
SlackでClaudeにメンションして「出勤」「退勤」を記録
"""

import os
import json
import datetime
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
CALENDAR_ID = os.environ.get('ATTENDANCE_CALENDAR_ID', 'primary')
TOKEN_PATH = Path(__file__).parent / 'token.json'
CREDENTIALS_PATH = Path(__file__).parent / 'credentials.json'

def get_calendar_service():
    """Google Calendar APIサービスを取得"""
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_PATH.exists():
                raise FileNotFoundError(
                    f"credentials.json が見つかりません。\n"
                    f"Google Cloud Consoleからダウンロードして {CREDENTIALS_PATH} に配置してください。"
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, 'w') as token:
            token.write(creds.to_json())

    return build('calendar', 'v3', credentials=creds)

def record_clock_in(user_name: str, note: str = "") -> dict:
    """
    出勤を記録

    Args:
        user_name: ユーザー名（Slack表示名）
        note: 備考（オプション）

    Returns:
        作成されたイベント情報
    """
    service = get_calendar_service()
    now = datetime.datetime.now()

    event = {
        'summary': f'【出勤】{user_name}',
        'description': f'出勤時刻: {now.strftime("%H:%M")}\n{note}'.strip(),
        'start': {
            'dateTime': now.isoformat(),
            'timeZone': 'Asia/Tokyo',
        },
        'end': {
            'dateTime': (now + datetime.timedelta(minutes=1)).isoformat(),
            'timeZone': 'Asia/Tokyo',
        },
        'colorId': '10',  # 緑色（出勤）
    }

    result = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()

    return {
        'status': 'success',
        'type': 'clock_in',
        'user': user_name,
        'time': now.strftime('%Y-%m-%d %H:%M'),
        'event_id': result.get('id'),
        'event_link': result.get('htmlLink'),
    }

def record_clock_out(user_name: str, note: str = "") -> dict:
    """
    退勤を記録

    Args:
        user_name: ユーザー名（Slack表示名）
        note: 備考（オプション）

    Returns:
        作成されたイベント情報
    """
    service = get_calendar_service()
    now = datetime.datetime.now()

    # 今日の出勤イベントを探す
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    events_result = service.events().list(
        calendarId=CALENDAR_ID,
        timeMin=today_start.isoformat() + 'Z',
        timeMax=today_end.isoformat() + 'Z',
        q=f'【出勤】{user_name}',
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get('items', [])
    clock_in_time = None
    work_duration = None

    if events:
        # 最新の出勤時刻を取得
        clock_in_event = events[-1]
        clock_in_str = clock_in_event['start'].get('dateTime', clock_in_event['start'].get('date'))
        clock_in_time = datetime.datetime.fromisoformat(clock_in_str.replace('Z', '+00:00'))
        if clock_in_time.tzinfo:
            clock_in_time = clock_in_time.replace(tzinfo=None)
        work_duration = now - clock_in_time

    # 勤務時間を計算
    duration_str = ""
    if work_duration:
        hours, remainder = divmod(int(work_duration.total_seconds()), 3600)
        minutes = remainder // 60
        duration_str = f"\n勤務時間: {hours}時間{minutes}分"

    event = {
        'summary': f'【退勤】{user_name}',
        'description': f'退勤時刻: {now.strftime("%H:%M")}{duration_str}\n{note}'.strip(),
        'start': {
            'dateTime': now.isoformat(),
            'timeZone': 'Asia/Tokyo',
        },
        'end': {
            'dateTime': (now + datetime.timedelta(minutes=1)).isoformat(),
            'timeZone': 'Asia/Tokyo',
        },
        'colorId': '11',  # 赤色（退勤）
    }

    result = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()

    response = {
        'status': 'success',
        'type': 'clock_out',
        'user': user_name,
        'time': now.strftime('%Y-%m-%d %H:%M'),
        'event_id': result.get('id'),
        'event_link': result.get('htmlLink'),
    }

    if work_duration:
        hours, remainder = divmod(int(work_duration.total_seconds()), 3600)
        minutes = remainder // 60
        response['work_duration'] = f'{hours}時間{minutes}分'
        response['clock_in_time'] = clock_in_time.strftime('%H:%M') if clock_in_time else None

    return response

def get_today_attendance(user_name: str = None) -> dict:
    """
    今日の勤怠状況を取得

    Args:
        user_name: ユーザー名（指定しない場合は全員分）

    Returns:
        今日の勤怠情報
    """
    service = get_calendar_service()
    now = datetime.datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    query = f'【出勤】{user_name}' if user_name else '【出勤】'

    events_result = service.events().list(
        calendarId=CALENDAR_ID,
        timeMin=today_start.isoformat() + 'Z',
        timeMax=today_end.isoformat() + 'Z',
        q=query,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    return {
        'date': now.strftime('%Y-%m-%d'),
        'events': events_result.get('items', []),
    }

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 3:
        print("使い方: python attendance.py [clock_in|clock_out|status] ユーザー名")
        sys.exit(1)

    action = sys.argv[1]
    user = sys.argv[2]
    note = sys.argv[3] if len(sys.argv) > 3 else ""

    if action == 'clock_in':
        result = record_clock_in(user, note)
    elif action == 'clock_out':
        result = record_clock_out(user, note)
    elif action == 'status':
        result = get_today_attendance(user)
    else:
        print(f"不明なアクション: {action}")
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))
