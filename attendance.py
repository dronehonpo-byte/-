#!/usr/bin/env python3
"""
勤怠管理システム - Google Calendar連携
Slackから出勤・退勤を記録し、Google Calendarに保存します
"""
import os
import json
import datetime
from typing import Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
CALENDAR_ID = 'g44reec3f5c9v4tnv5q2t8d1ms'
TOKEN_FILE = 'token.json'
CREDENTIALS_FILE = 'credentials.json'
ATTENDANCE_FILE = 'attendance_records.json'


def get_calendar_service():
    """Google Calendar APIサービスを取得"""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    return build('calendar', 'v3', credentials=creds)


def load_attendance_records() -> dict:
    """勤怠記録をファイルから読み込む"""
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_attendance_records(records: dict):
    """勤怠記録をファイルに保存"""
    with open(ATTENDANCE_FILE, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def clock_in(user_id: str, user_name: str = "") -> dict:
    """
    出勤を記録

    Args:
        user_id: SlackユーザーID
        user_name: ユーザー名（表示用）

    Returns:
        記録結果
    """
    now = datetime.datetime.now()
    today = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M')

    records = load_attendance_records()

    # 今日の出勤記録があるかチェック
    record_key = f"{user_id}_{today}"
    if record_key in records and records[record_key].get('clock_in'):
        return {
            'success': False,
            'message': f'本日は既に出勤済みです（出勤: {records[record_key]["clock_in"]}）'
        }

    # Google Calendarにイベントを作成
    service = get_calendar_service()

    event = {
        'summary': f'勤務 - {user_name or user_id}',
        'description': f'Slack User ID: {user_id}\n出勤: {time_str}',
        'start': {
            'dateTime': now.isoformat(),
            'timeZone': 'Asia/Tokyo',
        },
        'end': {
            'dateTime': (now + datetime.timedelta(hours=8)).isoformat(),  # 仮の終了時刻
            'timeZone': 'Asia/Tokyo',
        },
    }

    created_event = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()

    # ローカル記録を保存
    records[record_key] = {
        'user_id': user_id,
        'user_name': user_name,
        'date': today,
        'clock_in': time_str,
        'clock_in_datetime': now.isoformat(),
        'clock_out': None,
        'event_id': created_event['id']
    }
    save_attendance_records(records)

    return {
        'success': True,
        'message': f'出勤を記録しました',
        'date': today,
        'clock_in': time_str,
        'user_id': user_id,
        'event_id': created_event['id']
    }


def clock_out(user_id: str) -> dict:
    """
    退勤を記録

    Args:
        user_id: SlackユーザーID

    Returns:
        記録結果
    """
    now = datetime.datetime.now()
    today = now.strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M')

    records = load_attendance_records()
    record_key = f"{user_id}_{today}"

    # 今日の出勤記録があるかチェック
    if record_key not in records or not records[record_key].get('clock_in'):
        return {
            'success': False,
            'message': '本日の出勤記録がありません。先に「出勤」と入力してください。'
        }

    if records[record_key].get('clock_out'):
        return {
            'success': False,
            'message': f'本日は既に退勤済みです（退勤: {records[record_key]["clock_out"]}）'
        }

    record = records[record_key]
    clock_in_time = datetime.datetime.fromisoformat(record['clock_in_datetime'])

    # 勤務時間を計算
    work_duration = now - clock_in_time
    hours = int(work_duration.total_seconds() // 3600)
    minutes = int((work_duration.total_seconds() % 3600) // 60)

    # Google Calendarのイベントを更新
    service = get_calendar_service()

    event = service.events().get(calendarId=CALENDAR_ID, eventId=record['event_id']).execute()
    event['end'] = {
        'dateTime': now.isoformat(),
        'timeZone': 'Asia/Tokyo',
    }
    event['description'] = f"Slack User ID: {user_id}\n出勤: {record['clock_in']}\n退勤: {time_str}\n勤務時間: {hours}時間{minutes}分"

    service.events().update(calendarId=CALENDAR_ID, eventId=record['event_id'], body=event).execute()

    # ローカル記録を更新
    record['clock_out'] = time_str
    record['clock_out_datetime'] = now.isoformat()
    record['work_hours'] = hours
    record['work_minutes'] = minutes
    save_attendance_records(records)

    return {
        'success': True,
        'message': f'退勤を記録しました',
        'date': today,
        'clock_in': record['clock_in'],
        'clock_out': time_str,
        'work_duration': f'{hours}時間{minutes}分',
        'user_id': user_id
    }


def get_status(user_id: str) -> dict:
    """
    勤怠状況を取得

    Args:
        user_id: SlackユーザーID

    Returns:
        勤怠状況
    """
    now = datetime.datetime.now()
    today = now.strftime('%Y-%m-%d')

    records = load_attendance_records()
    record_key = f"{user_id}_{today}"

    if record_key not in records:
        return {
            'status': 'not_clocked_in',
            'message': '本日の出勤記録はありません'
        }

    record = records[record_key]

    if record.get('clock_out'):
        return {
            'status': 'clocked_out',
            'message': f"出勤: {record['clock_in']} / 退勤: {record['clock_out']}",
            'clock_in': record['clock_in'],
            'clock_out': record['clock_out'],
            'work_duration': f"{record.get('work_hours', 0)}時間{record.get('work_minutes', 0)}分"
        }

    return {
        'status': 'working',
        'message': f"出勤: {record['clock_in']} / 勤務中",
        'clock_in': record['clock_in']
    }


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 3:
        print("使い方:")
        print("  python attendance.py clock_in <user_id> [user_name]")
        print("  python attendance.py clock_out <user_id>")
        print("  python attendance.py status <user_id>")
        sys.exit(1)

    command = sys.argv[1]
    user_id = sys.argv[2]

    if command == 'clock_in':
        user_name = sys.argv[3] if len(sys.argv) > 3 else ""
        result = clock_in(user_id, user_name)
    elif command == 'clock_out':
        result = clock_out(user_id)
    elif command == 'status':
        result = get_status(user_id)
    else:
        print(f"不明なコマンド: {command}")
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))
