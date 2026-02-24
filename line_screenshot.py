#!/usr/bin/env python3
"""LINE スクリーンショット監視ツール (Windows版)"""
import asyncio, sys, re, datetime
from pathlib import Path
SAVE_DIR = Path("E:/LINE_screenshots")
async def take_screenshot(sender_name):
    from PIL import ImageGrab
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = re.sub(r'[^\w\-]', '_', sender_name)
    filepath = SAVE_DIR / f"LINE_{safe}_{ts}.png"
    img = ImageGrab.grab()
    img.save(str(filepath))
    return str(filepath)
async def monitor(target_names):
    import winsdk.windows.ui.notifications.management as mgmt
    import winsdk.windows.ui.notifications as notifs
    listener = mgmt.UserNotificationListener.current
    access = await listener.request_access_async()
    if str(access) != "UserNotificationListenerAccessStatus.ALLOWED":
        print("エラー: 通知アクセスが許可されていません")
        print("  設定 → プライバシー → 通知 → アクセスをONにしてください")
        return
    print(f"監視開始: {', '.join(target_names)}")
    print(f"保存先: {SAVE_DIR}")
    print("(Ctrl+C で停止)")
    print("")
    seen_ids = set()
    count = 0
    while True:
        try:
            notif_list = await listener.get_notifications_async(
                notifs.NotificationKinds.TOAST
            )
            for notif in notif_list:
                nid = notif.id
                if nid in seen_ids:
                    continue
                seen_ids.add(nid)
                try:
                    app_name = notif.app_info.display_info.display_name
                    if "LINE" not in app_name:
                        continue
                    bindings = notif.notification.visual.bindings
                    if not bindings:
                        continue
                    texts = [t.text for t in bindings[0].get_text_elements()]
                    full_text = " ".join(t for t in texts if t)
                    for name in target_names:
                        if name.lower() in full_text.lower():
                            now = datetime.datetime.now().strftime("%H:%M:%S")
                            print(f"[{now}] 「{name}」からメッセージ！撮影中...")
                            path = await take_screenshot(name)
                            count += 1
                            print(f"  保存: {path} (累計{count}枚)")
                            break
                except Exception:
                    pass
        except Exception as e:
            print(f"エラー: {e}")
        await asyncio.sleep(1)
def main():
    if len(sys.argv) < 2:
        print("使い方: python line_screenshot.py \"監視したい名前\"")
        print("例:     python line_screenshot.py \"谷田 結依\"")
        return
    names = sys.argv[1:]
    try:
        asyncio.run(monitor(names))
    except KeyboardInterrupt:
        print("\n停止しました")
if __name__ == "__main__":
    main()
