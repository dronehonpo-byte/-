#!/usr/bin/env python3
"""
LINE スクリーンショット監視ツール
特定の人からLINEメッセージが来たら自動でスクリーンショットを撮ります。

使い方:
    python line_screenshot.py "田中太郎" "佐藤花子"
    python line_screenshot.py "田中" --save-dir ~/Desktop/screenshots
    python line_screenshot.py "John" --verbose
"""

import subprocess
import os
import datetime
import argparse
from pathlib import Path

# D-Bus (Linux デスクトップ通知) のインポート
try:
    import dbus
    from dbus.mainloop.glib import DBusGMainLoop
    from gi.repository import GLib
    DBUS_AVAILABLE = True
except ImportError:
    DBUS_AVAILABLE = False


def take_screenshot(sender_name: str, save_dir: Path) -> str:
    """スクリーンショットを撮影して保存する。

    scrot, maim, gnome-screenshot, import (ImageMagick) のいずれかを使用。
    """
    save_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    # ファイル名に使えない文字を置換
    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_" for c in sender_name
    )
    filepath = save_dir / f"LINE_{safe_name}_{timestamp}.png"

    # 利用可能なスクリーンショットツールを順番に試す
    tools = [
        ["scrot", str(filepath)],
        ["maim", str(filepath)],
        ["import", "-window", "root", str(filepath)],
        ["gnome-screenshot", "-f", str(filepath)],
        ["xwd", "-root", "-silent", "-out", str(filepath.with_suffix(".xwd"))],
    ]

    for tool_cmd in tools:
        try:
            result = subprocess.run(
                tool_cmd, capture_output=True, timeout=10, check=False
            )
            # xwd の場合は変換が必要
            if tool_cmd[0] == "xwd" and result.returncode == 0:
                xwd_file = filepath.with_suffix(".xwd")
                if xwd_file.exists():
                    subprocess.run(
                        ["convert", str(xwd_file), str(filepath)],
                        capture_output=True,
                        timeout=10,
                        check=True,
                    )
                    xwd_file.unlink(missing_ok=True)
            if result.returncode == 0 and filepath.exists():
                return str(filepath)
        except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError):
            continue

    raise RuntimeError(
        "スクリーンショットツールが見つかりません。\n"
        "以下のいずれかをインストールしてください: scrot, maim, gnome-screenshot"
    )


class LineNotificationMonitor:
    """D-Bus を使って LINE の通知を監視するクラス"""

    # LINE アプリ名として認識するキーワード
    LINE_APP_KEYWORDS = ["line", "naver"]

    def __init__(self, target_names: list[str], save_dir: Path, verbose: bool = False):
        self.target_names = [name.lower() for name in target_names]
        self.original_names = target_names
        self.save_dir = save_dir
        self.verbose = verbose
        self.screenshot_count = 0

    def is_line_notification(self, app_name: str) -> bool:
        """LINE からの通知かどうかを判定"""
        app_lower = app_name.lower()
        return any(kw in app_lower for kw in self.LINE_APP_KEYWORDS)

    def matches_target(self, text: str) -> str | None:
        """テキストに対象の名前が含まれているか確認し、マッチした名前を返す"""
        text_lower = text.lower()
        for i, name in enumerate(self.target_names):
            if name in text_lower:
                return self.original_names[i]
        return None

    def handle_notification(self, *args):
        """D-Bus 通知メッセージのハンドラ"""
        try:
            if len(args) < 5:
                return

            app_name = str(args[0])
            summary = str(args[3])
            body = str(args[4])

            if self.verbose:
                print(f"  [通知受信] app='{app_name}' summary='{summary}' body='{body}'")

            if not self.is_line_notification(app_name):
                return

            # summary（送信者名）または body（メッセージ本文）で一致確認
            matched_name = self.matches_target(summary) or self.matches_target(body)

            if matched_name:
                now = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"\n[{now}] \"{matched_name}\" からのメッセージを検知しました！")
                print("  スクリーンショットを撮影しています...")
                try:
                    saved_path = take_screenshot(matched_name, self.save_dir)
                    self.screenshot_count += 1
                    print(f"  保存完了: {saved_path}")
                    print(f"  (合計 {self.screenshot_count} 枚)")
                except RuntimeError as e:
                    print(f"  [エラー] {e}")

        except Exception as e:
            if self.verbose:
                print(f"  [エラー] 通知処理中にエラー: {e}")

    def start(self):
        """監視を開始する"""
        if not DBUS_AVAILABLE:
            print("[エラー] D-Bus ライブラリが利用できません。")
            print("以下のコマンドでインストールしてください:")
            print("  pip install dbus-python PyGObject")
            print("  または: sudo apt install python3-dbus python3-gi")
            return 1

        DBusGMainLoop(set_as_default=True)

        try:
            session_bus = dbus.SessionBus()
        except dbus.exceptions.DBusException as e:
            print(f"[エラー] D-Busセッションバスに接続できません: {e}")
            print("デスクトップ環境（GNOME, KDE等）で実行してください。")
            return 1

        # org.freedesktop.Notifications の Notify メソッド呼び出しを監視
        session_bus.add_match_string_non_blocking(
            "type='method_call',"
            "interface='org.freedesktop.Notifications',"
            "member='Notify'"
        )
        session_bus.add_message_filter(
            lambda conn, msg: self.handle_notification(*msg.get_args_list())
        )

        print("=" * 50)
        print("LINE スクリーンショット監視ツール")
        print("=" * 50)
        print(f"監視対象: {', '.join(self.original_names)}")
        print(f"保存先:   {self.save_dir}")
        print(f"状態:     監視中... (Ctrl+C で停止)")
        if self.verbose:
            print("モード:   詳細表示（全ての通知を表示）")
        print("=" * 50)

        loop = GLib.MainLoop()
        try:
            loop.run()
        except KeyboardInterrupt:
            print(f"\n\n監視を停止しました。(合計 {self.screenshot_count} 枚撮影)")

        return 0


def main():
    parser = argparse.ArgumentParser(
        description="LINEの特定の人からメッセージが来たら自動スクリーンショットを撮ります",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s "田中太郎"
  %(prog)s "田中" "佐藤" "山田"
  %(prog)s "John" --save-dir ~/Desktop/line_shots
  %(prog)s "友達" --verbose

注意:
  - LINE for PC (Linux版またはWine経由) が通知を送る必要があります
  - デスクトップ環境（GNOME, KDE等）が必要です
  - スクリーンショットツール (scrot, maim, gnome-screenshot) が必要です
        """,
    )
    parser.add_argument(
        "names",
        nargs="+",
        metavar="NAME",
        help="監視する名前（複数指定可）",
    )
    parser.add_argument(
        "--save-dir",
        default="~/Pictures/LINE_screenshots",
        help="スクリーンショットの保存先ディレクトリ (デフォルト: ~/Pictures/LINE_screenshots)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="全ての通知を表示する（動作確認・デバッグ用）",
    )

    args = parser.parse_args()

    save_dir = Path(args.save_dir).expanduser().resolve()
    monitor = LineNotificationMonitor(
        target_names=args.names,
        save_dir=save_dir,
        verbose=args.verbose,
    )

    return monitor.start()


if __name__ == "__main__":
    exit(main())
