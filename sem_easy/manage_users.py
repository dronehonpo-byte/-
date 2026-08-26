"""利用者（ID・パスワード）の管理ツール。

管理者が利用者を発行・削除するためのスクリプトです。
パスワードはハッシュ化して保存され、平文では保存されません。

使い方（コマンドプロンプトで実行）:
    python manage_users.py add    <ID> <パスワード> [表示名] [利用期限YYYY-MM-DD]
    python manage_users.py delete <ID>
    python manage_users.py list
    python manage_users.py passwd <ID> <新しいパスワード>
"""
from __future__ import annotations

import sys

from modules import auth


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    cmd = args[0]

    if cmd == "add" and len(args) >= 3:
        uid, pw = args[1], args[2]
        name = args[3] if len(args) > 3 else uid
        expires = args[4] if len(args) > 4 else None
        auth.create_user(uid, pw, display_name=name, expires=expires)
        print(f"利用者『{uid}』を作成しました（パスワードはハッシュ化して保存）。")
        return 0

    if cmd == "delete" and len(args) >= 2:
        users = auth.load_users()
        if args[1] in users:
            del users[args[1]]
            auth.save_users(users)
            print(f"利用者『{args[1]}』を削除しました。")
        else:
            print("該当する利用者がいません。")
        return 0

    if cmd == "passwd" and len(args) >= 3:
        users = auth.load_users()
        rec = users.get(args[1])
        if not rec:
            print("該当する利用者がいません。")
            return 1
        h, salt = auth.hash_password(args[2])
        rec.update({"hash": h, "salt": salt, "failures": 0, "locked_until": None})
        users[args[1]] = rec
        auth.save_users(users)
        print(f"利用者『{args[1]}』のパスワードを変更しました。")
        return 0

    if cmd == "list":
        users = auth.load_users()
        if not users:
            print("利用者が登録されていません。")
        for uid, rec in users.items():
            print(f"- {uid}（{rec.get('display_name', '')}）"
                  f" 作成: {rec.get('created_at', '')}"
                  f" 期限: {rec.get('expires') or '無期限'}")
        return 0

    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
