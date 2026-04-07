#!/usr/bin/env python3
"""勤怠管理ツール - 出勤・退勤を記録"""
import json
import datetime
from pathlib import Path

DATA_FILE = Path(__file__).parent / "attendance_data.json"


def load_data():
    """勤怠データを読み込む"""
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"records": []}


def save_data(data):
    """勤怠データを保存"""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def clock_in(user_name: str) -> str:
    """出勤を記録"""
    data = load_data()
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    # 今日すでに出勤しているかチェック
    for record in data["records"]:
        if record["user"] == user_name and record["date"] == date_str and record.get("clock_in"):
            return f"⚠️ {user_name}さんは本日すでに出勤済みです（{record['clock_in']}）"

    # 新しい記録を追加
    record = {
        "user": user_name,
        "date": date_str,
        "clock_in": time_str,
        "clock_out": None
    }
    data["records"].append(record)
    save_data(data)

    return f"✅ 出勤を記録しました\n👤 {user_name}\n📅 {date_str}\n🕐 {time_str}"


def clock_out(user_name: str) -> str:
    """退勤を記録"""
    data = load_data()
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    # 今日の出勤記録を探す
    for record in data["records"]:
        if record["user"] == user_name and record["date"] == date_str:
            if record.get("clock_out"):
                return f"⚠️ {user_name}さんは本日すでに退勤済みです（{record['clock_out']}）"
            if not record.get("clock_in"):
                return f"⚠️ {user_name}さんは本日まだ出勤していません"

            record["clock_out"] = time_str

            # 勤務時間を計算
            clock_in_time = datetime.datetime.strptime(record["clock_in"], "%H:%M:%S")
            clock_out_time = datetime.datetime.strptime(time_str, "%H:%M:%S")
            work_duration = clock_out_time - clock_in_time
            hours, remainder = divmod(work_duration.seconds, 3600)
            minutes = remainder // 60

            save_data(data)
            return f"✅ 退勤を記録しました\n👤 {user_name}\n📅 {date_str}\n🕐 {time_str}\n⏱️ 勤務時間: {hours}時間{minutes}分"

    return f"⚠️ {user_name}さんの本日の出勤記録がありません"


def get_status(user_name: str = None) -> str:
    """勤怠状況を取得"""
    data = load_data()
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    if user_name:
        # 特定ユーザーの今日の状況
        for record in data["records"]:
            if record["user"] == user_name and record["date"] == today:
                status = "出勤中" if record["clock_in"] and not record["clock_out"] else "退勤済み"
                return f"👤 {user_name}\n📅 {today}\n📊 状態: {status}\n🕐 出勤: {record.get('clock_in', '-')}\n🕐 退勤: {record.get('clock_out', '-')}"
        return f"👤 {user_name}さんの本日の記録はありません"

    # 全員の今日の状況
    today_records = [r for r in data["records"] if r["date"] == today]
    if not today_records:
        return "📊 本日の勤怠記録はありません"

    lines = [f"📊 本日（{today}）の勤怠状況\n"]
    for record in today_records:
        status = "出勤中" if record["clock_in"] and not record["clock_out"] else "退勤済み"
        lines.append(f"・{record['user']}: {status} (出勤:{record.get('clock_in', '-')} / 退勤:{record.get('clock_out', '-')})")

    return "\n".join(lines)


def main():
    import sys

    if len(sys.argv) < 2:
        print("使い方:")
        print("  出勤: python attendance.py in <名前>")
        print("  退勤: python attendance.py out <名前>")
        print("  状況: python attendance.py status [名前]")
        return

    command = sys.argv[1].lower()

    if command == "in":
        if len(sys.argv) < 3:
            print("名前を指定してください")
            return
        print(clock_in(sys.argv[2]))

    elif command == "out":
        if len(sys.argv) < 3:
            print("名前を指定してください")
            return
        print(clock_out(sys.argv[2]))

    elif command == "status":
        user_name = sys.argv[2] if len(sys.argv) > 2 else None
        print(get_status(user_name))

    else:
        print(f"不明なコマンド: {command}")


if __name__ == "__main__":
    main()
