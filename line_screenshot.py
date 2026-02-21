#!/usr/bin/env python3
"""
LINE スクリーンショット監視ツール
特定の人からLINEメッセージが来たら自動でスクリーンショットを撮ります。

必要なもの:
  - Linux デスクトップ環境 (GNOME, KDE, XFCE 等)
  - LINE for PC (または Chrome 拡張版)
  - デスクトップ通知が有効なこと
  - スクリーンショットツール (scrot, maim, gnome-screenshot のいずれか)

使い方:
  python3 line_screenshot.py "田中太郎"
  python3 line_screenshot.py "田中" "佐藤" "山田"
  python3 line_screenshot.py "友達" --save-dir ~/Desktop/スクショ
  python3 line_screenshot.py "友達" --verbose
  python3 line_screenshot.py --test          # 動作確認（テストモード）
"""

import subprocess
import sys
import os
import re
import datetime
import argparse
import signal
import threading
from pathlib import Path


# =====================================================
# スクリーンショット
# =====================================================

def find_screenshot_tool() -> list[str] | None:
    """利用可能なスクリーンショットツールを探す"""
    tools = {
        "scrot":            ["scrot", "{file}"],
        "maim":             ["maim", "{file}"],
        "gnome-screenshot": ["gnome-screenshot", "-f", "{file}"],
        "import":           ["import", "-window", "root", "{file}"],
        "xwd":              None,  # 変換が必要なため後で処理
    }
    for name, cmd in tools.items():
        if subprocess.run(["which", name], capture_output=True).returncode == 0:
            return cmd
    return None


def take_screenshot(sender_name: str, save_dir: Path) -> str:
    """スクリーンショットを撮影して PNG ファイルに保存する"""
    save_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = re.sub(r"[^\w\-]", "_", sender_name)
    filepath = save_dir / f"LINE_{safe_name}_{timestamp}.png"

    tool_cmd = find_screenshot_tool()
    if tool_cmd is None:
        raise RuntimeError(
            "スクリーンショットツールが見つかりません。\n"
            "  sudo apt install scrot   または\n"
            "  sudo apt install maim"
        )

    cmd = [c.replace("{file}", str(filepath)) for c in tool_cmd]
    result = subprocess.run(cmd, capture_output=True, timeout=15)
    if result.returncode != 0:
        raise RuntimeError(f"{cmd[0]} が失敗しました: {result.stderr.decode()}")
    if not filepath.exists():
        raise RuntimeError(f"ファイルが生成されませんでした: {filepath}")

    return str(filepath)


# =====================================================
# 通知のパース
# =====================================================

# gdbus monitor の出力例:
#   /org/freedesktop/Notifications: org.freedesktop.Notifications.Notify (
#      'LINE', uint32 0, 'line', '田中太郎', 'こんにちは', @as [], {}, int32 -1)
#
# Notify の引数順:
#   app_name, replaces_id, app_icon, summary, body, actions, hints, expire_timeout
NOTIFY_PATTERN = re.compile(
    r"Notifications\.Notify\s*\(\s*"
    r"'([^']*)'"           # [1] app_name
    r"\s*,\s*\w+\s+\d+"   # replaces_id (例: uint32 0)
    r"\s*,\s*'[^']*'"     # app_icon (スキップ)
    r"\s*,\s*'([^']*)'"   # [2] summary (送信者名)
    r"\s*,\s*'([^']*)'",  # [3] body (メッセージ本文)
    re.DOTALL,
)


def parse_notification(line: str) -> tuple[str, str, str] | None:
    """gdbus の出力行から (app_name, summary, body) を抽出する"""
    if "Notifications.Notify" not in line:
        return None
    m = NOTIFY_PATTERN.search(line)
    if m:
        app_name = m.group(1)
        summary  = m.group(2)
        body     = m.group(3)
        return app_name, summary, body
    return None


def is_line_app(app_name: str) -> bool:
    """LINE からの通知かどうかを判定"""
    lower = app_name.lower()
    return any(kw in lower for kw in ["line", "naver"])


# =====================================================
# メイン監視ループ
# =====================================================

class Monitor:
    def __init__(self, target_names: list[str], save_dir: Path, verbose: bool):
        self.targets = target_names
        self.targets_lower = [n.lower() for n in target_names]
        self.save_dir = save_dir
        self.verbose = verbose
        self.count = 0
        self._proc: subprocess.Popen | None = None

    def matches(self, text: str) -> str | None:
        """テキストに監視対象の名前が含まれていれば元の名前を返す"""
        tl = text.lower()
        for original, lower in zip(self.targets, self.targets_lower):
            if lower in tl:
                return original
        return None

    def handle_line(self, raw: str):
        """gdbus の 1 行を処理する"""
        parsed = parse_notification(raw)
        if parsed is None:
            return

        app_name, summary, body = parsed

        if self.verbose:
            print(f"  [通知] app='{app_name}' / from='{summary}' / msg='{body[:40]}'")

        if not is_line_app(app_name):
            return

        matched = self.matches(summary) or self.matches(body)
        if matched:
            now = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"\n[{now}] \"{matched}\" からメッセージを検知！")
            print("  スクリーンショット撮影中...")
            try:
                path = take_screenshot(matched, self.save_dir)
                self.count += 1
                print(f"  保存: {path}")
                print(f"  累計: {self.count} 枚")
            except Exception as e:
                print(f"  [失敗] {e}")

    def start(self):
        """gdbus monitor を起動して通知を監視する"""
        # gdbus が使えるか確認
        if subprocess.run(["which", "gdbus"], capture_output=True).returncode != 0:
            print("[エラー] gdbus が見つかりません。")
            print("  sudo apt install libglib2.0-bin")
            return 1

        # DBUS_SESSION_BUS_ADDRESS が必要（デスクトップセッションが必要）
        if not os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
            print("[エラー] デスクトップセッションが検出されません。")
            print("  GNOME / KDE / XFCE などのデスクトップ環境でログインして実行してください。")
            print("  ターミナルエミュレータ (gnome-terminal など) から起動するのが正しい方法です。")
            return 1

        cmd = [
            "gdbus", "monitor",
            "--session",
            "--dest", "org.freedesktop.Notifications",
            "--object-path", "/org/freedesktop/Notifications",
        ]

        print("=" * 52)
        print("  LINE スクリーンショット監視ツール")
        print("=" * 52)
        print(f"  監視対象 : {', '.join(self.targets)}")
        print(f"  保存先   : {self.save_dir}")
        print(f"  状態     : 監視中... (Ctrl+C で停止)")
        if self.verbose:
            print("  モード   : 詳細表示（全通知を表示）")
        print("=" * 52)

        try:
            self._proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
            for line in self._proc.stdout:
                self.handle_line(line.strip())
        except KeyboardInterrupt:
            pass
        finally:
            if self._proc:
                self._proc.terminate()
            print(f"\n監視を停止しました。(合計 {self.count} 枚撮影)")

        return 0


# =====================================================
# テストモード（デスクトップなしで動作確認）
# =====================================================

def run_test(save_dir: Path):
    """
    実際の D-Bus セッションなしで動作を確認するテストモード。
    通知のパースとスクリーンショット保存をシミュレートします。
    """
    print("=" * 52)
    print("  テストモード")
    print("=" * 52)

    # 通知パースのテスト
    fake_lines = [
        "/org/freedesktop/Notifications: org.freedesktop.Notifications.Notify ('LINE', uint32 0, '', '田中太郎', 'こんにちは！', @as [], {}, int32 -1)",
        "/org/freedesktop/Notifications: org.freedesktop.Notifications.Notify ('Slack', uint32 0, '', '一般', 'ランチどうする？', @as [], {}, int32 -1)",
        "/org/freedesktop/Notifications: org.freedesktop.Notifications.Notify ('LINE', uint32 0, '', '佐藤花子', 'ありがとう！', @as [], {}, int32 -1)",
    ]

    print("\n[テスト 1] 通知のパース")
    for raw in fake_lines:
        result = parse_notification(raw)
        if result:
            app, summary, body = result
            line_mark = "✓ LINE" if is_line_app(app) else "  other"
            print(f"  {line_mark} | from='{summary}' | msg='{body}'")
        else:
            print(f"  パース失敗: {raw[:60]}...")
    print("  → パース OK")

    # スクリーンショットツール確認
    print("\n[テスト 2] スクリーンショットツール")
    tool = find_screenshot_tool()
    if tool:
        print(f"  利用可能: {tool[0]}")
    else:
        print("  [警告] ツールが見つかりません (scrot または maim をインストールしてください)")

    # 保存先ディレクトリ確認
    print("\n[テスト 3] 保存先ディレクトリ")
    save_dir.mkdir(parents=True, exist_ok=True)
    print(f"  {save_dir}  → 作成 OK")

    # スクリーンショット（表示があれば実際に撮影）
    if os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"):
        print("\n[テスト 4] 実際にスクリーンショットを撮影")
        try:
            path = take_screenshot("テスト送信者", save_dir)
            print(f"  保存: {path}")
        except Exception as e:
            print(f"  失敗: {e}")
    else:
        print("\n[テスト 4] スクリーンショット: スキップ（ディスプレイなし）")

    print("\n" + "=" * 52)
    print("  テスト完了。本番環境ではデスクトップ上で実行してください。")
    print("=" * 52)
    return 0


# =====================================================
# エントリポイント
# =====================================================

def main():
    parser = argparse.ArgumentParser(
        description="LINEの特定の人からメッセージが来たら自動スクリーンショットを撮ります",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
例:
  %(prog)s "田中太郎"
  %(prog)s "田中" "佐藤" "山田"
  %(prog)s "友達" --save-dir ~/Desktop/line_shots
  %(prog)s "友達" --verbose
  %(prog)s --test
        """,
    )
    parser.add_argument(
        "names",
        nargs="*",
        metavar="NAME",
        help="監視する名前（複数指定可）",
    )
    parser.add_argument(
        "--save-dir", "-o",
        default="~/Pictures/LINE_screenshots",
        help="保存先ディレクトリ (デフォルト: ~/Pictures/LINE_screenshots)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="全ての通知を表示する（動作確認用）",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="テストモード（デスクトップなしで動作確認）",
    )

    args = parser.parse_args()
    save_dir = Path(args.save_dir).expanduser().resolve()

    if args.test:
        return run_test(save_dir)

    if not args.names:
        parser.error("監視する名前を1つ以上指定してください。例: python3 line_screenshot.py \"田中太郎\"")

    monitor = Monitor(
        target_names=args.names,
        save_dir=save_dir,
        verbose=args.verbose,
    )
    return monitor.start()


if __name__ == "__main__":
    sys.exit(main())
