"""運用保守：業者の削除・全データ初期化（本番運用の準備）.

FK制約に依存しない順序で、生SQLにより安全に削除する（SQLite/Postgres両対応）。
管理者アカウントは残す。
"""
from __future__ import annotations

from sqlalchemy import text

from ..extensions import db


def ensure_schema() -> None:
    """既存テーブルに後から追加した列を冪等に補う（Postgres）。SQLiteはcreate_allで新規作成のため不要."""
    from sqlalchemy import text

    if db.engine.dialect.name != "postgresql":
        return
    stmts = [
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fare_base VARCHAR(60)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fare_add VARCHAR(60)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fare_other VARCHAR(255)",
    ]
    try:
        with db.engine.begin() as conn:
            for s in stmts:
                conn.execute(text(s))
    except Exception:
        from flask import current_app
        current_app.logger.exception("vendor schema migration skipped")


def purge_vendor(vendor_id: int) -> None:
    """1業者とその所属ドライバー・提示・通知・購読を削除する."""
    p = {"vid": vendor_id}
    # この業者の提示を確定参照している依頼の参照を外す
    db.session.execute(text(
        "UPDATE requests SET confirmed_entry_id = NULL "
        "WHERE confirmed_entry_id IN (SELECT id FROM entries WHERE vendor_id = :vid)"), p)
    # 所属ドライバー宛の通知・プッシュ購読
    db.session.execute(text(
        "DELETE FROM notifications WHERE role='driver' AND recipient_id IN "
        "(SELECT id FROM drivers WHERE vendor_id = :vid)"), p)
    db.session.execute(text(
        "DELETE FROM push_subscriptions WHERE role='driver' AND recipient_id IN "
        "(SELECT id FROM drivers WHERE vendor_id = :vid)"), p)
    # 提示 → ドライバー → 業者
    db.session.execute(text("DELETE FROM entries WHERE vendor_id = :vid"), p)
    db.session.execute(text("DELETE FROM drivers WHERE vendor_id = :vid"), p)
    db.session.execute(text("DELETE FROM vendors WHERE id = :vid"), p)
    db.session.commit()


def wipe_operational_data() -> int:
    """業者・利用者・依頼などの運用データを全消去する（管理者は残す）.

    返り値：削除前の利用者数（目安）。
    """
    n = db.session.execute(text("SELECT COUNT(*) FROM customers")).scalar() or 0
    # 参照を外してから順に削除（FK安全）
    db.session.execute(text("UPDATE requests SET confirmed_entry_id = NULL"))
    for tbl in (
        "notifications",
        "entries",
        "requests",
        "push_subscriptions",
        "drivers",
        "vendors",
        "customers",
    ):
        db.session.execute(text(f"DELETE FROM {tbl}"))
    db.session.commit()
    return int(n)
